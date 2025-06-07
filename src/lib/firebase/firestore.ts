
'use server';
import { db } from './config';
import { collection, addDoc, query, where, getDocs, Timestamp, orderBy, limit, doc, getDoc, updateDoc, deleteDoc, writeBatch, runTransaction } from 'firebase/firestore';
import type { Expense, ExpenseFormData, UserProfile, FriendRequest, Friend } from '@/lib/types';

const EXPENSES_COLLECTION = 'expenses';
const USERS_COLLECTION = 'users';
const FRIEND_REQUESTS_COLLECTION = 'friendRequests';
const FRIENDS_SUBCOLLECTION = 'friends';


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
    // It's good practice to throw the error or return a more specific error message
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

export async function acceptFriendRequest(requestId: string): Promise<void> {
  const requestRef = doc(db, FRIEND_REQUESTS_COLLECTION, requestId);
  
  await runTransaction(db, async (transaction) => {
    const requestSnap = await transaction.get(requestRef);
    if (!requestSnap.exists()) {
      throw new Error("Friend request does not exist or has been already processed.");
    }
    const requestData = requestSnap.data() as Omit<FriendRequest, 'id'>; // Omit id because it's from snap
    if (requestData.status !== 'pending') {
      throw new Error("Friend request is not pending.");
    }

    const fromUserId = requestData.fromUserId;
    const toUserId = requestData.toUserId;

    const fromUserProfile = await getUserProfile(fromUserId);
    const toUserProfile = await getUserProfile(toUserId);

    if (!fromUserProfile || !toUserProfile) {
      throw new Error("One or both user profiles could not be found.");
    }
    
    const now = Timestamp.now();

    const friendDataForFromUser: Friend = {
      uid: toUserId,
      email: toUserProfile.email,
      displayName: toUserProfile.displayName,
      addedAt: now,
    };
    const friendDataForToUser: Friend = {
      uid: fromUserId,
      email: fromUserProfile.email,
      displayName: fromUserProfile.displayName,
      addedAt: now,
    };

    const fromUserFriendRef = doc(db, USERS_COLLECTION, fromUserId, FRIENDS_SUBCOLLECTION, toUserId);
    const toUserFriendRef = doc(db, USERS_COLLECTION, toUserId, FRIENDS_SUBCOLLECTION, fromUserId);

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
    const friendsCollectionRef = collection(db, USERS_COLLECTION, userId, FRIENDS_SUBCOLLECTION);
    const q = query(friendsCollectionRef, orderBy('addedAt', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Friend));
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

// Helper function for setting document with merge option (useful for createUserProfile if we want to update)
import { setDoc } from 'firebase/firestore';
// Usage: await setDoc(userRef, data, { merge: true }); // if you want to merge with existing doc
