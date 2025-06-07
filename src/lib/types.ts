
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
  createdAt: string;
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

export type RecurrenceType = "none" | "daily" | "weekly" | "monthly" | "yearly";

export interface Reminder {
  id?: string;
  userId: string;
  title: string;
  notes?: string;
  dueDate: string; // This is already a string, used for yyyy-MM-dd
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
  timestamp: string; // Changed from Timestamp
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
  category: string; // "Overall" or a specific expense category
  amount: number;
  period: "monthly"; // Initially just monthly
  startDate: string; // YYYY-MM-DD ISO string from Date
  endDate: string; // YYYY-MM-DD ISO string from Date
  createdAt: string; // ISO string from Timestamp
  updatedAt?: string; // ISO string from Timestamp
}

export interface BudgetFormData {
  name: string;
  category: string;
  amount: string; // Input as string, converted to number
  period: "monthly";
  // startDate and endDate will be calculated on save for now
}
