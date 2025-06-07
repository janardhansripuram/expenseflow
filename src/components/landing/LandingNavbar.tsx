
"use client";

import Link from 'next/link';
import { AppLogo } from '@/components/core/AppLogo';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { UserNav } from '../core/UserNav'; // For consistency if user is somehow on landing but logged in

export default function LandingNavbar() {
  const { user, loading } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 max-w-screen-2xl items-center justify-between">
        <AppLogo href="/" />
        <nav className="flex items-center gap-2">
          {loading ? (
            <div className="h-8 w-20 animate-pulse rounded-md bg-muted"></div>
          ) : user ? (
             <UserNav />
          ) : (
            <>
              <Button variant="ghost" asChild>
                <Link href="/login">Log In</Link>
              </Button>
              <Button asChild>
                <Link href="/signup">Get Started</Link>
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
