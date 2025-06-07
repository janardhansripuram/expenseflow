'use server';
import { db } from './config';
import { collection, addDoc, query, where, getDocs, Timestamp, orderBy, limit, doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import type { Expense, ExpenseFormData } from '@/lib/types';

const EXPENSES_COLLECTION = 'expenses';

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

// Future functions (not implemented in UI yet)
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
