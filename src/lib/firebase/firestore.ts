'use server';
import { db } from './config';
import { collection, addDoc, query, where, getDocs, Timestamp, orderBy, limit, doc, getDoc, updateDoc, deleteDoc, writeBatch, runTransaction, arrayUnion, arrayRemove, setDoc } from 'firebase/firestore';
import type { Expense, ExpenseFormData, UserProfile, FriendRequest, Friend, Group, GroupMemberDetail, SplitExpense, SplitParticipant, SplitMethod, Reminder, ReminderFormData, RecurrenceType, ActivityActionType, GroupActivityLogEntry, Budget, BudgetFormData, Income, IncomeFormData, CurrencyCode } from '@/lib/types';
import { SUPPORTED_CURRENCIES } from '@/lib/types';
import { startOfMonth, endOfMonth, formatISO, parseISO } from 'date-fns';

const EXPENSES_COLLECTION = 'expenses';
const INCOME_COLLECTION = 'income'; // New collection for income
const USERS_COLLECTION = 'users';
const FRIEND_REQUESTS_COLLECTION = 'friendRequests';
const FRIENDS_SUBCOLLECTION = 'friends';
const GROUPS_COLLECTION = 'groups';
const SPLIT_EXPENSES_COLLECTION = 'splitExpenses';
const REMINDERS_COLLECTION = 'reminders';
const ACTIVITY_LOG_SUBCOLLECTION = 'activityLog';
const BUDGETS_COLLECTION = 'budgets';


// Activity Log Functions (Helper, not directly exported usually)
async function logGroupActivity(
  groupId: string,
  activityData: Omit<GroupActivityLogEntry, 'id' | 'timestamp'> & { timestamp?: Timestamp } // Allow optional timestamp for direct creation
): Promise<void> {
  try {
    const logRef = collection(db, GROUPS_COLLECTION, groupId, ACTIVITY_LOG_SUBCOLLECTION);
    await addDoc(logRef, {
      ...activityData,
      timestamp: activityData.timestamp || Timestamp.now(),
    });
  } catch (error) {
    console.error(`Error logging activity for group ${groupId}:`, error);
    // Optionally, decide if this error should propagate or be handled silently
  }
}

export async function getGroupActivityLog(groupId: string, limitCount: number = 20): Promise<GroupActivityLogEntry[]> {
  try {
    const logRef = collection(db, GROUPS_COLLECTION, groupId, ACTIVITY_LOG_SUBCOLLECTION);
    const q = query(logRef, orderBy('timestamp', 'desc'), limit(limitCount));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(docSnap => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        timestamp: (data.timestamp as Timestamp).toDate().toISOString(),
      } as GroupActivityLogEntry;
    });
  } catch (error) {
    console.error(`Error fetching activity log for group ${groupId}:`, error);
    throw error;
  }
}


// Expense Functions
export async function addExpense(userId: string, expenseData: ExpenseFormData, actorProfile?: UserProfile): Promise<string> {
  try {
    if (!userId) throw new Error("User ID is required to add an expense.");
    const tagsArray = expenseData.tags ? expenseData.tags.split(',').map(tag => tag.trim()).filter(tag => tag !== '') : [];

    const expenseDoc: any = {
      userId,
      description: expenseData.description,
      amount: parseFloat(expenseData.amount),
      currency: expenseData.currency, // Currency is required in ExpenseFormData
      category: expenseData.category,
      date: Timestamp.fromDate(parseISO(expenseData.date)),
      notes: expenseData.notes || '',
      receiptUrl: expenseData.receiptUrl || null,
      createdAt: Timestamp.now(),
      isRecurring: expenseData.isRecurring || false,
      recurrence: expenseData.recurrence || 'none',
      recurrenceEndDate: expenseData.recurrenceEndDate ? Timestamp.fromDate(parseISO(expenseData.recurrenceEndDate)) : null,
      tags: tagsArray,
    };

    if (expenseData.groupId && expenseData.groupName) {
      expenseDoc.groupId = expenseData.groupId;
      expenseDoc.groupName = expenseData.groupName;
    } else {
      expenseDoc.groupId = null;
      expenseDoc.groupName = null;
    }

    console.log("[firestore.addExpense] Saving expenseDoc:", JSON.stringify(expenseDoc, null, 2));
    const docRef = await addDoc(collection(db, EXPENSES_COLLECTION), expenseDoc);
    console.log("[firestore.addExpense] Document written with ID: ", docRef.id);


    if (expenseData.groupId && actorProfile) {
      await logGroupActivity(expenseData.groupId, {
        actorId: actorProfile.uid,
        actorDisplayName: actorProfile.displayName || actorProfile.email,
        actionType: ActivityActionType.EXPENSE_ADDED_TO_GROUP,
        details: `added expense "${expenseData.description}" (${new Intl.NumberFormat('en-US', { style: 'currency', currency: expenseData.currency || 'USD' }).format(parseFloat(expenseData.amount))}) to the group`,
        relatedExpenseId: docRef.id,
        relatedExpenseName: expenseData.description,
      });
    }
    return docRef.id;
  } catch (error) {
    console.error("[firestore.addExpense] Error adding document: ", error);
    throw error;
  }
}

function mapExpenseDocumentToExpenseObject(docSnap: any): Expense | null {
  const docId = docSnap.id;
  try {
    const data = docSnap.data();
    if (!data) {
      console.error(`[firestore.mapExpense] Document ${docId} has no data.`);
      return null;
    }

    if (!data.date || typeof data.date.toDate !== 'function') {
      console.error(`[firestore.mapExpense] Document ${docId} has invalid or missing 'date' field:`, data.date);
      return null;
    }
    if (!data.createdAt || typeof data.createdAt.toDate !== 'function') {
      console.error(`[firestore.mapExpense] Document ${docId} has invalid or missing 'createdAt' field:`, data.createdAt);
      return null;
    }

    return {
      id: docId,
      description: data.description || 'No description',
      amount: typeof data.amount === 'number' ? data.amount : 0,
      currency: data.currency || 'USD',
      category: data.category || 'Other',
      date: (data.date as Timestamp).toDate().toISOString().split('T')[0],
      notes: data.notes || '',
      receiptUrl: data.receiptUrl || undefined,
      groupId: data.groupId || undefined,
      groupName: data.groupName || undefined,
      createdAt: (data.createdAt as Timestamp).toDate().toISOString(),
      userId: data.userId || 'Unknown User',
      isRecurring: data.isRecurring || false,
      recurrence: data.recurrence || 'none',
      recurrenceEndDate: data.recurrenceEndDate && typeof data.recurrenceEndDate.toDate === 'function'
                         ? (data.recurrenceEndDate as Timestamp).toDate().toISOString().split('T')[0]
                         : undefined,
      tags: Array.isArray(data.tags) ? data.tags : [],
    };
  } catch (error) {
    console.error(`[firestore.mapExpense] Error mapping expense document ${docId}:`, error, docSnap.data());
    return null;
  }
}

