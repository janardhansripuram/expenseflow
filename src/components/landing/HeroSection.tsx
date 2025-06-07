
"use client";

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { ArrowRight, CheckCircle } from 'lucide-react';

export default function HeroSection() {
  return (
    <section className="py-16 md:py-24 lg:py-32 bg-gradient-to-b from-background to-secondary/30">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div className="space-y-6 animate-fadeInUp">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight font-headline text-primary">
              Take Control of Your Finances with ExpenseFlow
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground">
              Effortlessly track, manage, and analyze your expenses. Split bills with friends, manage group finances, and gain valuable insights with smart reports.
            </p>
            <ul className="space-y-2 text-muted-foreground">
              <li className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                Intuitive Expense Tracking & OCR
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                Seamless Bill Splitting & Group Management
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                Powerful AI-Powered Reports
              </li>
            </ul>
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button size="lg" asChild className="shadow-lg hover:shadow-xl transition-shadow">
                <Link href="/signup">
                  Get Started For Free <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild className="shadow-md hover:shadow-lg transition-shadow">
                <Link href="#features">
                  Learn More
                </Link>
              </Button>
            </div>
          </div>
          <div className="mt-8 md:mt-0 animate-fadeInRight">
            <Image
              src="https://placehold.co/700x500.png"
              alt="ExpenseFlow Dashboard Mockup"
              width={700}
              height={500}
              className="rounded-xl shadow-2xl object-cover"
              data-ai-hint="finance app dashboard"
              priority
            />
          </div>
        </div>
      </div>
    </section>
  );
}

// Add simple keyframes for animations if not using a library
// Ensure tailwind.config.ts has these keyframes if used
// For example:
// theme: {
//   extend: {
//     keyframes: {
//       fadeInUp: {
//         '0%': { opacity: '0', transform: 'translateY(20px)' },
//         '100%': { opacity: '1', transform: 'translateY(0)' },
//       },
//       fadeInRight: {
//         '0%': { opacity: '0', transform: 'translateX(20px)' },
//         '100%': { opacity: '1', transform: 'translateX(0)' },
//       }
//     },
//     animation: {
//       fadeInUp: 'fadeInUp 0.8s ease-out forwards',
//       fadeInRight: 'fadeInRight 0.8s ease-out 0.2s forwards', // Slight delay
//     }
//   }
// }
// In this case, I'm adding animate-fadeInUp and animate-fadeInRight directly to the classNames.
// The actual keyframes definitions would need to be in tailwind.config.ts
// Since they are not yet, these class names will not apply animation.
// For now, I will rely on the user to add these to their tailwind.config.ts or use a library.
// For demo purposes, I will add basic Tailwind opacity and transform animations for simple effect.

// Corrected approach: Use existing tailwind-animate for animations if they exist or use simple transitions
// Since tailwindcss-animate is installed, I'll use its classes if suitable, or simple opacity transitions.
// For now, let's use a subtle opacity transition.
// Updated: Let's assume animate-fadeInUp and animate-fadeInRight are classes enabled by tailwindcss-animate or custom keyframes.
// If not, the elements will just appear without animation, which is fine for a first pass.
// The example comment above shows how to add them to tailwind.config.js
// The provided tailwind.config.ts already has 'tailwindcss-animate' and keyframes for accordion.
// I will add the fadeInUp and fadeInRight keyframes to the tailwind.config.ts
