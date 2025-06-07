
'use server';
import { db } from './config';
import { collection, addDoc, query, where, getDocs, Timestamp, orderBy, limit, doc, getDoc, updateDoc, deleteDoc, writeBatch, runTransaction, arrayUnion, arrayRemove } from 'firebase/firestore';
import type { Expense, ExpenseFormData, UserProfile, FriendRequest, Friend, Group, GroupMemberDetail, SplitExpense } from '@/lib/types';

const EXPENSES_COLLECTION = 'expenses';
const USERS_COLLECTION = 'users';
const FRIEND_REQUESTS_COLLECTION = 'friendRequests';
const FRIENDS_SUBCOLLECTION = 'friends';
const GROUPS_COLLECTION = 'groups';
const SPLIT_EXPENSES_COLLECTION = 'splitExpenses';


// Expense Functions
export async function addExpense(userId: string, expenseData: ExpenseFormData): Promise<string> {
  try {
    if (!userId) throw new Error("User ID is required to add an expense.");
    const docRef = await addDoc(collection(db, EXPENSES_COLLECTION), {
      userId,
      description: expenseData.description,
      amount: parseFloat(expenseData.amount),
      category: expenseData.category,
      date: Timestamp.fromDate(new Date(expenseData.date)),
      notes: expenseData.notes || '',
      createdAt: Timestamp.now(),
    });
    return docRef.id;
  } catch (error) {
    console.error("Error adding document: ", error);
    throw error;
  }
}

export async function getExpensesByUser(userId: string): Promise<Expense[]> {
  try {
    if (!userId) return [];
    const q = query(
      collection(db, EXPENSES_COLLECTION),
      where('userId', '==', userId),
      orderBy('date', 'desc')
    );
    const querySnapshot = await getDocs(q);
    const expenses: Expense[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      expenses.push({
        id: doc.id,
        description: data.description,
        amount: data.amount,
        category: data.category,
        date: (data.date as Timestamp).toDate().toISOString().split('T')[0],
        notes: data.notes,
        receiptUrl: data.receiptUrl,
        createdAt: data.createdAt as Timestamp,
        userId: data.userId,
      });
    });
    return expenses;
  } catch (error) {
    console.error("Error getting documents: ", error);
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
    const expenses: Expense[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      expenses.push({
        id: doc.id,
        description: data.description,
        amount: data.amount,
        category: data.category,
        date: (data.date as Timestamp).toDate().toISOString().split('T')[0],
        notes: data.notes,
        receiptUrl: data.receiptUrl,
        createdAt: data.createdAt as Timestamp,
        userId: data.userId,
      });
    });
    return expenses;
  } catch (error) {
    console.error("Error getting recent documents: ", error);
    throw error;
  }
}

export async function getExpenseById(expenseId: string): Promise<Expense | null> {
  try {
    const docRef = doc(db, EXPENSES_COLLECTION, expenseId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        date: (data.date as Timestamp).toDate().toISOString().split('T')[0],
      } as Expense;
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error getting document by ID: ", error);
    throw error;
  }
}

export async function updateExpense(expenseId: string, expenseData: Partial<ExpenseFormData>): Promise<void> {
  try {
    const docRef = doc(db, EXPENSES_COLLECTION, expenseId);
    const updateData: any = { ...expenseData };
    if (expenseData.date) {
      updateData.date = Timestamp.fromDate(new Date(expenseData.date));
    }
    if (expenseData.amount) {
      updateData.amount = parseFloat(expenseData.amount);
    }
    await updateDoc(docRef, updateData);
  } catch (error) {
    console.error("Error updating document: ", error);
    throw error;
  }
}

export async function deleteExpense(expenseId: string): Promise<void> {
  try {
    const docRef = doc(db, EXPENSES_COLLECTION, expenseId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error("Error deleting document: ", error);
    throw error;
  }
}

// User Profile Functions
export async function createUserProfile(userId: string, email: string, displayName?: string): Promise<void> {
  try {
    const userRef = doc(db, USERS_COLLECTION, userId);
    await setDoc(userRef, {
      uid: userId,
      email: email.toLowerCase(), // Store email in lowercase for consistent querying
      displayName: displayName || email.split('@')[0], // Default display name
      createdAt: Timestamp.now(),
    });
  } catch (error) {
    console.error("Error creating user profile: ", error);
    throw error;
  }
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const userRef = doc(db, USERS_COLLECTION, userId);
    const docSnap = await getDoc(userRef);
    if (docSnap.exists()) {
      return docSnap.data() as UserProfile;
    }
    return null;
  } catch (error) {
    console.error("Error getting user profile: ", error);
    throw error;
  }
}

export async function getUserByEmail(email: string): Promise<UserProfile | null> {
  try {
    const q = query(collection(db, USERS_COLLECTION), where('email', '==', email.toLowerCase()));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      return querySnapshot.docs[0].data() as UserProfile;
    }
    return null;
  } catch (error) {
    console.error("Error getting user by email: ", error);
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

    // Check if already friends
    const friendDoc = await getDoc(doc(db, USERS_COLLECTION, fromUserId, FRIENDS_SUBCOLLECTION, toUserId));
    if (friendDoc.exists()) {
      return { success: false, message: "You are already friends with this user." };
    }

    // Check for existing pending request (either way)
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
      toUserEmail: toUser.email, // Use the exact email from the target user's profile
      status: 'pending',
      createdAt: Timestamp.now(),
    });
    return { success: true, message: "Friend request sent successfully." };
  } catch (error) {
    console.error("Error sending friend request: ", error);
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
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FriendRequest));
  } catch (error) {
    console.error("Error getting incoming friend requests: ", error);
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
    const requestData = requestSnap.data() as Omit<FriendRequest, 'id'>;
    if (requestData.status !== 'pending') {
      throw new Error("Friend request is not pending.");
    }
    
    const now = Timestamp.now();

    const friendDataForFromUser: Friend = {
      uid: toUserProfile.uid,
      email: toUserProfile.email,
      displayName: toUserProfile.displayName,
      addedAt: now,
    };
    const friendDataForToUser: Friend = {
      uid: fromUserProfile.uid,
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
    console.error("Error rejecting friend request: ", error);
    throw error;
  }
}

