
"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, PlusCircle, Target, Edit, Trash2, Landmark, AlertTriangle, Save } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { addBudget, getBudgetsByUser, updateBudget, deleteBudget, getExpensesByUser } from "@/lib/firebase/firestore";
import type { Budget, BudgetFormData, Expense, CurrencyCode } from "@/lib/types";
import { SUPPORTED_CURRENCIES } from "@/lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useForm } from "react-hook-form";
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { Alert, AlertDescription as UIDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

const budgetSchema = z.object({
  name: z.string().min(1, "Budget name is required").max(50, "Name too long"),
  category: z.string().min(1, "Category is required"),
  amount: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
    message: "Amount must be a positive number",
  }),
  currency: z.custom<CurrencyCode>((val) => SUPPORTED_CURRENCIES.some(c => c.code === val), {
    message: "Invalid currency selected",
  }),
  period: z.literal("monthly", {
    errorMap: () => ({ message: "Only monthly budgets are currently supported." }),
  }),
});

export default function BudgetsPage() {
  const { authUser, userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [spentAmounts, setSpentAmounts] = useState<Record<string, { spent: number; hasOtherCurrencyExpenses: boolean }>>({});

  const [isBudgetDialogOpen, setIsBudgetDialogOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const form = useForm<BudgetFormData>({
    resolver: zodResolver(budgetSchema),
    defaultValues: {
      name: "",
      category: "",
      amount: "",
      currency: "USD",
      period: "monthly",
    },
  });

  useEffect(() => {
    if (userProfile && !authLoading && !editingBudget) {
      form.reset({
        name: "",
        category: "",
        amount: "",
        currency: userProfile.defaultCurrency || "USD",
        period: "monthly",
      });
    } else if (editingBudget && userProfile) {
         form.reset({
            name: editingBudget.name,
            category: editingBudget.category,
            amount: String(editingBudget.amount),
            currency: editingBudget.currency || userProfile.defaultCurrency || "USD",
            period: editingBudget.period,
        });
    }
  }, [userProfile, authLoading, form, editingBudget]);


  const fetchBudgetData = useCallback(async () => {
    if (!authUser) {
      setBudgets([]);
      setExpenses([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true); 

    try {
      let userBudgets: Budget[] = [];
      let userExpensesData: Expense[] = [];

      try {
        userBudgets = await getBudgetsByUser(authUser.uid);
        setBudgets(userBudgets);
      } catch (error) {
        console.error("Error fetching budgets:", error);
        toast({ variant: "destructive", title: "Budget Data Error", description: "Could not load your budget records." });
        setBudgets([]);
      }

      try {
        userExpensesData = await getExpensesByUser(authUser.uid);
        setExpenses(userExpensesData);
      } catch (error) {
        console.error("Error fetching expenses for budget calculations:", error);
        toast({ variant: "destructive", title: "Expense Data Error (for Budgets)", description: "Could not load expenses needed for budget calculations." });
        setExpenses([]);
      }

    } catch (error) { 
      console.error("General error in fetchBudgetData:", error);
      toast({ variant: "destructive", title: "Loading Error", description: "An unexpected error occurred while loading budget page data." });
      setBudgets([]);
      setExpenses([]);
    } finally {
      setIsLoading(false);
    }
  }, [authUser, toast]);

  useEffect(() => {
    if (authLoading) {
      setIsLoading(true);
      return;
    }
    if (authUser) {
      fetchBudgetData();
    } else {
      setBudgets([]);
      setExpenses([]);
      setIsLoading(false);
    }
  }, [authLoading, authUser, fetchBudgetData]);

  useEffect(() => {
    if (budgets.length > 0 && expenses.length > 0) {
      const newSpentAmounts: Record<string, { spent: number; hasOtherCurrencyExpenses: boolean }> = {};
      budgets.forEach(budget => {
        const budgetStartDate = parseISO(budget.startDate);
        const budgetEndDate = parseISO(budget.endDate);

        let totalSpentInBudgetCurrency = 0;
        let hasOtherCurrencyExpensesInCategory = false;

        expenses.forEach(expense => {
          const expenseDate = parseISO(expense.date);
          if (
            expense.category === budget.category &&
            isWithinInterval(expenseDate, { start: budgetStartDate, end: budgetEndDate })
          ) {
            if (expense.currency === budget.currency) {
              totalSpentInBudgetCurrency += expense.amount;
            } else {
              hasOtherCurrencyExpensesInCategory = true;
            }
          }
        });
        if (budget.id) {
          newSpentAmounts[budget.id] = { spent: totalSpentInBudgetCurrency, hasOtherCurrencyExpenses: hasOtherCurrencyExpensesInCategory };
        }
      });
      setSpentAmounts(newSpentAmounts);
    } else {
      setSpentAmounts({});
    }
  }, [budgets, expenses]);

  const handleOpenDialog = (budget: Budget | null = null) => {
    setEditingBudget(budget);
    if (budget) {
      form.reset({
        name: budget.name,
        category: budget.category,
        amount: String(budget.amount),
        currency: budget.currency || userProfile?.defaultCurrency || "USD",
        period: budget.period,
      });
    } else {
      form.reset({ name: "", category: "", amount: "", currency: userProfile?.defaultCurrency || "USD", period: "monthly" });
    }
    setIsBudgetDialogOpen(true);
  };

  const onSubmit = async (values: BudgetFormData) => {
    if (!authUser) return;
    setIsSubmitting(true);
    try {
      if (editingBudget && editingBudget.id) {
        await updateBudget(editingBudget.id, values);
        toast({ title: "Budget Updated", description: "Your budget has been successfully updated." });
      } else {
        await addBudget(authUser.uid, values);
        toast({ title: "Budget Created", description: "Your new budget has been set." });
      }
      if (authUser) fetchBudgetData();
      setIsBudgetDialogOpen(false);
      setEditingBudget(null);
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Could not save budget." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteBudget = async (budgetId: string) => {
    if (!budgetId) return;
    setIsDeleting(budgetId);
    try {
      await deleteBudget(budgetId);
      toast({ title: "Budget Deleted", description: "The budget has been successfully deleted." });
      if (authUser) fetchBudgetData();
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Could not delete budget." });
    } finally {
      setIsDeleting(null);
    }
  };

  const formatCurrencyDisplay = (amount: number, currencyCode: CurrencyCode) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currencyCode, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
  };

  const getCategoryDisplayName = (categoryValue: string) => {
    const categoryMap: Record<string, string> = {
      food: "Food & Dining", transport: "Transportation", utilities: "Utilities",
      entertainment: "Entertainment", health: "Health & Wellness", shopping: "Shopping",
      travel: "Travel", education: "Education", gifts: "Gifts & Donations",
      groceries: "Groceries", "office supplies": "Office Supplies", clothing: "Clothing", other: "Other"
    };
    return categoryMap[categoryValue] || categoryValue;
  };


  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">Loading budgets...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline text-foreground">Budgets</h1>
          <p className="text-muted-foreground">Manage your spending targets and track progress (monthly only for now).</p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add New Budget
        </Button>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline flex items-center">
            <Target className="mr-2 h-6 w-6 text-primary" />
            Your Budgets
          </CardTitle>
          <CardDescription>Overview of your current monthly budgets.</CardDescription>
        </CardHeader>
        <CardContent>
          {budgets.length === 0 ? (
            <div className="text-center py-10">
              <Target className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-4 text-lg text-muted-foreground">No budgets created yet.</p>
              <p className="text-sm text-muted-foreground mt-2">Click "Add New Budget" to get started.</p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {budgets.map((budget) => {
                const spentAmountData = budget.id ? spentAmounts[budget.id] : { spent: 0, hasOtherCurrencyExpenses: false };
                const spent = spentAmountData?.spent || 0;
                const progress = budget.amount > 0 ? Math.min((spent / budget.amount) * 100, 100) : 0;
                const overBudget = spent > budget.amount;

                return (
                  <Card key={budget.id} className="shadow-md hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-xl font-headline text-primary">{budget.name}</CardTitle>
                          <CardDescription>{getCategoryDisplayName(budget.category)} - {formatCurrencyDisplay(budget.amount, budget.currency)} ({budget.currency})</CardDescription>
                        </div>
                        <div className="flex gap-1">
                           <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpenDialog(budget)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive/90" disabled={isDeleting === budget.id}>
                                {isDeleting === budget.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Budget?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete the budget "{budget.name}"? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => budget.id && handleDeleteBudget(budget.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <Progress value={progress} className={cn(overBudget ? "bg-destructive/30 [&>div]:bg-destructive" : "")}/>
                        <div className="flex justify-between text-sm font-medium">
                           <span className={cn(overBudget ? "text-destructive" : "text-foreground")}>
                             Spent: {formatCurrencyDisplay(spent, budget.currency)}
                           </span>
                           <span className="text-muted-foreground">
                             Remaining: {formatCurrencyDisplay(Math.max(0, budget.amount - spent), budget.currency)}
                           </span>
                        </div>
                        {spentAmountData?.hasOtherCurrencyExpenses && (
                            <Alert variant="default" className="mt-2 text-xs bg-amber-50 border-amber-200 text-amber-700 p-2">
                                <AlertTriangle className="h-4 w-4 text-amber-600" />
                                <UIDescription className="pl-1">
                                 Expenses in other currencies for this category exist and are not included in this budget's progress.
                                </UIDescription>
                            </Alert>
                        )}
                      </div>
                    </CardContent>
                     <CardFooter className="text-xs text-muted-foreground pt-2">
                        Monthly Budget for {format(parseISO(budget.startDate), "MMMM yyyy")}
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isBudgetDialogOpen} onOpenChange={setIsBudgetDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingBudget ? "Edit Budget" : "Add New Budget"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Budget Name</FormLabel>
                    <FormControl><Input placeholder="e.g., Monthly Groceries" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="food">Food & Dining</SelectItem>
                        <SelectItem value="transport">Transportation</SelectItem>
                        <SelectItem value="utilities">Utilities</SelectItem>
                        <SelectItem value="entertainment">Entertainment</SelectItem>
                        <SelectItem value="health">Health & Wellness</SelectItem>
                        <SelectItem value="shopping">Shopping</SelectItem>
                        <SelectItem value="travel">Travel</SelectItem>
                        <SelectItem value="education">Education</SelectItem>
                        <SelectItem value="gifts">Gifts & Donations</SelectItem>
                        <SelectItem value="groceries">Groceries</SelectItem>
                        <SelectItem value="office supplies">Office Supplies</SelectItem>
                        <SelectItem value="clothing">Clothing</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <div className="grid grid-cols-2 gap-4">
                 <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Amount</FormLabel>
                        <FormControl><Input type="number" step="0.01" placeholder="e.g., 500" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="currency"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel className="flex items-center"><Landmark className="mr-2 h-4 w-4 text-muted-foreground" />Currency</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || userProfile?.defaultCurrency || "USD"}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Select currency" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                            {SUPPORTED_CURRENCIES.map(curr => (
                                <SelectItem key={curr.code} value={curr.code}>
                                  {curr.code} - {curr.name} ({curr.symbol})
                                </SelectItem>
                            ))}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                />
              </div>
              <FormField
                control={form.control}
                name="period"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Period</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled>
                       <FormControl>
                        <SelectTrigger><SelectValue placeholder="Select period" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">Currently, only monthly budgets are supported.</p>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter className="pt-2">
                <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                <Button type="submit" disabled={isSubmitting || authLoading}>
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4"/>}
                  {editingBudget ? "Save Changes" : "Create Budget"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
