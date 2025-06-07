
"use client";

import React, { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, BarChart3, Lightbulb, TrendingUp, FileText, PieChartIcon } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getExpensesByUser } from "@/lib/firebase/firestore";
import type { Expense } from "@/lib/types";
import { summarizeSpending, SummarizeSpendingOutput } from "@/ai/flows/summarize-spending";
import { useToast } from "@/hooks/use-toast";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { subDays, formatISO, startOfMonth, endOfMonth } from 'date-fns';

type PeriodOption = "last7days" | "last30days" | "currentMonth" | "allTime";

interface ChartDataItem {
  category: string;
  total: number;
}

const PIE_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(var(--chart-1) / 0.7)",
  "hsl(var(--chart-2) / 0.7)",
];


export default function ReportsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>([]);
  const [isLoadingExpenses, setIsLoadingExpenses] = useState(true);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [summaryData, setSummaryData] = useState<SummarizeSpendingOutput | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodOption>("last30days");

  useEffect(() => {
    async function fetchExpenses() {
      if (user) {
        setIsLoadingExpenses(true);
        try {
          const userExpenses = await getExpensesByUser(user.uid);
          setExpenses(userExpenses);
        } catch (error) {
          console.error("Failed to fetch expenses:", error);
          toast({ variant: "destructive", title: "Error", description: "Could not load expenses for reports." });
        } finally {
          setIsLoadingExpenses(false);
        }
      }
    }
    fetchExpenses();
  }, [user, toast]);

  useEffect(() => {
    if (!expenses.length) {
      setFilteredExpenses([]);
      return;
    }

    const now = new Date();
    let startDate: Date;

    switch (selectedPeriod) {
      case "last7days":
        startDate = subDays(now, 7);
        break;
      case "last30days":
        startDate = subDays(now, 30);
        break;
      case "currentMonth":
        startDate = startOfMonth(now);
        break;
      case "allTime":
      default:
        setFilteredExpenses(expenses);
        return;
    }
    
    const endDate = selectedPeriod === "currentMonth" ? endOfMonth(now) : now;

    const filtered = expenses.filter(expense => {
      const expenseDate = new Date(expense.date);
      return expenseDate >= startDate && expenseDate <= endDate;
    });
    setFilteredExpenses(filtered);

  }, [expenses, selectedPeriod]);


  const handleGenerateSummary = async () => {
    if (!user || filteredExpenses.length === 0) {
      toast({ title: "No Data", description: "No expenses found for the selected period to generate a summary." });
      setSummaryData(null);
      return;
    }
    setIsLoadingSummary(true);
    setSummaryData(null); 
    try {
      const spendingDataString = filteredExpenses
        .map(e => `${e.category} - ${e.description}: $${e.amount.toFixed(2)} on ${e.date}`)
        .join('\n');
      
      let periodDescription = "";
      switch (selectedPeriod) {
        case "last7days": periodDescription = "the last 7 days"; break;
        case "last30days": periodDescription = "the last 30 days"; break;
        case "currentMonth": periodDescription = "the current month"; break;
        case "allTime": periodDescription = "all time"; break;
      }

      const result = await summarizeSpending({ spendingData: spendingDataString, period: periodDescription });
      setSummaryData(result);
      toast({ title: "Summary Generated", description: "AI insights are ready!" });
    } catch (error) {
      console.error("Failed to generate summary:", error);
      toast({ variant: "destructive", title: "Summary Error", description: "Could not generate AI summary." });
    } finally {
      setIsLoadingSummary(false);
    }
  };
  
  const chartData: ChartDataItem[] = useMemo(() => {
    if (!filteredExpenses.length) return [];
    const dataByCat = filteredExpenses.reduce((acc, expense) => {
      acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(dataByCat)
      .map(([category, total]) => ({ category, total: parseFloat(total.toFixed(2)) }))
      .sort((a, b) => b.total - a.total);
  }, [filteredExpenses]);

  const totalSpendingForPeriod = useMemo(() => {
    return chartData.reduce((sum, item) => sum + item.total, 0);
  }, [chartData]);

  const barChartConfig = {
    total: {
      label: "Total Spent",
      color: "hsl(var(--chart-1))",
    },
  } satisfies Record<string, any>;

  // For Pie chart legend and tooltip, map categories to chart colors
  const pieChartConfig = useMemo(() => {
    const config: Record<string, { label: string; color: string }> = {};
    chartData.forEach((item, index) => {
      config[item.category] = {
        label: item.category,
        color: PIE_COLORS[index % PIE_COLORS.length],
      };
    });
    return config;
  }, [chartData]);


  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline text-foreground">Reports</h1>
          <p className="text-muted-foreground">Analyze your spending patterns and generate financial reports.</p>
        </div>
        <div className="flex items-center gap-2">
            <Select value={selectedPeriod} onValueChange={(value: PeriodOption) => setSelectedPeriod(value)}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="last7days">Last 7 Days</SelectItem>
                <SelectItem value="last30days">Last 30 Days</SelectItem>
                <SelectItem value="currentMonth">Current Month</SelectItem>
                <SelectItem value="allTime">All Time</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleGenerateSummary} disabled={isLoadingSummary || isLoadingExpenses || filteredExpenses.length === 0}>
                {isLoadingSummary ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
                Generate AI Summary
            </Button>
        </div>
      </div>

      {isLoadingExpenses && (
        <Card className="shadow-lg">
          <CardContent className="flex flex-col items-center justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="mt-2 text-muted-foreground">Loading expense data...</p>
          </CardContent>
        </Card>
      )}

      {!isLoadingExpenses && filteredExpenses.length === 0 && (
         <Card className="shadow-lg">
            <CardHeader>
                <CardTitle className="font-headline">No Data</CardTitle>
                <CardDescription>No expenses found for the selected period.</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">Try selecting a different period or add some expenses first.</p>
            </CardContent>
        </Card>
      )}

      {!isLoadingExpenses && filteredExpenses.length > 0 && (
        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
            <Card className="shadow-lg">
            <CardHeader>
                <CardTitle className="font-headline flex items-center">
                <BarChart3 className="mr-2 h-6 w-6 text-primary" />
                Spending by Category
                </CardTitle>
                <CardDescription>Visual breakdown of your expenses for {selectedPeriod === 'allTime' ? 'all time' : `the ${selectedPeriod.replace('last', 'last ').replace('days', ' days').replace('currentMonth', 'current month')}`}.</CardDescription>
            </CardHeader>
            <CardContent className="h-[350px] w-full">
                <ChartContainer config={barChartConfig} className="w-full h-full">
                <BarChart accessibilityLayer data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis
                    dataKey="category"
                    tickLine={false}
                    tickMargin={10}
                    axisLine={false}
                    tickFormatter={(value) => value.length > 10 ? `${value.substring(0,10)}...` : value}
                    />
                    <YAxis tickFormatter={(value) => `$${value}`} />
                    <Tooltip 
                    cursor={{fill: 'hsl(var(--muted))', radius: 'var(--radius)'}}
                    content={<ChartTooltipContent indicator="dot" />} 
                    />
                    <Legend content={<ChartLegendContent />} />
                    <Bar dataKey="total" fill="var(--color-total)" radius={[4, 4, 0, 0]} />
                </BarChart>
                </ChartContainer>
            </CardContent>
            </Card>

            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle className="font-headline flex items-center">
                        <PieChartIcon className="mr-2 h-6 w-6 text-primary" />
                        Category Distribution
                    </CardTitle>
                    <CardDescription>Proportional spending by category for {selectedPeriod === 'allTime' ? 'all time' : `the ${selectedPeriod.replace('last', 'last ').replace('days', ' days').replace('currentMonth', 'current month')}`}.</CardDescription>
                </CardHeader>
                <CardContent className="h-[350px] w-full flex items-center justify-center">
                   <ChartContainer config={pieChartConfig} className="w-full h-full aspect-square">
                        <PieChart accessibilityLayer>
                            <Tooltip
                                content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                    const data = payload[0].payload; // The data for the slice
                                    const percentage = totalSpendingForPeriod > 0 ? (data.total / totalSpendingForPeriod * 100).toFixed(1) : 0;
                                    return (
                                        <div className="rounded-lg border bg-background p-2.5 shadow-sm text-sm">
                                            <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2.5">
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{data.category}</span>
                                                    <span className="text-muted-foreground">
                                                        Amount: ${data.total.toLocaleString()} ({percentage}%)
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                    }
                                    return null;
                                }}
                            />
                            <Pie
                                data={chartData}
                                dataKey="total"
                                nameKey="category"
                                cx="50%"
                                cy="50%"
                                outerRadius={100}
                                innerRadius={40}
                                labelLine={false}
                                label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, payload }) => {
                                    const RADIAN = Math.PI / 180;
                                    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                                    const x = cx + (radius + 15) * Math.cos(-midAngle * RADIAN);
                                    const y = cy + (radius + 15) * Math.sin(-midAngle * RADIAN);
                                    const displayPercent = (payload.total / totalSpendingForPeriod * 100);
                                    if (displayPercent < 5) return null; // Hide label for very small slices

                                    return (
                                    <text
                                        x={x}
                                        y={y}
                                        fill="hsl(var(--foreground))"
                                        textAnchor={x > cx ? 'start' : 'end'}
                                        dominantBaseline="central"
                                        className="text-xs fill-foreground"
                                    >
                                        {`${payload.category.length > 8 ? payload.category.substring(0,6)+'..' : payload.category} (${displayPercent.toFixed(0)}%)`}
                                    </text>
                                    );
                                }}
                            >
                                {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                ))}
                            </Pie>
                             <Legend content={<ChartLegendContent nameKey="category" />} />
                        </PieChart>
                    </ChartContainer>
                </CardContent>
            </Card>
        </div>
      )}

      {isLoadingSummary && (
        <Card className="shadow-lg">
          <CardContent className="flex flex-col items-center justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="mt-2 text-muted-foreground">Generating AI summary...</p>
          </CardContent>
        </Card>
      )}

      {summaryData && !isLoadingSummary && (
        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
          <Card className="shadow-md hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="font-headline flex items-center text-xl"><FileText className="mr-2 h-5 w-5 text-primary"/>Overall Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-foreground whitespace-pre-wrap">{summaryData.summary}</p>
            </CardContent>
          </Card>
          <Card className="shadow-md hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="font-headline flex items-center text-xl"><TrendingUp className="mr-2 h-5 w-5 text-green-500"/>Key Spending Areas</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-foreground whitespace-pre-wrap">{summaryData.keySpendingAreas}</p>
            </CardContent>
          </Card>
          <Card className="shadow-md hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="font-headline flex items-center text-xl"><Lightbulb className="mr-2 h-5 w-5 text-yellow-500"/>Potential Savings</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-foreground whitespace-pre-wrap">{summaryData.potentialSavings}</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}


    