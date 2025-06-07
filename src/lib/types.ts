
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
  receiptUrl?: string;
  receiptFile?: File | null;
};

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  createdAt: Timestamp;
}

export interface FriendRequest {
  id: string;
  fromUserId: string;
  fromUserEmail: string;
  fromUserDisplayName?: string;
  toUserId: string;
  toUserEmail: string;
  status: 'pending';
  createdAt: Timestamp;
}

export interface Friend {
  uid: string;
  email: string;
  displayName?: string;
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
  createdBy: string;
  createdAt: Timestamp;
  memberIds: string[];
  memberDetails: GroupMemberDetail[];
}

export type SplitMethod = "equally" | "byAmount" | "byPercentage";

export interface SplitParticipant {
  userId: string;
  displayName?: string;
  email?: string;
  amountOwed: number;
  percentage?: number;
  isSettled: boolean;
}

export interface SplitExpense {
  id?: string;
  originalExpenseId: string;
  originalExpenseDescription: string;
  splitMethod: SplitMethod;
  totalAmount: number;
  paidBy: string;
  participants: SplitParticipant[];
  involvedUserIds: string[];
  groupId?: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  notes?: string;
}

export type RecurrenceType = "none" | "daily" | "weekly" | "monthly" | "yearly";

export interface Reminder {
  id?: string;
  userId: string;
  title: string;
  notes?: string;
  dueDate: string;
  recurrence: RecurrenceType;
  isCompleted: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type ReminderFormData = {
  title: string;
  notes?: string;
  dueDate: string;
  recurrence: RecurrenceType;
};

export interface GroupMemberBalance {
  uid: string;
  displayName: string;
  email: string;
  paidForGroup: number;
  owesToOthersInGroup: number;
  netBalance: number;
}
