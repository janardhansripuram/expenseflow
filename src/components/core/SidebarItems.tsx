
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { NavItem } from '@/lib/types';
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { ChevronDown } from 'lucide-react';
import React from 'react';

interface SidebarItemsProps {
  items: NavItem[];
  onLinkClick?: () => void;
}

export function SidebarItems({ items, onLinkClick }: SidebarItemsProps) {
  const pathname = usePathname();
  const [openSubmenus, setOpenSubmenus] = React.useState<Record<string, boolean>>({});
  const { state, isMobile } = useSidebar();

  const toggleSubmenu = (title: string) => {
    setOpenSubmenus(prev => ({ ...prev, [title]: !prev[title] }));
  };

  return (
    <SidebarMenu>
      {items.map((item) => {
        const isActive = item.href === '/' ? pathname === item.href : pathname.startsWith(item.href);
        const isSubmenuOpen = openSubmenus[item.title] || false;

        if (item.separator) {
          return <hr key={item.title} className="my-2 border-sidebar-border" />;
        }
        
        if (item.submenu && item.submenu.length > 0) {
          return (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                onClick={() => toggleSubmenu(item.title)}
                className={cn(
                  "justify-between",
                  isActive && "bg-sidebar-accent text-sidebar-accent-foreground"
                )}
                aria-expanded={isSubmenuOpen}
                tooltip={state === "collapsed" && !isMobile ? item.title : undefined}
              >
                <div className="flex items-center gap-2">
                  <item.icon className="h-5 w-5" />
                  <span className="font-medium">{item.title}</span>
                </div>
                <ChevronDown className={cn("h-4 w-4 transition-transform", isSubmenuOpen && "rotate-180")} />
              </SidebarMenuButton>
              {isSubmenuOpen && (
                <SidebarMenuSub>
                  {item.submenu.map((subItem) => {
                    const isSubActive = pathname.startsWith(subItem.href);
                    return (
                      <SidebarMenuSubItem key={subItem.title}>
                        <Link href={subItem.href}>
                          <SidebarMenuSubButton
                            isActive={isSubActive}
                            onClick={onLinkClick}
                            className={cn(isSubActive && "bg-sidebar-accent text-sidebar-accent-foreground")}
                          >
                            {subItem.icon && <subItem.icon className="mr-2 h-4 w-4" />}
                            {subItem.title}
                          </SidebarMenuSubButton>
                        </Link>
                      </SidebarMenuSubItem>
                    );
                  })}
                </SidebarMenuSub>
              )}
            </SidebarMenuItem>
          );
        }

        return (
          <SidebarMenuItem key={item.title}>
            <Link href={item.href}>
              <SidebarMenuButton
                isActive={isActive}
                onClick={onLinkClick}
                className={cn(isActive && "bg-sidebar-accent text-sidebar-accent-foreground")}
                disabled={item.disabled}
                tooltip={state === "collapsed" && !isMobile ? item.title : undefined}
              >
                <item.icon className="h-5 w-5" />
                <span className="font-medium">{item.title}</span>
                {item.label && (
                  <span className="ml-auto text-xs text-muted-foreground">{item.label}</span>
                )}
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}
