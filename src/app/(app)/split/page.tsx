
"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, SplitIcon, ArrowLeft, Users, AlertCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getExpensesByUser } from "@/lib/firebase/firestore";
import type { Expense } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export default function SplitExpensesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [numberOfPeople, setNumberOfPeople] = useState<number>(2);
  
  useEffect(() => {
    async function fetchExpenses() {
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
    }
    fetchExpenses();
  }, [user, toast]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const amountPerPerson = useMemo(() => {
    if (selectedExpense && numberOfPeople > 0) {
      return selectedExpense.amount / numberOfPeople;
    }
    return 0;
  }, [selectedExpense, numberOfPeople]);

  const handleSelectExpense = (expense: Expense) => {
    setSelectedExpense(expense);
    setNumberOfPeople(2); // Reset to default when a new expense is selected
  };

  const handleClearSelection = () => {
    setSelectedExpense(null);
    setNumberOfPeople(2);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-headline text-foreground">Split Expenses</h1>
        <p className="text-muted-foreground">Easily divide shared costs. This is a basic version; friend selection and saving splits will come later.</p>
      </div>

      {!selectedExpense ? (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline flex items-center">
              <SplitIcon className="mr-2 h-6 w-6 text-primary" />
              Step 1: Select an Expense to Split
            </CardTitle>
            <CardDescription>Choose one of your recorded expenses to begin.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center items-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-2 text-muted-foreground">Loading expenses...</p>
              </div>
            ) : expenses.length === 0 ? (
              <div className="text-center py-10">
                <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground" />
                <p className="mt-4 text-muted-foreground text-lg">No expenses recorded yet.</p>
                <p className="text-sm text-muted-foreground mt-2">You need to add expenses before you can split them.</p>
                <Button asChild className="mt-4">
                  <Link href="/expenses/add">Add Expense</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {expenses.map((expense) => (
                  <Card 
                    key={expense.id} 
                    className="hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => handleSelectExpense(expense)}
                  >
                    <CardContent className="p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">{expense.description}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(expense.date), "MMM dd, yyyy")} - {expense.category}
                          </p>
                        </div>
                        <p className="font-semibold text-lg">{formatCurrency(expense.amount)}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-lg">
          <CardHeader>
             <div className="flex items-center justify-between">
                <CardTitle className="font-headline flex items-center">
                    <Users className="mr-2 h-6 w-6 text-primary" />
                    Step 2: Define Split Details
                </CardTitle>
                <Button variant="outline" size="sm" onClick={handleClearSelection}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Choose Another Expense
                </Button>
            </div>
            <CardDescription>Specify how many ways to split the selected expense.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Card className="bg-muted/30">
                <CardHeader>
                    <CardTitle className="text-lg font-medium">{selectedExpense.description}</CardTitle>
                    <CardDescription>
                        Total Amount: <span className="font-semibold text-foreground">{formatCurrency(selectedExpense.amount)}</span> | 
                        Date: {format(new Date(selectedExpense.date), "MMM dd, yyyy")} | 
                        Category: {selectedExpense.category}
                    </CardDescription>
                </CardHeader>
            </Card>
            
            <div className="space-y-2">
              <Label htmlFor="numberOfPeople" className="text-base">Split among how many people (including yourself)?</Label>
              <Input
                id="numberOfPeople"
                type="number"
                min="1"
                value={numberOfPeople}
                onChange={(e) => setNumberOfPeople(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="max-w-xs text-base"
              />
            </div>

            {numberOfPeople > 0 && (
              <div className="pt-4">
                <p className="text-lg font-semibold">Amount per person:</p>
                <p className="text-3xl font-bold text-primary">{formatCurrency(amountPerPerson)}</p>
              </div>
            )}
            
            <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                    Note: This is a basic calculator. Advanced splitting options (by specific friends, percentages, etc.) and saving split details will be available in a future update once "Friends" and "Groups" features are implemented.
                </p>
            </div>

          </CardContent>
        </Card>
      )}
    </div>
  );
}

