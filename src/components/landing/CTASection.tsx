
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, Zap } from 'lucide-react';

export default function CTASection() {
  return (
    <section className="py-16 md:py-24 bg-gradient-to-r from-primary to-accent text-primary-foreground">
      <div className="container mx-auto px-4 text-center">
        <Zap className="mx-auto h-16 w-16 mb-6 text-background" />
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight font-headline mb-6">
          Ready to Simplify Your Finances?
        </h2>
        <p className="text-lg md:text-xl mb-8 max-w-2xl mx-auto text-primary-foreground/90">
          Join thousands of users who are taking control of their spending, managing shared expenses, and achieving their financial goals with ExpenseFlow.
        </p>
        <Button 
          size="lg" 
          asChild 
          className="bg-background text-primary hover:bg-background/90 shadow-lg hover:shadow-xl transition-all duration-300 ease-in-out transform hover:scale-105 px-8 py-3 text-lg"
        >
          <Link href="/signup">
            Sign Up Now & Get Started <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </Button>
        <p className="mt-4 text-sm text-primary-foreground/80">
          It&apos;s free to get started!
        </p>
      </div>
    </section>
  );
}
