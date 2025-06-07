
"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, PlusCircle, BarChart3, List, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getRecentExpensesByUser } from "@/lib/firebase/firestore";
import type { Expense } from "@/lib/types";
import { format } from "date-fns";

export default function DashboardPage() {
  const { user } = useAuth();
  const [recentExpenses, setRecentExpenses] = useState<Expense[]>([]);
  const [isLoadingExpenses, setIsLoadingExpenses] = useState(true);

  useEffect(() => {
    async function fetchRecentExpenses() {
      if (user) {
        setIsLoadingExpenses(true);
        try {
          const expenses = await getRecentExpensesByUser(user.uid, 3);
          setRecentExpenses(expenses);
        } catch (error) {
          console.error("Failed to fetch recent expenses:", error);
          // Optionally show a toast notification here
        } finally {
          setIsLoadingExpenses(false);
        }
      } else {
        setRecentExpenses([]);
        setIsLoadingExpenses(false);
      }
    }
    fetchRecentExpenses();
  }, [user]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back! Here&apos;s an overview of your finances.</p>
        </div>
        <Button asChild>
          <Link href="/expenses/add">
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Expense
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader>
            <CardTitle className="font-headline text-xl">Recent Activity</CardTitle>
            <CardDescription>Your latest transactions.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingExpenses ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <p className="ml-2 text-sm text-muted-foreground">Loading activity...</p>
              </div>
            ) : recentExpenses.length > 0 ? (
              <div className="space-y-3">
                {recentExpenses.map(expense => (
                  <div key={expense.id} className="flex justify-between items-center p-2 rounded-md hover:bg-muted/50 transition-colors">
                    <div>
                      <p className="font-medium text-sm">{expense.description}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(expense.date), "MMM dd, yyyy")} - {expense.category}</p>
                    </div>
                    <p className="font-semibold text-sm">{formatCurrency(expense.amount)}</p>
                  </div>
                ))}
                 <Button variant="outline" className="w-full mt-2" asChild>
                  <Link href="/expenses">
                    View All Expenses <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">No recent activity to display yet.</p>
                <Button variant="outline" className="w-full" asChild>
                  <Link href="/expenses">
                    View All Expenses <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader>
            <CardTitle className="font-headline text-xl">Spending Overview</CardTitle>
            <CardDescription>Visualize your spending habits.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center text-center">
              <Image 
                src="https://placehold.co/300x200.png" 
                alt="Placeholder chart for spending overview" 
                width={300} 
                height={200} 
                className="rounded-md mb-4"
                data-ai-hint="finance chart graph"
              />
              <p className="text-sm text-muted-foreground mb-4">Detailed charts will appear here once you add expenses. (Reports coming soon)</p>
              <Button variant="secondary" className="w-full" asChild disabled>
                <Link href="/reports">
                  <BarChart3 className="mr-2 h-4 w-4" /> Go to Reports
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader>
            <CardTitle className="font-headline text-xl">Quick Actions</CardTitle>
            <CardDescription>Get started with common tasks.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="default" className="w-full" asChild>
              <Link href="/expenses/add">Add Expense</Link>
            </Button>
            <Button variant="outline" className="w-full" disabled>Create Group (Coming Soon)</Button>
            <Button variant="outline" className="w-full" disabled>Split Expense (Coming Soon)</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
