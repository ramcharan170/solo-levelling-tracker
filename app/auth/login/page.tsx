'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail, Lock, LogIn, UserPlus, ShieldAlert, Terminal } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/components/AuthProvider';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session } = useAuth();
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Get errors passed in search parameters (e.g. from callback redirects)
  useEffect(() => {
    const err = searchParams.get('error');
    if (err) setErrorMsg(err);
  }, [searchParams]);

  // If already logged in, redirect to dashboard
  useEffect(() => {
    if (session) {
      router.push('/dashboard');
    }
  }, [session, router]);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      if (isRegistering) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (error) throw error;
        
        if (data.user && data.session === null) {
          setSuccessMsg('[ SYSTEM ] A verification link has been sent to your email.');
        } else if (data.session) {
          router.push('/dashboard');
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push('/dashboard');
      }
    } catch (err: any) {
      setErrorMsg(err.message ?? 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMsg('');
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setErrorMsg(err.message ?? 'Google Login failed.');
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md z-10">
      {/* RPG HUD Container */}
      <div className="border border-system-border bg-system-card/95 rounded-lg shadow-double p-8 relative overflow-hidden">
        
        {/* Top Scanline Border */}
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-system-cyanGlow via-system-cyan to-system-cyanGlow animate-pulse" />

        {/* Heading */}
        <div className="text-center mb-8">
          <div className="flex justify-center items-center gap-1.5 text-xs text-system-muted tracking-[0.25em] mb-2 uppercase">
            <Terminal size={14} className="text-system-cyan" />
            [ System Gateway ]
          </div>
          <h1 className="text-2xl font-bold tracking-widest text-system-cyan drop-shadow-[0_0_8px_rgba(125,211,252,0.4)] uppercase">
            Hunter Awakening
          </h1>
          <p className="text-xs text-system-textMuted mt-1">
            Verify your credentials to register as a hunter.
          </p>
        </div>

        {/* Alert Messages */}
        {errorMsg && (
          <div className="mb-5 flex items-start gap-2.5 bg-red-950/20 border border-red-500/30 text-red-400 text-xs p-3.5 rounded">
            <ShieldAlert size={16} className="shrink-0 mt-0.5" />
            <div>
              <span className="font-mono font-bold tracking-wider mr-1">[ ALERT ]:</span>
              {errorMsg}
            </div>
          </div>
        )}

        {successMsg && (
          <div className="mb-5 flex items-start gap-2.5 bg-emerald-950/20 border border-emerald-500/30 text-emerald-400 text-xs p-3.5 rounded">
            <Terminal size={16} className="shrink-0 mt-0.5 text-emerald-400 animate-pulse" />
            <div>{successMsg}</div>
          </div>
        )}

        {/* Credentials Form */}
        <form onSubmit={handleEmailAuth} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-wider text-system-muted font-bold block">
              Hunter Email Address
            </label>
            <div className="relative">
              <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-system-muted" />
              <input
                type="email"
                required
                placeholder="name@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="w-full pl-11 pr-4 py-2.5 bg-system-panel border border-system-border rounded text-sm text-system-text placeholder-system-muted focus:outline-none focus:border-system-cyan focus:shadow-cyan transition-all"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-wider text-system-muted font-bold block">
              Security Key (Password)
            </label>
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-system-muted" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="w-full pl-11 pr-4 py-2.5 bg-system-panel border border-system-border rounded text-sm text-system-text placeholder-system-muted focus:outline-none focus:border-system-cyan focus:shadow-cyan transition-all"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-system-panel hover:bg-system-cyanGlow/10 border border-system-border hover:border-system-cyan text-sm tracking-widest text-system-cyan font-bold rounded flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRegistering ? (
              <>
                <UserPlus size={16} />
                REGISTER HUNTER
              </>
            ) : (
              <>
                <LogIn size={16} />
                AWAKEN HUNTER
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="my-6 flex items-center justify-between gap-3 text-[10px] text-system-muted tracking-wider">
          <div className="h-px flex-1 bg-system-border/50" />
          <span>OR CONNECT WITH</span>
          <div className="h-px flex-1 bg-system-border/50" />
        </div>

        {/* Social Sign In */}
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full py-2.5 bg-system-panel hover:bg-system-purple/10 border border-system-border hover:border-system-purple text-sm tracking-widest text-system-purpleGlow font-bold rounded flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
        >
          <svg className="w-4 h-4 mr-1 fill-current" viewBox="0 0 24 24">
            <path d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114-3.328 0-6.03-2.702-6.03-6.03s2.702-6.03 6.03-6.03c1.524 0 2.915.567 3.985 1.503L21 4.783C18.672 2.624 15.607 1.341 12.24 1.341c-5.836 0-10.57 4.733-10.57 10.57 0 5.836 4.734 10.57 10.57 10.57 5.753 0 10.457-4.148 10.57-9.877v-2.319h-10.57z" />
          </svg>
          GOOGLE AUTH
        </button>

        {/* Toggle Registration Mode */}
        <div className="mt-6 text-center text-xs">
          <button
            onClick={() => setIsRegistering(!isRegistering)}
            disabled={loading}
            className="text-system-textMuted hover:text-system-cyan border-b border-dashed border-system-muted hover:border-system-cyan transition-all font-mono"
          >
            {isRegistering
              ? "Already registered? [ RETURN TO SIGN IN ]"
              : "New awakening? [ REGISTER NEW HUNTER ]"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="relative min-h-screen flex items-center justify-center bg-system-bg text-system-text overflow-hidden px-4 font-sans">
      {/* HUD Scan Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.02)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />
      <div className="absolute top-0 left-0 right-0 bottom-0 bg-radial-gradient(circle_at_center,transparent_40%,#05080d_95%) pointer-events-none" />
      
      {/* Background Glows */}
      <div className="absolute top-[20%] left-[15%] w-80 h-80 rounded-full bg-cyan-500/5 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[20%] right-[15%] w-80 h-80 rounded-full bg-purple-500/5 blur-[100px] pointer-events-none" />

      <Suspense fallback={
        <div className="w-full max-w-md z-10 border border-system-border bg-system-card/95 rounded-lg shadow-double p-8 flex flex-col items-center justify-center min-h-[400px]">
          <div className="flex items-center gap-2.5 text-system-cyan animate-pulse font-mono">
            <Terminal size={18} />
            <span className="tracking-widest uppercase text-xs font-bold">[ LOADING SYSTEM GATEWAY ]</span>
          </div>
        </div>
      }>
        <LoginForm />
      </Suspense>
    </div>
  );
}
