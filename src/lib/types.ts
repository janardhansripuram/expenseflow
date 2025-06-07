
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
  receiptUrl?: string;
  createdAt: Timestamp; // Firestore Timestamp
  userId: string;
  groupId?: string; // ID of the group this expense belongs to
  groupName?: string; // Denormalized name of the group
}

export type ExpenseFormData = {
  description: string;
  amount: string; // Input as string, converted to number
  category: string;
  date: string; // YYYY-MM-DD
  notes?: string;
  groupId?: string; // Optional group ID
  groupName?: string; // Optional: passed to firestore, derived from selected group
  receiptUrl?: string; // Added for managing uploads
  receiptFile?: File | null; // For handling file input
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

export interface GroupMemberDetail {
  uid: string;
  email: string;
  displayName?: string;
}

export interface Group {
  id: string;
  name: string;
  createdBy: string; // UID of the creator
  createdAt: Timestamp;
  memberIds: string[]; // Array of UIDs of members
  memberDetails: GroupMemberDetail[]; // Denormalized for display
}

// Types for Expense Splitting
export type SplitMethod = "equally" | "byAmount" | "byPercentage";

export interface SplitParticipant {
  userId: string;
  displayName?: string;
  email?: string;
  amountOwed: number; // For 'equally' and 'byAmount', this is the final amount. For 'byPercentage', this is calculated.
  percentage?: number; // Only for 'byPercentage'. Value from 0 to 100.
  isSettled: boolean;
}

export interface SplitExpense {
  id?: string; // Firestore document ID
  originalExpenseId: string;
  originalExpenseDescription: string; // Denormalized for easy display
  splitMethod: SplitMethod;
  totalAmount: number;
  paidBy: string; // UID of the user who paid the original expense
  participants: SplitParticipant[];
  involvedUserIds: string[]; // Array of UIDs for querying (payer + participants)
  groupId?: string; // Optional, if split originated from a group expense
  createdAt: Timestamp;
  notes?: string;
}

// Types for Reminders
export type RecurrenceType = "none" | "daily" | "weekly" | "monthly" | "yearly";

export interface Reminder {
  id?: string;
  userId: string;
  title: string;
  notes?: string;
  dueDate: string; // Stored as YYYY-MM-DD string, converted to Timestamp on save
  recurrence: RecurrenceType;
  isCompleted: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type ReminderFormData = {
  title: string;
  notes?: string;
  dueDate: string; // YYYY-MM-DD
  recurrence: RecurrenceType;
};

// Type for Group Balances display
export interface GroupMemberBalance {
  uid: string;
  displayName: string;
  email: string;
  paidForGroup: number;
  owesToOthersInGroup: number;
  netBalance: number;
}
