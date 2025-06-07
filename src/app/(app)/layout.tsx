
"use client";

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { AppLogo } from '@/components/core/AppLogo';
import { UserNav } from '@/components/core/UserNav';
import { ThemeToggle } from '@/components/core/ThemeToggle';
import { SidebarItems } from '@/components/core/SidebarItems';
import type { NavItem } from '@/lib/types';
import {
  LayoutDashboard,
  CircleDollarSign,
  ScanLine,
  Users,
  UserPlus,
  BarChart3,
  BellRing,
  Settings,
  Loader2,
  PlusCircle,
  Split,
  FileText,
  ListChecks,
  UserCog,
  Landmark,
  Target,
  Banknote, 
  TrendingUp, 
  CreditCard, 
} from 'lucide-react';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarTrigger,
  SidebarInset,
} from '@/components/ui/sidebar';

const navItems: NavItem[] = [
  { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { title: 'Expenses', href: '/expenses', icon: CircleDollarSign, submenu: [
      { title: 'View Expenses', href: '/expenses', icon: CircleDollarSign },
      { title: 'Add Expense', href: '/expenses/add', icon: PlusCircle },
      { title: 'Scan Receipt (OCR)', href: '/expenses/scan', icon: ScanLine },
    ]
  },
  { title: 'Income', href: '/income', icon: Banknote, submenu: [
      { title: 'View Income', href: '/income', icon: TrendingUp },
      { title: 'Add Income', href: '/income/add', icon: CreditCard },
    ]
  },
  { title: 'Budgets', href: '/budgets', icon: Target },
  { title: 'Split Expenses', href: '/split', icon: Split },
  { title: 'Groups', href: '/groups', icon: Users },
  { title: 'Friends', href: '/friends', icon: UserPlus },
  { title: 'Debts', href: '/debts', icon: Landmark },
  { title: 'Reports', href: '/reports', icon: FileText },
  { title: 'Reminders', href: '/reminders', icon: ListChecks, submenu: [
      { title: 'View Reminders', href: '/reminders', icon: BellRing },
      { title: 'Add Reminder', href: '/reminders/add', icon: PlusCircle },
    ] 
  },
  { title: 'Settings', href: '/settings', icon: Settings, separator: true },
];

const getPageTitle = (pathname: string, items: NavItem[]): string => {
  for (const item of items) {
    if (item.href === pathname && !item.submenu) return item.title;
    if (pathname.startsWith(item.href) && item.submenu) {
        for (const subItem of item.submenu) {
            if (subItem.href === pathname) return item.title; 
        }
        // Fallback for dynamic child routes not explicitly in submenu
        if (item.href !== '/dashboard' && pathname.startsWith(item.href + '/')) {
            if (pathname.startsWith('/expenses/edit/')) return 'Edit Expense';
            if (pathname.startsWith('/income/edit/')) return 'Edit Income';
            if (pathname.startsWith('/groups/') && pathname.split('/').length === 3 && pathname !== '/groups') return 'Group Details';
            if (pathname.startsWith('/split/edit/')) return 'Edit Split';
            if (pathname === '/reminders/add') return 'Add Reminder'; // Specific check
            return item.title; 
        }
        if (item.href === pathname) return item.title;
    }
  }
  // Handle specific dynamic routes not covered by the above loop
  if (pathname.startsWith('/expenses/edit/')) return 'Edit Expense';
  if (pathname.startsWith('/income/edit/')) return 'Edit Income';
  if (pathname.startsWith('/groups/') && pathname.split('/').length === 3 && pathname !== '/groups') return 'Group Details';
  if (pathname.startsWith('/split/edit/')) return 'Edit Split';

  // Handle specific static routes that might be top-level or missed
  if (pathname === '/expenses/scan') return 'Scan Receipt';
  if (pathname === '/income/add') return 'Add Income';
  if (pathname === '/reminders/add') return 'Add Reminder'; 
  if (pathname === '/debts') return 'Debts';
  if (pathname === '/budgets') return 'Budgets';


  const defaultTitle = items.find(item => item.href === '/dashboard')?.title || 'ExpenseFlow';
  return pathname === '/dashboard' ? defaultTitle : 'ExpenseFlow';
};


export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { authUser, loading } = useAuth(); // Use authUser
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  const [pageTitle, setPageTitle] = React.useState('ExpenseFlow');

  useEffect(() => {
    if (!loading && !authUser) { // Check authUser
      router.replace('/login');
    }
  }, [authUser, loading, router]); // Depend on authUser

  useEffect(() => {
    setPageTitle(getPageTitle(pathname, navItems));
  }, [pathname]);


  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!authUser) { // Check authUser
    return null;
  }

  return (
    <SidebarProvider open={sidebarOpen} onOpenChange={setSidebarOpen}>
      <Sidebar side="left" variant="sidebar" collapsible="icon">
        <SidebarHeader className="p-4 border-b border-sidebar-border">
          <AppLogo />
        </SidebarHeader>
        <SidebarContent className="p-2">
          <SidebarItems items={navItems} />
        </SidebarContent>
        <SidebarFooter className="p-4 mt-auto border-t border-sidebar-border">
          {/* Footer content if any, e.g. version number */}
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background/80 backdrop-blur-sm px-4 md:px-6">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="md:hidden" />
              <h1 className="text-lg font-semibold font-headline text-foreground md:text-xl">
                 {pageTitle}
              </h1>
            </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <UserNav />
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
