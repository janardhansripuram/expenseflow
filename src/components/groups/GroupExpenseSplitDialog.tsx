
"use client";

import React, { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, Users, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import type { Expense, Group, SplitParticipant, UserProfile } from "@/lib/types";
import { createSplitExpense } from "@/lib/firebase/firestore";
import { Timestamp } from "firebase/firestore";

interface GroupExpenseSplitDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  expenseToSplit: Expense | null;
  group: Group | null;
  currentUserProfile: UserProfile | null;
}

export function GroupExpenseSplitDialog({
  isOpen,
  onOpenChange,
  expenseToSplit,
  group,
  currentUserProfile,
}: GroupExpenseSplitDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth(); // Current logged-in user
  const [isSavingSplit, setIsSavingSplit] = useState(false);

  const payerProfile = useMemo(() => {
    if (!expenseToSplit || !group) return null;
    return group.memberDetails.find(m => m.uid === expenseToSplit.userId);
  }, [expenseToSplit, group]);

  const numberOfParticipants = group?.memberIds.length || 0;
  const amountPerPerson = useMemo(() => {
    if (expenseToSplit && numberOfParticipants > 0) {
      return expenseToSplit.amount / numberOfParticipants;
    }
    return 0;
  }, [expenseToSplit, numberOfParticipants]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const getInitials = (name?: string, email?: string) => {
    if (name) {
      const parts = name.split(' ');
      if (parts.length > 1 && parts[0] && parts[1]) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      if (parts[0]) return parts[0].substring(0,2).toUpperCase();
    }
    if (email) return email.substring(0,2).toUpperCase();
    return '??';
  };

  const handleSaveSplit = async () => {
    if (!expenseToSplit || !group || !payerProfile || !user || !currentUserProfile) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Missing necessary data to save the split.",
      });
      return;
    }
    if (numberOfParticipants <= 0) {
        toast({
            variant: "destructive",
            title: "Error",
            description: "Cannot split with zero participants.",
        });
        return;
    }

    setIsSavingSplit(true);

    const participants: SplitParticipant[] = group.memberDetails.map(member => ({
      userId: member.uid,
      displayName: member.displayName || member.email,
      email: member.email,
      amountOwed: amountPerPerson,
      isSettled: member.uid === expenseToSplit.userId, // Payer is settled
    }));
    
    const splitData = {
      originalExpenseId: expenseToSplit.id!,
      originalExpenseDescription: expenseToSplit.description,
      splitType: "equally" as "equally",
      totalAmount: expenseToSplit.amount,
      paidBy: expenseToSplit.userId, // The user who originally paid for the group expense
      participants: participants,
      notes: `Split of group expense: "${expenseToSplit.description}" for group "${group.name}"`,
    };

    try {
      await createSplitExpense(splitData);
      toast({
        title: "Split Saved",
        description: `Expense "${expenseToSplit.description}" has been successfully split among group members.`,
      });
      onOpenChange(false); // Close dialog on success
    } catch (error) {
      console.error("Error saving group expense split:", error);
      toast({
        variant: "destructive",
        title: "Failed to Save Split",
        description: "An error occurred while saving the split. Please try again.",
      });
    } finally {
      setIsSavingSplit(false);
    }
  };

  if (!expenseToSplit || !group) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Split Group Expense: {expenseToSplit.description}</DialogTitle>
          <DialogDescription>
            This expense will be split equally among all {group.memberIds.length} members of &quot;{group.name}&quot;.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
            <div>
                <Label className="font-semibold">Total Amount:</Label>
                <p className="text-2xl font-bold text-primary">{formatCurrency(expenseToSplit.amount)}</p>
            </div>
             <div>
                <Label className="font-semibold">Paid By:</Label>
                <div className="flex items-center gap-2 mt-1">
                    <Avatar className="h-8 w-8">
                        <AvatarImage src={`https://placehold.co/40x40.png?text=${getInitials(payerProfile?.displayName, payerProfile?.email)}`} alt={payerProfile?.displayName || payerProfile?.email} data-ai-hint="person avatar" />
                        <AvatarFallback>{getInitials(payerProfile?.displayName, payerProfile?.email)}</AvatarFallback>
                    </Avatar>
                    <span>{payerProfile?.displayName || payerProfile?.email} {payerProfile?.uid === currentUserProfile?.uid ? "(You)" : ""}</span>
                </div>
            </div>

            <div>
                <Label className="font-semibold">Participants ({numberOfParticipants}):</Label>
                <ScrollArea className="h-40 mt-1 rounded-md border p-2">
                    {group.memberDetails.map(member => (
                        <div key={member.uid} className="flex items-center justify-between p-2 hover:bg-muted/50 rounded-md">
                            <div className="flex items-center gap-2">
                                <Avatar className="h-8 w-8">
                                <AvatarImage src={`https://placehold.co/40x40.png?text=${getInitials(member.displayName, member.email)}`} alt={member.displayName || member.email} data-ai-hint="person avatar" />
                                <AvatarFallback>{getInitials(member.displayName, member.email)}</AvatarFallback>
                                </Avatar>
                                <span className="text-sm">{member.displayName || member.email}</span>
                                 {member.uid === expenseToSplit.userId && <Badge variant="secondary" className="text-xs">Payer</Badge>}
                            </div>
                            <span className="text-sm font-medium">{formatCurrency(amountPerPerson)}</span>
                        </div>
                    ))}
                </ScrollArea>
            </div>
             <div className="p-3 bg-accent/20 rounded-md border border-accent/50 text-accent-foreground">
                <div className="flex items-start">
                    <Info className="h-5 w-5 mr-2 mt-0.5 text-accent" />
                    <p className="text-xs">
                        Each of the {numberOfParticipants} members will owe {formatCurrency(amountPerPerson)}. 
                        The payer, {payerProfile?.displayName || payerProfile?.email}, is considered settled.
                    </p>
                </div>
            </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={isSavingSplit}>
              Cancel
            </Button>
          </DialogClose>
          <Button onClick={handleSaveSplit} disabled={isSavingSplit || numberOfParticipants <= 0}>
            {isSavingSplit ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Confirm & Save Split
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
