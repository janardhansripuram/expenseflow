
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
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) { // Only perform actions once the loading state is false
      if (user) {
        router.prefetch('/dashboard'); // Prefetch if user is logged in
        router.replace('/dashboard'); // Redirect to dashboard if user is logged in
      }
      // If !user, this effect does nothing, and the component will render the landing page.
    }
  }, [user, loading, router]);

  if (loading) {
    return <PageLoader message="Loading ExpenseFlow..." />;
  }

  // If user is logged in (and not loading), they are about to be redirected by the useEffect.
  // Show a loader during this brief period.
  if (user) {
     return <PageLoader message="Redirecting to your dashboard..." />;
  }

  // If not loading and no user, show the landing page content.
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
