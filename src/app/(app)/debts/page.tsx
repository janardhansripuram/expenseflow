
"use client";

import React, { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Landmark, Users, ArrowRight, ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getFriends, getUserProfile, getSplitExpensesForUser } from "@/lib/firebase/firestore";
import type { Friend, UserProfile, SplitExpense } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

interface DebtSummary {
  friendId: string;
  friendDisplayName: string;
  friendEmail: string;
  friendAvatarText: string;
  netAmount: number; // Positive: friend owes user, Negative: user owes friend
}

export default function DebtsPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [personalSplits, setPersonalSplits] = useState<SplitExpense[]>([]);
  const [debtSummaries, setDebtSummaries] = useState<DebtSummary[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchAllData() {
      if (!user) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const [profile, fetchedFriends, allUserSplits] = await Promise.all([
          getUserProfile(user.uid),
          getFriends(user.uid),
          getSplitExpensesForUser(user.uid),
        ]);

        setCurrentUserProfile(profile);
        setFriends(fetchedFriends || []);
        setPersonalSplits(allUserSplits.filter(split => !split.groupId)); // Only personal splits

      } catch (error) {
        console.error("Failed to fetch data for debts page:", error);
        toast({ variant: "destructive", title: "Error Loading Data", description: "Could not load necessary data." });
      } finally {
        setIsLoading(false);
      }
    }
    fetchAllData();
  }, [user, toast]);

  useEffect(() => {
    if (!currentUserProfile || friends.length === 0 && personalSplits.length === 0) {
        if (!isLoading) setDebtSummaries([]); // Clear if no data and not loading
        return;
    }

    const friendMap = new Map(friends.map(f => [f.uid, f]));
    const netDebts: Record<string, number> = {}; // friendUid -> amount

    personalSplits.forEach(split => {
      // Case 1: Current user paid for the split
      if (split.paidBy === currentUserProfile.uid) {
        split.participants.forEach(p => {
          if (p.userId !== currentUserProfile.uid && !p.isSettled) {
            netDebts[p.userId] = (netDebts[p.userId] || 0) + p.amountOwed; // Friend owes current user
          }
        });
      }
      // Case 2: Current user is a participant (and not the payer)
      else {
        const currentUserParticipant = split.participants.find(p => p.userId === currentUserProfile.uid);
        if (currentUserParticipant && !currentUserParticipant.isSettled) {
          netDebts[split.paidBy] = (netDebts[split.paidBy] || 0) - currentUserParticipant.amountOwed; // Current user owes friend
        }
      }
    });

    const summaries: DebtSummary[] = Object.entries(netDebts)
      .map(([friendId, amount]) => {
        if (Math.abs(amount) < 0.01) return null; // Ignore negligible amounts
        const friend = friendMap.get(friendId);
        if (!friend) return null; // Friend might have been removed but split exists

        const initials = friend.displayName ? 
          (friend.displayName.split(' ').length > 1 ? `${friend.displayName.split(' ')[0][0]}${friend.displayName.split(' ')[1][0]}` : friend.displayName.substring(0,2))
          : friend.email.substring(0,2);

        return {
          friendId,
          friendDisplayName: friend.displayName || friend.email,
          friendEmail: friend.email,
          friendAvatarText: initials.toUpperCase(),
          netAmount: amount,
        };
      })
      .filter(summary => summary !== null) as DebtSummary[];
      
    setDebtSummaries(summaries.sort((a,b) => Math.abs(b.netAmount) - Math.abs(a.netAmount))); // Sort by largest absolute amount

  }, [currentUserProfile, friends, personalSplits, isLoading]);
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">Calculating debts...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline text-foreground">Consolidated Debts</h1>
          <p className="text-muted-foreground">Summary of who owes whom from your personal (non-group) splits.</p>
        </div>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline flex items-center">
            <Landmark className="mr-2 h-6 w-6 text-primary"/>
            Debt Overview
          </CardTitle>
          <CardDescription>
            This view summarizes net balances between you and your friends based on unsettled personal splits.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {debtSummaries.length === 0 ? (
            <div className="text-center py-10">
                <Users className="mx-auto h-12 w-12 text-muted-foreground" />
                <p className="mt-4 text-muted-foreground text-lg">All clear! No outstanding personal debts with friends.</p>
                <p className="text-sm text-muted-foreground mt-2">Or, you haven't split any personal expenses yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {debtSummaries.map(summary => (
                <Card key={summary.friendId} className="shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      {/* Person on the left */}
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Avatar className="h-10 w-10">
                           <AvatarImage src={`https://placehold.co/100x100.png?text=${summary.netAmount > 0 ? summary.friendAvatarText : (currentUserProfile?.displayName?.substring(0,2).toUpperCase() || 'ME')}`} alt={summary.netAmount > 0 ? summary.friendDisplayName : (currentUserProfile?.displayName || "You")} data-ai-hint="person avatar" />
                           <AvatarFallback>{summary.netAmount > 0 ? summary.friendAvatarText : (currentUserProfile?.displayName?.substring(0,2).toUpperCase() || 'ME')}</AvatarFallback>
                        </Avatar>
                        <div className="truncate">
                            <p className="font-medium text-sm truncate">{summary.netAmount > 0 ? summary.friendDisplayName : (currentUserProfile?.displayName || "You")}</p>
                            <p className="text-xs text-muted-foreground truncate">{summary.netAmount > 0 ? summary.friendEmail : currentUserProfile?.email}</p>
                        </div>
                      </div>

                      {/* Arrow and Amount */}
                      <div className="flex flex-col items-center text-center">
                        {summary.netAmount > 0 ? <ArrowRight className="h-5 w-5 text-green-500" /> : <ArrowLeft className="h-5 w-5 text-red-500" />}
                        <Badge variant={summary.netAmount > 0 ? "default" : "destructive"} className={summary.netAmount > 0 ? "bg-green-600 hover:bg-green-700 text-white" : ""}>
                           {formatCurrency(Math.abs(summary.netAmount))}
                        </Badge>
                        <p className="text-xs mt-1 text-muted-foreground">
                            {summary.netAmount > 0 ? `owes ${currentUserProfile?.displayName || "You"}` : `owes ${summary.friendDisplayName}`}
                        </p>
                      </div>
                      
                      {/* Person on the right */}
                      <div className="flex items-center gap-3 flex-1 min-w-0 justify-end">
                         <div className="truncate text-right">
                            <p className="font-medium text-sm truncate">{summary.netAmount < 0 ? summary.friendDisplayName : (currentUserProfile?.displayName || "You")}</p>
                            <p className="text-xs text-muted-foreground truncate">{summary.netAmount < 0 ? summary.friendEmail : currentUserProfile?.email}</p>
                        </div>
                        <Avatar className="h-10 w-10">
                           <AvatarImage src={`https://placehold.co/100x100.png?text=${summary.netAmount < 0 ? summary.friendAvatarText : (currentUserProfile?.displayName?.substring(0,2).toUpperCase() || 'ME')}`} alt={summary.netAmount < 0 ? summary.friendDisplayName : (currentUserProfile?.displayName || "You")} data-ai-hint="person avatar" />
                           <AvatarFallback>{summary.netAmount < 0 ? summary.friendAvatarText : (currentUserProfile?.displayName?.substring(0,2).toUpperCase() || 'ME')}</AvatarFallback>
                        </Avatar>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
