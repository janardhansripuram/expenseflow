
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
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Save, Loader2, Users, CalendarDays, RefreshCcw, TagsIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { getExpenseById, updateExpense, getGroupsForUser } from "@/lib/firebase/firestore";
import type { Expense, ExpenseFormData, Group, RecurrenceType } from "@/lib/types";
import { format, parseISO } from "date-fns";

const PERSONAL_GROUP_VALUE = "___PERSONAL___";

const recurrenceOptions: { value: RecurrenceType; label: string }[] = [
  { value: "none", label: "None" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

const expenseSchema = z.object({
  description: z.string().min(1, "Description is required"),
  amount: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
    message: "Amount must be a positive number",
  }),
  category: z.string().min(1, "Category is required"),
  date: z.string().min(1, "Date is required"),
  notes: z.string().optional(),
  groupId: z.string().optional(),
  isRecurring: z.boolean().optional(),
  recurrence: z.custom<RecurrenceType>((val) => recurrenceOptions.map(o => o.value).includes(val as string)).optional(),
  recurrenceEndDate: z.string().optional().refine(val => !val || !isNaN(new Date(val).valueOf()), {
    message: "Invalid date format for recurrence end date"
  }),
  tags: z.string().optional(), // Comma-separated string
}).superRefine((data, ctx) => {
  if (data.isRecurring) {
    if (!data.recurrence || data.recurrence === "none") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Recurrence frequency (e.g., daily, weekly) is required for recurring expenses.",
        path: ["recurrence"],
      });
    }
    if (data.recurrenceEndDate && data.date && parseISO(data.recurrenceEndDate) < parseISO(data.date)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Recurrence end date cannot be before the expense date.",
            path: ["recurrenceEndDate"],
        });
    }
  } else {
    if (data.recurrence && data.recurrence !== "none") {
         ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "If a recurrence frequency is selected, please mark the expense as recurring.",
            path: ["isRecurring"],
        });
    }
    if (data.recurrenceEndDate) {
         ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Recurrence end date should only be set for recurring expenses.",
            path: ["recurrenceEndDate"],
        });
    }
  }
});

