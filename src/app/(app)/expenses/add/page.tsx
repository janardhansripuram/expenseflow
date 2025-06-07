
"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ArrowLeft, Save, Paperclip, Loader2, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { addExpense, getGroupsForUser } from "@/lib/firebase/firestore";
import type { ExpenseFormData, Group } from "@/lib/types";
import { format } from "date-fns";
import React, { useEffect, useState } from "react";

const expenseSchema = z.object({
  description: z.string().min(1, "Description is required"),
  amount: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
    message: "Amount must be a positive number",
  }),
  category: z.string().min(1, "Category is required"),
  date: z.string().min(1, "Date is required"),
  notes: z.string().optional(),
  groupId: z.string().optional(),
});

export default function AddExpensePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userGroups, setUserGroups] = useState<Group[]>([]);
  const [isLoadingGroups, setIsLoadingGroups] = useState(true);

  const form = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      description: "",
      amount: "",
      category: "",
      date: format(new Date(), "yyyy-MM-dd"), // Default to today
      notes: "",
      groupId: "",
    },
  });

  useEffect(() => {
    async function fetchGroups() {
      if (user) {
        setIsLoadingGroups(true);
        try {
          const groups = await getGroupsForUser(user.uid);
          setUserGroups(groups);
        } catch (error) {
          console.error("Failed to fetch user groups:", error);
          toast({
            variant: "destructive",
            title: "Error Loading Groups",
            description: "Could not load your groups for selection.",
          });
        } finally {
          setIsLoadingGroups(false);
        }
      }
    }
    fetchGroups();
  }, [user, toast]);

  useEffect(() => {
    const groupIdFromParams = searchParams.get("groupId");
    if (groupIdFromParams && userGroups.length > 0) {
      const groupExists = userGroups.some(group => group.id === groupIdFromParams);
      if (groupExists) {
        form.setValue("groupId", groupIdFromParams);
      }
    }
  }, [searchParams, userGroups, form]);


  async function onSubmit(values: ExpenseFormData) {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Authentication Error",
        description: "You must be logged in to add an expense.",
      });
      return;
    }
    setIsSubmitting(true);

    let dataToSave: ExpenseFormData = { ...values };
    if (values.groupId) {
      const selectedGroup = userGroups.find(g => g.id === values.groupId);
      if (selectedGroup) {
        dataToSave.groupName = selectedGroup.name;
      }
    } else {
      // Ensure groupId and groupName are not sent if no group is selected or "None"
      dataToSave.groupId = undefined;
      dataToSave.groupName = undefined;
    }


    try {
      await addExpense(user.uid, dataToSave);
      toast({
        title: "Expense Added",
        description: "Your expense has been successfully recorded.",
      });
      form.reset({ // Reset to defaults, clearing any pre-filled group
          description: "",
          amount: "",
          category: "",
          date: format(new Date(), "yyyy-MM-dd"),
          notes: "",
          groupId: "",
      }); 
      router.push("/expenses"); // Navigate to expenses list
    } catch (error) {
      console.error("Failed to add expense:", error);
      toast({
        variant: "destructive",
        title: "Failed to Add Expense",
        description: "An error occurred while saving your expense. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/expenses">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back to Expenses</span>
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline text-foreground">Add New Expense</h1>
          <p className="text-muted-foreground">Manually enter your expense details below.</p>
        </div>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline">Expense Details</CardTitle>
          <CardDescription>Fill in the information for your new expense.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Coffee with client" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="e.g., 5.00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
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
                 <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="groupId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center">
                      <Users className="mr-2 h-4 w-4 text-muted-foreground" />
                      Assign to Group (Optional)
                    </FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value || ""} // Ensure value is controlled
                      disabled={isLoadingGroups || userGroups.length === 0}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={isLoadingGroups ? "Loading groups..." : "Personal Expense (No Group)"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">Personal Expense (No Group)</SelectItem>
                        {userGroups.map(group => (
                          <SelectItem key={group.id} value={group.id}>
                            {group.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {userGroups.length === 0 && !isLoadingGroups && (
                        <p className="text-xs text-muted-foreground">No groups found. Create one on the <Link href="/groups" className="underline">Groups page</Link>.</p>
                    )}
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

              <div className="space-y-2">
                  <Label htmlFor="receipt">Receipt (Optional)</Label>
                  <Input id="receipt" type="file" disabled />
                  <p className="text-xs text-muted-foreground">Receipt scanning/upload will be available via the OCR page.</p>
              </div>
              
              <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" asChild type="button">
                      <Link href="/expenses">Cancel</Link>
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                      Save Expense
                  </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
       <Card className="shadow-lg mt-6">
        <CardHeader>
            <CardTitle className="font-headline">Scan Receipt (OCR)</CardTitle>
            <CardDescription>Automatically fill details by scanning your receipt.</CardDescription>
        </CardHeader>
        <CardContent>
            <Button className="w-full" variant="secondary" asChild>
                <Link href="/expenses/scan">
                  <Paperclip className="mr-2 h-4 w-4" /> Scan with OCR
                </Link>
            </Button>
        </CardContent>
       </Card>
    </div>
  );
}

