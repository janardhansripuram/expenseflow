
"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, SplitIcon, ArrowLeft, Users, AlertCircle, UserCheck, Save, ListCollapse, CheckSquare, Handshake, Edit, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getExpensesByUser, getFriends, getUserProfile, createSplitExpense, getSplitExpensesForUser, updateSplitParticipantSettlement, deleteSplitExpense } from "@/lib/firebase/firestore";
import type { Expense, Friend, UserProfile, SplitExpense, SplitParticipant, SplitMethod } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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


export default function SplitExpensesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);

  const [isLoadingExpenses, setIsLoadingExpenses] = useState(true);
  const [isLoadingFriends, setIsLoadingFriends] = useState(true);
  const [isSavingSplit, setIsSavingSplit] = useState(false);
  const [isProcessingSettlement, setIsProcessingSettlement] = useState<string | null>(null); // stores splitId-participantId
  const [isDeletingSplit, setIsDeletingSplit] = useState<string | null>(null); // stores splitId

  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [selectedFriendsToSplit, setSelectedFriendsToSplit] = useState<Record<string, boolean>>({});

  const [savedSplits, setSavedSplits] = useState<SplitExpense[]>([]);
  const [isLoadingSavedSplits, setIsLoadingSavedSplits] = useState(true);

  const fetchAllData = useCallback(async () => {
    if (user) {
      setIsLoadingExpenses(true);
      setIsLoadingFriends(true);
      setIsLoadingSavedSplits(true);
      try {
        const [userExpenses, userFriends, profile, userSplits] = await Promise.all([
          getExpensesByUser(user.uid),
          getFriends(user.uid),
          getUserProfile(user.uid),
          getSplitExpensesForUser(user.uid)
        ]);
        setExpenses(userExpenses.filter(exp => !exp.groupId)); // Only personal expenses for now
        setFriends(userFriends);
        setCurrentUserProfile(profile);
        setSavedSplits(userSplits);
      } catch (error) {
        console.error("Failed to fetch data for splitting:", error);
        toast({
          variant: "destructive",
          title: "Error Loading Data",
          description: "Could not load expenses, friends, or saved splits. Please try again.",
        });
      } finally {
        setIsLoadingExpenses(false);
        setIsLoadingFriends(false);
        setIsLoadingSavedSplits(false);
      }
    } else {
      setIsLoadingExpenses(false);
      setIsLoadingFriends(false);
      setIsLoadingSavedSplits(false);
      setExpenses([]);
      setFriends([]);
      setCurrentUserProfile(null);
      setSavedSplits([]);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const numberOfParticipants = useMemo(() => {
    return Object.values(selectedFriendsToSplit).filter(Boolean).length + 1; // +1 for the current user
  }, [selectedFriendsToSplit]);

  const amountPerPerson = useMemo(() => {
    if (selectedExpense && numberOfParticipants > 0) {
      // For now, still assumes equal split for UI display until non-equal split UI is built
      return selectedExpense.amount / numberOfParticipants;
    }
    return 0;
  }, [selectedExpense, numberOfParticipants]);

  const handleSelectExpense = (expense: Expense) => {
    if (expense.groupId) {
        toast({
            title: "Group Expense",
            description: "This expense belongs to a group. Please split it from the group's detail page for now.",
            variant: "default"
        });
        return;
    }
    setSelectedExpense(expense);
    setSelectedFriendsToSplit({});
  };

  const handleClearSelection = () => {
    setSelectedExpense(null);
    setSelectedFriendsToSplit({});
  };

  const handleToggleFriendSelection = (friendId: string) => {
    setSelectedFriendsToSplit(prev => ({
      ...prev,
      [friendId]: !prev[friendId],
    }));
  };

  const handleSaveSplit = async () => {
    if (!selectedExpense || !user || !currentUserProfile || numberOfParticipants <= 0) {
        toast({
            variant: "destructive",
            title: "Cannot Save Split",
            description: "Please select an expense and ensure all participant details are available.",
        });
        return;
    }
    if (numberOfParticipants === 1 && Object.values(selectedFriendsToSplit).filter(Boolean).length === 0) {
        toast({
            variant: "destructive",
            title: "Cannot Save Split",
            description: "Please select at least one friend to split the expense with.",
        });
        return;
    }

    setIsSavingSplit(true);

    // Current UI only supports equal splits, so we construct participants accordingly.
    // This will be enhanced when non-equal split UI is built.
    const currentSplitMethod: SplitMethod = 'equally';
    const calculatedAmountPerPerson = selectedExpense.amount / numberOfParticipants;

    const participants: SplitParticipant[] = [];
    participants.push({
      userId: user.uid,
      displayName: currentUserProfile.displayName || currentUserProfile.email,
      email: currentUserProfile.email,
      amountOwed: calculatedAmountPerPerson,
      isSettled: true, // Payer is always settled initially for their own "share"
    });

    Object.entries(selectedFriendsToSplit).forEach(([friendId, isSelected]) => {
      if (isSelected) {
        const friendProfile = friends.find(f => f.uid === friendId);
        if (friendProfile) {
          participants.push({
            userId: friendProfile.uid,
            displayName: friendProfile.displayName || friendProfile.email,
            email: friendProfile.email,
            amountOwed: calculatedAmountPerPerson,
            isSettled: false,
          });
        }
      }
    });

    const splitData = {
        originalExpenseId: selectedExpense.id!,
        originalExpenseDescription: selectedExpense.description,
        splitMethod: currentSplitMethod,
        totalAmount: selectedExpense.amount,
        paidBy: user.uid,
        participants: participants,
        notes: `Split of expense: ${selectedExpense.description}`,
    };

    try {
        await createSplitExpense(splitData);
        toast({
          title: "Split Saved",
          description: `Expense "${selectedExpense.description}" has been successfully split.`,
        });
        handleClearSelection();
        fetchAllData(); // Refresh all data including saved splits
    } catch (error: any) {
        console.error("Error saving split expense:", error);
        toast({
            variant: "destructive",
            title: "Failed to Save Split",
            description: error.message || "An error occurred while saving the split. Please try again.",
        });
    } finally {
        setIsSavingSplit(false);
    }
  };

  const handleSettleParticipant = async (splitId: string, participantUserId: string) => {
    if (!splitId) return;
    setIsProcessingSettlement(`${splitId}-${participantUserId}`);
    try {
        await updateSplitParticipantSettlement(splitId, participantUserId, true);
        toast({ title: "Settlement Updated", description: "Participant marked as settled."});
        fetchAllData(); // Refresh splits
    } catch (error: any) {
        console.error("Error settling participant:", error);
        toast({ variant: "destructive", title: "Update Failed", description: error.message || "Could not update settlement status."});
    } finally {
        setIsProcessingSettlement(null);
    }
  };

  const handleDeleteSplit = async (splitId: string) => {
    if (!splitId) return;
    setIsDeletingSplit(splitId);
    try {
        await deleteSplitExpense(splitId);
        toast({ title: "Split Deleted", description: "The split expense record has been deleted." });
        fetchAllData();
    } catch (error: any) {
        console.error("Error deleting split:", error);
        toast({ variant: "destructive", title: "Delete Failed", description: error.message || "Could not delete the split record." });
    } finally {
        setIsDeletingSplit(null);
    }
  };

  const getInitials = (name?: string, email?: string) => {
    if (name) {
      const parts = name.split(' ');
      if (parts.length > 1 && parts[0] && parts[1]) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      if (parts[0]) return parts[0].substring(0,2).toUpperCase();
    }
    if (email) return email.substring(0,2).toUpperCase();
    return '??';
  }

  const getPayerDisplayName = (split: SplitExpense): string => {
    const payer = split.participants.find(p => p.userId === split.paidBy);
    if (payer?.userId === currentUserProfile?.uid) return "You";
    return payer?.displayName || payer?.email || "Unknown Payer";
  }

  const isLoading = isLoadingExpenses || isLoadingFriends;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-headline text-foreground">Split Expenses</h1>
        <p className="text-muted-foreground">Divide shared costs with your friends. (Currently supports equal splits for personal expenses only from this page).</p>
      </div>

      {!selectedExpense ? (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline flex items-center">
              <SplitIcon className="mr-2 h-6 w-6 text-primary" />
              Step 1: Select a Personal Expense to Split
            </CardTitle>
            <CardDescription>Choose one of your recorded personal (non-group) expenses to begin.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingExpenses ? (
              <div className="flex justify-center items-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-2 text-muted-foreground">Loading expenses...</p>
              </div>
            ) : expenses.filter(exp => !exp.groupId).length === 0 ? (
              <div className="text-center py-10">
                <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground" />
                <p className="mt-4 text-muted-foreground text-lg">No personal expenses recorded yet.</p>
                <p className="text-sm text-muted-foreground mt-2">Add personal expenses to split them here, or split group expenses from the group's page.</p>
                <Button asChild className="mt-4">
                  <Link href="/expenses/add">Add Expense</Link>
                </Button>
              </div>
            ) : (
              <ScrollArea className="max-h-96">
                <div className="space-y-3 pr-4">
                  {expenses.filter(exp => !exp.groupId).map((expense) => (
                    <Card
                      key={expense.id}
                      className="hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => handleSelectExpense(expense)}
                    >
                      <CardContent className="p-4">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-medium">{expense.description}</p>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(expense.date), "MMM dd, yyyy")} - {expense.category}
                            </p>
                          </div>
                          <p className="font-semibold text-lg">{formatCurrency(expense.amount)}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-lg">
          <CardHeader>
             <div className="flex items-center justify-between">
                <CardTitle className="font-headline flex items-center">
                    <Users className="mr-2 h-6 w-6 text-primary" />
                    Step 2: Select Friends to Split With
                </CardTitle>
                <Button variant="outline" size="sm" onClick={handleClearSelection}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Choose Another Expense
                </Button>
            </div>
            <CardDescription>
              Selected Expense: <span className="font-medium text-foreground">{selectedExpense.description}</span> for <span className="font-medium text-foreground">{formatCurrency(selectedExpense.amount)}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {isLoadingFriends ? (
                 <div className="flex justify-center items-center py-6">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <p className="ml-2 text-muted-foreground">Loading friends list...</p>
                </div>
            ) : friends.length === 0 ? (
                <div className="text-center py-6">
                    <AlertCircle className="mx-auto h-10 w-10 text-muted-foreground" />
                    <p className="mt-3 text-muted-foreground">No friends added yet.</p>
                    <p className="text-sm text-muted-foreground mt-1">You can add friends on the <Link href="/friends" className="underline text-primary">Friends page</Link>.</p>
                     <p className="text-sm text-muted-foreground mt-4">For now, you can only split with yourself (effectively no split).</p>
                </div>
            ) : (
              <div className="space-y-3">
                <Label className="text-base">Select friends to include in the split (Paid by You):</Label>
                <ScrollArea className="h-60 rounded-md border p-2">
                  {friends.map((friend) => (
                    <div key={friend.uid} className="flex items-center justify-between p-2 hover:bg-muted/50 rounded-md">
                      <Label htmlFor={`friend-split-${friend.uid}`} className="flex items-center gap-3 cursor-pointer flex-grow">
                        <Avatar className="h-8 w-8">
                            <AvatarImage src={`https://placehold.co/40x40.png?text=${getInitials(friend.displayName, friend.email)}`} alt={friend.displayName || friend.email} data-ai-hint="person avatar" />
                            <AvatarFallback>{getInitials(friend.displayName, friend.email)}</AvatarFallback>
                        </Avatar>
                        <div>
                            <span className="font-medium text-sm">{friend.displayName || friend.email}</span>
                            <p className="text-xs text-muted-foreground">{friend.email}</p>
                        </div>
                      </Label>
                      <Checkbox
                        id={`friend-split-${friend.uid}`}
                        checked={!!selectedFriendsToSplit[friend.uid]}
                        onCheckedChange={() => handleToggleFriendSelection(friend.uid)}
                      />
                    </div>
                  ))}
                </ScrollArea>
              </div>
            )}

            <div className="pt-4 border-t">
                <div className="flex justify-between items-center mb-2">
                    <p className="text-sm text-muted-foreground">
                        Splitting with: You + {Object.values(selectedFriendsToSplit).filter(Boolean).length} friend(s) = <span className="font-semibold text-foreground">{numberOfParticipants} participant(s)</span>
                    </p>
                </div>
                <p className="text-lg font-semibold">Amount per participant (equally split):</p>
                <p className="text-3xl font-bold text-primary">{formatCurrency(amountPerPerson)}</p>
                 <p className="text-xs text-muted-foreground mt-1">Note: Non-equal split methods will be available soon.</p>
            </div>

            <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={handleClearSelection} disabled={isSavingSplit}>Cancel / Choose Other</Button>
                <Button onClick={handleSaveSplit} disabled={isLoading || !selectedExpense || isSavingSplit || (Object.values(selectedFriendsToSplit).filter(Boolean).length === 0 && friends.length > 0) }>
                    {isSavingSplit ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save Split
                </Button>
            </div>

            {friends.length > 0 && Object.values(selectedFriendsToSplit).filter(Boolean).length === 0 && (
                 <p className="text-xs text-destructive text-right mt-1">Please select at least one friend to save the split.</p>
            )}

          </CardContent>
        </Card>
      )}

    <Card className="shadow-lg mt-8">
        <CardHeader>
            <CardTitle className="font-headline flex items-center">
                <ListCollapse className="mr-2 h-6 w-6 text-primary" />
                Split History (Personal Expenses)
            </CardTitle>
            <CardDescription>Review your previously saved expense splits and manage settlements. (Group splits are managed on the group's page).</CardDescription>
        </CardHeader>
        <CardContent>
            {isLoadingSavedSplits ? (
                <div className="flex justify-center items-center py-10">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="ml-2 text-muted-foreground">Loading split history...</p>
                </div>
            ) : savedSplits.filter(s => !s.groupId).length === 0 ? ( // Filter out group splits from this view
                <p className="text-muted-foreground text-center py-6">No personal split expenses recorded yet.</p>
            ) : (
                <ScrollArea className="max-h-[500px]">
                <div className="space-y-4 pr-3">
                    {savedSplits.filter(s => !s.groupId).map((split) => ( // Filter out group splits
                        <Card key={split.id} className="shadow-sm">
                            <CardHeader className="pb-3">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <CardTitle className="text-lg">{split.originalExpenseDescription}</CardTitle>
                                        <CardDescription>
                                            Total: {formatCurrency(split.totalAmount)} ({split.splitMethod}) | Split on: {format(split.createdAt.toDate(), "MMM dd, yyyy, p")}
                                        </CardDescription>
                                        <CardDescription>
                                            Paid by: <span className="font-medium text-foreground">{getPayerDisplayName(split)}</span>
                                        </CardDescription>
                                    </div>
                                    <div className="flex gap-1">
                                        <Button variant="ghost" size="icon" className="h-7 w-7" disabled onClick={() => toast({title: "Coming Soon", description: "Editing splits will be available soon."})}>
                                            <Edit className="h-4 w-4" />
                                            <span className="sr-only">Edit Split</span>
                                        </Button>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive/90" disabled={isDeletingSplit === split.id}>
                                                    {isDeletingSplit === split.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                                    <span className="sr-only">Delete Split</span>
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Delete Split?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        Are you sure you want to delete the split for &quot;{split.originalExpenseDescription}&quot;? This action cannot be undone.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => split.id && handleDeleteSplit(split.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm font-medium mb-2">Participants & Settlements:</p>
                                <ul className="space-y-2 text-sm">
                                    {split.participants.map((p, index) => (
                                        <li key={index} className="flex justify-between items-center p-2 rounded-md bg-muted/50">
                                            <div className="flex items-center gap-2">
                                                <Avatar className="h-8 w-8">
                                                    <AvatarImage src={`https://placehold.co/40x40.png?text=${getInitials(p.displayName, p.email)}`} alt={p.displayName || p.email} data-ai-hint="person avatar"/>
                                                    <AvatarFallback>{getInitials(p.displayName, p.email)}</AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <span className="font-medium text-foreground">{p.userId === currentUserProfile?.uid ? "You" : (p.displayName || p.email)}</span>
                                                    <span className="text-muted-foreground"> owes {formatCurrency(p.amountOwed)}</span>
                                                </div>
                                            </div>
                                            {p.isSettled ? (
                                                <Badge variant="default" className="bg-green-600 hover:bg-green-700 text-white">
                                                    <CheckSquare className="mr-1.5 h-3.5 w-3.5" />Settled
                                                </Badge>
                                            ) : (
                                              currentUserProfile?.uid === split.paidBy && p.userId !== currentUserProfile.uid ? (
                                                <AlertDialog>
                                                  <AlertDialogTrigger asChild>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        disabled={isProcessingSettlement === `${split.id}-${p.userId}`}
                                                        className="text-xs"
                                                    >
                                                      {isProcessingSettlement === `${split.id}-${p.userId}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Handshake className="mr-1.5 h-3.5 w-3.5"/>}
                                                      Mark Settled
                                                    </Button>
                                                  </AlertDialogTrigger>
                                                  <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                      <AlertDialogTitle>Confirm Settlement</AlertDialogTitle>
                                                      <AlertDialogDescription>
                                                        Are you sure you want to mark {p.displayName || p.email} as settled for {formatCurrency(p.amountOwed)}?
                                                      </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                      <AlertDialogAction onClick={() => split.id && handleSettleParticipant(split.id, p.userId)}>Confirm</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                  </AlertDialogContent>
                                                </AlertDialog>
                                              ) : currentUserProfile?.uid === p.userId && currentUserProfile.uid !== split.paidBy ? (
                                                 <AlertDialog>
                                                  <AlertDialogTrigger asChild>
                                                    <Button
                                                        variant="secondary"
                                                        size="sm"
                                                        disabled={isProcessingSettlement === `${split.id}-${p.userId}`}
                                                        className="text-xs"
                                                    >
                                                      {isProcessingSettlement === `${split.id}-${p.userId}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckSquare className="mr-1.5 h-3.5 w-3.5"/>}
                                                       I've Paid
                                                    </Button>
                                                  </AlertDialogTrigger>
                                                  <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                      <AlertDialogTitle>Confirm Payment</AlertDialogTitle>
                                                      <AlertDialogDescription>
                                                        Are you sure you want to mark your share of {formatCurrency(p.amountOwed)} as paid to {getPayerDisplayName(split)}? This will notify them (conceptually).
                                                      </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                      <AlertDialogAction onClick={() => split.id && handleSettleParticipant(split.id, p.userId)}>Confirm Payment</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                  </AlertDialogContent>
                                                </AlertDialog>
                                              ) : (
                                                <Badge variant="secondary">Owes</Badge>
                                              )
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                            {split.notes && (
                                <CardFooter className="text-xs text-muted-foreground pt-2">
                                    Notes: {split.notes}
                                </CardFooter>
                            )}
                        </Card>
                    ))}
                </div>
                </ScrollArea>
            )}
        </CardContent>
    </Card>
    </div>
  );
}
