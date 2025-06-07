
"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, Loader2, CreditCard, Landmark } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { getIncomeById, updateIncome } from "@/lib/firebase/firestore";
import type { IncomeFormData, Income, CurrencyCode } from "@/lib/types";
import { SUPPORTED_CURRENCIES } from "@/lib/types";
import { format, parseISO } from "date-fns";

const incomeSchema = z.object({
  source: z.string().min(1, "Source is required"),
  amount: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
    message: "Amount must be a positive number",
  }),
  currency: z.custom<CurrencyCode>((val) => SUPPORTED_CURRENCIES.some(c => c.code === val), {
    message: "Invalid currency selected",
  }),
  date: z.string().min(1, "Date is required"),
  notes: z.string().optional(),
});

export default function EditIncomePage() {
  const router = useRouter();
  const params = useParams();
  const incomeId = params.incomeId as string;

  const { toast } = useToast();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<IncomeFormData>({
    resolver: zodResolver(incomeSchema),
    defaultValues: {
      source: "",
      amount: "",
      currency: "USD",
      date: format(new Date(), "yyyy-MM-dd"),
      notes: "",
    },
  });

  const fetchIncomeData = useCallback(async () => {
    if (!user || !incomeId) return;
    setIsLoading(true);
    try {
      const incomeData = await getIncomeById(incomeId);
      if (incomeData) {
        if (incomeData.userId !== user.uid) {
          toast({ variant: "destructive", title: "Unauthorized", description: "You do not have permission to edit this income record." });
          router.push("/income");
          return;
        }
        form.reset({
          source: incomeData.source,
          amount: String(incomeData.amount),
          currency: incomeData.currency || "USD",
          date: incomeData.date, // Already in YYYY-MM-DD from firestore.ts
          notes: incomeData.notes || "",
        });
      } else {
        toast({ variant: "destructive", title: "Not Found", description: "Income record not found." });
        router.push("/income");
      }
    } catch (error) {
      console.error("Failed to fetch income:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not load income details." });
    } finally {
      setIsLoading(false);
    }
  }, [user, incomeId, form, router, toast]);

  useEffect(() => {
    fetchIncomeData();
  }, [fetchIncomeData]);

  async function onSubmit(values: IncomeFormData) {
    if (!user || !incomeId) return;
    setIsSubmitting(true);
    try {
      await updateIncome(incomeId, values);
      toast({
        title: "Income Updated",
        description: "Your income record has been successfully updated.",
      });
      router.push("/income");
    } catch (error) {
      console.error("Failed to update income:", error);
      toast({
        variant: "destructive",
        title: "Failed to Update Income",
        description: "An error occurred while saving your changes. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">Loading income details...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/income">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back to Income</span>
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline text-foreground">Edit Income</h1>
          <p className="text-muted-foreground">Modify your income details below.</p>
        </div>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline flex items-center">
            <CreditCard className="mr-2 h-5 w-5 text-primary"/> Income Details
          </CardTitle>
          <CardDescription>Update the information for your income record.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="source"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Source</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Salary, Freelance Project" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="e.g., 1000.00" {...field} />
                      </FormControl>
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
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select currency" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {SUPPORTED_CURRENCIES.map(curr => (
                            <SelectItem key={curr.code} value={curr.code}>
                              {curr.code} - {curr.name}
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
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date Received</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Add any relevant notes here..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" asChild type="button" disabled={isSubmitting}>
                  <Link href="/income">Cancel</Link>
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save Changes
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
