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
                        <Link href={subItem.href} legacyBehavior passHref>
                          <SidebarMenuSubButton
                            asChild
                            isActive={isSubActive}
                            onClick={onLinkClick}
                            className={cn(isSubActive && "bg-sidebar-accent text-sidebar-accent-foreground")}
                          >
                            <a> {/* Link content is now inside <a> tag for proper styling and behavior */}
                              {subItem.icon && <subItem.icon className="mr-2 h-4 w-4" />}
                              {subItem.title}
                            </a>
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
            <Link href={item.href} legacyBehavior passHref>
              <SidebarMenuButton
                asChild
                isActive={isActive}
                onClick={onLinkClick}
                className={cn(isActive && "bg-sidebar-accent text-sidebar-accent-foreground")}
                disabled={item.disabled}
              >
                <a> {/* Link content is now inside <a> tag */}
                  <item.icon className="h-5 w-5" />
                  <span className="font-medium">{item.title}</span>
                  {item.label && (
                    <span className="ml-auto text-xs text-muted-foreground">{item.label}</span>
                  )}
                </a>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}
