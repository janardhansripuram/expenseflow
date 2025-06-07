
"use client";

import Link from 'next/link';
import { AppLogo } from '@/components/core/AppLogo';
import { Github, Twitter, Linkedin } from 'lucide-react';

export default function LandingFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border/40 bg-background">
      <div className="container mx-auto px-4 py-8 md:py-12">
        <div className="grid md:grid-cols-3 gap-8 items-center">
          <div className="md:col-span-1">
            <AppLogo />
            <p className="mt-2 text-sm text-muted-foreground">
              Simplifying your financial life, one expense at a time.
            </p>
          </div>
          <div className="md:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-8 text-sm">
            <div>
              <h4 className="font-semibold text-foreground mb-2">Product</h4>
              <ul className="space-y-1.5">
                <li><Link href="#features" className="text-muted-foreground hover:text-primary">Features</Link></li>
                <li><Link href="/signup" className="text-muted-foreground hover:text-primary">Sign Up</Link></li>
                <li><Link href="/login" className="text-muted-foreground hover:text-primary">Log In</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-2">Company</h4>
              <ul className="space-y-1.5">
                <li><span className="text-muted-foreground">About Us (Coming Soon)</span></li>
                <li><span className="text-muted-foreground">Careers (Coming Soon)</span></li>
                <li><span className="text-muted-foreground">Contact (Coming Soon)</span></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-2">Legal</h4>
              <ul className="space-y-1.5">
                <li><span className="text-muted-foreground">Privacy Policy (Coming Soon)</span></li>
                <li><span className="text-muted-foreground">Terms of Service (Coming Soon)</span></li>
              </ul>
            </div>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t border-border/40 flex flex-col sm:flex-row justify-between items-center text-sm text-muted-foreground">
          <p>&copy; {currentYear} ExpenseFlow. All rights reserved.</p>
          <div className="flex gap-4 mt-4 sm:mt-0">
            <Link href="#" aria-label="Twitter" className="hover:text-primary"><Twitter className="h-5 w-5" /></Link>
            <Link href="#" aria-label="GitHub" className="hover:text-primary"><Github className="h-5 w-5" /></Link>
            <Link href="#" aria-label="LinkedIn" className="hover:text-primary"><Linkedin className="h-5 w-5" /></Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
