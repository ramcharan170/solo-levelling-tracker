'use client';

import { useEffect, useState } from 'react';
import { Bell, Download } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function PwaReminders() {
  const [mounted, setMounted] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  useEffect(() => {
    setMounted(true);

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((error) => {
        console.error('Service worker registration failed:', error);
      });
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    setNotificationsEnabled('Notification' in window && Notification.permission === 'granted');

    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  useEffect(() => {
    if (!notificationsEnabled || !('Notification' in window)) return;

    const now = new Date();
    const reminderAt = new Date();
    reminderAt.setHours(20, 0, 0, 0);
    if (reminderAt <= now) {
      reminderAt.setDate(reminderAt.getDate() + 1);
    }

    const timer = window.setTimeout(() => {
      if (Notification.permission === 'granted') {
        new Notification('Hunter Log Reminder', {
          body: 'Record your quests and recovery before the day resets.',
          icon: '/icon-192x192.png',
        });
      }
    }, reminderAt.getTime() - now.getTime());

    return () => window.clearTimeout(timer);
  }, [notificationsEnabled]);

  const handleInstall = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  };

  const handleNotifications = async () => {
    if (!('Notification' in window)) return;
    const permission = await Notification.requestPermission();
    setNotificationsEnabled(permission === 'granted');
  };

  if (!mounted || (!installPrompt && notificationsEnabled)) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[900] flex flex-col gap-2">
      {installPrompt && (
        <button
          type="button"
          onClick={handleInstall}
          className="flex items-center gap-2 rounded border border-system-cyan/70 bg-system-card px-3 py-2 text-[10px] font-mono font-bold uppercase tracking-wider text-system-cyan shadow-cyan/10 shadow"
        >
          <Download size={13} />
          Install
        </button>
      )}
      {!notificationsEnabled && typeof window !== 'undefined' && 'Notification' in window && (
        <button
          type="button"
          onClick={handleNotifications}
          className="flex items-center gap-2 rounded border border-system-border bg-system-card px-3 py-2 text-[10px] font-mono font-bold uppercase tracking-wider text-system-textMuted hover:border-system-cyan/60 hover:text-system-cyan"
        >
          <Bell size={13} />
          Reminders
        </button>
      )}
    </div>
  );
}
