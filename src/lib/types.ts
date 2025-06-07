import type { LucideIcon } from 'lucide-react';
import type { Timestamp } from 'firebase/firestore';

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  label?: string;
  disabled?: boolean;
  external?: boolean;
  separator?: boolean;
  submenu?: NavItem[];
};

export interface Expense {
  id?: string; // Firestore document ID
  description: string;
  amount: number;
  category: string;
  date: string; // Stored as YYYY-MM-DD string from form, converted to Firestore Timestamp on save
  notes?: string;
  receiptUrl?: string; // URL to stored receipt image (for future use)
  createdAt: Timestamp; // Firestore Timestamp
  userId: string;
}

export type ExpenseFormData = {
  description: string;
  amount: string; // Input as string, converted to number
  category: string;
  date: string; // YYYY-MM-DD
  notes?: string;
};