export async function getExpensesByUser(userId: string): Promise<Expense[]> {
  try {
    console.log("[firestore.getExpensesByUser] Fetching expenses for userId:", userId);
    if (!userId) {
      console.log("[firestore.getExpensesByUser] No userId provided, returning empty array.");
      return [];
    }
    const q = query(
      collection(db, EXPENSES_COLLECTION),
      where('userId', '==', userId),
      orderBy('date', 'desc')
    );
    const querySnapshot = await getDocs(q);
    console.log(`[firestore.getExpensesByUser] Found ${querySnapshot.docs.length} documents for userId ${userId}.`);
    if (querySnapshot.docs.length > 0) {
        console.log("[firestore.getExpensesByUser] Raw data of first document:", JSON.stringify(querySnapshot.docs[0].data(), null, 2));
    }

    const expenses = querySnapshot.docs
      .map(mapExpenseDocumentToExpenseObject)
      .filter(expense => expense !== null) as Expense[];
    return expenses;
  } catch (error) {
    console.error("[firestore.getExpensesByUser] Error getting documents: ", error);
    throw error;
  }
}

export async function getRecentExpensesByUser(userId: string, count: number = 5): Promise<Expense[]> {
 try {
    if (!userId) return [];
    const q = query(
      collection(db, EXPENSES_COLLECTION),
      where('userId', '==', userId),
      orderBy('date', 'desc'),
      limit(count)
    );
    const querySnapshot = await getDocs(q);
    const expenses = querySnapshot.docs
      .map(mapExpenseDocumentToExpenseObject)
      .filter(expense => expense !== null) as Expense[];
    return expenses;
  } catch (error) {
    console.error("[firestore.getRecentExpensesByUser] Error getting recent documents: ", error);
    throw error;
  }
}

export async function getExpenseById(expenseId: string): Promise<Expense | null> {
  try {
    const docRef = doc(db, EXPENSES_COLLECTION, expenseId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return mapExpenseDocumentToExpenseObject(docSnap);
    } else {
      console.log("[firestore.getExpenseById] No such document!");
      return null;
    }
  } catch (error) {
    console.error("[firestore.getExpenseById] Error getting document by ID: ", error);
    throw error;
  }
}

export async function updateExpense(expenseId: string, expenseData: Partial<ExpenseFormData>): Promise<void> {
  try {
    const docRef = doc(db, EXPENSES_COLLECTION, expenseId);
    const updateData: { [key: string]: any } = {updatedAt: Timestamp.now()};

    if (expenseData.description !== undefined) updateData.description = expenseData.description;
    if (expenseData.amount !== undefined) updateData.amount = parseFloat(expenseData.amount);
    if (expenseData.currency !== undefined) updateData.currency = expenseData.currency;
    if (expenseData.category !== undefined) updateData.category = expenseData.category;
    if (expenseData.date !== undefined) updateData.date = Timestamp.fromDate(parseISO(expenseData.date));
    if (expenseData.notes !== undefined) updateData.notes = expenseData.notes;

    if (expenseData.receiptUrl === null) {
        updateData.receiptUrl = null;
    } else if (expenseData.receiptUrl !== undefined) {
        updateData.receiptUrl = expenseData.receiptUrl;
    }

    if (expenseData.groupId) {
      updateData.groupId = expenseData.groupId;
      updateData.groupName = expenseData.groupName;
    } else if (expenseData.groupId === '' || expenseData.groupId === null) {
      updateData.groupId = null;
      updateData.groupName = null;
    }

    if (expenseData.isRecurring !== undefined) updateData.isRecurring = expenseData.isRecurring;
    if (expenseData.recurrence !== undefined) updateData.recurrence = expenseData.recurrence;
    if (expenseData.recurrenceEndDate !== undefined) {
      updateData.recurrenceEndDate = expenseData.recurrenceEndDate ? Timestamp.fromDate(parseISO(expenseData.recurrenceEndDate)) : null;
    }
    if (expenseData.tags !== undefined) {
      updateData.tags = expenseData.tags ? expenseData.tags.split(',').map(tag => tag.trim()).filter(tag => tag !== '') : [];
    }

    if (Object.keys(updateData).length > 1) {
        await updateDoc(docRef, updateData);
    }
  } catch (error) {
    console.error("[firestore.updateExpense] Error updating document: ", error);
    throw error;
  }
}


