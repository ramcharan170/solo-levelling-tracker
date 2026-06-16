import type { Metadata, Viewport } from 'next';
import { Outfit, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/components/AuthProvider';
import BackgroundCanvas from '@/components/BackgroundCanvas';
import PwaReminders from '@/components/PwaReminders';

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
});

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
});

export const metadata: Metadata = {
  title: 'SYSTEM // HUNTER LOG',
  description: 'Solo Leveling inspired productivity RPG system. Complete quests, track sleep, level up.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Hunter Log',
  },
};

export const viewport: Viewport = {
  themeColor: '#05080d',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${outfit.variable} ${jetbrains.variable}`}>
      <body className="bg-system-bg text-system-text select-none min-h-screen relative font-sans antialiased">
        <AuthProvider>
          {/* Global Particle Background */}
          <BackgroundCanvas />
          
          {/* Main Grid Scan Overlay */}
          <div className="fixed inset-0 w-full h-full hud-grid pointer-events-none z-0" />
          
          {/* App Core */}
          <div className="relative z-10 w-full min-h-screen flex flex-col">
            {children}
          </div>
          <PwaReminders />
        </AuthProvider>
      </body>
    </html>
  );
}
