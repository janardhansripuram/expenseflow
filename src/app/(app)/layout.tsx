"use client";

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
import { Button } from '@/components/ui/button';

const navItems: NavItem[] = [
  { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { title: 'Expenses', href: '/expenses', icon: CircleDollarSign, submenu: [
      { title: 'View Expenses', href: '/expenses', icon: CircleDollarSign },
      { title: 'Add Expense', href: '/expenses/add', icon: PlusCircle },
      { title: 'Scan Receipt (OCR)', href: '/expenses/scan', icon: ScanLine, disabled: true },
    ] 
  },
  { title: 'Split Expenses', href: '/split', icon: Split, disabled: true },
  { title: 'Groups', href: '/groups', icon: Users, disabled: true },
  { title: 'Friends', href: '/friends', icon: UserPlus, disabled: true },
  { title: 'Reports', href: '/reports', icon: BarChart3, disabled: true },
  { title: 'Reminders', href: '/reminders', icon: BellRing, disabled: true },
  { title: 'Settings', href: '/settings', icon: Settings, separator: true },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = React.useState(true); // Default to open on desktop

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null; // Or a redirect component, though useEffect handles it
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
              <SidebarTrigger className="md:hidden" /> {/* Hidden on md and up */}
              <h1 className="text-lg font-semibold font-headline text-foreground md:text-xl">
                 {/* Dynamically set page title here based on route */}
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
