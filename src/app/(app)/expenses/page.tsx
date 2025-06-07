
"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, ListFilter, Loader2, Edit, Trash2, Users } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getExpensesByUser, deleteExpense } from "@/lib/firebase/firestore";
import type { Expense } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";

export default function ExpensesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<string | null>(null); // Stores ID of expense being deleted

  const fetchExpenses = async () => {
    if (user) {
      setIsLoading(true);
      try {
        const userExpenses = await getExpensesByUser(user.uid);
        setExpenses(userExpenses);
      } catch (error) {
        console.error("Failed to fetch expenses:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Could not load your expenses. Please try again.",
        });
      } finally {
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
      setExpenses([]);
    }
  };
  
  useEffect(() => {
    fetchExpenses();
  }, [user]);

  const handleDelete = async (expenseId: string) => {
    setIsDeleting(expenseId);
    try {
      await deleteExpense(expenseId);
      toast({
        title: "Expense Deleted",
        description: "The expense has been successfully deleted.",
      });
      fetchExpenses(); // Refresh the list
    } catch (error) {
      console.error("Failed to delete expense:", error);
      toast({
        variant: "destructive",
        title: "Error Deleting Expense",
        description: "Could not delete the expense. Please try again.",
      });
    } finally {
      setIsDeleting(null);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline text-foreground">My Expenses</h1>
          <p className="text-muted-foreground">View and manage your recorded expenses.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => toast({ title: "Filter", description: "Filter functionality coming soon!"})}>
            <ListFilter className="mr-2 h-4 w-4" /> Filter
          </Button>
          <Button asChild>
            <Link href="/expenses/add">
              <PlusCircle className="mr-2 h-4 w-4" /> Add New Expense
            </Link>
          </Button>
        </div>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline">Expense List</CardTitle>
          <CardDescription>All your recorded expenses are listed here.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-2 text-muted-foreground">Loading expenses...</p>
            </div>
          ) : expenses.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-muted-foreground text-lg">No expenses recorded yet.</p>
              <p className="text-sm text-muted-foreground mt-2">Start by adding your first expense!</p>
              <Button asChild className="mt-4">
                <Link href="/expenses/add">Add Expense</Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Group</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell className="font-medium">{expense.description}</TableCell>
                    <TableCell className="text-right">{formatCurrency(expense.amount)}</TableCell>
                    <TableCell>{expense.category}</TableCell>
                    <TableCell>{expense.date}</TableCell>
                    <TableCell>
                      {expense.groupName ? (
                        <Badge variant="secondary" className="flex items-center gap-1 max-w-fit">
                          <Users className="h-3 w-3" />
                          {expense.groupName}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">Personal</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="mr-2" disabled>
                        <Edit className="h-4 w-4" />
                         <span className="sr-only">Edit</span>
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                           <Button variant="ghost" size="icon" disabled={isDeleting === expense.id}>
                            {isDeleting === expense.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <Trash2 className="h-4 w-4 text-destructive" />}
                            <span className="sr-only">Delete</span>
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently delete this expense.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => expense.id && handleDelete(expense.id)} className="bg-destructive hover:bg-destructive/90">
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