export async function deleteExpense(expenseId: string): Promise<void> {
  try {
    const docRef = doc(db, EXPENSES_COLLECTION, expenseId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error("[firestore.deleteExpense] Error deleting document: ", error);
    throw error;
  }
}

export async function getExpensesByGroupId(groupId: string): Promise<Expense[]> {
  try {
    if (!groupId) return [];
    const q = query(
      collection(db, EXPENSES_COLLECTION),
      where('groupId', '==', groupId),
      orderBy('date', 'desc')
    );
    const querySnapshot = await getDocs(q);
    const expenses = querySnapshot.docs
      .map(mapExpenseDocumentToExpenseObject)
      .filter(expense => expense !== null) as Expense[];
    return expenses;
  } catch (error) {
    console.error("[firestore.getExpensesByGroupId] Error getting expenses by group ID: ", error);
    throw error;
  }
}

// Income Functions
export async function addIncome(userId: string, incomeData: IncomeFormData): Promise<string> {
  try {
    if (!userId) throw new Error("User ID is required to add income.");
    const incomeDoc = {
      userId,
      source: incomeData.source,
      amount: parseFloat(incomeData.amount),
      currency: incomeData.currency || 'USD',
      date: Timestamp.fromDate(parseISO(incomeData.date)),
      notes: incomeData.notes || '',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };
    const docRef = await addDoc(collection(db, INCOME_COLLECTION), incomeDoc);
    return docRef.id;
  } catch (error) {
    console.error("[firestore.addIncome] Error adding income: ", error);
    throw error;
  }
}

function mapIncomeDocumentToIncomeObject(docSnap: any): Income | null {
  const docId = docSnap.id;
  try {
    const data = docSnap.data();
    if (!data) {
      console.error(`[firestore.mapIncome] Income document ${docId} has no data.`);
      return null;
    }

    if (!data.date || typeof data.date.toDate !== 'function') {
      console.error(`[firestore.mapIncome] Income document ${docId} has invalid or missing 'date' field:`, data.date);
      return null;
    }
    if (!data.createdAt || typeof data.createdAt.toDate !== 'function') {
      console.error(`[firestore.mapIncome] Income document ${docId} has invalid or missing 'createdAt' field:`, data.createdAt);
      return null;
    }
     if (data.updatedAt && typeof data.updatedAt.toDate !== 'function') {
      console.warn(`[firestore.mapIncome] Income document ${docId} has invalid 'updatedAt' field:`, data.updatedAt);
      // Continue mapping, but updatedAt will be undefined
    }

    return {
      id: docId,
      userId: data.userId || 'Unknown User',
      source: data.source || 'Unknown Source',
      amount: typeof data.amount === 'number' ? data.amount : 0,
      currency: data.currency || 'USD',
      date: (data.date as Timestamp).toDate().toISOString().split('T')[0],
      notes: data.notes || '',
      createdAt: (data.createdAt as Timestamp).toDate().toISOString(),
      updatedAt: data.updatedAt && typeof data.updatedAt.toDate === 'function'
                 ? (data.updatedAt as Timestamp).toDate().toISOString()
                 : (data.createdAt as Timestamp).toDate().toISOString(),
    };
  } catch (error) {
     console.error(`[firestore.mapIncome] Error mapping income document ${docId}:`, error, docSnap.data());
    return null;
  }
}

export async function getIncomeByUser(userId: string): Promise<Income[]> {
  try {
    if (!userId) return [];
    const q = query(
      collection(db, INCOME_COLLECTION),
      where('userId', '==', userId),
      orderBy('date', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs
      .map(mapIncomeDocumentToIncomeObject)
      .filter(income => income !== null) as Income[];
  } catch (error) {
    console.error("[firestore.getIncomeByUser] Error getting income: ", error);
    throw error;
  }
}

export async function getIncomeById(incomeId: string): Promise<Income | null> {
  try {
    const docRef = doc(db, INCOME_COLLECTION, incomeId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return mapIncomeDocumentToIncomeObject(docSnap);
    }
    return null;
  } catch (error) {
    console.error("[firestore.getIncomeById] Error getting income by ID: ", error);
    throw error;
  }
}

export async function updateIncome(incomeId: string, incomeData: Partial<IncomeFormData>): Promise<void> {
  try {
    const docRef = doc(db, INCOME_COLLECTION, incomeId);
    const updateData: { [key: string]: any } = { updatedAt: Timestamp.now() };

    if (incomeData.source !== undefined) updateData.source = incomeData.source;
    if (incomeData.amount !== undefined) updateData.amount = parseFloat(incomeData.amount);
    if (incomeData.currency !== undefined) updateData.currency = incomeData.currency;
    if (incomeData.date !== undefined) updateData.date = Timestamp.fromDate(parseISO(incomeData.date));
    if (incomeData.notes !== undefined) updateData.notes = incomeData.notes;

    if (Object.keys(updateData).length > 1) {
      await updateDoc(docRef, updateData);
    }
  } catch (error) {
    console.error("[firestore.updateIncome] Error updating income: ", error);
    throw error;
  }
}

export async function deleteIncome(incomeId: string): Promise<void> {
  try {
    const docRef = doc(db, INCOME_COLLECTION, incomeId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error("[firestore.deleteIncome] Error deleting income: ", error);
    throw error;
  }
}


// User Profile Functions
export async function createUserProfile(userId: string, email: string, displayName?: string): Promise<void> {
  try {
    const userRef = doc(db, USERS_COLLECTION, userId);
    await setDoc(userRef, {
      uid: userId,
      email: email.toLowerCase(),
      displayName: displayName || email.split('@')[0] || 'User',
      defaultCurrency: 'USD' as CurrencyCode,
      createdAt: Timestamp.now(),
    });
  } catch (error) {
    console.error("[firestore.createUserProfile] Error creating user profile: ", error);
    throw error;
  }
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const userRef = doc(db, USERS_COLLECTION, userId);
    const docSnap = await getDoc(userRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        uid: data.uid,
        email: data.email,
        displayName: data.displayName,
        defaultCurrency: data.defaultCurrency || ('USD' as CurrencyCode),
        createdAt: (data.createdAt as Timestamp).toDate().toISOString(),
      } as UserProfile;
    }
    return null;
  } catch (error) {
    console.error("[firestore.getUserProfile] Error getting user profile: ", error);
    throw error;
  }
}

export async function getUserByEmail(email: string): Promise<UserProfile | null> {
  try {
    const q = query(collection(db, USERS_COLLECTION), where('email', '==', email.toLowerCase()));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const data = querySnapshot.docs[0].data();
      return {
        uid: data.uid,
        email: data.email,
        displayName: data.displayName,
        defaultCurrency: data.defaultCurrency || ('USD' as CurrencyCode),
        createdAt: (data.createdAt as Timestamp).toDate().toISOString(),
      } as UserProfile;
    }
    return null;
  } catch (error) {
    console.error("[firestore.getUserByEmail] Error getting user by email: ", error);
    throw error;
  }
}

export async function updateUserProfile(userId: string, data: Partial<Pick<UserProfile, 'displayName' | 'defaultCurrency'>>): Promise<void> {
  try {
    const userRef = doc(db, USERS_COLLECTION, userId);
    const updateData: { [key: string]: any } = { updatedAt: Timestamp.now() };

    const allowedUpdates: Partial<UserProfile> = {};
    if (data.displayName !== undefined) allowedUpdates.displayName = data.displayName;
    if (data.defaultCurrency !== undefined) allowedUpdates.defaultCurrency = data.defaultCurrency;

    if (Object.keys(allowedUpdates).length > 0) {
        await updateDoc(userRef, { ...allowedUpdates, updatedAt: Timestamp.now() });
    }
  } catch (error) {
    console.error("[firestore.updateUserProfile] Error updating user profile: ", error);
    throw error;
  }
}

// Friend Management Functions
export async function sendFriendRequest(fromUserId: string, fromUserEmail: string, fromUserDisplayName: string | undefined, toUserEmail: string): Promise<{success: boolean, message: string}> {
  try {
    if (fromUserEmail.toLowerCase() === toUserEmail.toLowerCase()) {
      return { success: false, message: "You cannot send a friend request to yourself." };
    }

    const toUser = await getUserByEmail(toUserEmail);
    if (!toUser) {
      return { success: false, message: "User with this email does not exist." };
    }
    const toUserId = toUser.uid;

    const friendDoc = await getDoc(doc(db, USERS_COLLECTION, fromUserId, FRIENDS_SUBCOLLECTION, toUserId));
    if (friendDoc.exists()) {
      return { success: false, message: "You are already friends with this user." };
    }

    const q1 = query(collection(db, FRIEND_REQUESTS_COLLECTION),
      where('fromUserId', '==', fromUserId),
      where('toUserId', '==', toUserId),
      where('status', '==', 'pending'));
    const existingReq1 = await getDocs(q1);
    if (!existingReq1.empty) {
       return { success: false, message: "A friend request to this user is already pending." };
    }

    const q2 = query(collection(db, FRIEND_REQUESTS_COLLECTION),
      where('fromUserId', '==', toUserId),
      where('toUserId', '==', fromUserId),
      where('status', '==', 'pending'));
    const existingReq2 = await getDocs(q2);
     if (!existingReq2.empty) {
       return { success: false, message: "This user has already sent you a friend request. Check your incoming requests." };
    }

    await addDoc(collection(db, FRIEND_REQUESTS_COLLECTION), {
      fromUserId,
      fromUserEmail,
      fromUserDisplayName: fromUserDisplayName || fromUserEmail.split('@')[0],
      toUserId,
      toUserEmail: toUser.email,
      status: 'pending',
      createdAt: Timestamp.now(),
    });
    return { success: true, message: "Friend request sent successfully." };
  } catch (error) {
    console.error("[firestore.sendFriendRequest] Error sending friend request: ", error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
    return { success: false, message: `Failed to send friend request: ${errorMessage}` };
  }
}

export async function getIncomingFriendRequests(userId: string): Promise<FriendRequest[]> {
  try {
    const q = query(
      collection(db, FRIEND_REQUESTS_COLLECTION),
      where('toUserId', '==', userId),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            createdAt: (data.createdAt as Timestamp).toDate().toISOString(),
        } as FriendRequest
    });
  } catch (error) {
    console.error("[firestore.getIncomingFriendRequests] Error getting incoming friend requests: ", error);
    throw error;
  }
}

