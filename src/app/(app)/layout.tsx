
"use client";

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation'; // Added usePathname
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
      { title: 'Scan Receipt (OCR)', href: '/expenses/scan', icon: ScanLine }, // Enabled
    ] 
  },
  { title: 'Split Expenses', href: '/split', icon: Split, disabled: true },
  { title: 'Groups', href: '/groups', icon: Users, disabled: true },
  { title: 'Friends', href: '/friends', icon: UserPlus, disabled: true },
  { title: 'Reports', href: '/reports', icon: BarChart3, disabled: true },
  { title: 'Reminders', href: '/reminders', icon: BellRing, disabled: true },
  { title: 'Settings', href: '/settings', icon: Settings, separator: true },
];

// Helper function to get page title from navItems
const getPageTitle = (pathname: string, items: NavItem[]): string => {
  for (const item of items) {
    if (item.href === pathname) return item.title;
    if (item.submenu) {
      for (const subItem of item.submenu) {
        if (subItem.href === pathname) return subItem.title;
      }
    }
  }
  // Fallback for dynamic routes or non-nav pages
  if (pathname.startsWith('/expenses/edit/')) return 'Edit Expense'; 
  if (pathname.startsWith('/expenses/view/')) return 'View Expense';
  return 'ExpenseFlow'; // Default title
};


export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname(); // Get current path
  const [sidebarOpen, setSidebarOpen] = React.useState(true); // Default to open on desktop
  const [pageTitle, setPageTitle] = React.useState('ExpenseFlow');

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

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

  if (!user) {
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
