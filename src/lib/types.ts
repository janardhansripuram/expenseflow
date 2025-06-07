
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

export const SUPPORTED_CURRENCIES = [
  { code: "USD", name: "US Dollar", symbol: "$" },
  { code: "EUR", name: "Euro", symbol: "€" },
  { code: "GBP", name: "British Pound", symbol: "£" },
  { code: "JPY", name: "Japanese Yen", symbol: "¥" },
  { code: "CAD", name: "Canadian Dollar", symbol: "CA$" },
  { code: "AUD", name: "Australian Dollar", symbol: "A$" },
  { code: "INR", name: "Indian Rupee", symbol: "₹" },
] as const;

export type CurrencyCode = typeof SUPPORTED_CURRENCIES[number]['code'];

export type RecurrenceType = "none" | "daily" | "weekly" | "monthly" | "yearly";

export interface Expense {
  id?: string; // Firestore document ID
  description: string;
  amount: number;
  currency: CurrencyCode; // Added currency field
  category: string;
  date: string; // Stored as YYYY-MM-DD string from form, converted to Firestore Timestamp on save
  notes?: string;
  receiptUrl?: string;
  createdAt: string;
  userId: string;
  groupId?: string; // ID of the group this expense belongs to
  groupName?: string; // Denormalized name of the group
  isRecurring?: boolean;
  recurrence?: RecurrenceType;
  recurrenceEndDate?: string; // ISO string YYYY-MM-DD
  tags?: string[];
}

export type ExpenseFormData = {
  description: string;
  amount: string; // Input as string, converted to number
  currency: CurrencyCode; // Added currency field
  category: string;
  date: string; // YYYY-MM-DD
  notes?: string;
  groupId?: string; // Optional group ID
  groupName?: string; // Optional: passed to firestore, derived from selected group
  receiptUrl?: string;
  receiptFile?: File | null;
  isRecurring?: boolean;
  recurrence?: RecurrenceType;
  recurrenceEndDate?: string; // YYYY-MM-DD
  tags?: string; // Input as comma-separated string, converted to array
};

export interface Income {
  id?: string;
  userId: string;
  source: string;
  amount: number;
  date: string; // YYYY-MM-DD
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export type IncomeFormData = {
  source: string;
  amount: string; // Input as string, converted to number
  date: string; // YYYY-MM-DD
  notes?: string;
};


export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  createdAt: string;
}

export interface FriendRequest {
  id: string;
  fromUserId: string;
  fromUserEmail: string;
  fromUserDisplayName?: string;
  toUserId: string;
  toUserEmail: string;
  status: 'pending';
  createdAt: string;
}

export interface Friend {
  uid: string;
  email: string;
  displayName?: string;
  addedAt: string;
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
  createdAt: string;
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
  createdAt: string;
  updatedAt?: string;
  notes?: string;
}

export interface Reminder {
  id?: string;
  userId: string;
  title: string;
  notes?: string;
  dueDate: string;
  recurrence: RecurrenceType;
  isCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ReminderFormData = {
  title: string;
  notes?: string;
  dueDate: string; // yyyy-MM-dd
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

export enum ActivityActionType {
  GROUP_CREATED = "GROUP_CREATED",
  GROUP_NAME_UPDATED = "GROUP_NAME_UPDATED",
  MEMBER_ADDED = "MEMBER_ADDED",
  MEMBER_REMOVED = "MEMBER_REMOVED",
  MEMBER_LEFT = "MEMBER_LEFT",
  GROUP_DELETED = "GROUP_DELETED",
  EXPENSE_ADDED_TO_GROUP = "EXPENSE_ADDED_TO_GROUP",
  EXPENSE_SPLIT_IN_GROUP = "EXPENSE_SPLIT_IN_GROUP",
  SETTLEMENT_UPDATED_IN_GROUP = "SETTLEMENT_UPDATED_IN_GROUP",
}

export interface GroupActivityLogEntry {
  id?: string;
  actorId: string;
  actorDisplayName: string;
  actionType: ActivityActionType;
  details: string;
  timestamp: string;
  relatedMemberId?: string;
  relatedMemberName?: string;
  relatedExpenseId?: string;
  relatedExpenseName?: string;
  previousValue?: string;
  newValue?: string;
}

export interface Budget {
  id?: string;
  userId: string;
  name: string;
  category: string;
  amount: number;
  period: "monthly";
  startDate: string;
  endDate: string;
  createdAt: string;
  updatedAt?: string;
}

export type BudgetFormData = {
  name: string;
  category: string;
  amount: string;
  period: "monthly";
}

