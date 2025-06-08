
"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, BarChart3, Lightbulb, TrendingUp, FileText, PieChartIcon, CalendarDays, DownloadCloud, AlertTriangle, Filter } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getExpensesByUser } from "@/lib/firebase/firestore";
import type { Expense, CurrencyCode } from "@/lib/types";
import { SUPPORTED_CURRENCIES } from "@/lib/types";
import { summarizeSpending, SummarizeSpendingOutput } from "@/ai/flows/summarize-spending";
import { useToast } from "@/hooks/use-toast";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { subDays, startOfMonth, endOfMonth, parseISO, format, startOfDay, endOfDay } from 'date-fns';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";


type PeriodOption = "last7days" | "last30days" | "currentMonth" | "allTime";
type ReportPeriod = PeriodOption | "custom";

interface ChartDataItem {
  category: string;
  total: number;
  currency?: CurrencyCode;
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
  const { authUser, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [allRawExpenses, setAllRawExpenses] = useState<Expense[]>([]);
  const [isLoadingPage, setIsLoadingPage] = useState(true); // Page-level loader
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [summaryData, setSummaryData] = useState<SummarizeSpendingOutput | null>(null);
  
  const [selectedPeriod, setSelectedPeriod] = useState<ReportPeriod>("last30days");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");

  const [uniqueCurrenciesForFilter, setUniqueCurrenciesForFilter] = useState<CurrencyCode[]>([]);
  const [selectedChartCurrencyFilter, setSelectedChartCurrencyFilter] = useState<CurrencyCode | 'all'>('all');

  const fetchExpenses = useCallback(async () => {
    if (!authUser) {
      setAllRawExpenses([]);
      setIsLoadingPage(false);
      return;
    }
    // setIsLoadingPage(true) is managed by the main useEffect
    try {
      const userExpenses = await getExpensesByUser(authUser.uid);
      setAllRawExpenses(userExpenses);
    } catch (error) {
      console.error("Failed to fetch expenses:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not load expenses for reports." });
      setAllRawExpenses([]);
    } finally {
      setIsLoadingPage(false); // Page-specific loading stops
    }
  }, [authUser, toast]);

  useEffect(() => {
    if (authLoading) {
      setIsLoadingPage(true);
      return;
    }
    if (authUser) {
      setIsLoadingPage(true); // Page will fetch its data
      fetchExpenses();
    } else {
      setAllRawExpenses([]);
      setIsLoadingPage(false);
    }
  }, [authLoading, authUser, fetchExpenses]);

  const expensesFilteredByPeriod = useMemo(() => {
    if (!allRawExpenses.length) {
      return [];
    }

    const now = new Date();
    let startDateFilter: Date | null = null;
    let endDateFilter: Date | null = now; 

    if (selectedPeriod === "custom") {
      if (customStartDate && customEndDate) {
        const parsedStartDate = parseISO(customStartDate);
        const parsedEndDate = parseISO(customEndDate);
        
        if (parsedStartDate > parsedEndDate) {
          return []; 
        }
        startDateFilter = startOfDay(parsedStartDate);
        endDateFilter = endOfDay(parsedEndDate);
      } else {
        return []; 
      }
    } else if (selectedPeriod === "last7days") {
      startDateFilter = startOfDay(subDays(now, 7));
      endDateFilter = endOfDay(now);
    } else if (selectedPeriod === "last30days") {
      startDateFilter = startOfDay(subDays(now, 30));
      endDateFilter = endOfDay(now);
    } else if (selectedPeriod === "currentMonth") {
      startDateFilter = startOfDay(startOfMonth(now));
      endDateFilter = endOfDay(endOfMonth(now));
    } else if (selectedPeriod === "allTime") {
      return allRawExpenses;
    }

    if (startDateFilter && endDateFilter) {
      return allRawExpenses.filter(expense => {
        const expenseDate = parseISO(expense.date); 
        return expenseDate >= startDateFilter! && expenseDate <= endDateFilter!;
      });
    } else if (selectedPeriod !== "allTime") {
        return [];
    }
    return allRawExpenses; 
  }, [allRawExpenses, selectedPeriod, customStartDate, customEndDate]);
  
  useEffect(() => {
    const currencies = Array.from(new Set(expensesFilteredByPeriod.map(exp => exp.currency))).sort() as CurrencyCode[];
    setUniqueCurrenciesForFilter(currencies);
    if (currencies.length > 0 && selectedChartCurrencyFilter !== 'all' && !currencies.includes(selectedChartCurrencyFilter)) {
        setSelectedChartCurrencyFilter('all');
    } else if (currencies.length === 0 && selectedChartCurrencyFilter !== 'all') {
        setSelectedChartCurrencyFilter('all');
    }
  }, [expensesFilteredByPeriod, selectedChartCurrencyFilter]);