export async function acceptFriendRequest(requestId: string, fromUserProfile: UserProfile, toUserProfile: UserProfile): Promise<void> {
  const requestRef = doc(db, FRIEND_REQUESTS_COLLECTION, requestId);

  await runTransaction(db, async (transaction) => {
    const requestSnap = await transaction.get(requestRef);
    if (!requestSnap.exists()) {
      throw new Error("Friend request does not exist or has been already processed.");
    }
    const requestData = requestSnap.data() as Omit<FriendRequest, 'id' | 'createdAt'> & {createdAt: Timestamp};
    if (requestData.status !== 'pending') {
      throw new Error("Friend request is not pending.");
    }

    const now = Timestamp.now();

    const friendDataForFromUser: Omit<Friend, 'uid' | 'addedAt'> & {addedAt: Timestamp} = {
      email: toUserProfile.email,
      displayName: toUserProfile.displayName,
      addedAt: now,
    };
    const friendDataForToUser: Omit<Friend, 'uid'| 'addedAt'> & {addedAt: Timestamp} = {
      email: fromUserProfile.email,
      displayName: fromUserProfile.displayName,
      addedAt: now,
    };

    const fromUserFriendRef = doc(db, USERS_COLLECTION, fromUserProfile.uid, FRIENDS_SUBCOLLECTION, toUserProfile.uid);
    const toUserFriendRef = doc(db, USERS_COLLECTION, toUserProfile.uid, FRIENDS_SUBCOLLECTION, fromUserProfile.uid);

    transaction.set(fromUserFriendRef, friendDataForFromUser);
    transaction.set(toUserFriendRef, friendDataForToUser);
    transaction.delete(requestRef);
  });
}


export async function rejectFriendRequest(requestId: string): Promise<void> {
  try {
    const requestRef = doc(db, FRIEND_REQUESTS_COLLECTION, requestId);
    await deleteDoc(requestRef);
  } catch (error) {
    console.error("[firestore.rejectFriendRequest] Error rejecting friend request: ", error);
    throw error;
  }
}

export async function getFriends(userId: string): Promise<Friend[]> {
  try {
    if (!userId) return [];
    const friendsCollectionRef = collection(db, USERS_COLLECTION, userId, FRIENDS_SUBCOLLECTION);
    const q = query(friendsCollectionRef, orderBy('displayName', 'asc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
            ...data,
            uid: docSnap.id,
            addedAt: (data.addedAt as Timestamp).toDate().toISOString(),
        } as Friend
    });
  } catch (error) {
    console.error("[firestore.getFriends] Error getting friends: ", error);
    throw error;
  }
}

export async function removeFriend(currentUserId: string, friendUserId: string): Promise<void> {
  const batch = writeBatch(db);
  const currentUserFriendRef = doc(db, USERS_COLLECTION, currentUserId, FRIENDS_SUBCOLLECTION, friendUserId);
  const friendUserFriendRef = doc(db, USERS_COLLECTION, friendUserId, FRIENDS_SUBCOLLECTION, currentUserId);

  batch.delete(currentUserFriendRef);
  batch.delete(friendUserFriendRef);

  try {
    await batch.commit();
  } catch (error) {
    console.error("[firestore.removeFriend] Error removing friend: ", error);
    throw error;
  }
}

// Group Management Functions
export async function createGroup(
  creatorProfile: UserProfile,
  groupName: string,
  initialMemberProfiles: UserProfile[]
): Promise<string> {
  try {
    if (!groupName.trim()) throw new Error("Group name cannot be empty.");
    if (!initialMemberProfiles.some(p => p.uid === creatorProfile.uid)) {
      throw new Error("Creator must be part of the initial members.");
    }

    const memberIds = initialMemberProfiles.map(p => p.uid);
    const memberDetails: GroupMemberDetail[] = initialMemberProfiles.map(p => ({
      uid: p.uid,
      email: p.email,
      displayName: p.displayName || p.email.split('@')[0],
    }));

    const groupData = {
      name: groupName,
      createdBy: creatorProfile.uid,
      createdAt: Timestamp.now(),
      memberIds: memberIds,
      memberDetails: memberDetails,
    };

    const groupRef = await addDoc(collection(db, GROUPS_COLLECTION), groupData);

    await logGroupActivity(groupRef.id, {
      actorId: creatorProfile.uid,
      actorDisplayName: creatorProfile.displayName || creatorProfile.email,
      actionType: ActivityActionType.GROUP_CREATED,
      details: `created group "${groupName}"`,
    });
    for (const member of initialMemberProfiles) {
      if (member.uid !== creatorProfile.uid) {
         await logGroupActivity(groupRef.id, {
            actorId: creatorProfile.uid,
            actorDisplayName: creatorProfile.displayName || creatorProfile.email,
            actionType: ActivityActionType.MEMBER_ADDED,
            details: `added ${member.displayName || member.email} to the group during creation`,
            relatedMemberId: member.uid,
            relatedMemberName: member.displayName || member.email,
        });
      }
    }
    return groupRef.id;
  } catch (error) {
    console.error("[firestore.createGroup] Error creating group: ", error);
    throw error;
  }
}

export async function getGroupsForUser(userId: string): Promise<Group[]> {
  try {
    if (!userId) return [];
    const q = query(
      collection(db, GROUPS_COLLECTION),
      where('memberIds', 'array-contains', userId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
            id: docSnap.id,
            ...data,
            createdAt: (data.createdAt as Timestamp).toDate().toISOString(),
        } as Group
    });
  } catch (error) {
    console.error("[firestore.getGroupsForUser] Error getting groups for user: ", error);
    throw error;
  }
}

