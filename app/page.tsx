'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { Terminal } from 'lucide-react';

export default function RootPage() {
  const router = useRouter();
  const { session, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (session) {
        router.push('/dashboard');
      } else {
        router.push('/auth/login');
      }
    }
  }, [session, loading, router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-system-bg text-system-text font-mono">
      <div className="flex items-center gap-2.5 text-system-cyan animate-pulse">
        <Terminal size={20} className="text-system-cyan" />
        <span className="tracking-widest uppercase text-sm font-bold">[ INITIALIZING SYSTEM GATEWAY ]</span>
      </div>
    </div>
  );
}
