import { Coins } from 'lucide-react';
import Link from 'next/link';

export function AppLogo() {
  return (
    <Link href="/dashboard" className="flex items-center gap-2" aria-label="ExpenseFlow Home">
      <Coins className="h-7 w-7 text-primary" />
      <span className="text-xl font-bold font-headline text-foreground">ExpenseFlow</span>
    </Link>
  );
}