export async function getGroupDetails(groupId: string): Promise<Group | null> {
  try {
    const groupRef = doc(db, GROUPS_COLLECTION, groupId);
    const docSnap = await getDoc(groupRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
          id: docSnap.id,
          ...data,
          createdAt: (data.createdAt as Timestamp).toDate().toISOString(),
      } as Group;
    }
    return null;
  } catch (error) {
    console.error("[firestore.getGroupDetails] Error getting group details: ", error);
    throw error;
  }
}

export async function updateGroupDetails(
  groupId: string,
  actorProfile: UserProfile,
  data: { name?: string }
): Promise<void> {
  try {
    const groupRef = doc(db, GROUPS_COLLECTION, groupId);
    const batch = writeBatch(db);

    const groupSnap = await getDoc(groupRef);
    if (!groupSnap.exists()) throw new Error("Group not found for update.");
    const existingGroupData = groupSnap.data() as Group;

    const updateData: { [key: string]: any } = { ...data, updatedAt: Timestamp.now() };
    batch.update(groupRef, updateData);

    if (data.name && existingGroupData.name !== data.name) {
      // Update groupName in associated expenses
      const expensesQuery = query(collection(db, EXPENSES_COLLECTION), where('groupId', '==', groupId));
      const expensesSnapshot = await getDocs(expensesQuery);
      expensesSnapshot.forEach(expenseDoc => {
        batch.update(expenseDoc.ref, { groupName: data.name });
      });

      await logGroupActivity(groupId, {
        actorId: actorProfile.uid,
        actorDisplayName: actorProfile.displayName || actorProfile.email,
        actionType: ActivityActionType.GROUP_NAME_UPDATED,
        details: `changed group name from "${existingGroupData.name}" to "${data.name}"`,
        previousValue: existingGroupData.name,
        newValue: data.name,
      });
    }
    await batch.commit();
  } catch (error) {
    console.error("[firestore.updateGroupDetails] Error updating group details:", error);
    throw error;
  }
}

export async function addMembersToGroup(
  groupId: string,
  actorProfile: UserProfile,
  newMemberProfiles: UserProfile[]
): Promise<void> {
  try {
    if (newMemberProfiles.length === 0) return;
    const groupRef = doc(db, GROUPS_COLLECTION, groupId);

    await runTransaction(db, async (transaction) => {
      const groupSnap = await transaction.get(groupRef);
      if (!groupSnap.exists()) throw new Error("Group not found.");

      const groupData = groupSnap.data() as Group;
      const existingMemberIds = new Set(groupData.memberIds);

      const membersToAddDetails: GroupMemberDetail[] = [];
      const memberIdsToAdd: string[] = [];

      for (const profile of newMemberProfiles) {
        if (!existingMemberIds.has(profile.uid)) {
          memberIdsToAdd.push(profile.uid);
          membersToAddDetails.push({
            uid: profile.uid,
            email: profile.email,
            displayName: profile.displayName || profile.email.split('@')[0]
          });
          // Log activity inside the transaction for each member added
          await logGroupActivity(groupId, {
            actorId: actorProfile.uid,
            actorDisplayName: actorProfile.displayName || actorProfile.email,
            actionType: ActivityActionType.MEMBER_ADDED,
            details: `added ${profile.displayName || profile.email} to the group`,
            relatedMemberId: profile.uid,
            relatedMemberName: profile.displayName || profile.email,
          });
        }
      }

      if (memberIdsToAdd.length > 0) {
        transaction.update(groupRef, {
          memberIds: arrayUnion(...memberIdsToAdd),
          memberDetails: arrayUnion(...membersToAddDetails),
          updatedAt: Timestamp.now()
        });
      }
    });
  } catch (error) {
    console.error("[firestore.addMembersToGroup] Error adding members to group:", error);
    throw error;
  }
}

export async function removeMemberFromGroup(
  groupId: string,
  actorProfile: UserProfile,
  memberIdToRemove: string,
  memberDisplayNameToRemove: string
): Promise<void> {
   try {
    const groupRef = doc(db, GROUPS_COLLECTION, groupId);

    await runTransaction(db, async (transaction) => {
      const groupSnap = await transaction.get(groupRef);
      if (!groupSnap.exists()) throw new Error("Group not found.");

      const groupData = groupSnap.data() as Group;
      const memberDetailToRemove = groupData.memberDetails.find(m => m.uid === memberIdToRemove);

      if (!memberDetailToRemove && groupData.memberIds.includes(memberIdToRemove)) {
         console.warn(`[firestore.removeMemberFromGroup] Member detail for UID ${memberIdToRemove} not found in group ${groupId}, but ID was in memberIds. Proceeding with ID removal.`);
      }

      let isDeletingGroup = false;
      if (groupData.memberIds.length === 1 && groupData.memberIds.includes(memberIdToRemove)) {
        isDeletingGroup = true;
        transaction.delete(groupRef);
      } else {
        const updatePayload: { memberIds: any, memberDetails?: any, updatedAt: Timestamp } = {
            memberIds: arrayRemove(memberIdToRemove),
            updatedAt: Timestamp.now()
        };
        if (memberDetailToRemove) {
            updatePayload.memberDetails = arrayRemove(memberDetailToRemove);
        }
        transaction.update(groupRef, updatePayload);
      }

      // Logging logic
      let actionType = ActivityActionType.MEMBER_REMOVED;
      let details = `${actorProfile.displayName || actorProfile.email} removed ${memberDisplayNameToRemove} from the group "${groupData.name}"`;

      if (actorProfile.uid === memberIdToRemove) { // User is leaving
        actionType = ActivityActionType.MEMBER_LEFT;
        details = `${actorProfile.displayName || actorProfile.email} left the group "${groupData.name}"`;
      }

      if (isDeletingGroup) {
        actionType = ActivityActionType.GROUP_DELETED;
        details = `Group "${groupData.name}" was deleted as the last member (${actorProfile.displayName || actorProfile.email}) left.`;
      }

      await logGroupActivity(groupId, {
        actorId: actorProfile.uid,
        actorDisplayName: actorProfile.displayName || actorProfile.email,
        actionType: actionType,
        details: details,
        relatedMemberId: memberIdToRemove,
        relatedMemberName: memberDisplayNameToRemove,
      });
    });
  } catch (error) {
    console.error("[firestore.removeMemberFromGroup] Error removing member from group:", error);
    throw error;
  }
}

// Split Expense Functions
type CreateSplitExpenseData = {
  originalExpenseId: string;
  originalExpenseDescription: string;
  currency: CurrencyCode;
  splitMethod: SplitMethod;
  totalAmount: number;
  paidBy: string;
  participants: SplitParticipant[];
  groupId?: string;
  groupName?: string;
  notes?: string;
  actorProfile?: UserProfile;
};

