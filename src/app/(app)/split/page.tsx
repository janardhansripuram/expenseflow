
"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, SplitIcon, ArrowLeft, Users, AlertCircle, UserCheck, Save } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getExpensesByUser, getFriends, getUserProfile, createSplitExpense } from "@/lib/firebase/firestore";
import type { Expense, Friend, UserProfile, SplitExpense, SplitParticipant } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Timestamp } from "firebase/firestore";

export default function SplitExpensesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  
  const [isLoadingExpenses, setIsLoadingExpenses] = useState(true);
  const [isLoadingFriends, setIsLoadingFriends] = useState(true);
  const [isSavingSplit, setIsSavingSplit] = useState(false);
  
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [selectedFriendsToSplit, setSelectedFriendsToSplit] = useState<Record<string, boolean>>({});

  const fetchInitialData = useCallback(async () => {
    if (user) {
      setIsLoadingExpenses(true);
      setIsLoadingFriends(true);
      try {
        const [userExpenses, userFriends, profile] = await Promise.all([
          getExpensesByUser(user.uid),
          getFriends(user.uid),
          getUserProfile(user.uid)
        ]);
        setExpenses(userExpenses);
        setFriends(userFriends);
        setCurrentUserProfile(profile);
      } catch (error) {
        console.error("Failed to fetch data for splitting:", error);
        toast({
          variant: "destructive",
          title: "Error Loading Data",
          description: "Could not load expenses or friends. Please try again.",
        });
      } finally {
        setIsLoadingExpenses(false);
        setIsLoadingFriends(false);
      }
    } else {
      setIsLoadingExpenses(false);
      setIsLoadingFriends(false);
      setExpenses([]);
      setFriends([]);
      setCurrentUserProfile(null);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const numberOfParticipants = useMemo(() => {
    return Object.values(selectedFriendsToSplit).filter(Boolean).length + 1; // +1 for the current user
  }, [selectedFriendsToSplit]);

  const amountPerPerson = useMemo(() => {
    if (selectedExpense && numberOfParticipants > 0) {
      return selectedExpense.amount / numberOfParticipants;
    }
    return 0;
  }, [selectedExpense, numberOfParticipants]);

  const handleSelectExpense = (expense: Expense) => {
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

    const participants: SplitParticipant[] = [];

    // Add payer (current user)
    participants.push({
      userId: user.uid,
      displayName: currentUserProfile.displayName || currentUserProfile.email,
      email: currentUserProfile.email,
      amountOwed: amountPerPerson,
      isSettled: true, // Payer is always settled
    });

    // Add selected friends
    Object.entries(selectedFriendsToSplit).forEach(([friendId, isSelected]) => {
      if (isSelected) {
        const friendProfile = friends.find(f => f.uid === friendId);
        if (friendProfile) {
          participants.push({
            userId: friendProfile.uid,
            displayName: friendProfile.displayName || friendProfile.email,
            email: friendProfile.email,
            amountOwed: amountPerPerson,
            isSettled: false,
          });
        }
      }
    });
    
    const splitData: Omit<SplitExpense, 'id' | 'createdAt'> = {
        originalExpenseId: selectedExpense.id!,
        splitType: "equally",
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
    } catch (error) {
        console.error("Error saving split expense:", error);
        toast({
            variant: "destructive",
            title: "Failed to Save Split",
            description: "An error occurred while saving the split. Please try again.",
        });
    } finally {
        setIsSavingSplit(false);
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

  const isLoading = isLoadingExpenses || isLoadingFriends;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-headline text-foreground">Split Expenses</h1>
        <p className="text-muted-foreground">Divide shared costs with your friends.</p>
      </div>

      {!selectedExpense ? (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline flex items-center">
              <SplitIcon className="mr-2 h-6 w-6 text-primary" />
              Step 1: Select an Expense to Split
            </CardTitle>
            <CardDescription>Choose one of your recorded expenses to begin.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingExpenses ? (
              <div className="flex justify-center items-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-2 text-muted-foreground">Loading expenses...</p>
              </div>
            ) : expenses.length === 0 ? (
              <div className="text-center py-10">
                <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground" />
                <p className="mt-4 text-muted-foreground text-lg">No expenses recorded yet.</p>
                <p className="text-sm text-muted-foreground mt-2">You need to add expenses before you can split them.</p>
                <Button asChild className="mt-4">
                  <Link href="/expenses/add">Add Expense</Link>
                </Button>
              </div>
            ) : (
              <ScrollArea className="max-h-96">
                <div className="space-y-3 pr-4">
                  {expenses.map((expense) => (
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
        // Step 2: Define Split Details (Select Friends)
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
                <Label className="text-base">Select friends to include in the split:</Label>
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
                <p className="text-lg font-semibold">Amount per participant:</p>
                <p className="text-3xl font-bold text-primary">{formatCurrency(amountPerPerson)}</p>
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
            <div className="pt-4 border-t">
                <p className="text-xs text-muted-foreground">
                    Note: This feature allows splitting expenses equally. Future updates will include tracking settlements and more advanced split options.
                </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}


    