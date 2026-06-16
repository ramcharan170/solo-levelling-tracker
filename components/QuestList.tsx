'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Check, Plus, Trash2, ShieldAlert } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getXpReward } from '@/lib/gameplay';

interface Quest {
  id: string;
  title: string;
  description: string | null;
  type: 'daily' | 'weekly';
  category: 'AI/RAG' | 'Web Dev' | 'Automation' | 'Fitness' | 'Custom';
  difficulty: 'E' | 'D' | 'C' | 'B' | 'A' | 'S';
  xp_reward: number;
  is_completed: boolean;
  is_system: boolean;
}

interface QuestListProps {
  userId: string;
  onXpChange: (xpAdded: number) => void;
}

export default function QuestList({ userId, onXpChange }: QuestListProps) {
  const [activeTab, setActiveTab] = useState<'daily' | 'weekly'>('daily');
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingQuestId, setSavingQuestId] = useState<string | null>(null);

  // Form State
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<'AI/RAG' | 'Web Dev' | 'Automation' | 'Fitness' | 'Custom'>('Custom');
  const [difficulty, setDifficulty] = useState<'E' | 'D' | 'C' | 'B' | 'A' | 'S'>('E');
  const [submitting, setSubmitting] = useState(false);

  const supabase = createClient();

  const fetchQuests = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('quests')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching quests:', error);
    } else {
      setQuests(data as Quest[]);
    }
    setLoading(false);
  }, [userId, supabase]);

  // Insert mock/system default quests if user has none
  const checkAndSeedQuests = useCallback(async () => {
    const { count, error } = await supabase
      .from('quests')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (error) {
      console.error('Error checking user quests:', error);
      return;
    }

    if (count === 0) {
      // Seed default quests matching the original HTML app's weekly structure
      const systemQuests = [
        {
          user_id: userId,
          title: 'Semantic movie search',
          description: 'Implement a vector-based search using embeddings.',
          type: 'weekly',
          category: 'AI/RAG',
          difficulty: 'C',
          xp_reward: getXpReward('C', 'weekly'),
          is_system: true,
        },
        {
          user_id: userId,
          title: 'Weather App',
          description: 'Build a standard React client integrated with openweathermap API.',
          type: 'weekly',
          category: 'Web Dev',
          difficulty: 'D',
          xp_reward: getXpReward('D', 'weekly'),
          is_system: true,
        },
        {
          user_id: userId,
          title: 'Read 2 pages of documentation',
          description: 'Stay updated on modern tool stacks.',
          type: 'daily',
          category: 'AI/RAG',
          difficulty: 'E',
          xp_reward: getXpReward('E', 'daily'),
          is_system: true,
        },
        {
          user_id: userId,
          title: 'Daily Coding Session',
          description: 'Solve at least one coding challenge.',
          type: 'daily',
          category: 'Web Dev',
          difficulty: 'D',
          xp_reward: getXpReward('D', 'daily'),
          is_system: true,
        },
      ];

      const { error: seedError } = await supabase.from('quests').insert(systemQuests);
      if (seedError) console.error('Failed to seed default quests:', seedError);
      else fetchQuests();
    } else {
      fetchQuests();
    }
  }, [userId, supabase, fetchQuests]);

  useEffect(() => {
    checkAndSeedQuests();
  }, [checkAndSeedQuests]);

  const handleToggleQuest = async (questId: string, currentStatus: boolean, xpReward: number) => {
    if (savingQuestId) return;
    setSavingQuestId(questId);

    const nextStatus = !currentStatus;

    // Optimistically update local UI
    setQuests((prev) =>
      prev.map((q) => (q.id === questId ? { ...q, is_completed: nextStatus } : q))
    );

    try {
      // 1. Save quest completion status
      const { error: questError } = await supabase
        .from('quests')
        .update({
          is_completed: nextStatus,
          completed_at: nextStatus ? new Date().toISOString() : null,
        })
        .eq('id', questId);

      if (questError) throw questError;

      // 2. Fetch current profile XP to update
      const { data: profile, error: profileFetchError } = await supabase
        .from('profiles')
        .select('xp')
        .eq('id', userId)
        .single();

      if (profileFetchError) throw profileFetchError;

      const xpChange = nextStatus ? xpReward : -xpReward;
      const newXp = Math.max(0, (profile?.xp ?? 0) + xpChange);

      // 3. Update user profile XP
      const { error: profileUpdateError } = await supabase
        .from('profiles')
        .update({ xp: newXp })
        .eq('id', userId);

      if (profileUpdateError) throw profileUpdateError;

      // Notify parent dashboard of XP change to trigger updates
      onXpChange(xpChange);
    } catch (err) {
      console.error('Failed to toggle quest state:', err);
      // Revert local state on error
      setQuests((prev) =>
        prev.map((q) => (q.id === questId ? { ...q, is_completed: currentStatus } : q))
      );
    } finally {
      setSavingQuestId(null);
    }
  };

  const handleDeleteQuest = async (questId: string) => {
    if (savingQuestId) return;
    setSavingQuestId(questId);

    try {
      const { error } = await supabase.from('quests').delete().eq('id', questId);
      if (error) throw error;
      setQuests((prev) => prev.filter((q) => q.id !== questId));
    } catch (err) {
      console.error('Failed to delete quest:', err);
    } finally {
      setSavingQuestId(null);
    }
  };

  const handleCreateQuest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || submitting) return;

    setSubmitting(true);
    const xp_reward = getXpReward(difficulty, activeTab);

    try {
      const { data, error } = await supabase
        .from('quests')
        .insert({
          user_id: userId,
          title,
          description: description.trim() || null,
          type: activeTab,
          category,
          difficulty,
          xp_reward,
          is_completed: false,
          is_system: false,
        })
        .select()
        .single();

      if (error) throw error;

      setQuests((prev) => [...prev, data as Quest]);
      setTitle('');
      setDescription('');
      setIsAdding(false);
    } catch (err) {
      console.error('Failed to create quest:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredQuests = quests.filter((q) => q.type === activeTab);

  const getDifficultyColor = (diff: string) => {
    switch (diff) {
      case 'S':
        return 'text-purple-400 border-purple-500/50 bg-purple-950/20';
      case 'A':
        return 'text-violet-400 border-violet-500/50 bg-violet-950/20';
      case 'B':
        return 'text-indigo-400 border-indigo-500/50 bg-indigo-950/20';
      case 'C':
        return 'text-blue-400 border-blue-500/50 bg-blue-950/20';
      case 'D':
        return 'text-sky-400 border-sky-500/50 bg-sky-950/20';
      case 'E':
      default:
        return 'text-cyan-400 border-cyan-500/50 bg-cyan-950/20';
    }
  };

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'AI/RAG':
        return 'text-cyan-400 border-cyan-600/30 bg-cyan-950/10';
      case 'Web Dev':
        return 'text-emerald-400 border-emerald-600/30 bg-emerald-950/10';
      case 'Automation':
        return 'text-amber-400 border-amber-600/30 bg-amber-950/10';
      case 'Fitness':
        return 'text-rose-400 border-rose-600/30 bg-rose-950/10';
      case 'Custom':
      default:
        return 'text-slate-400 border-slate-600/30 bg-slate-900/10';
    }
  };

  return (
    <div className="p-5 bg-system-card border border-system-border rounded-lg space-y-5 font-sans">
      {/* TABS CONTAINER */}
      <div className="flex border-b border-system-border/40">
        <button
          onClick={() => {
            setActiveTab('daily');
            setIsAdding(false);
          }}
          className={`flex-1 py-2 text-xs font-mono font-bold tracking-widest uppercase cursor-pointer border-b-2 transition-all ${
            activeTab === 'daily'
              ? 'border-system-cyan text-system-cyan drop-shadow-[0_0_8px_rgba(125,211,252,0.2)]'
              : 'border-transparent text-system-muted hover:text-system-textMuted'
          }`}
        >
          [ DAILY QUESTS ]
        </button>
        <button
          onClick={() => {
            setActiveTab('weekly');
            setIsAdding(false);
          }}
          className={`flex-1 py-2 text-xs font-mono font-bold tracking-widest uppercase cursor-pointer border-b-2 transition-all ${
            activeTab === 'weekly'
              ? 'border-system-purple text-system-purpleGlow drop-shadow-[0_0_8px_rgba(167,139,250,0.2)]'
              : 'border-transparent text-system-muted hover:text-system-textMuted'
          }`}
        >
          [ WEEKLY QUESTS ]
        </button>
      </div>

      {/* ADD QUEST EXPANDER */}
      <div>
        {!isAdding ? (
          <button
            onClick={() => setIsAdding(true)}
            className="w-full py-2 bg-system-panel border border-dashed border-system-border hover:border-system-cyan/50 text-system-textMuted hover:text-system-cyan flex items-center justify-center gap-2 text-xs font-bold font-mono tracking-wider rounded cursor-pointer transition-all"
          >
            <Plus size={14} />
            ADD CUSTOM {activeTab.toUpperCase()} QUEST
          </button>
        ) : (
          <form onSubmit={handleCreateQuest} className="bg-system-panel border border-system-border rounded p-4 space-y-4">
            <div className="text-[10px] text-system-cyan font-mono tracking-wider uppercase font-bold">
              [ CREATE CUSTOM QUEST ]
            </div>
            
            <div className="space-y-1">
              <input
                type="text"
                required
                maxLength={80}
                placeholder="Quest Title (e.g. Code database schemas)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 bg-system-bg border border-system-border rounded text-xs text-system-text focus:outline-none focus:border-system-cyan focus:shadow-cyan"
              />
            </div>

            <div className="space-y-1">
              <textarea
                placeholder="Quest Details (Optional)"
                maxLength={200}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 bg-system-bg border border-system-border rounded text-xs text-system-text focus:outline-none focus:border-system-cyan focus:shadow-cyan h-16 resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[9px] uppercase tracking-wider text-system-muted font-bold block">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e: any) => setCategory(e.target.value)}
                  className="w-full px-2 py-1.5 bg-system-bg border border-system-border rounded text-xs text-system-text focus:outline-none focus:border-system-cyan"
                >
                  <option value="AI/RAG">AI / RAG</option>
                  <option value="Web Dev">Web Dev</option>
                  <option value="Automation">Automation</option>
                  <option value="Fitness">Fitness</option>
                  <option value="Custom">Custom</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] uppercase tracking-wider text-system-muted font-bold block">
                  Difficulty (Rank)
                </label>
                <select
                  value={difficulty}
                  onChange={(e: any) => setDifficulty(e.target.value)}
                  className="w-full px-2 py-1.5 bg-system-bg border border-system-border rounded text-xs text-system-text focus:outline-none focus:border-system-cyan"
                >
                  <option value="E">E-Rank (Easy)</option>
                  <option value="D">D-Rank</option>
                  <option value="C">C-Rank (Medium)</option>
                  <option value="B">B-Rank</option>
                  <option value="A">A-Rank (Hard)</option>
                  <option value="S">S-Rank (Nightmare)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-3 py-1.5 bg-transparent border border-system-border text-system-muted hover:text-system-textMuted text-xs font-bold tracking-wider rounded cursor-pointer transition-all"
              >
                CANCEL
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-3 py-1.5 bg-system-cyanGlow/10 border border-system-cyan text-system-cyan hover:bg-system-cyanGlow/20 text-xs font-bold tracking-wider rounded cursor-pointer transition-all"
              >
                DEPLOY QUEST
              </button>
            </div>
          </form>
        )}
      </div>

      {/* QUESTS CONTAINER */}
      <div className="space-y-2">
        {loading ? (
          <div className="text-center py-8 text-xs text-system-muted font-mono animate-pulse">
            LOADING ACTIVE QUEST DATA...
          </div>
        ) : filteredQuests.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-system-border/40 rounded bg-system-panel/20 text-system-muted text-xs font-mono">
            NO ACTIVE {activeTab.toUpperCase()} QUESTS AVAILABLE.
          </div>
        ) : (
          filteredQuests.map((quest) => (
            <div
              key={quest.id}
              className={`flex items-center gap-3 p-3 bg-system-panel border rounded transition-all duration-300 ${
                quest.is_completed
                  ? 'border-emerald-500/30 opacity-55'
                  : 'border-system-border hover:border-system-cyan/35'
              }`}
            >
              {/* Checkbox Trigger */}
              <button
                onClick={() => handleToggleQuest(quest.id, quest.is_completed, quest.xp_reward)}
                className={`w-5 h-5 border rounded flex items-center justify-center transition-all cursor-pointer ${
                  quest.is_completed
                    ? 'bg-emerald-500 border-emerald-500 text-system-dark shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                    : 'border-system-cyan hover:bg-system-cyanGlow/10 text-transparent'
                }`}
              >
                <Check strokeWidth={3} className="w-3.5 h-3.5" />
              </button>

              {/* Title & Description */}
              <div className="flex-1 min-w-0 pr-2">
                <h4
                  className={`text-xs sm:text-sm font-bold tracking-wide truncate ${
                    quest.is_completed ? 'line-through text-system-muted' : 'text-system-text'
                  }`}
                >
                  {quest.title}
                </h4>
                {quest.description && (
                  <p className="text-[10px] sm:text-xs text-system-textMuted mt-0.5 truncate leading-relaxed">
                    {quest.description}
                  </p>
                )}
              </div>

              {/* Badges Column */}
              <div className="flex items-center gap-2 shrink-0">
                {/* Category Tag */}
                <span className={`text-[8px] sm:text-[9px] uppercase tracking-wider font-mono border px-2 py-0.5 rounded ${getCategoryColor(quest.category)}`}>
                  {quest.category}
                </span>

                {/* Difficulty Tag */}
                <span className={`text-[8px] sm:text-[9px] uppercase tracking-wider font-mono font-bold border px-1.5 py-0.5 rounded ${getDifficultyColor(quest.difficulty)}`}>
                  {quest.difficulty}
                </span>

                {/* XP Reward Label */}
                <span className="text-[10px] sm:text-xs font-mono font-bold text-system-cyan select-none">
                  +{quest.xp_reward} XP
                </span>

                {/* Custom Quest Delete Trigger */}
                {!quest.is_system && (
                  <button
                    onClick={() => handleDeleteQuest(quest.id)}
                    className="p-1 text-system-muted hover:text-red-400 hover:bg-red-500/10 rounded transition-all cursor-pointer ml-1"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