export async function getFriends(userId: string): Promise<Friend[]> {
  try {
    if (!userId) return [];
    const friendsCollectionRef = collection(db, USERS_COLLECTION, userId, FRIENDS_SUBCOLLECTION);
    const q = query(friendsCollectionRef, orderBy('displayName', 'asc')); // Order by displayName for easier selection
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(docSnap => ({ ...docSnap.data(), uid: docSnap.id } as Friend)); // uid is doc.id here
  } catch (error) {
    console.error("Error getting friends: ", error);
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
    console.error("Error removing friend: ", error);
    throw error;
  }
}

// Group Management Functions
export async function createGroup(
  creatorProfile: UserProfile,
  groupName: string,
  initialMemberProfiles: UserProfile[] // Must include creatorProfile
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
    return groupRef.id;
  } catch (error) {
    console.error("Error creating group: ", error);
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
    return querySnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Group));
  } catch (error) {
    console.error("Error getting groups for user: ", error);
    throw error;
  }
}

export async function getGroupDetails(groupId: string): Promise<Group | null> {
  try {
    const groupRef = doc(db, GROUPS_COLLECTION, groupId);
    const docSnap = await getDoc(groupRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Group;
    }
    return null;
  } catch (error) {
    console.error("Error getting group details: ", error);
    throw error;
  }
}

export async function addMembersToGroup(groupId: string, newMemberProfiles: UserProfile[]): Promise<void> {
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

      newMemberProfiles.forEach(profile => {
        if (!existingMemberIds.has(profile.uid)) {
          memberIdsToAdd.push(profile.uid);
          membersToAddDetails.push({
            uid: profile.uid,
            email: profile.email,
            displayName: profile.displayName || profile.email.split('@')[0]
          });
        }
      });

      if (memberIdsToAdd.length > 0) {
        transaction.update(groupRef, {
          memberIds: arrayUnion(...memberIdsToAdd),
          memberDetails: arrayUnion(...membersToAddDetails)
        });
      }
    });
  } catch (error) {
    console.error("Error adding members to group:", error);
    throw error;
  }
}

export async function removeMemberFromGroup(groupId: string, memberIdToRemove: string): Promise<void> {
   try {
    const groupRef = doc(db, GROUPS_COLLECTION, groupId);
    
    await runTransaction(db, async (transaction) => {
      const groupSnap = await transaction.get(groupRef);
      if (!groupSnap.exists()) throw new Error("Group not found.");

      const groupData = groupSnap.data() as Group;
      const memberDetailToRemove = groupData.memberDetails.find(m => m.uid === memberIdToRemove);

      if (!memberDetailToRemove) throw new Error("Member not found in group's detail list.");

      // If the group has only one member and that member is being removed, delete the group.
      if (groupData.memberIds.length === 1 && groupData.memberIds.includes(memberIdToRemove)) {
        transaction.delete(groupRef);
      } else {
        transaction.update(groupRef, {
          memberIds: arrayRemove(memberIdToRemove),
          memberDetails: arrayRemove(memberDetailToRemove)
        });
      }
    });
  } catch (error) {
    console.error("Error removing member from group:", error);
    throw error;
  }
}

// Split Expense Functions
type CreateSplitExpenseData = Omit<SplitExpense, 'id' | 'createdAt' | 'involvedUserIds'> & {
  originalExpenseDescription: string;
};

export async function createSplitExpense(splitData: CreateSplitExpenseData): Promise<string> {
  try {
    if (!splitData.paidBy) throw new Error("Payer ID (paidBy) is required.");
    if (!splitData.originalExpenseId) throw new Error("Original expense ID is required.");
    if (!splitData.originalExpenseDescription) throw new Error("Original expense description is required.");
    if (splitData.participants.length === 0) throw new Error("At least one participant is required.");

    const involvedUserIds = Array.from(new Set([splitData.paidBy, ...splitData.participants.map(p => p.userId)]));

    const docRef = await addDoc(collection(db, SPLIT_EXPENSES_COLLECTION), {
      ...splitData,
      involvedUserIds,
      createdAt: Timestamp.now(),
    });
    return docRef.id;
  } catch (error) {
    console.error("Error creating split expense: ", error);
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
    return querySnapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data(),
      createdAt: docSnap.data().createdAt as Timestamp, // Ensure createdAt is Timestamp
    } as SplitExpense));
  } catch (error) {
    console.error("Error getting split expenses for user: ", error);
    throw error;
  }
}


// Helper function for setting document with merge option (useful for createUserProfile if we want to update)
import { setDoc } from 'firebase/firestore';
// Usage: await setDoc(userRef, data, { merge: true }); // if you want to merge with existing doc

