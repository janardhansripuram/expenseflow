
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

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string; // Can be added later or during profile setup
  createdAt: Timestamp;
}

export interface FriendRequest {
  id: string; // Firestore document ID
  fromUserId: string;
  fromUserEmail: string; // Denormalized for display in recipient's UI
  fromUserDisplayName?: string; // Denormalized
  toUserId: string;
  toUserEmail: string; // For querying/security rules
  status: 'pending'; // We will delete on accept/reject, so 'pending' is the main status
  createdAt: Timestamp;
}

export interface Friend {
  uid: string; // Friend's User ID (also the document ID in the subcollection)
  email: string; // Denormalized
  displayName?: string; // Denormalized
  addedAt: Timestamp;
}
