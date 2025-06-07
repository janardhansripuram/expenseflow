
"use client";

import React, { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight, PlusCircle, BarChart3, List, Loader2, Users, SplitIcon, BellRing, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getRecentExpensesByUser, getExpensesByUser, getRemindersByUser } from "@/lib/firebase/firestore";
import type { Expense, Reminder } from "@/lib/types";
import { format, parseISO, isToday, isPast, differenceInDays, startOfDay } from "date-fns";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ChartDataItem {
  category: string;
  total: number;
}

interface ProcessedReminder extends Reminder {
  status: 'overdue' | 'dueToday' | 'upcoming';
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [recentExpenses, setRecentExpenses] = useState<Expense[]>([]);
  const [allUserExpensesForChart, setAllUserExpensesForChart] = useState<Expense[]>([]);
  const [userReminders, setUserReminders] = useState<Reminder[]>([]);
  
  const [isLoadingExpenses, setIsLoadingExpenses] = useState(true);
  const [isLoadingChartData, setIsLoadingChartData] = useState(true);
  const [isLoadingReminders, setIsLoadingReminders] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      if (user) {
        setIsLoadingExpenses(true);
        setIsLoadingChartData(true);
        setIsLoadingReminders(true);
        try {
          const expensesPromise = getRecentExpensesByUser(user.uid, 3);
          const allExpensesPromise = getExpensesByUser(user.uid); 
          const remindersPromise = getRemindersByUser(user.uid);

          const [recent, allUserExpenses, reminders] = await Promise.all([expensesPromise, allExpensesPromise, remindersPromise]);
          
          setRecentExpenses(recent);
          setAllUserExpensesForChart(allUserExpenses);
          setUserReminders(reminders);

        } catch (error) {
          console.error("Failed to fetch dashboard data:", error);
        } finally {
          setIsLoadingExpenses(false);
          setIsLoadingChartData(false);
          setIsLoadingReminders(false);
        }
      } else {
        setRecentExpenses([]);
        setAllUserExpensesForChart([]);
        setUserReminders([]);
        setIsLoadingExpenses(false);
        setIsLoadingChartData(false);
        setIsLoadingReminders(false);
      }
    }
    fetchDashboardData();
  }, [user]);

  const dashboardChartData = useMemo(() => {
    if (!allUserExpensesForChart || allUserExpensesForChart.length === 0) {
      return [];
    }
    const dataByCat = allUserExpensesForChart.reduce((acc, expense) => {
      acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(dataByCat)
      .map(([category, total]) => ({ category, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5); // Show top 5 categories
  }, [allUserExpensesForChart]);


  const processedRemindersForDashboard = useMemo(() => {
    if (!userReminders) return [];
    const today = startOfDay(new Date());
    return userReminders
      .filter(r => !r.isCompleted)
      .map(r => {
        const dueDate = parseISO(r.dueDate);
        let status: 'overdue' | 'dueToday' | 'upcoming' = 'upcoming';
        if (isPast(dueDate) && !isToday(dueDate)) {
          status = 'overdue';
        } else if (isToday(dueDate)) {
          status = 'dueToday';
        }
        return { ...r, status, dueDateObj: dueDate };
      })
      .sort((a, b) => {
        if (a.status === 'overdue' && b.status !== 'overdue') return -1;
        if (a.status !== 'overdue' && b.status === 'overdue') return 1;
        if (a.status === 'dueToday' && b.status !== 'dueToday') return -1;
        if (a.status !== 'dueToday' && b.status === 'dueToday') return 1;
        return differenceInDays(a.dueDateObj, b.dueDateObj); // Sort upcoming by soonest
      })
      .slice(0, 3); // Show top 3 actionable reminders
  }, [userReminders]);

  const overdueCount = useMemo(() => userReminders.filter(r => !r.isCompleted && isPast(parseISO(r.dueDate)) && !isToday(parseISO(r.dueDate))).length, [userReminders]);
  const dueTodayCount = useMemo(() => userReminders.filter(r => !r.isCompleted && isToday(parseISO(r.dueDate))).length, [userReminders]);


  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };
  
  const chartConfig = {
    total: {
      label: "Spent",
      color: "hsl(var(--chart-1))",
    },
  } satisfies Record<string, any>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back! Here&apos;s an overview of your finances and tasks.</p>
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
                  <div key={expense.id} className="flex justify-between items-start p-2 rounded-md hover:bg-muted/50 transition-colors">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{expense.description}</p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <span>{format(new Date(expense.date), "MMM dd, yyyy")}</span>
                        <span>- {expense.category}</span>
                      </div>
                       {expense.groupName && (
                          <Badge variant="secondary" className="mt-1 text-xs flex items-center gap-1 max-w-fit">
                             <Users className="h-3 w-3"/> {expense.groupName}
                          </Badge>
                        )}
                    </div>
                    <p className="font-semibold text-sm ml-2">{formatCurrency(expense.amount)}</p>
                  </div>
                ))}
                 <Button variant="outline" className="w-full mt-2" asChild>
                  <Link href="/expenses">
                    View All Expenses <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4 text-center py-4">
                <p className="text-sm text-muted-foreground">No recent activity to display yet.</p>
                 <Button variant="outline" className="w-full" asChild>
                  <Link href="/expenses/add">
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Your First Expense
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader>
            <CardTitle className="font-headline text-xl">Spending Overview</CardTitle>
            <CardDescription>Quick look at your top categories.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingChartData ? (
                <div className="flex items-center justify-center h-[200px]">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <p className="ml-2 text-sm text-muted-foreground">Loading chart...</p>
                </div>
            ) : dashboardChartData.length > 0 ? (
              <div className="h-[200px] w-full">
                <ChartContainer config={chartConfig} className="w-full h-full">
                  <BarChart accessibilityLayer data={dashboardChartData} layout="vertical" margin={{left: 10, right:10}}>
                    <CartesianGrid horizontal={false} />
                    <XAxis type="number" hide />
                    <YAxis 
                        dataKey="category" 
                        type="category" 
                        tickLine={false} 
                        axisLine={false} 
                        tickMargin={5}
                        width={80}
                        tickFormatter={(value) => value.length > 10 ? `${value.substring(0,10)}...` : value}
                    />
                    <Tooltip 
                        cursor={{fill: 'hsl(var(--muted))', radius: 'var(--radius)'}}
                        content={<ChartTooltipContent indicator="dot" />} 
                    />
                    <Bar dataKey="total" fill="var(--color-total)" radius={4} barSize={15} />
                  </BarChart>
                </ChartContainer>
              </div>
            ) : (
                 <div className="flex flex-col items-center text-center h-[200px] justify-center">
                     <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
                     <p className="text-sm text-muted-foreground mb-4">Add expenses to see your spending overview.</p>
                 </div>
            )}
             <Button variant="secondary" className="w-full mt-4" asChild>
                <Link href="/reports">
                  <BarChart3 className="mr-2 h-4 w-4" /> Go to Full Reports
                </Link>
              </Button>
          </CardContent>
        </Card>
        
        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader>
            <CardTitle className="font-headline text-xl flex items-center">
                <BellRing className="mr-2 h-5 w-5 text-primary" />
                Upcoming Reminders
            </CardTitle>
            <CardDescription>
                {overdueCount > 0 && <span className="text-destructive font-semibold">{overdueCount} Overdue. </span>}
                {dueTodayCount > 0 && <span className="text-amber-600 font-semibold">{dueTodayCount} Due Today.</span>}
                {(overdueCount === 0 && dueTodayCount === 0 && processedRemindersForDashboard.length > 0) && <span>Your next few reminders.</span>}
                {(overdueCount === 0 && dueTodayCount === 0 && processedRemindersForDashboard.length === 0 && !isLoadingReminders) && <span>No pending reminders.</span>}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingReminders ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <p className="ml-2 text-sm text-muted-foreground">Loading reminders...</p>
              </div>
            ) : processedRemindersForDashboard.length > 0 ? (
              <div className="space-y-3">
                {processedRemindersForDashboard.map(reminder => (
                  <div key={reminder.id} className="flex justify-between items-start p-2 rounded-md hover:bg-muted/50 transition-colors">
                    <div className="flex-1">
                      <p className={cn("font-medium text-sm", reminder.status === 'overdue' && 'text-destructive', reminder.status === 'dueToday' && 'text-amber-600')}>
                        {reminder.title}
                      </p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <span>Due: {format(parseISO(reminder.dueDate), "MMM dd")}</span>
                        {reminder.status === 'overdue' && <Badge variant="destructive" className="text-xs">Overdue</Badge>}
                        {reminder.status === 'dueToday' && <Badge variant="outline" className="text-xs border-amber-500 text-amber-600">Today</Badge>}
                      </div>
                    </div>
                  </div>
                ))}
                 <Button variant="outline" className="w-full mt-2" asChild>
                  <Link href="/reminders">
                    View All Reminders <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4 text-center py-4">
                 <CheckCircle2 className="mx-auto h-10 w-10 text-green-500" />
                <p className="text-sm text-muted-foreground">All caught up on reminders!</p>
                 <Button variant="outline" className="w-full" asChild>
                  <Link href="/reminders/add">
                    <PlusCircle className="mr-2 h-4 w-4" /> Add New Reminder
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

      </div>
       <Card className="shadow-lg mt-6">
          <CardHeader>
            <CardTitle className="font-headline text-xl">Quick Actions</CardTitle>
            <CardDescription>Get started with common tasks.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            <Button variant="default" className="w-full" asChild>
              <Link href="/expenses/add">Add Expense</Link>
            </Button>
             <Button variant="outline" className="w-full" asChild>
              <Link href="/expenses/scan">Scan Receipt</Link>
            </Button>
            <Button variant="outline" className="w-full" asChild>
              <Link href="/split">
                <SplitIcon className="mr-2 h-4 w-4" /> Split an Expense
              </Link>
            </Button>
             <Button variant="outline" className="w-full" asChild>
              <Link href="/income/add">Add Income</Link>
            </Button>
             <Button variant="outline" className="w-full" asChild>
              <Link href="/groups">Manage Groups</Link>
            </Button>
            <Button variant="outline" className="w-full" asChild>
              <Link href="/reminders/add">Set Reminder</Link>
            </Button>
          </CardContent>
        </Card>
    </div>
  );
}

