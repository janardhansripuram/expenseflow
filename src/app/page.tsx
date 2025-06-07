
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';
import LandingNavbar from '@/components/landing/LandingNavbar';
import HeroSection from '@/components/landing/HeroSection';
import FeaturesSection from '@/components/landing/FeaturesSection';
import CTASection from '@/components/landing/CTASection';
import LandingFooter from '@/components/landing/LandingFooter';

const PageLoader = ({ message }: { message: string }) => (
  <div className="flex h-screen min-h-screen flex-col items-center justify-center bg-background p-4">
    <Loader2 className="h-12 w-12 animate-spin text-primary" />
    <p className="mt-4 text-lg text-foreground font-headline">{message}</p>
  </div>
);

export default function HomePage() {
  const { authUser, loading } = useAuth(); // Use authUser
  const router = useRouter();

  useEffect(() => {
    if (!loading) { 
      if (authUser) { // Check authUser
        router.prefetch('/dashboard'); 
        router.replace('/dashboard'); 
      }
    }
  }, [authUser, loading, router]); // Depend on authUser

  if (loading) {
    return <PageLoader message="Loading ExpenseFlow..." />;
  }

  if (authUser) { // Check authUser
     return <PageLoader message="Redirecting to your dashboard..." />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <LandingNavbar />
      <main className="flex-grow">
        <HeroSection />
        <FeaturesSection />
        <CTASection />
      </main>
      <LandingFooter />
    </div>
  );
}