  const expensesForChart = useMemo(() => {
    if (selectedChartCurrencyFilter === 'all') {
      return expensesFilteredByPeriod;
    }
    return expensesFilteredByPeriod.filter(exp => exp.currency === selectedChartCurrencyFilter);
  }, [expensesFilteredByPeriod, selectedChartCurrencyFilter]);
  
  const hasMixedCurrenciesInChartData = useMemo(() => {
    if (selectedChartCurrencyFilter !== 'all' || expensesForChart.length <= 1) return false;
    const currencies = new Set(expensesForChart.map(exp => exp.currency));
    return currencies.size > 1;
  }, [expensesForChart, selectedChartCurrencyFilter]);

  useEffect(() => {
    setSummaryData(null); 
  }, [expensesFilteredByPeriod, selectedChartCurrencyFilter]);


  const handleGenerateSummary = async () => {
    if (!authUser || expensesFilteredByPeriod.length === 0) {
      toast({ title: "No Data", description: "No expenses found for the selected period to generate a summary." });
      setSummaryData(null);
      return;
    }
     if (selectedPeriod === 'custom' && (!customStartDate || !customEndDate)) {
      toast({ variant: "destructive", title: "Custom Date Range Needed", description: "Please select a start and end date for the custom range summary."});
      return;
    }

    setIsLoadingSummary(true);
    setSummaryData(null); 
    try {
      const spendingDataString = expensesFilteredByPeriod 
        .map(e => `${e.category} - ${e.description}: ${e.amount.toFixed(2)} ${e.currency} on ${e.date}`)
        .join('\n');
      
      let periodDescription = getPeriodDescriptionForCharts(); 
      
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
    if (!expensesForChart.length) return [];
    const dataByCat = expensesForChart.reduce((acc, expense) => {
      acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(dataByCat)
      .map(([category, total]) => ({ category, total: parseFloat(total.toFixed(2)), currency: selectedChartCurrencyFilter === 'all' ? undefined : selectedChartCurrencyFilter }))
      .sort((a, b) => b.total - a.total);
  }, [expensesForChart, selectedChartCurrencyFilter]);

  const totalSpendingForPeriod = useMemo(() => {
    return chartData.reduce((sum, item) => sum + item.total, 0);
  }, [chartData]);
  
  const chartCurrencyLabel = useMemo(() => {
    if (selectedChartCurrencyFilter === 'all') return ""; 
    const currencyInfo = SUPPORTED_CURRENCIES.find(c => c.code === selectedChartCurrencyFilter);
    return currencyInfo ? `(${currencyInfo.symbol})` : `(${selectedChartCurrencyFilter})`;
  }, [selectedChartCurrencyFilter]);


  const barChartConfig = {
    total: {
      label: `Total Spent ${chartCurrencyLabel}`,
      color: "hsl(var(--chart-1))",
    },
  } satisfies Record<string, any>;

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
  
  const getPeriodDescriptionForCharts = () => {
    if (selectedPeriod === "custom") {
        if (customStartDate && customEndDate) {
            return `from ${format(parseISO(customStartDate), "MMM dd, yyyy")} to ${format(parseISO(customEndDate), "MMM dd, yyyy")}`;
        }
        return "the custom period (dates not set)";
    }
    switch (selectedPeriod) {
        case "last7days": return "the last 7 days";
        case "last30days": return "the last 30 days";
        case "currentMonth": return "the current month";
        case "allTime": return "all time";
        default: return "the selected period";
    }
  };

  const escapeCSVField = (field: string | number | boolean | undefined | null): string => {
    if (field === undefined || field === null) {
      return "";
    }
    const stringField = String(field);
    if (stringField.includes(',') || stringField.includes('\n') || stringField.includes('"')) {
      return `"${stringField.replace(/"/g, '""')}"`;
    }
    return stringField;
  };

  const handleExportToCSV = () => {
    if (expensesFilteredByPeriod.length === 0) { 
      toast({ title: "No Data", description: "No expenses to export for the selected period." });
      return;
    }

    const headers = [
        "Date", "Description", "Category", "Amount", "Currency",
        "Notes", "Group Name", "Is Recurring", "Recurrence Frequency",
        "Recurrence End Date", "Tags"
    ];
    const csvRows = [
      headers.join(','), 
      ...expensesFilteredByPeriod.map(expense => {
        const row = [
          format(parseISO(expense.date), "yyyy-MM-dd"),
          escapeCSVField(expense.description),
          escapeCSVField(expense.category),
          expense.amount, 
          escapeCSVField(expense.currency),
          escapeCSVField(expense.notes),
          escapeCSVField(expense.groupName),
          escapeCSVField(expense.isRecurring),
          escapeCSVField(expense.recurrence),
          escapeCSVField(expense.recurrenceEndDate),
          escapeCSVField(expense.tags?.join("; ")),
        ];
        return row.join(',');
      })
    ];

    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      const reportDate = format(new Date(), "yyyy-MM-dd");
      link.setAttribute('href', url);
      link.setAttribute('download', `expenses_report_${reportDate}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast({ title: "Export Started", description: "Your CSV report is downloading." });
    } else {
      toast({ variant: "destructive", title: "Export Failed", description: "Your browser doesn't support this feature." });
    }
  };

  if (isLoadingPage) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg text-foreground">Loading Reports...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline text-foreground">Reports</h1>
          <p className="text-muted-foreground">Analyze your spending patterns and generate financial reports.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto flex-wrap">
            <Select value={selectedPeriod} onValueChange={(value: ReportPeriod) => setSelectedPeriod(value)}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="last7days">Last 7 Days</SelectItem>
                <SelectItem value="last30days">Last 30 Days</SelectItem>
                <SelectItem value="currentMonth">Current Month</SelectItem>
                <SelectItem value="allTime">All Time</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedChartCurrencyFilter} onValueChange={(value: CurrencyCode | 'all') => setSelectedChartCurrencyFilter(value)} disabled={uniqueCurrenciesForFilter.length === 0}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Filter Chart Currency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Currencies (Direct Sum)</SelectItem>
                {uniqueCurrenciesForFilter.map(currency => (
                  <SelectItem key={currency} value={currency}>
                    {SUPPORTED_CURRENCIES.find(c => c.code === currency)?.name || currency} ({SUPPORTED_CURRENCIES.find(c => c.code === currency)?.symbol})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
                onClick={handleGenerateSummary} 
                disabled={isLoadingSummary || isLoadingPage || expensesFilteredByPeriod.length === 0 || (selectedPeriod === 'custom' && (!customStartDate || !customEndDate))}
                className="w-full sm:w-auto"
            >
                {isLoadingSummary ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
                Generate AI Summary
            </Button>
             <Button 
                onClick={handleExportToCSV} 
                disabled={isLoadingPage || expensesFilteredByPeriod.length === 0}
                variant="outline"
                className="w-full sm:w-auto"
            >
                <DownloadCloud className="mr-2 h-4 w-4" />
                Export CSV
            </Button>
        </div>
      </div>
      
      {selectedPeriod === 'custom' && (
        <Card className="shadow-md">
            <CardHeader>
                <CardTitle className="font-headline flex items-center text-lg"><CalendarDays className="mr-2 h-5 w-5 text-primary"/>Custom Date Range</CardTitle>
            </CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="customStartDate">Start Date</Label>
                    <Input 
                        type="date" 
                        id="customStartDate" 
                        value={customStartDate} 
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        className="mt-1"
                        max={customEndDate || undefined} 
                    />
                </div>
                <div>
                    <Label htmlFor="customEndDate">End Date</Label>
                    <Input 
                        type="date" 
                        id="customEndDate" 
                        value={customEndDate} 
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        className="mt-1"
                        min={customStartDate || undefined}
                        max={format(new Date(), "yyyy-MM-dd")} 
                    />
                </div>
            </CardContent>
        </Card>
      )}


      {isLoadingPage && ( // This check might be redundant due to the main loader, but harmless
        <Card className="shadow-lg">
          <CardContent className="flex flex-col items-center justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="mt-2 text-muted-foreground">Loading expense data...</p>
          </CardContent>
        </Card>
      )}

      {!isLoadingPage && expensesFilteredByPeriod.length === 0 && (
         <Card className="shadow-lg">
            <CardHeader>
                <CardTitle className="font-headline">No Data</CardTitle>
                <CardDescription>No expenses found for {getPeriodDescriptionForCharts()}.</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">Try selecting a different period or add some expenses first. If using a custom range, ensure both start and end dates are selected.</p>
            </CardContent>
        </Card>
      )}

      {!isLoadingPage && expensesFilteredByPeriod.length > 0 && (
        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
            <Card className="shadow-lg">
            <CardHeader>
                <CardTitle className="font-headline flex items-center">
                <BarChart3 className="mr-2 h-6 w-6 text-primary" />
                Spending by Category
                </CardTitle>
                <CardDescription>Visual breakdown of your expenses for {getPeriodDescriptionForCharts()}.
                {selectedChartCurrencyFilter !== 'all' && ` Showing data for ${SUPPORTED_CURRENCIES.find(c=>c.code === selectedChartCurrencyFilter)?.name || selectedChartCurrencyFilter} (${SUPPORTED_CURRENCIES.find(c=>c.code === selectedChartCurrencyFilter)?.symbol}) only.`}
                </CardDescription>
            </CardHeader>
            <CardContent className="w-full">
                {selectedChartCurrencyFilter === 'all' && hasMixedCurrenciesInChartData && (
                    <Alert variant="default" className="mb-2 text-xs bg-amber-50 border-amber-200 text-amber-700">
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                        <AlertDescription>
                        Amounts in different currencies are summed together without conversion. This may not be arithmetically accurate. Filter by a specific currency for precise analysis.
                        </AlertDescription>
                    </Alert>
                )}
                <div className="h-[350px] w-full">
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
                        <YAxis tickFormatter={(value) => selectedChartCurrencyFilter === 'all' ? `$${value}`: `${SUPPORTED_CURRENCIES.find(c=>c.code === selectedChartCurrencyFilter)?.symbol || ''}${value}`} />
                        <Tooltip 
                        cursor={{fill: 'hsl(var(--muted))', radius: 'var(--radius)'}}
                        content={<ChartTooltipContent indicator="dot" formatter={(value, name, props) => {
                            const currencyCode = props.payload.currency || (selectedChartCurrencyFilter !== 'all' ? selectedChartCurrencyFilter : undefined);
                            const currencySymbol = currencyCode ? (SUPPORTED_CURRENCIES.find(c=>c.code === currencyCode)?.symbol || '') : (selectedChartCurrencyFilter === 'all' ? '' : '$'); 
                            return `${currencySymbol}${Number(value).toLocaleString()}`;
                         }} />} 
                        />
                        <Legend content={<ChartLegendContent />} />
                        <Bar dataKey="total" fill="var(--color-total)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                    </ChartContainer>
                </div>
            </CardContent>
            </Card>

            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle className="font-headline flex items-center">
                        <PieChartIcon className="mr-2 h-6 w-6 text-primary" />
                        Category Distribution
                    </CardTitle>
                    <CardDescription>Proportional spending by category for {getPeriodDescriptionForCharts()}.
                    {selectedChartCurrencyFilter !== 'all' && ` Showing data for ${SUPPORTED_CURRENCIES.find(c=>c.code === selectedChartCurrencyFilter)?.name || selectedChartCurrencyFilter} (${SUPPORTED_CURRENCIES.find(c=>c.code === selectedChartCurrencyFilter)?.symbol}) only.`}
                    </CardDescription>
                </CardHeader>
                <CardContent className="w-full">
                    {selectedChartCurrencyFilter === 'all' && hasMixedCurrenciesInChartData && (
                        <Alert variant="default" className="mb-2 text-xs bg-amber-50 border-amber-200 text-amber-700">
                            <AlertTriangle className="h-4 w-4 text-amber-600" />
                            <AlertDescription>
                             Amounts in different currencies are summed together without conversion. This may not be arithmetically accurate. Filter by a specific currency for precise analysis.
                            </AlertDescription>
                        </Alert>
                    )}
                    <div className="h-[350px] w-full flex items-center justify-center">
                       <ChartContainer config={pieChartConfig} className="w-full h-full aspect-square">
                            <PieChart accessibilityLayer>
                                <Tooltip
                                    content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                        const data = payload[0].payload as ChartDataItem;
                                        const percentage = totalSpendingForPeriod > 0 ? (data.total / totalSpendingForPeriod * 100).toFixed(1) : 0;
                                        const currencySymbol = data.currency ? (SUPPORTED_CURRENCIES.find(c => c.code === data.currency)?.symbol || '') : (selectedChartCurrencyFilter === 'all' ? '' : (SUPPORTED_CURRENCIES.find(c => c.code === selectedChartCurrencyFilter)?.symbol || '$'));
                                        return (
                                            <div className="rounded-lg border bg-background p-2.5 shadow-sm text-sm">
                                                <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2.5">
                                                    <div className="flex flex-col">
                                                        <span className="font-medium">{data.category}</span>
                                                        <span className="text-muted-foreground">
                                                            Amount: {currencySymbol}{data.total.toLocaleString()} ({percentage}%)
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
                                        if (displayPercent < 5) return null; 

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
                    </div>
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
