
"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ListChecks, PlusCircle, Trash2, CalendarIcon, Edit, Loader2, BellRing, CheckCircle2, AlertTriangle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { addReminder, getRemindersByUser, updateReminderCompletion, deleteReminder, updateReminder } from "@/lib/firebase/firestore";
import type { Reminder, ReminderFormData, RecurrenceType } from "@/lib/types";
import { format, parseISO, isToday, isPast, compareAsc, compareDesc, startOfDay } from "date-fns";
import { cn } from "@/lib/utils";

const reminderSchema = z.object({
  title: z.string().min(1, "Title is required"),
  notes: z.string().optional(),
  dueDate: z.string().refine((date) => !isNaN(new Date(date).valueOf()), {
    message: "Valid date is required",
  }),
  recurrence: z.custom<RecurrenceType>((val) => ["none", "daily", "weekly", "monthly", "yearly"].includes(val as string), {
    message: "Invalid recurrence type",
  }),
});

export default function RemindersPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProcessing, setIsProcessing] = useState<string | null>(null); // Reminder ID being processed
  
  const [isReminderDialogOpen, setIsReminderDialogOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);


  const form = useForm<ReminderFormData>({
    resolver: zodResolver(reminderSchema),
    defaultValues: {
      title: "",
      notes: "",
      dueDate: format(new Date(), "yyyy-MM-dd"),
      recurrence: "none",
    },
  });

  const fetchReminders = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const userReminders = await getRemindersByUser(user.uid);
      setReminders(userReminders);
    } catch (error) {
      console.error("Error fetching reminders:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not load reminders." });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchReminders();
  }, [fetchReminders]);
  
  useEffect(() => {
    if (editingReminder) {
      form.reset({
        title: editingReminder.title,
        notes: editingReminder.notes || "",
        dueDate: editingReminder.dueDate, // Already in yyyy-MM-dd format
        recurrence: editingReminder.recurrence,
      });
    } else {
      form.reset({
        title: "",
        notes: "",
        dueDate: format(new Date(), "yyyy-MM-dd"),
        recurrence: "none",
      });
    }
  }, [editingReminder, form, isReminderDialogOpen]);


  const handleFormSubmit = async (values: ReminderFormData) => {
    if (!user) return;
    setIsSubmitting(true);
    try {
      if (editingReminder && editingReminder.id) {
        await updateReminder(editingReminder.id, values);
        toast({ title: "Reminder Updated", description: "Your reminder has been successfully updated." });
      } else {
        await addReminder(user.uid, values);
        toast({ title: "Reminder Added", description: "Your reminder has been set." });
      }
      form.reset({ title: "", notes: "", dueDate: format(new Date(), "yyyy-MM-dd"), recurrence: "none" });
      setIsReminderDialogOpen(false);
      setEditingReminder(null);
      fetchReminders();
    } catch (error) {
      console.error("Error saving reminder:", error);
      toast({ variant: "destructive", title: "Error", description: `Could not ${editingReminder ? 'update' : 'add'} reminder.` });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openAddReminderDialog = () => {
    setEditingReminder(null);
    setIsReminderDialogOpen(true);
  };

  const openEditReminderDialog = (reminder: Reminder) => {
    setEditingReminder(reminder);
    setIsReminderDialogOpen(true);
  };

  const handleToggleComplete = async (reminderId: string, currentStatus: boolean) => {
    setIsProcessing(reminderId);
    try {
      await updateReminderCompletion(reminderId, !currentStatus);
      toast({ title: "Reminder Updated", description: `Reminder marked as ${!currentStatus ? "complete" : "pending"}.` });
      fetchReminders();
    } catch (error) {
      console.error("Error updating reminder:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not update reminder status." });
    } finally {
      setIsProcessing(null);
    }
  };

  const handleDeleteReminder = async (reminderId: string) => {
    setIsProcessing(reminderId);
    try {
      await deleteReminder(reminderId);
      toast({ title: "Reminder Deleted", description: "The reminder has been removed." });
      fetchReminders();
    } catch (error) {
      console.error("Error deleting reminder:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not delete reminder." });
    } finally {
      setIsProcessing(null);
    }
  };

  const recurrenceOptions: { value: RecurrenceType; label: string }[] = [
    { value: "none", label: "None" },
    { value: "daily", label: "Daily" },
    { value: "weekly", label: "Weekly" },
    { value: "monthly", label: "Monthly" },
    { value: "yearly", label: "Yearly" },
  ];

  const sortedReminders = useMemo(() => {
    const today = startOfDay(new Date());
    return [...reminders].sort((a, b) => {
      const aDueDate = parseISO(a.dueDate);
      const bDueDate = parseISO(b.dueDate);

      // Sort by completion status first (incomplete before complete)
      if (a.isCompleted !== b.isCompleted) {
        return a.isCompleted ? 1 : -1;
      }

      // For incomplete reminders:
      if (!a.isCompleted) {
        const aIsOverdue = isPast(aDueDate) && !isToday(aDueDate);
        const bIsOverdue = isPast(bDueDate) && !isToday(bDueDate);
        const aIsDueToday = isToday(aDueDate);
        const bIsDueToday = isToday(bDueDate);

        if (aIsOverdue !== bIsOverdue) return aIsOverdue ? -1 : 1; // Overdue first
        if (aIsOverdue && bIsOverdue) return compareAsc(aDueDate, bDueDate); // Sort overdue by date

        if (aIsDueToday !== bIsDueToday) return aIsDueToday ? -1 : 1; // Due today after overdue
        // (No specific sort for due today if multiple, could add title sort)

        return compareAsc(aDueDate, bDueDate); // Then upcoming by date
      }

      // For completed reminders (sort by due date, most recent first)
      return compareDesc(aDueDate, bDueDate);
    });
  }, [reminders]);
  
  const getReminderStatus = (reminder: Reminder): { status: 'overdue' | 'dueToday' | 'upcoming' | 'completed', cardClass: string } => {
    if (reminder.isCompleted) {
      return { status: 'completed', cardClass: "bg-muted/50 opacity-70 border-muted" };
    }
    const dueDate = parseISO(reminder.dueDate);
    if (isPast(dueDate) && !isToday(dueDate)) {
      return { status: 'overdue', cardClass: "border-destructive/70 bg-destructive/5 hover:border-destructive" };
    }
    if (isToday(dueDate)) {
      return { status: 'dueToday', cardClass: "border-amber-500/70 bg-amber-500/5 hover:border-amber-500" };
    }
    return { status: 'upcoming', cardClass: "border-border" };
  };


  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline text-foreground">Reminders</h1>
          <p className="text-muted-foreground">Set up reminders for upcoming bills or payments.</p>
        </div>
        <Button onClick={openAddReminderDialog}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Reminder
        </Button>
      </div>

      <Dialog open={isReminderDialogOpen} onOpenChange={(isOpen) => {
          setIsReminderDialogOpen(isOpen);
          if (!isOpen) setEditingReminder(null); 
      }}>
        <DialogContent className="sm:max-w-lg">
        <DialogHeader>
            <DialogTitle>{editingReminder ? "Edit Reminder" : "Create New Reminder"}</DialogTitle>
            <DialogDescription>
            {editingReminder ? "Update the details for your reminder." : "Fill in the details for your new reminder."}
            </DialogDescription>
        </DialogHeader>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 py-4">
            <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                    <Input placeholder="e.g., Pay Rent" {...field} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                <FormItem className="flex flex-col">
                    <FormLabel>Due Date</FormLabel>
                    <Popover>
                    <PopoverTrigger asChild>
                        <FormControl>
                        <Button
                            variant={"outline"}
                            className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                            )}
                        >
                            {field.value ? (
                            format(parseISO(field.value), "PPP")
                            ) : (
                            <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                        </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                        mode="single"
                        selected={field.value ? parseISO(field.value) : undefined}
                        onSelect={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : "")}
                        disabled={(date) => date < startOfDay(new Date()) } // Disable past dates
                        initialFocus
                        />
                    </PopoverContent>
                    </Popover>
                    <FormMessage />
                </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="recurrence"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Recurrence</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                        <SelectTrigger>
                        <SelectValue placeholder="Select recurrence" />
                        </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        {recurrenceOptions.map(opt => (
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
            <DialogFooter className="pt-2">
                <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
                </DialogClose>
                <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (editingReminder ? <Edit className="mr-2 h-4 w-4" /> : <PlusCircle className="mr-2 h-4 w-4" />)}
                {editingReminder ? "Save Changes" : "Save Reminder"}
                </Button>
            </DialogFooter>
            </form>
        </Form>
        </DialogContent>
      </Dialog>


      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline flex items-center">
            <BellRing className="mr-2 h-6 w-6 text-primary" />
            Your Reminders
          </CardTitle>
          <CardDescription>Manage your upcoming and past reminders.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-2 text-muted-foreground">Loading reminders...</p>
            </div>
          ) : sortedReminders.length === 0 ? (
            <div className="text-center py-10">
              <CheckCircle2 className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-4 text-lg text-muted-foreground">No reminders set yet.</p>
              <p className="text-sm text-muted-foreground mt-2">Looks like you're all caught up! Click "Add Reminder" to create a new one.</p>
              <Button className="mt-6" onClick={openAddReminderDialog}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Your First Reminder
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {sortedReminders.map((reminder) => {
                const { status, cardClass } = getReminderStatus(reminder);
                return (
                    <Card key={reminder.id} className={cn("shadow-sm transition-all", cardClass)}>
                    <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                            <div className="flex-grow">
                                <CardTitle className={cn("text-lg", reminder.isCompleted && "line-through text-muted-foreground")}>
                                    {reminder.title}
                                </CardTitle>
                                <CardDescription>
                                Due: {format(parseISO(reminder.dueDate), "PPP")}
                                {status === 'overdue' && !reminder.isCompleted && <span className="ml-2 text-xs font-semibold text-destructive">(Overdue)</span>}
                                {status === 'dueToday' && !reminder.isCompleted && <span className="ml-2 text-xs font-semibold text-amber-600">(Due Today)</span>}
                                {reminder.recurrence !== "none" && (
                                    <span className="ml-2 capitalize text-xs p-1 bg-secondary text-secondary-foreground rounded-sm">
                                    {reminder.recurrence}
                                    </span>
                                )}
                                </CardDescription>
                            </div>
                            <Checkbox
                                checked={reminder.isCompleted}
                                onCheckedChange={() => reminder.id && handleToggleComplete(reminder.id, reminder.isCompleted)}
                                disabled={isProcessing === reminder.id}
                                aria-label={`Mark reminder "${reminder.title}" as ${reminder.isCompleted ? 'pending' : 'complete'}`}
                                className="ml-4 h-5 w-5 flex-shrink-0"
                            />
                        </div>
                    </CardHeader>
                    {reminder.notes && (
                        <CardContent className="py-2">
                        <p className="text-sm text-muted-foreground">{reminder.notes}</p>
                        </CardContent>
                    )}
                    <CardFooter className="flex justify-end gap-2 pt-2">
                        <Button variant="outline" size="sm" onClick={() => reminder.id && openEditReminderDialog(reminder)} disabled={isProcessing === reminder.id || reminder.isCompleted}>
                        <Edit className="mr-1.5 h-3.5 w-3.5" /> Edit
                        </Button>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button 
                                    variant="ghost" 
                                    size="icon"
                                    className="text-destructive hover:text-destructive/80 h-8 w-8" 
                                    disabled={isProcessing === reminder.id}
                                    aria-label={`Delete reminder "${reminder.title}"`}
                                >
                                    {isProcessing === reminder.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Reminder?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete the reminder titled &quot;{reminder.title}&quot;.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => reminder.id && handleDeleteReminder(reminder.id)} className="bg-destructive hover:bg-destructive/90">
                                    Delete
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </CardFooter>
                    </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