export async function createSplitExpense(splitData: CreateSplitExpenseData): Promise<string> {
  try {
    if (!splitData.paidBy) throw new Error("Payer ID (paidBy) is required.");
    if (!splitData.originalExpenseId) throw new Error("Original expense ID is required.");
    if (!splitData.originalExpenseDescription) throw new Error("Original expense description is required.");
    if (splitData.participants.length === 0) throw new Error("At least one participant is required.");

    let validatedParticipants = [...splitData.participants];

    if (splitData.splitMethod === 'byAmount') {
      const calculatedTotalOwed = validatedParticipants.reduce((sum, p) => sum + p.amountOwed, 0);
      if (Math.abs(calculatedTotalOwed - splitData.totalAmount) > 0.01) {
        throw new Error(`Sum of amounts owed (${calculatedTotalOwed.toFixed(2)}) by participants does not match total expense amount (${splitData.totalAmount.toFixed(2)}).`);
      }
    } else if (splitData.splitMethod === 'byPercentage') {
      const totalPercentage = validatedParticipants.reduce((sum, p) => sum + (p.percentage || 0), 0);
      if (Math.abs(totalPercentage - 100) > 0.01) {
        throw new Error(`Sum of percentages (${totalPercentage.toFixed(2)}%) does not equal 100%.`);
      }
      validatedParticipants = validatedParticipants.map(p => ({
        ...p,
        amountOwed: parseFloat(((splitData.totalAmount * (p.percentage || 0)) / 100).toFixed(2)),
      }));
    } else if (splitData.splitMethod === 'equally') {
      const numParticipants = validatedParticipants.length;
      if (numParticipants === 0) throw new Error("Cannot split equally with zero participants.");
      const amountPerPerson = parseFloat((splitData.totalAmount / numParticipants).toFixed(2));
      // Adjust for rounding for the last participant
      let sumOfCalculatedAmounts = 0;
      validatedParticipants = validatedParticipants.map((p, index) => {
        let currentAmountOwed = amountPerPerson;
        if (index === numParticipants - 1) {
            currentAmountOwed = parseFloat((splitData.totalAmount - sumOfCalculatedAmounts).toFixed(2));
        } else {
            sumOfCalculatedAmounts += amountPerPerson;
        }
        return {...p, amountOwed: currentAmountOwed};
      });
    }

    const involvedUserIds = Array.from(new Set([splitData.paidBy, ...validatedParticipants.map(p => p.userId)]));

    const dataToSave: Omit<SplitExpense, 'id' | 'createdAt' | 'updatedAt'> & {createdAt: Timestamp, updatedAt: Timestamp} = {
      originalExpenseId: splitData.originalExpenseId,
      originalExpenseDescription: splitData.originalExpenseDescription,
      currency: splitData.currency,
      splitMethod: splitData.splitMethod,
      totalAmount: splitData.totalAmount,
      paidBy: splitData.paidBy,
      participants: validatedParticipants,
      involvedUserIds,
      groupId: splitData.groupId || null,
      groupName: splitData.groupName || null,
      notes: splitData.notes || '',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    const docRef = await addDoc(collection(db, SPLIT_EXPENSES_COLLECTION), dataToSave);

    if (splitData.groupId && splitData.actorProfile) {
      await logGroupActivity(splitData.groupId, {
        actorId: splitData.actorProfile.uid,
        actorDisplayName: splitData.actorProfile.displayName || splitData.actorProfile.email,
        actionType: ActivityActionType.EXPENSE_SPLIT_IN_GROUP,
        details: `split the expense "${splitData.originalExpenseDescription}" among ${splitData.participants.length} members in group "${splitData.groupName || 'Unknown Group'}"`,
        relatedExpenseId: splitData.originalExpenseId,
        relatedExpenseName: splitData.originalExpenseDescription,
      });
    }
    return docRef.id;
  } catch (error) {
    console.error("[firestore.createSplitExpense] Error creating split expense: ", error);
    throw error;
  }
}

export async function getSplitExpensesForUser(userId: string): Promise<SplitExpense[]> {
  try {
    if (!userId) return [];
    const q = query(
      collection(db, SPLIT_EXPENSES_COLLECTION),
      where('involvedUserIds', 'array-contains', userId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
            id: docSnap.id,
            ...data,
            currency: data.currency || 'USD',
            createdAt: (data.createdAt as Timestamp).toDate().toISOString(),
            updatedAt: (data.updatedAt as Timestamp).toDate().toISOString(),
        } as SplitExpense
    });
  } catch (error) {
    console.error("[firestore.getSplitExpensesForUser] Error getting split expenses for user: ", error);
    throw error;
  }
}

export async function getSplitExpenseById(splitExpenseId: string): Promise<SplitExpense | null> {
  try {
    const docRef = doc(db, SPLIT_EXPENSES_COLLECTION, splitExpenseId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        currency: data.currency || 'USD',
        createdAt: (data.createdAt as Timestamp).toDate().toISOString(),
        updatedAt: (data.updatedAt as Timestamp).toDate().toISOString(),
      } as SplitExpense;
    }
    return null;
  } catch (error) {
    console.error("[firestore.getSplitExpenseById] Error getting split expense by ID: ", error);
    throw error;
  }
}

export async function getSplitExpensesByGroupId(groupId: string): Promise<SplitExpense[]> {
  try {
    if (!groupId) return [];
    const q = query(
      collection(db, SPLIT_EXPENSES_COLLECTION),
      where('groupId', '==', groupId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
            id: docSnap.id,
            ...data,
            currency: data.currency || 'USD',
            createdAt: (data.createdAt as Timestamp).toDate().toISOString(),
            updatedAt: (data.updatedAt as Timestamp).toDate().toISOString(),
        } as SplitExpense
    });
  } catch (error) {
    console.error("[firestore.getSplitExpensesByGroupId] Error getting split expenses by group ID: ", error);
    throw error;
  }
}

export async function updateSplitParticipantSettlement(
  splitExpenseId: string,
  participantUserId: string,
  newSettledStatus: boolean,
  // Optional parameters for group logging
  groupId?: string,
  actorProfile?: UserProfile,
  participantDisplayName?: string,
  originalExpenseDescription?: string
): Promise<void> {
  const splitExpenseRef = doc(db, SPLIT_EXPENSES_COLLECTION, splitExpenseId);
  try {
    await runTransaction(db, async (transaction) => {
      const splitDoc = await transaction.get(splitExpenseRef);
      if (!splitDoc.exists()) {
        throw new Error("Split expense document not found.");
      }
      const splitData = splitDoc.data() as SplitExpense;
      const updatedParticipants = splitData.participants.map(p => {
        if (p.userId === participantUserId) {
          return { ...p, isSettled: newSettledStatus };
        }
        return p;
      });
      transaction.update(splitExpenseRef, { participants: updatedParticipants, updatedAt: Timestamp.now() });

      if (groupId && actorProfile && participantDisplayName && originalExpenseDescription) {
        const settlementStatus = newSettledStatus ? "settled" : "unsettled";
        const targetDisplayName = participantUserId === actorProfile.uid ? "their share" : `${participantDisplayName}'s share`;

        await logGroupActivity(groupId, {
          actorId: actorProfile.uid,
          actorDisplayName: actorProfile.displayName || actorProfile.email,
          actionType: ActivityActionType.SETTLEMENT_UPDATED_IN_GROUP,
          details: `marked ${targetDisplayName} as ${settlementStatus} for the split of "${originalExpenseDescription}"`,
          relatedExpenseId: splitData.originalExpenseId,
          relatedExpenseName: originalExpenseDescription,
          relatedMemberId: participantUserId,
          relatedMemberName: participantDisplayName,
        });
      }
    });
  } catch (error) {
    console.error("[firestore.updateSplitParticipantSettlement] Error updating participant settlement status: ", error);
    throw error;
  }
}

