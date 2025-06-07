
"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, ListFilter, Loader2, Edit, Trash2, Users, RefreshCw, XCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getExpensesByUser, deleteExpense, getGroupsForUser } from "@/lib/firebase/firestore";
import type { Expense, Group } from "@/lib/types";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";

interface FilterCriteria {
  searchTerm: string;
  startDate: string;
  endDate: string;
  category: string;
  minAmount: string;
  maxAmount: string;
  groupId: string; // 'all', 'personal', or actual group ID
}

interface SortCriteria {
  sortBy: keyof Expense | 'amount' | 'date' | 'description' | 'category';
  sortOrder: 'asc' | 'desc';
}

const initialFilterCriteria: FilterCriteria = {
  searchTerm: "",
  startDate: "",
  endDate: "",
  category: "all",
  minAmount: "",
  maxAmount: "",
  groupId: "all",
};

const initialSortCriteria: SortCriteria = {
  sortBy: "date",
  sortOrder: "desc",
};

export default function ExpensesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const [userGroups, setUserGroups] = useState<Group[]>([]);
  const [uniqueCategories, setUniqueCategories] = useState<string[]>([]);
  
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);
  const [currentFilters, setCurrentFilters] = useState<FilterCriteria>(initialFilterCriteria);
  const [currentSort, setCurrentSort] = useState<SortCriteria>(initialSortCriteria);
  
  const [tempFilters, setTempFilters] = useState<FilterCriteria>(initialFilterCriteria);
  const [tempSort, setTempSort] = useState<SortCriteria>(initialSortCriteria);

  const fetchInitialData = useCallback(async () => {
    if (user) {
      setIsLoading(true);
      try {
        const [userExpenses, fetchedGroups] = await Promise.all([
          getExpensesByUser(user.uid),
          getGroupsForUser(user.uid)
        ]);
        
        setAllExpenses(userExpenses);
        setUserGroups(fetchedGroups || []);

        const categories = Array.from(new Set(userExpenses.map(exp => exp.category))).sort();
        setUniqueCategories(categories);
        
      } catch (error) {
        console.error("Failed to fetch initial data:", error);
        toast({
          variant: "destructive",
          title: "Error Loading Data",
          description: "Could not load expenses or groups. Please try again.",
        });
      } finally {
        setIsLoading(false);
      }
    } else {
      setAllExpenses([]);
      setUserGroups([]);
      setUniqueCategories([]);
      setIsLoading(false);
    }
  }, [user, toast]);
  
  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  useEffect(() => {
    setTempFilters(currentFilters);
    setTempSort(currentSort);
  }, [isFilterDialogOpen, currentFilters, currentSort]);

  const filteredAndSortedExpenses = useMemo(() => {
    let processedExpenses = [...allExpenses];

    if (currentFilters.searchTerm) {
      processedExpenses = processedExpenses.filter(exp => 
        exp.description.toLowerCase().includes(currentFilters.searchTerm.toLowerCase())
      );
    }

    if (currentFilters.startDate) {
      const startDate = parseISO(currentFilters.startDate);
      processedExpenses = processedExpenses.filter(exp => parseISO(exp.date) >= startDate);
    }
    if (currentFilters.endDate) {
      const endDate = parseISO(currentFilters.endDate);
      processedExpenses = processedExpenses.filter(exp => parseISO(exp.date) <= endDate);
    }
    
    if (currentFilters.category !== 'all') {
      processedExpenses = processedExpenses.filter(exp => exp.category === currentFilters.category);
    }

    if (currentFilters.minAmount) {
      processedExpenses = processedExpenses.filter(exp => exp.amount >= parseFloat(currentFilters.minAmount));
    }
    if (currentFilters.maxAmount) {
      processedExpenses = processedExpenses.filter(exp => exp.amount <= parseFloat(currentFilters.maxAmount));
    }

    if (currentFilters.groupId !== 'all') {
      if (currentFilters.groupId === 'personal') {
        processedExpenses = processedExpenses.filter(exp => !exp.groupId);
      } else {
        processedExpenses = processedExpenses.filter(exp => exp.groupId === currentFilters.groupId);
      }
    }

    processedExpenses.sort((a, b) => {
      let valA = a[currentSort.sortBy as keyof Expense];
      let valB = b[currentSort.sortBy as keyof Expense];

      if (currentSort.sortBy === 'amount') {
        valA = a.amount;
        valB = b.amount;
      } else if (currentSort.sortBy === 'date') {
        valA = new Date(a.date).getTime();
        valB = new Date(b.date).getTime();
      }

      if (typeof valA === 'string' && typeof valB === 'string') {
        valA = valA.toLowerCase();
        valB = valB.toLowerCase();
      }
      
      let comparison = 0;
      if (valA === undefined || valA === null) comparison = -1;
      else if (valB === undefined || valB === null) comparison = 1;
      else if (valA < valB) comparison = -1;
      else if (valA > valB) comparison = 1;

      return currentSort.sortOrder === 'asc' ? comparison : comparison * -1;
    });

    return processedExpenses;
  }, [allExpenses, currentFilters, currentSort]);

  const handleDelete = useCallback(async (expenseId: string) => {
    setIsDeleting(expenseId);
    try {
      await deleteExpense(expenseId);
      toast({
        title: "Expense Deleted",
        description: "The expense has been successfully deleted.",
      });
      fetchInitialData(); 
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
  }, [toast, fetchInitialData]);

  const handleEdit = useCallback((expenseId: string) => {
    router.push(`/expenses/edit/${expenseId}`);
  }, [router]);

  const handleApplyFiltersFromDialog = useCallback(() => {
    setCurrentFilters(tempFilters);
    setCurrentSort(tempSort);
    setIsFilterDialogOpen(false);
  }, [tempFilters, tempSort]);

  const handleClearFilters = useCallback(() => {
    setCurrentFilters(initialFilterCriteria);
    setCurrentSort(initialSortCriteria);
    setTempFilters(initialFilterCriteria); 
    setTempSort(initialSortCriteria);
  }, []);
  
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
          <Dialog open={isFilterDialogOpen} onOpenChange={setIsFilterDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <ListFilter className="mr-2 h-4 w-4" /> Filter & Sort
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Filter & Sort Expenses</DialogTitle>
                <DialogDescription>Refine your expense list based on criteria below.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="searchTerm" className="text-right col-span-1">Search</Label>
                  <Input 
                    id="searchTerm" 
                    value={tempFilters.searchTerm}
                    onChange={(e) => setTempFilters(prev => ({...prev, searchTerm: e.target.value}))}
                    placeholder="Description..."
                    className="col-span-3" 
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="startDate" className="text-right col-span-1">Start Date</Label>
                  <Input 
                    id="startDate" 
                    type="date" 
                    value={tempFilters.startDate}
                    onChange={(e) => setTempFilters(prev => ({...prev, startDate: e.target.value}))}
                    className="col-span-3" 
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="endDate" className="text-right col-span-1">End Date</Label>
                  <Input 
                    id="endDate" 
                    type="date" 
                    value={tempFilters.endDate}
                    onChange={(e) => setTempFilters(prev => ({...prev, endDate: e.target.value}))}
                    className="col-span-3" 
                  />
                </div>
                 <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="category" className="text-right col-span-1">Category</Label>
                  <Select value={tempFilters.category} onValueChange={(value) => setTempFilters(prev => ({...prev, category: value}))}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Any Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Any Category</SelectItem>
                      {uniqueCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                 <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="minAmount" className="text-right col-span-1">Min Amount</Label>
                  <Input 
                    id="minAmount" 
                    type="number"
                    placeholder="0.00"
                    value={tempFilters.minAmount}
                    onChange={(e) => setTempFilters(prev => ({...prev, minAmount: e.target.value}))}
                    className="col-span-3" 
                  />
                </div>
                 <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="maxAmount" className="text-right col-span-1">Max Amount</Label>
                  <Input 
                    id="maxAmount" 
                    type="number"
                    placeholder="e.g., 100.00"
                    value={tempFilters.maxAmount}
                    onChange={(e) => setTempFilters(prev => ({...prev, maxAmount: e.target.value}))}
                    className="col-span-3" 
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="group" className="text-right col-span-1">Group</Label>
                  <Select value={tempFilters.groupId} onValueChange={(value) => setTempFilters(prev => ({...prev, groupId: value}))}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Any Group" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Any Group / Personal</SelectItem>
                      <SelectItem value="personal">Personal Expense (No Group)</SelectItem>
                      {userGroups.map(group => <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <hr className="my-2"/>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="sortBy" className="text-right col-span-1">Sort By</Label>
                  <Select value={tempSort.sortBy} onValueChange={(value) => setTempSort(prev => ({...prev, sortBy: value as SortCriteria['sortBy']}))}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Sort By" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date">Date</SelectItem>
                      <SelectItem value="amount">Amount</SelectItem>
                      <SelectItem value="description">Description</SelectItem>
                      <SelectItem value="category">Category</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="sortOrder" className="text-right col-span-1">Order</Label>
                  <Select value={tempSort.sortOrder} onValueChange={(value) => setTempSort(prev => ({...prev, sortOrder: value as 'asc' | 'desc'}))}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Order" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="asc">Ascending</SelectItem>
                      <SelectItem value="desc">Descending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={handleClearFilters} className="mr-auto">
                  <XCircle className="mr-2 h-4 w-4" /> Clear Filters
                </Button>
                <DialogClose asChild>
                  <Button type="button" variant="outline">Cancel</Button>
                </DialogClose>
                <Button type="button" onClick={handleApplyFiltersFromDialog}>
                  <RefreshCw className="mr-2 h-4 w-4" /> Apply
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

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
          <CardDescription>
            {filteredAndSortedExpenses.length} of {allExpenses.length} expenses shown.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-2 text-muted-foreground">Loading expenses...</p>
            </div>
          ) : allExpenses.length === 0 ? (
             <div className="text-center py-10">
              <p className="text-muted-foreground text-lg">No expenses recorded yet.</p>
              <p className="text-sm text-muted-foreground mt-2">Start by adding your first expense!</p>
              <Button asChild className="mt-4">
                <Link href="/expenses/add">Add Expense</Link>
              </Button>
            </div>
          ) : filteredAndSortedExpenses.length === 0 && allExpenses.length > 0 ? (
            <div className="text-center py-10">
                <p className="text-muted-foreground text-lg">No expenses match your current filters.</p>
                <p className="text-sm text-muted-foreground mt-2">Try adjusting your filter criteria or clear filters.</p>
                 <Button variant="outline" onClick={handleClearFilters} className="mt-4">
                  <XCircle className="mr-2 h-4 w-4" /> Clear Filters
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
                {filteredAndSortedExpenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell className="font-medium max-w-xs truncate" title={expense.description}>{expense.description}</TableCell>
                    <TableCell className="text-right">{formatCurrency(expense.amount)}</TableCell>
                    <TableCell>{expense.category}</TableCell>
                    <TableCell>{format(parseISO(expense.date), "MMM dd, yyyy")}</TableCell>
                    <TableCell>
                      {expense.groupName ? (
                        <Badge variant="secondary" className="flex items-center gap-1 max-w-fit text-xs">
                          <Users className="h-3 w-3" />
                          {expense.groupName}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">Personal</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="mr-1" onClick={() => expense.id && handleEdit(expense.id)}>
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

    