export default function EditExpensePage() {
  const router = useRouter();
  const params = useParams();
  const expenseId = params.expenseId as string;

  const { toast } = useToast();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userGroups, setUserGroups] = useState<Group[]>([]);
  const [isLoadingGroups, setIsLoadingGroups] = useState(true);

  const form = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      description: "",
      amount: "",
      category: "",
      date: format(new Date(), "yyyy-MM-dd"),
      notes: "",
      groupId: "",
      isRecurring: false,
      recurrence: "none",
      recurrenceEndDate: "",
      tags: "",
    },
  });

  const isRecurringWatch = form.watch("isRecurring");
  const recurrenceWatch = form.watch("recurrence");

  const fetchExpenseData = useCallback(async () => {
    if (!user || !expenseId) return;
    setIsLoading(true);
    setIsLoadingGroups(true);

    try {
      const expenseDataPromise = getExpenseById(expenseId);
      const groupsPromise = getGroupsForUser(user.uid);

      const [expense, groups] = await Promise.all([expenseDataPromise, groupsPromise]);

      setUserGroups(groups || []);

      if (expense) {
        if (expense.userId !== user.uid) {
          toast({ variant: "destructive", title: "Unauthorized", description: "You do not have permission to edit this expense." });
          router.push("/expenses");
          return;
        }
        form.reset({
          description: expense.description,
          amount: String(expense.amount),
          category: expense.category,
          date: expense.date,
          notes: expense.notes || "",
          groupId: expense.groupId || "",
          isRecurring: expense.isRecurring || false,
          recurrence: expense.recurrence || "none",
          recurrenceEndDate: expense.recurrenceEndDate || "",
          tags: expense.tags ? expense.tags.join(", ") : "", // Join tags array to string for input
        });
      } else {
        toast({ variant: "destructive", title: "Not Found", description: "Expense not found." });
        router.push("/expenses");
      }
    } catch (error) {
      console.error("Failed to fetch expense or groups:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not load expense details." });
    } finally {
      setIsLoading(false);
      setIsLoadingGroups(false);
    }
  }, [user, expenseId, form, router, toast]);

  useEffect(() => {
    fetchExpenseData();
  }, [fetchExpenseData]);

  async function onSubmit(values: ExpenseFormData) {
    if (!user || !expenseId) return;
    setIsSubmitting(true);

    let dataToSave: Partial<ExpenseFormData> = { ...values };

    if (values.groupId && values.groupId !== PERSONAL_GROUP_VALUE) {
      const selectedGroup = userGroups.find(g => g.id === values.groupId);
      if (selectedGroup) {
        dataToSave.groupName = selectedGroup.name;
      } else {
        dataToSave.groupId = null;
        dataToSave.groupName = null;
      }
    } else {
      dataToSave.groupId = null;
      dataToSave.groupName = null;
    }

    if (!values.isRecurring) {
      dataToSave.recurrence = "none";
      dataToSave.recurrenceEndDate = undefined; // Will be saved as null or removed by firestore.ts
    } else {
       if (values.recurrence === "none") dataToSave.recurrence = "monthly"; // Default if somehow 'none' with isRecurring true
       if (!values.recurrenceEndDate || values.recurrence === "none") {
        dataToSave.recurrenceEndDate = undefined;
      }
    }

    try {
      await updateExpense(expenseId, dataToSave);
      toast({
        title: "Expense Updated",
        description: "Your expense has been successfully updated.",
      });
      router.push("/expenses");
    } catch (error) {
      console.error("Failed to update expense:", error);
      toast({
        variant: "destructive",
        title: "Failed to Update Expense",
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
        <p className="ml-2 text-muted-foreground">Loading expense details...</p>
      </div>
    );
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
          <h1 className="text-3xl font-bold tracking-tight font-headline text-foreground">Edit Expense</h1>
          <p className="text-muted-foreground">Modify your expense details below.</p>
        </div>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline">Expense Details</CardTitle>
          <CardDescription>Update the information for your expense.</CardDescription>
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
                      <Select onValueChange={field.onChange} value={field.value}>
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
                      value={field.value || ""}
                      disabled={isLoadingGroups}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={isLoadingGroups ? "Loading groups..." : "Personal Expense (No Group)"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={PERSONAL_GROUP_VALUE}>Personal Expense (No Group)</SelectItem>
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

              <FormField
                control={form.control}
                name="tags"
                render={({ field }) => (
                  <FormItem>
                     <FormLabel className="flex items-center">
                       <TagsIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                       Tags (Optional, comma-separated)
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., work, travel, project-alpha" {...field} />
                    </FormControl>
                     <FormDescription>Separate tags with a comma.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Card className="p-4 bg-muted/30 border-dashed">
                <FormField
                  control={form.control}
                  name="isRecurring"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="font-medium text-base flex items-center gap-1">
                        <RefreshCcw className="h-4 w-4 text-primary"/>
                        Is this a recurring expense?
                      </FormLabel>
                    </FormItem>
                  )}
                />
                {isRecurringWatch && (
                  <div className="space-y-4 mt-4 pl-2 border-l-2 border-primary/50 ml-2">
                    <FormField
                      control={form.control}
                      name="recurrence"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Recurrence Frequency</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || "none"}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select frequency" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                               {recurrenceOptions.filter(opt => opt.value !== "none").map(opt => (
                                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="recurrenceEndDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-1">
                            <CalendarDays className="h-4 w-4 text-muted-foreground"/>
                            Recurrence End Date (Optional)
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="date"
                              {...field}
                              disabled={!isRecurringWatch || recurrenceWatch === "none"}
                              min={form.getValues("date")}
                            />
                          </FormControl>
                          <FormDescription>Leave blank if it recurs indefinitely.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}
              </Card>

              <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" asChild type="button">
                      <Link href="/expenses">Cancel</Link>
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
