
"use client";

import React, { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, PlusCircle, BarChart3, List, Loader2, Users, SplitIcon, BellRing, AlertTriangle, CheckCircle2, Filter } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getRecentExpensesByUser, getExpensesByUser, getRemindersByUser } from "@/lib/firebase/firestore";
import type { Expense, Reminder, CurrencyCode } from "@/lib/types";
import { SUPPORTED_CURRENCIES } from "@/lib/types";
import { format, parseISO, isToday, isPast, differenceInDays, startOfDay } from "date-fns";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ChartDataItem {
  category: string;
  total: number;
}

interface ProcessedReminder extends Reminder {
  status: 'overdue' | 'dueToday' | 'upcoming';
  dueDateObj: Date;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [recentExpenses, setRecentExpenses] = useState<Expense[]>([]);
  const [allUserExpensesForChart, setAllUserExpensesForChart] = useState<Expense[]>([]);
  const [userReminders, setUserReminders] = useState<Reminder[]>([]);

  const [isLoadingExpenses, setIsLoadingExpenses] = useState(true);
  const [isLoadingChartData, setIsLoadingChartData] = useState(true);
  const [isLoadingReminders, setIsLoadingReminders] = useState(true);

  const [uniqueCurrenciesForDashboardChart, setUniqueCurrenciesForDashboardChart] = useState<CurrencyCode[]>([]);
  const [selectedDashboardChartCurrency, setSelectedDashboardChartCurrency] = useState<CurrencyCode | 'all'>('all');


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

          const currencies = Array.from(new Set(allUserExpenses.map(exp => exp.currency))).sort() as CurrencyCode[];
          setUniqueCurrenciesForDashboardChart(currencies);
          if (currencies.length > 0 && selectedDashboardChartCurrency !== 'all' && !currencies.includes(selectedDashboardChartCurrency)) {
            setSelectedDashboardChartCurrency('all');
          } else if (currencies.length === 0 && selectedDashboardChartCurrency !== 'all') {
            setSelectedDashboardChartCurrency('all');
          }

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
        setUniqueCurrenciesForDashboardChart([]);
        setIsLoadingExpenses(false);
        setIsLoadingChartData(false);
        setIsLoadingReminders(false);
      }
    }
    fetchDashboardData();
  }, [user, selectedDashboardChartCurrency]); // Re-fetch or re-evaluate unique currencies if selected currency changes? No, only on user change.

  const expensesForDashboardChart = useMemo(() => {
    if (selectedDashboardChartCurrency === 'all') {
      return allUserExpensesForChart;
    }
    return allUserExpensesForChart.filter(exp => exp.currency === selectedDashboardChartCurrency);
  }, [allUserExpensesForChart, selectedDashboardChartCurrency]);


  const dashboardChartData = useMemo(() => {
    if (!expensesForDashboardChart || expensesForDashboardChart.length === 0) {
      return [];
    }
    const dataByCat = expensesForDashboardChart.reduce((acc, expense) => {
      acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(dataByCat)
      .map(([category, total]) => ({ category, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [expensesForDashboardChart]);

  const hasMixedCurrenciesInFullChartData = useMemo(() => {
    if (allUserExpensesForChart.length <= 1) return false;
    const currencies = new Set(allUserExpensesForChart.map(exp => exp.currency));
    return currencies.size > 1;
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
        return differenceInDays(a.dueDateObj, b.dueDateObj);
      })
      .slice(0, 3);
  }, [userReminders]);

  const overdueCount = useMemo(() => userReminders.filter(r => !r.isCompleted && isPast(parseISO(r.dueDate)) && !isToday(parseISO(r.dueDate))).length, [userReminders]);
  const dueTodayCount = useMemo(() => userReminders.filter(r => !r.isCompleted && isToday(parseISO(r.dueDate))).length, [userReminders]);


  const formatCurrency = (amount: number, currencyCode: CurrencyCode = 'USD') => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currencyCode }).format(amount);
  };

  const chartCurrencyLabel = useMemo(() => {
    if (selectedDashboardChartCurrency === 'all') return "";
    const currencyInfo = SUPPORTED_CURRENCIES.find(c => c.code === selectedDashboardChartCurrency);
    return currencyInfo ? `(${currencyInfo.symbol})` : `(${selectedDashboardChartCurrency})`;
  }, [selectedDashboardChartCurrency]);

  const chartConfig = useMemo(() => ({
    total: {
      label: `Spent ${chartCurrencyLabel}`,
      color: "hsl(var(--chart-1))",
    },
  }), [chartCurrencyLabel]);

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
                    <p className="font-semibold text-sm ml-2">{formatCurrency(expense.amount, expense.currency)}</p>
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
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                    <CardTitle className="font-headline text-xl">Spending Overview</CardTitle>
                    <CardDescription>Top categories. {selectedDashboardChartCurrency !== 'all' && `Showing ${selectedDashboardChartCurrency} only.`}</CardDescription>
                </div>
                {uniqueCurrenciesForDashboardChart.length > 0 && (
                    <Select value={selectedDashboardChartCurrency} onValueChange={(value: CurrencyCode | 'all') => setSelectedDashboardChartCurrency(value)}>
                        <SelectTrigger className="w-full sm:w-[180px] h-8 text-xs">
                            <SelectValue placeholder="Filter Currency" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Currencies</SelectItem>
                            {uniqueCurrenciesForDashboardChart.map(currency => (
                            <SelectItem key={currency} value={currency}>
                                {SUPPORTED_CURRENCIES.find(c => c.code === currency)?.name || currency}
                            </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingChartData ? (
                <div className="flex items-center justify-center h-[200px]">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <p className="ml-2 text-sm text-muted-foreground">Loading chart...</p>
                </div>
            ) : dashboardChartData.length > 0 ? (
              <>
                {selectedDashboardChartCurrency === 'all' && hasMixedCurrenciesInFullChartData && (
                  <Alert variant="default" className="mb-2 text-xs bg-amber-50 border-amber-200 text-amber-700">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <AlertDescription>
                      Chart sums amounts in various currencies. For precise analysis, filter by a specific currency above.
                    </AlertDescription>
                  </Alert>
                )}
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
                          content={<ChartTooltipContent indicator="dot" formatter={(value) => {
                            const currencySymbolToDisplay = selectedDashboardChartCurrency === 'all' ? '' : (SUPPORTED_CURRENCIES.find(c=>c.code === selectedDashboardChartCurrency)?.symbol || '$');
                            return `${currencySymbolToDisplay}${Number(value).toLocaleString()}`;
                          }}/>}
                      />
                      <Bar dataKey="total" fill="var(--color-total)" radius={4} barSize={15} />
                    </BarChart>
                  </ChartContainer>
                </div>
              </>
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
                 <Button variant="outline" className="w-full mt-2" onClick={() => router.push('/reminders')}>
                    View All Reminders <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
              </div>
            ) : (
              <div className="space-y-4 text-center py-4">
                 <CheckCircle2 className="mx-auto h-10 w-10 text-green-500" />
                <p className="text-sm text-muted-foreground">All caught up on reminders!</p>
                 <Button variant="outline" className="w-full" onClick={() => router.push('/reminders/add')}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add New Reminder
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
