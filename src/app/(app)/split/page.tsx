
"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, SplitIcon, ArrowLeft, Users, AlertCircle, UserCheck, Save, ListCollapse, CheckSquare, Handshake, Edit, Trash2, AlertTriangle, UserPlus, ShoppingBag } from "lucide-react";
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
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";


export default function SplitExpensesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);

  const [isLoadingExpenses, setIsLoadingExpenses] = useState(true);
  const [isLoadingFriends, setIsLoadingFriends] = useState(true);
  const [isSavingSplit, setIsSavingSplit] = useState(false);
  const [isProcessingSettlement, setIsProcessingSettlement] = useState<string | null>(null); 
  const [isDeletingSplit, setIsDeletingSplit] = useState<string | null>(null); 

  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [selectedFriendsToSplit, setSelectedFriendsToSplit] = useState<Record<string, boolean>>({});
  const [splitMethod, setSplitMethod] = useState<SplitMethod>('equally');
  const [participantValues, setParticipantValues] = useState<Record<string, { amount?: string; percentage?: string }>>({});
  const [validationError, setValidationError] = useState<string | null>(null);
  const [notes, setNotes] = useState<string>("");


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
        setExpenses(userExpenses.filter(exp => !exp.groupId)); 
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
  
  useEffect(() => {
    setParticipantValues({});
    setValidationError(null);
    setNotes(selectedExpense?.notes || "");
  }, [splitMethod, selectedFriendsToSplit, selectedExpense]);


  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const activeParticipants = useMemo(() => {
    if (!currentUserProfile) return [];
    const participants: UserProfile[] = [currentUserProfile]; // Payer is always included
    Object.entries(selectedFriendsToSplit).forEach(([friendId, isSelected]) => {
      if (isSelected) {
        const friendProfile = friends.find(f => f.uid === friendId);
        if (friendProfile) {
          participants.push({
            uid: friendProfile.uid,
            email: friendProfile.email,
            displayName: friendProfile.displayName || friendProfile.email,
            createdAt: friendProfile.addedAt, 
          });
        }
      }
    });
    return participants;
  }, [selectedFriendsToSplit, friends, currentUserProfile]);


  const numberOfParticipants = activeParticipants.length;

  const amountPerPersonEqually = useMemo(() => {
    if (selectedExpense && numberOfParticipants > 0 && splitMethod === 'equally') {
      return selectedExpense.amount / numberOfParticipants;
    }
    return 0;
  }, [selectedExpense, numberOfParticipants, splitMethod]);

  const handleParticipantValueChange = (userId: string, type: 'amount' | 'percentage', value: string) => {
    setParticipantValues(prev => ({
      ...prev,
      [userId]: {
        ...prev[userId], // Keep other type's value if it exists
        [type]: value,
      },
    }));
    setValidationError(null); 
  };

  const calculatedTotals = useMemo(() => {
    let totalAmountEntered = 0;
    let totalPercentageEntered = 0;

    activeParticipants.forEach(p => {
      const values = participantValues[p.uid];
      if (splitMethod === 'byAmount' && values?.amount) {
        totalAmountEntered += parseFloat(values.amount) || 0;
      }
      if (splitMethod === 'byPercentage' && values?.percentage) {
        totalPercentageEntered += parseFloat(values.percentage) || 0;
      }
    });
    return { totalAmountEntered, totalPercentageEntered };
  }, [participantValues, activeParticipants, splitMethod]);
  

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
    setSplitMethod('equally');
    setParticipantValues({});
    setValidationError(null);
    setNotes(expense.notes || `Split of: ${expense.description}`);
  };

  const handleClearSelection = () => {
    setSelectedExpense(null);
    setSelectedFriendsToSplit({});
    setSplitMethod('equally');
    setParticipantValues({});
    setValidationError(null);
    setNotes("");
  };

  const handleToggleFriendSelection = (friendId: string) => {
    setSelectedFriendsToSplit(prev => ({
      ...prev,
      [friendId]: !prev[friendId],
    }));
  };

  const validateSplit = (): boolean => {
    if (!selectedExpense || numberOfParticipants <= 0) {
      setValidationError("Please select an expense and at least one participant (including yourself).");
      return false;
    }

    if (splitMethod === 'byAmount') {
      const sum = activeParticipants.reduce((acc, p) => acc + (parseFloat(participantValues[p.uid]?.amount || '0') || 0), 0);
      if (Math.abs(sum - selectedExpense.amount) > 0.01) { 
        setValidationError(`The sum of amounts (${formatCurrency(sum)}) must equal the total expense amount (${formatCurrency(selectedExpense.amount)}).`);
        return false;
      }
    } else if (splitMethod === 'byPercentage') {
      const sum = activeParticipants.reduce((acc, p) => acc + (parseFloat(participantValues[p.uid]?.percentage || '0') || 0), 0);
      if (Math.abs(sum - 100) > 0.01) { 
        setValidationError(`The sum of percentages (${sum.toFixed(2)}%) must equal 100%.`);
        return false;
      }
    }
    setValidationError(null);
    return true;
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
     if (numberOfParticipants === 1 && activeParticipants[0]?.uid === currentUserProfile.uid && splitMethod !== 'equally' && friends.length > 0) {
        toast({
            variant: "destructive",
            title: "Cannot Save Split",
            description: "When splitting by amount or percentage with only yourself, please add friends or choose 'Split Equally'.",
        });
        return;
    }
    if (!validateSplit()) {
      return;
    }

    setIsSavingSplit(true);

    const participants: SplitParticipant[] = [];

    activeParticipants.forEach(p => {
      let amountOwed = 0;
      let percentage: number | undefined = undefined;

      if (splitMethod === 'equally') {
        // amountOwed will be calculated by createSplitExpense
      } else if (splitMethod === 'byAmount') {
        amountOwed = parseFloat(participantValues[p.uid]?.amount || '0') || 0;
      } else if (splitMethod === 'byPercentage') {
        percentage = parseFloat(participantValues[p.uid]?.percentage || '0') || 0;
      }
      
      participants.push({
        userId: p.uid,
        displayName: p.displayName || p.email,
        email: p.email,
        amountOwed: amountOwed, 
        percentage: percentage,
        isSettled: p.uid === user.uid, 
      });
    });

    const splitData = {
        originalExpenseId: selectedExpense.id!,
        originalExpenseDescription: selectedExpense.description,
        splitMethod: splitMethod,
        totalAmount: selectedExpense.amount,
        paidBy: user.uid,
        participants: participants,
        notes: notes || `Split of expense: ${selectedExpense.description}`,
    };

    try {
        await createSplitExpense(splitData);
        toast({
          title: "Split Saved",
          description: `Expense "${selectedExpense.description}" has been successfully split.`,
        });
        handleClearSelection();
        fetchAllData(); 
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
        fetchAllData(); 
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
  
  const handleEditSplit = (splitId: string) => {
    router.push(`/split/edit/${splitId}`);
  };


  const isLoading = isLoadingExpenses || isLoadingFriends;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-headline text-foreground">Split Expenses</h1>
        <p className="text-muted-foreground">Divide shared costs with your friends using various methods.</p>
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
                <ShoppingBag className="mx-auto h-12 w-12 text-muted-foreground" />
                <p className="mt-4 text-muted-foreground text-lg">No personal expenses found.</p>
                <p className="text-sm text-muted-foreground mt-2">Add some personal expenses first to split them with friends.</p>
                <Button asChild className="mt-4">
                  <Link href="/expenses/add">Add Personal Expense</Link>
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
                    Step 2: Configure Split
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
            <div>
              <Label className="text-base font-semibold">Choose Split Method:</Label>
              <RadioGroup value={splitMethod} onValueChange={(value) => setSplitMethod(value as SplitMethod)} className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-4">
                {(['equally', 'byAmount', 'byPercentage'] as SplitMethod[]).map(method => (
                  <div key={method}>
                    <RadioGroupItem value={method} id={`method-${method}`} className="peer sr-only" />
                    <Label 
                      htmlFor={`method-${method}`}
                      className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                    >
                      {method === 'equally' && 'Split Equally'}
                      {method === 'byAmount' && 'By Specific Amounts'}
                      {method === 'byPercentage' && 'By Percentage'}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {isLoadingFriends ? (
                 <div className="flex justify-center items-center py-6">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <p className="ml-2 text-muted-foreground">Loading friends list...</p>
                </div>
            ) : (
              <div className="space-y-3">
                <Label className="text-base font-semibold">Select Friends to Include (Paid by You):</Label>
                {friends.length === 0 ? (
                    <div className="text-center py-6 text-sm text-muted-foreground">
                      <UserPlus className="mx-auto h-10 w-10 mb-2" />
                      <p>No friends added yet. You can only split this expense with yourself for now.</p>
                      <p>To split with others, <Link href="/friends" className="underline text-primary hover:text-primary/80">add some friends</Link> first.</p>
                    </div>
                ) : (
                <ScrollArea className="h-40 rounded-md border p-2">
                  {friends.map((friend) => (
                    <div key={friend.uid} className="flex items-center justify-between p-2 hover:bg-muted/50 rounded-md">
                      <Label htmlFor={`friend-split-${friend.uid}`} className="flex items-center gap-3 cursor-pointer flex-grow">
                        <Avatar className="h-8 w-8">
                            <AvatarImage src="https://placehold.co/40x40.png" alt={friend.displayName || friend.email} data-ai-hint="person avatar" />
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
                )}
              </div>
            )}

            {numberOfParticipants > 0 && (
            <div className="pt-4 border-t">
              <Label className="text-base font-semibold">Participant Details ({numberOfParticipants}):</Label>
              <ScrollArea className="h-48 mt-2 space-y-3 pr-2">
                {activeParticipants.map(p => (
                  <div key={p.uid} className="p-3 border rounded-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-grow">
                        <Avatar className="h-8 w-8">
                            <AvatarImage src="https://placehold.co/40x40.png" alt={p.displayName || p.email} data-ai-hint="person avatar"/>
                            <AvatarFallback>{getInitials(p.displayName, p.email)}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">{p.uid === currentUserProfile?.uid ? 'You (Payer)' : (p.displayName || p.email)}</span>
                    </div>
                    {splitMethod === 'byAmount' && (
                      <div className="flex items-center gap-1.5 w-full sm:w-auto">
                        <span className="text-sm">$</span>
                        <Input 
                          type="number" 
                          step="0.01" 
                          placeholder="Amount"
                          className="h-8 text-sm w-full sm:max-w-[100px]"
                          value={participantValues[p.uid]?.amount || ''}
                          onChange={e => handleParticipantValueChange(p.uid, 'amount', e.target.value)}
                        />
                      </div>
                    )}
                    {splitMethod === 'byPercentage' && (
                       <div className="flex items-center gap-1.5 w-full sm:w-auto">
                        <Input 
                          type="number" 
                          step="0.01" 
                          placeholder="%"
                          className="h-8 text-sm w-full sm:max-w-[80px]"
                          value={participantValues[p.uid]?.percentage || ''}
                          onChange={e => handleParticipantValueChange(p.uid, 'percentage', e.target.value)}
                        />
                         <span className="text-sm">%</span>
                      </div>
                    )}
                    {splitMethod === 'equally' && (
                      <Badge variant="secondary">{formatCurrency(amountPerPersonEqually)}</Badge>
                    )}
                  </div>
                ))}
              </ScrollArea>
                {splitMethod === 'byAmount' && selectedExpense && (
                    <p className="text-sm mt-2 text-muted-foreground">
                        Total Entered: <span className="font-semibold text-foreground">{formatCurrency(calculatedTotals.totalAmountEntered)}</span> / {formatCurrency(selectedExpense.amount)}
                        {Math.abs(calculatedTotals.totalAmountEntered - selectedExpense.amount) > 0.01 && 
                        <span className="text-destructive ml-1"> (Does not match total!)</span>}
                    </p>
                )}
                {splitMethod === 'byPercentage' && (
                    <p className="text-sm mt-2 text-muted-foreground">
                        Total Entered: <span className="font-semibold text-foreground">{calculatedTotals.totalPercentageEntered.toFixed(2)}%</span> / 100%
                        {Math.abs(calculatedTotals.totalPercentageEntered - 100) > 0.01 && 
                        <span className="text-destructive ml-1"> (Does not sum to 100%!)</span>}
                    </p>
                )}
            </div>
            )}
             <div className="space-y-1">
                <Label htmlFor="split-notes">Notes (Optional)</Label>
                <Input 
                    id="split-notes"
                    placeholder="e.g., Dinner for project launch" 
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                />
            </div>
            
            {validationError && (
                <Alert variant="destructive" className="mt-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Validation Error</AlertTitle>
                    <AlertDescription>{validationError}</AlertDescription>
                </Alert>
            )}


            <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={handleClearSelection} disabled={isSavingSplit}>Cancel / Choose Other</Button>
                <Button 
                    onClick={handleSaveSplit} 
                    disabled={isLoading || !selectedExpense || isSavingSplit || numberOfParticipants === 0 || (numberOfParticipants === 1 && activeParticipants[0]?.uid === currentUserProfile?.uid && splitMethod !== 'equally' && friends.length > 0)}
                >
                    {isSavingSplit ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save Split
                </Button>
            </div>

            {friends.length > 0 && numberOfParticipants === 1 && activeParticipants[0]?.uid === currentUserProfile?.uid && splitMethod !== 'equally' && (
                 <p className="text-xs text-destructive text-right mt-1">Please select at least one friend or split equally.</p>
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
            ) : savedSplits.filter(s => !s.groupId).length === 0 ? ( 
                <div className="text-center py-10">
                    <ListCollapse className="mx-auto h-12 w-12 text-muted-foreground" />
                    <p className="mt-4 text-lg text-muted-foreground">No personal split expenses recorded yet.</p>
                    <p className="text-sm text-muted-foreground mt-2">When you split an expense, it will appear here.</p>
                </div>
            ) : (
                <ScrollArea className="max-h-[500px]">
                <div className="space-y-4 pr-3">
                    {savedSplits.filter(s => !s.groupId).map((split) => ( 
                        <Card key={split.id} className="shadow-sm">
                            <CardHeader className="pb-3">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <CardTitle className="text-lg">{split.originalExpenseDescription}</CardTitle>
                                        <CardDescription>
                                            Total: {formatCurrency(split.totalAmount)} ({split.splitMethod}) | Split on: {split.createdAt ? format(split.createdAt.toDate(), "MMM dd, yyyy, p") : 'N/A'}
                                        </CardDescription>
                                        <CardDescription>
                                            Paid by: <span className="font-medium text-foreground">{getPayerDisplayName(split)}</span>
                                        </CardDescription>
                                    </div>
                                    <div className="flex gap-1">
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => split.id && handleEditSplit(split.id)}>
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
                                                    <AvatarImage src="https://placehold.co/40x40.png" alt={p.displayName || p.email} data-ai-hint="person avatar"/>
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