export async function deleteSplitExpense(splitExpenseId: string): Promise<void> {
  try {
    const splitExpenseRef = doc(db, SPLIT_EXPENSES_COLLECTION, splitExpenseId);
    await deleteDoc(splitExpenseRef);
  } catch (error) {
    console.error("[firestore.deleteSplitExpense] Error deleting split expense: ", error);
    throw error;
  }
}

export async function updateSplitExpense(
  splitExpenseId: string,
  data: Partial<Pick<SplitExpense, 'splitMethod' | 'participants' | 'notes'>>
): Promise<void> {
  const splitExpenseRef = doc(db, SPLIT_EXPENSES_COLLECTION, splitExpenseId);
  try {
    const existingSplitDoc = await getDoc(splitExpenseRef);
    if (!existingSplitDoc.exists()) {
      throw new Error("Split expense document not found for update.");
    }
    const existingSplitData = existingSplitDoc.data() as Omit<SplitExpense, 'createdAt'|'updatedAt'> & {createdAt: Timestamp, updatedAt: Timestamp};

    const newSplitMethod = data.splitMethod || existingSplitData.splitMethod;
    let newParticipants = data.participants || existingSplitData.participants;
    const currentTotalAmount = existingSplitData.totalAmount;

    if (data.participants && data.participants.length === 0) {
      throw new Error("Participants list cannot be empty.");
    }

    if (data.splitMethod || data.participants) {
      if (newSplitMethod === 'byAmount') {
        const calculatedTotalOwed = newParticipants.reduce((sum, p) => sum + p.amountOwed, 0);
        if (Math.abs(calculatedTotalOwed - currentTotalAmount) > 0.01) {
          throw new Error(`Sum of amounts owed (${calculatedTotalOwed.toFixed(2)}) by participants does not match total expense amount (${currentTotalAmount.toFixed(2)}).`);
        }
      } else if (newSplitMethod === 'byPercentage') {
        const totalPercentage = newParticipants.reduce((sum, p) => sum + (p.percentage || 0), 0);
        if (Math.abs(totalPercentage - 100) > 0.01) {
          throw new Error(`Sum of percentages (${totalPercentage.toFixed(2)}%) does not equal 100%.`);
        }
        newParticipants = newParticipants.map(p => ({
          ...p,
          amountOwed: parseFloat(((currentTotalAmount * (p.percentage || 0)) / 100).toFixed(2)),
        }));
      } else if (newSplitMethod === 'equally') {
        const numParticipants = newParticipants.length;
        if (numParticipants === 0) throw new Error("Cannot split equally with zero participants.");
        const amountPerPerson = parseFloat((currentTotalAmount / numParticipants).toFixed(2));
        let sumOfCalculatedAmounts = 0;
        newParticipants = newParticipants.map((p, index) => {
           let currentAmountOwed = amountPerPerson;
           if (index === numParticipants - 1) {
               currentAmountOwed = parseFloat((currentTotalAmount - sumOfCalculatedAmounts).toFixed(2));
           } else {
               sumOfCalculatedAmounts += amountPerPerson;
           }
           return {...p, amountOwed: currentAmountOwed};
        });
      }
    }

    const updatePayload: Partial<Omit<SplitExpense, 'id' | 'createdAt' | 'updatedAt'>> & {updatedAt: Timestamp} = {
        splitMethod: newSplitMethod,
        participants: newParticipants,
        notes: data.notes !== undefined ? data.notes : existingSplitData.notes,
        updatedAt: Timestamp.now(),
    };

    await updateDoc(splitExpenseRef, updatePayload as { [key: string]: any });

  } catch (error) {
    console.error("[firestore.updateSplitExpense] Error updating split expense: ", error);
    throw error;
  }
}


// Reminder Functions
export async function addReminder(userId: string, reminderData: ReminderFormData): Promise<string> {
  try {
    if (!userId) throw new Error("User ID is required to add a reminder.");
    const now = Timestamp.now();
    const docRef = await addDoc(collection(db, REMINDERS_COLLECTION), {
      userId,
      title: reminderData.title,
      notes: reminderData.notes || '',
      dueDate: Timestamp.fromDate(parseISO(reminderData.dueDate)),
      recurrence: reminderData.recurrence,
      isCompleted: false,
      createdAt: now,
      updatedAt: now,
    });
    return docRef.id;
  } catch (error) {
    console.error("[firestore.addReminder] Error adding reminder: ", error);
    throw error;
  }
}

export async function getRemindersByUser(userId: string): Promise<Reminder[]> {
  try {
    if (!userId) return [];
    const q = query(
      collection(db, REMINDERS_COLLECTION),
      where('userId', '==', userId),
      orderBy('dueDate', 'asc')
    );
    const querySnapshot = await getDocs(q);
    const reminders: Reminder[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      reminders.push({
        id: doc.id,
        userId: data.userId,
        title: data.title,
        notes: data.notes,
        dueDate: (data.dueDate as Timestamp).toDate().toISOString().split('T')[0],
        recurrence: data.recurrence as RecurrenceType,
        isCompleted: data.isCompleted,
        createdAt: (data.createdAt as Timestamp).toDate().toISOString(),
        updatedAt: (data.updatedAt as Timestamp).toDate().toISOString(),
      });
    });
    return reminders;
  } catch (error) {
    console.error("[firestore.getRemindersByUser] Error getting reminders: ", error);
    throw error;
  }
}

