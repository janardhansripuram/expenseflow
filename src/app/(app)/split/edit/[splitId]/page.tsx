
"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, SplitIcon, ArrowLeft, Users, AlertCircle, Save, AlertTriangle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getFriends, getUserProfile, getSplitExpenseById, updateSplitExpense, getExpenseById } from "@/lib/firebase/firestore";
import type { Friend, UserProfile, SplitExpense, SplitParticipant, SplitMethod, Expense } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

export default function EditSplitExpensePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const params = useParams();
  const splitId = params.splitId as string;

  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [originalExpense, setOriginalExpense] = useState<Expense | null>(null);
  const [splitExpense, setSplitExpense] = useState<SplitExpense | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [splitMethod, setSplitMethod] = useState<SplitMethod>('equally');
  const [participantValues, setParticipantValues] = useState<Record<string, { amount?: string; percentage?: string }>>({});
  const [validationError, setValidationError] = useState<string | null>(null);
  const [notes, setNotes] = useState<string>("");

  const fetchInitialData = useCallback(async () => {
    if (!user || !splitId) {
        setIsLoading(false);
        return;
    }
    setIsLoading(true);
    try {
      const [profile, fetchedFriends, fetchedSplitExpense] = await Promise.all([
        getUserProfile(user.uid),
        getFriends(user.uid),
        getSplitExpenseById(splitId),
      ]);

      setCurrentUserProfile(profile);
      setFriends(fetchedFriends || []);

      if (!fetchedSplitExpense) {
        toast({ variant: "destructive", title: "Not Found", description: "Split expense not found." });
        router.push("/split");
        return;
      }
      if (fetchedSplitExpense.paidBy !== user.uid && !fetchedSplitExpense.participants.some(p => p.userId === user.uid)) {
        // Basic check, ideally only payer should edit the split structure.
        // More granular permissions can be added if needed.
        toast({ variant: "destructive", title: "Unauthorized", description: "You do not have permission to edit this split." });
        router.push("/split");
        return;
      }
      
      setSplitExpense(fetchedSplitExpense);
      setSplitMethod(fetchedSplitExpense.splitMethod);
      setNotes(fetchedSplitExpense.notes || "");

      const initialParticipantValues: Record<string, { amount?: string; percentage?: string }> = {};
      fetchedSplitExpense.participants.forEach(p => {
        initialParticipantValues[p.userId] = {
          amount: p.amountOwed.toString(), // Firestore stores as number
          percentage: p.percentage?.toString(),
        };
      });
      setParticipantValues(initialParticipantValues);

      // Fetch original expense details
      if (fetchedSplitExpense.originalExpenseId) {
        const expenseDetails = await getExpenseById(fetchedSplitExpense.originalExpenseId);
        setOriginalExpense(expenseDetails);
      }

    } catch (error) {
      console.error("Failed to fetch data for editing split:", error);
      toast({ variant: "destructive", title: "Error Loading Data", description: "Could not load split details." });
      router.push("/split");
    } finally {
      setIsLoading(false);
    }
  }, [user, splitId, toast, router]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  // Recalculate participant values when split method changes, but using existing participants
  useEffect(() => {
    if (!splitExpense) return;

    const currentParticipantIds = new Set(splitExpense.participants.map(p => p.userId));
    const newParticipantValues: Record<string, { amount?: string; percentage?: string }> = {};
    
    splitExpense.participants.forEach(p => {
      if(splitMethod === 'equally') {
        // Amount will be derived at save or display
      } else if (splitMethod === 'byAmount') {
         newParticipantValues[p.userId] = { amount: participantValues[p.userId]?.amount || "0" };
      } else if (splitMethod === 'byPercentage') {
         newParticipantValues[p.userId] = { percentage: participantValues[p.userId]?.percentage || "0" };
      }
    });
    
    setParticipantValues(newParticipantValues);
    setValidationError(null);
  }, [splitMethod, splitExpense]);


  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };
  
  // Participants are fixed for edit, derived from the loaded splitExpense
  const activeParticipants = useMemo(() => {
    if (!splitExpense || !currentUserProfile) return [];
    
    return splitExpense.participants.map(p => {
        if (p.userId === currentUserProfile.uid) return currentUserProfile;
        const friendProfile = friends.find(f => f.uid === p.userId);
        if (friendProfile) return { 
            uid: friendProfile.uid, 
            email: friendProfile.email, 
            displayName: friendProfile.displayName || friendProfile.email, 
            createdAt: friendProfile.addedAt 
        };
        // Fallback for participants not in current user's friend list (e.g. old data, or group splits)
        return { uid: p.userId, email: p.email || 'N/A', displayName: p.displayName || 'Unknown Participant', createdAt: new Date() } as UserProfile;
    });

  }, [splitExpense, friends, currentUserProfile]);

  const numberOfParticipants = activeParticipants.length;

  const amountPerPersonEqually = useMemo(() => {
    if (originalExpense && numberOfParticipants > 0 && splitMethod === 'equally') {
      return originalExpense.amount / numberOfParticipants;
    }
    return 0;
  }, [originalExpense, numberOfParticipants, splitMethod]);

  const handleParticipantValueChange = (userId: string, type: 'amount' | 'percentage', value: string) => {
    setParticipantValues(prev => ({
      ...prev,
      [userId]: { ...prev[userId], [type]: value },
    }));
    setValidationError(null);
  };

  const calculatedTotals = useMemo(() => {
    let totalAmountEntered = 0;
    let totalPercentageEntered = 0;
    activeParticipants.forEach(p => {
      const values = participantValues[p.uid];
      if (splitMethod === 'byAmount' && values?.amount) totalAmountEntered += parseFloat(values.amount) || 0;
      if (splitMethod === 'byPercentage' && values?.percentage) totalPercentageEntered += parseFloat(values.percentage) || 0;
    });
    return { totalAmountEntered, totalPercentageEntered };
  }, [participantValues, activeParticipants, splitMethod]);

  const validateSplit = (): boolean => {
    if (!originalExpense || !splitExpense || numberOfParticipants <= 0) {
      setValidationError("Missing original expense or participant data.");
      return false;
    }
    if (splitMethod === 'byAmount') {
      const sum = activeParticipants.reduce((acc, p) => acc + (parseFloat(participantValues[p.uid]?.amount || '0') || 0), 0);
      if (Math.abs(sum - originalExpense.amount) > 0.01) {
        setValidationError(`The sum of amounts (${formatCurrency(sum)}) must equal the total expense amount (${formatCurrency(originalExpense.amount)}).`);
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

  const handleSaveChanges = async () => {
    if (!splitExpense || !user || !originalExpense || !validateSplit()) {
      toast({ variant: "destructive", title: "Validation Failed", description: validationError || "Please check the split details." });
      return;
    }
    setIsSaving(true);

    const updatedParticipants: SplitParticipant[] = splitExpense.participants.map(existingP => {
      let amountOwed = existingP.amountOwed; // Default to existing, especially for 'equally'
      let percentage = existingP.percentage;
      
      if (splitMethod === 'byAmount') {
        amountOwed = parseFloat(participantValues[existingP.userId]?.amount || '0') || 0;
      } else if (splitMethod === 'byPercentage') {
        percentage = parseFloat(participantValues[existingP.userId]?.percentage || '0') || 0;
        // amountOwed will be recalculated by updateSplitExpense
      }
      // For 'equally', amountOwed is implicitly calculated by updateSplitExpense based on total participants
      
      return {
        ...existingP, // Keep existing displayName, email, isSettled
        amountOwed: amountOwed, // This might be a temporary value if percentages are used
        percentage: percentage,
      };
    });

    const dataToUpdate: Partial<Omit<SplitExpense, 'id' | 'createdAt' | 'involvedUserIds'>> = {
      splitMethod: splitMethod,
      participants: updatedParticipants,
      notes: notes || "",
      // totalAmount is derived from originalExpense, not directly editable here for the split
    };

    try {
      await updateSplitExpense(splitId, dataToUpdate);
      toast({ title: "Split Updated", description: "Your changes to the split have been saved." });
      router.push("/split");
    } catch (error: any) {
      console.error("Error updating split expense:", error);
      toast({ variant: "destructive", title: "Update Failed", description: error.message || "Could not save changes." });
    } finally {
      setIsSaving(false);
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


  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">Loading split details...</p>
      </div>
    );
  }

  if (!splitExpense || !originalExpense) {
    return (
      <div className="text-center py-10">
        <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground" />
        <p className="mt-4 text-muted-foreground text-lg">Could not load split details or original expense.</p>
        <Button asChild className="mt-4"><Link href="/split">Back to Splits</Link></Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/split">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back to Splits</span>
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline text-foreground">Edit Split</h1>
          <p className="text-muted-foreground">
            Modifying split for: <span className="font-medium">{originalExpense.description}</span> ({formatCurrency(originalExpense.amount)})
          </p>
        </div>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline flex items-center">
            <SplitIcon className="mr-2 h-6 w-6 text-primary" />
            Configure Split Details
          </CardTitle>
          <CardDescription>Adjust the split method and amounts/percentages. Participants cannot be changed in edit mode.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label className="text-base font-semibold">Split Method:</Label>
            <RadioGroup value={splitMethod} onValueChange={(value) => setSplitMethod(value as SplitMethod)} className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-4">
              {(['equally', 'byAmount', 'byPercentage'] as SplitMethod[]).map(method => (
                <div key={method}>
                  <RadioGroupItem value={method} id={`method-edit-${method}`} className="peer sr-only" />
                  <Label htmlFor={`method-edit-${method}`} className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer">
                    {method === 'equally' && 'Split Equally'}
                    {method === 'byAmount' && 'By Specific Amounts'}
                    {method === 'byPercentage' && 'By Percentage'}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {numberOfParticipants > 0 && (
            <div className="pt-4 border-t">
              <Label className="text-base font-semibold">Participant Details ({numberOfParticipants}):</Label>
              <p className="text-xs text-muted-foreground mb-2">Participants are fixed for editing. Only their shares can be modified.</p>
              <ScrollArea className="h-48 mt-2 space-y-3 pr-2">
                {activeParticipants.map(p => (
                  <div key={p.uid} className="p-3 border rounded-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-grow">
                        <Avatar className="h-8 w-8">
                            <AvatarImage src={`https://placehold.co/40x40.png?text=${getInitials(p.displayName, p.email)}`} alt={p.displayName || p.email} data-ai-hint="person avatar"/>
                            <AvatarFallback>{getInitials(p.displayName, p.email)}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">{p.uid === splitExpense.paidBy ? `${p.displayName || p.email} (Payer)` : (p.displayName || p.email)}</span>
                         {splitExpense.participants.find(sp => sp.userId === p.uid)?.isSettled && <Badge variant="outline" className="text-xs border-green-500 text-green-600">Settled</Badge>}
                    </div>
                    {splitMethod === 'byAmount' && (
                      <div className="flex items-center gap-1.5 w-full sm:w-auto">
                        <span className="text-sm">$</span>
                        <Input type="number" step="0.01" placeholder="Amount" className="h-8 text-sm w-full sm:max-w-[100px]"
                          value={participantValues[p.uid]?.amount || ''}
                          onChange={e => handleParticipantValueChange(p.uid, 'amount', e.target.value)}
                          disabled={splitExpense.participants.find(sp => sp.userId === p.uid)?.isSettled}
                        />
                      </div>
                    )}
                    {splitMethod === 'byPercentage' && (
                       <div className="flex items-center gap-1.5 w-full sm:w-auto">
                        <Input type="number" step="0.01" placeholder="%" className="h-8 text-sm w-full sm:max-w-[80px]"
                          value={participantValues[p.uid]?.percentage || ''}
                          onChange={e => handleParticipantValueChange(p.uid, 'percentage', e.target.value)}
                           disabled={splitExpense.participants.find(sp => sp.userId === p.uid)?.isSettled}
                        /> <span className="text-sm">%</span>
                      </div>
                    )}
                    {splitMethod === 'equally' && (
                      <Badge variant="secondary">{formatCurrency(amountPerPersonEqually)}</Badge>
                    )}
                  </div>
                ))}
              </ScrollArea>
              {splitMethod === 'byAmount' && (
                <p className="text-sm mt-2 text-muted-foreground">
                    Total Entered: <span className="font-semibold text-foreground">{formatCurrency(calculatedTotals.totalAmountEntered)}</span> / {formatCurrency(originalExpense.amount)}
                    {Math.abs(calculatedTotals.totalAmountEntered - originalExpense.amount) > 0.01 && <span className="text-destructive ml-1"> (Does not match total!)</span>}
                </p>
              )}
              {splitMethod === 'byPercentage' && (
                <p className="text-sm mt-2 text-muted-foreground">
                    Total Entered: <span className="font-semibold text-foreground">{calculatedTotals.totalPercentageEntered.toFixed(2)}%</span> / 100%
                    {Math.abs(calculatedTotals.totalPercentageEntered - 100) > 0.01 && <span className="text-destructive ml-1"> (Does not sum to 100%!)</span>}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-1">Settled participants' shares cannot be modified.</p>
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="split-edit-notes">Notes (Optional)</Label>
            <Input id="split-edit-notes" placeholder="e.g., Updated split details" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
            
          {validationError && (
            <Alert variant="destructive" className="mt-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Validation Error</AlertTitle>
                <AlertDescription>{validationError}</AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" asChild type="button" disabled={isSaving}>
              <Link href="/split">Cancel</Link>
            </Button>
            <Button onClick={handleSaveChanges} disabled={isSaving || isLoading || !splitExpense}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save Changes
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
