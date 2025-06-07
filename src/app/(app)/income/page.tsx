
"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, Loader2, Edit, Trash2, TrendingUp } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getIncomeByUser, deleteIncome } from "@/lib/firebase/firestore";
import type { Income, CurrencyCode } from "@/lib/types";
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
import { format, parseISO } from "date-fns";

export default function IncomePage() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [incomeList, setIncomeList] = useState<Income[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const fetchIncomeData = useCallback(async () => {
    if (user) {
      setIsLoading(true);
      try {
        const userIncome = await getIncomeByUser(user.uid);
        setIncomeList(userIncome);
      } catch (error) {
        console.error("Failed to fetch income data:", error);
        toast({
          variant: "destructive",
          title: "Error Loading Income",
          description: "Could not load your income records. Please try again.",
        });
      } finally {
        setIsLoading(false);
      }
    } else {
      setIncomeList([]);
      setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchIncomeData();
  }, [fetchIncomeData]);

  const handleDelete = async (incomeId: string) => {
    if (!incomeId) return;
    setIsDeleting(incomeId);
    try {
      await deleteIncome(incomeId);
      toast({
        title: "Income Deleted",
        description: "The income record has been successfully deleted.",
      });
      fetchIncomeData(); // Refresh the list
    } catch (error) {
      console.error("Failed to delete income:", error);
      toast({
        variant: "destructive",
        title: "Error Deleting Income",
        description: "Could not delete the income record. Please try again.",
      });
    } finally {
      setIsDeleting(null);
    }
  };

  const handleEdit = (incomeId: string) => {
    if (!incomeId) return;
    router.push(`/income/edit/${incomeId}`);
  };

  const formatCurrency = (amount: number, currencyCode: CurrencyCode = 'USD') => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currencyCode }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline text-foreground">My Income</h1>
          <p className="text-muted-foreground">View and manage your recorded income.</p>
        </div>
        <Button asChild>
          <Link href="/income/add">
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Income
          </Link>
        </Button>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline flex items-center">
            <TrendingUp className="mr-2 h-5 w-5 text-primary" />
            Income List
          </CardTitle>
          <CardDescription>
            {incomeList.length} income record{incomeList.length === 1 ? "" : "s"} found.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-2 text-muted-foreground">Loading income...</p>
            </div>
          ) : incomeList.length === 0 ? (
            <div className="text-center py-10">
              <TrendingUp className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground text-lg mt-4">No income recorded yet.</p>
              <p className="text-sm text-muted-foreground mt-2">Start by adding your first income record!</p>
              <Button asChild className="mt-4">
                <Link href="/income/add">Add Income</Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Source</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {incomeList.map((incomeItem) => (
                  <TableRow key={incomeItem.id}>
                    <TableCell className="font-medium max-w-xs truncate" title={incomeItem.source}>{incomeItem.source}</TableCell>
                    <TableCell className="text-right font-semibold">{formatCurrency(incomeItem.amount, incomeItem.currency)}</TableCell>
                    <TableCell>{format(parseISO(incomeItem.date), "MMM dd, yyyy")}</TableCell>
                    <TableCell className="max-w-sm truncate" title={incomeItem.notes}>{incomeItem.notes || "-"}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="mr-1" onClick={() => incomeItem.id && handleEdit(incomeItem.id)}>
                        <Edit className="h-4 w-4" />
                        <span className="sr-only">Edit</span>
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" disabled={isDeleting === incomeItem.id}>
                            {isDeleting === incomeItem.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 text-destructive" />}
                            <span className="sr-only">Delete</span>
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently delete this income record.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => incomeItem.id && handleDelete(incomeItem.id)} className="bg-destructive hover:bg-destructive/90">
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