export async function updateReminder(reminderId: string, data: ReminderFormData): Promise<void> {
  try {
    const reminderRef = doc(db, REMINDERS_COLLECTION, reminderId);
    await updateDoc(reminderRef, {
      title: data.title,
      notes: data.notes || '',
      dueDate: Timestamp.fromDate(parseISO(data.dueDate)),
      recurrence: data.recurrence,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error("[firestore.updateReminder] Error updating reminder: ", error);
    throw error;
  }
}

export async function updateReminderCompletion(reminderId: string, isCompleted: boolean): Promise<void> {
  try {
    const reminderRef = doc(db, REMINDERS_COLLECTION, reminderId);
    await updateDoc(reminderRef, {
      isCompleted: isCompleted,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error("[firestore.updateReminderCompletion] Error updating reminder completion status: ", error);
    throw error;
  }
}

export async function deleteReminder(reminderId: string): Promise<void> {
  try {
    const reminderRef = doc(db, REMINDERS_COLLECTION, reminderId);
    await deleteDoc(reminderRef);
  } catch (error) {
    console.error("[firestore.deleteReminder] Error deleting reminder: ", error);
    throw error;
  }
}

// Budget Functions
export async function addBudget(userId: string, budgetData: BudgetFormData): Promise<string> {
  try {
    if (!userId) throw new Error("User ID is required to add a budget.");
    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    if (budgetData.period === "monthly") {
      startDate = startOfMonth(now);
      endDate = endOfMonth(now);
    } else {
      // Handle other periods if/when implemented
      throw new Error("Unsupported budget period.");
    }

    const newBudget = {
      userId,
      name: budgetData.name,
      category: budgetData.category,
      amount: parseFloat(budgetData.amount),
      currency: budgetData.currency || 'USD',
      period: budgetData.period,
      startDate: formatISO(startDate, { representation: 'date' }),
      endDate: formatISO(endDate, { representation: 'date' }),
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };
    const docRef = await addDoc(collection(db, BUDGETS_COLLECTION), newBudget);
    return docRef.id;
  } catch (error) {
    console.error("[firestore.addBudget] Error adding budget: ", error);
    throw error;
  }
}

function mapBudgetDocumentToBudgetObject(docSnap: any): Budget | null {
    const docId = docSnap.id;
    try {
        const data = docSnap.data();
        if (!data) {
            console.error(`[firestore.mapBudget] Budget document ${docId} has no data.`);
            return null;
        }

        let createdAtISO: string;
        if (data.createdAt && typeof data.createdAt.toDate === 'function') {
            createdAtISO = (data.createdAt as Timestamp).toDate().toISOString();
        } else {
            console.warn(`[firestore.mapBudget] Budget document ${docId} has invalid or missing 'createdAt' field. Using current date as fallback. Data:`, data.createdAt);
            createdAtISO = new Date().toISOString();
        }

        let updatedAtISO: string;
        if (data.updatedAt && typeof data.updatedAt.toDate === 'function') {
            updatedAtISO = (data.updatedAt as Timestamp).toDate().toISOString();
        } else if (data.createdAt && typeof data.createdAt.toDate === 'function') { // Fallback to createdAt if updatedAt is invalid
            console.warn(`[firestore.mapBudget] Budget document ${docId} has invalid or missing 'updatedAt' field. Using 'createdAt' as fallback. Data:`, data.updatedAt);
            updatedAtISO = createdAtISO;
        } else {
            console.warn(`[firestore.mapBudget] Budget document ${docId} has invalid or missing 'updatedAt' and 'createdAt' fields. Using current date as fallback for updatedAt.`);
            updatedAtISO = new Date().toISOString();
        }

        let startDateValid = data.startDate;
        try {
            if (data.startDate) {
                parseISO(data.startDate); // Check if parseable, will throw if not
            } else {
                console.warn(`[firestore.mapBudget] Budget document ${docId} missing 'startDate'. Falling back to start of current month.`);
                startDateValid = formatISO(startOfMonth(new Date()), { representation: 'date' });
            }
        } catch (e) {
            console.warn(`[firestore.mapBudget] Budget document ${docId} has invalid 'startDate' field: ${data.startDate}. Falling back to start of current month.`);
            startDateValid = formatISO(startOfMonth(new Date()), { representation: 'date' });
        }

        let endDateValid = data.endDate;
        try {
            if (data.endDate) {
                parseISO(data.endDate); // Check if parseable
            } else {
                console.warn(`[firestore.mapBudget] Budget document ${docId} missing 'endDate'. Falling back to end of current month.`);
                endDateValid = formatISO(endOfMonth(new Date()), { representation: 'date' });
            }
        } catch (e) {
            console.warn(`[firestore.mapBudget] Budget document ${docId} has invalid 'endDate' field: ${data.endDate}. Falling back to end of current month.`);
            endDateValid = formatISO(endOfMonth(new Date()), { representation: 'date' });
        }

        return {
            id: docId,
            userId: data.userId || 'Unknown User',
            name: data.name || 'Untitled Budget',
            category: data.category || 'Other',
            amount: typeof data.amount === 'number' ? data.amount : 0,
            currency: data.currency || 'USD',
            period: data.period || 'monthly',
            startDate: startDateValid,
            endDate: endDateValid,
            createdAt: createdAtISO,
            updatedAt: updatedAtISO,
        };
    } catch (error) {
        console.error(`[firestore.mapBudget] Error mapping budget document ${docId}:`, error, docSnap.data());
        return null;
    }
}

export async function getBudgetsByUser(userId: string): Promise<Budget[]> {
  try {
    if (!userId) return [];
    const q = query(
      collection(db, BUDGETS_COLLECTION),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs
        .map(mapBudgetDocumentToBudgetObject)
        .filter(budget => budget !== null) as Budget[];
  } catch (error) {
    console.error("[firestore.getBudgetsByUser] Error getting budgets by user: ", error);
    throw error;
  }
}

export async function updateBudget(budgetId: string, budgetData: Partial<BudgetFormData>): Promise<void> {
  try {
    const budgetRef = doc(db, BUDGETS_COLLECTION, budgetId);
    const updatePayload: { [key: string]: any } = { updatedAt: Timestamp.now() };

    if (budgetData.name !== undefined) updatePayload.name = budgetData.name;
    if (budgetData.category !== undefined) updatePayload.category = budgetData.category;
    if (budgetData.amount !== undefined) updatePayload.amount = parseFloat(budgetData.amount);
    if (budgetData.currency !== undefined) updatePayload.currency = budgetData.currency;

    if (budgetData.period !== undefined) {
        updatePayload.period = budgetData.period;
        const now = new Date();
        if (budgetData.period === "monthly") {
            updatePayload.startDate = formatISO(startOfMonth(now), { representation: 'date' });
            updatePayload.endDate = formatISO(endOfMonth(now), { representation: 'date' });
        }
    }

    if (Object.keys(updatePayload).length > 1) {
        await updateDoc(budgetRef, updatePayload);
    }
  } catch (error) {
    console.error("[firestore.updateBudget] Error updating budget: ", error);
    throw error;
  }
}

export async function deleteBudget(budgetId: string): Promise<void> {
  try {
    const budgetRef = doc(db, BUDGETS_COLLECTION, budgetId);
    await deleteDoc(budgetRef);
  } catch (error) {
    console.error("[firestore.deleteBudget] Error deleting budget: ", error);
    throw error;
  }
}

