
"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Landmark, Users, ArrowRight, ArrowLeft, AlertTriangle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getFriends, getUserProfile, getSplitExpensesForUser } from "@/lib/firebase/firestore";
import type { Friend, UserProfile, SplitExpense, CurrencyCode } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription as UIDescription } from "@/components/ui/alert"; 

export default function DebtsPage() {
  const { authUser, userProfile: authUserProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [personalSplits, setPersonalSplits] = useState<SplitExpense[]>([]);
    
  const [isLoadingPage, setIsLoadingPage] = useState(true); // Page-specific loading

  const fetchAllData = useCallback(async () => {
    if (!authUser) {
      setCurrentUserProfile(null);
      setFriends([]);
      setPersonalSplits([]);
      setIsLoadingPage(false);
      return;
    }
    // setIsLoadingPage(true) is handled by main useEffect
    try {
      const [profile, fetchedFriends, allUserSplits] = await Promise.all([
        authUserProfile || getUserProfile(authUser.uid), // Use profile from auth context if available
        getFriends(authUser.uid),
        getSplitExpensesForUser(authUser.uid),
      ]);

      setCurrentUserProfile(profile);
      setFriends(fetchedFriends || []);
      setPersonalSplits(allUserSplits.filter(split => !split.groupId)); 

    } catch (error) {
      console.error("Failed to fetch data for debts page:", error);
      toast({ variant: "destructive", title: "Error Loading Data", description: "Could not load necessary data." });
      setCurrentUserProfile(null);
      setFriends([]);
      setPersonalSplits([]);
    } finally {
      setIsLoadingPage(false); // Page-specific loading stops
    }
  }, [authUser, authUserProfile, toast]);

  useEffect(() => {
    if (authLoading) {
      setIsLoadingPage(true);
      return;
    }
    if (authUser) {
      setIsLoadingPage(true); // Page will fetch its data
      fetchAllData();
    } else {
      // No user, auth is done.
      setCurrentUserProfile(null);
      setFriends([]);
      setPersonalSplits([]);
      setIsLoadingPage(false);
    }
  }, [authLoading, authUser, fetchAllData]);

  const debtSummaries = useMemo(() => {
    if (!currentUserProfile || (friends.length === 0 && personalSplits.length === 0)) {
        return [];
    }

    const friendMap = new Map(friends.map(f => [f.uid, f]));
    const netDebts: Record<string, Partial<Record<CurrencyCode, number>>> = {}; // friendUid -> { currency -> amount }

    personalSplits.forEach(split => {
      const currency = split.currency;
      if (split.paidBy === currentUserProfile.uid) { // User paid
        split.participants.forEach(p => {
          if (p.userId !== currentUserProfile.uid && !p.isSettled) {
            if (!netDebts[p.userId]) netDebts[p.userId] = {};
            netDebts[p.userId][currency] = (netDebts[p.userId][currency] || 0) + p.amountOwed; 
          }
        });
      } else { // Someone else paid, user might owe
        const currentUserParticipant = split.participants.find(p => p.userId === currentUserProfile.uid);
        if (currentUserParticipant && !currentUserParticipant.isSettled) {
          if (!netDebts[split.paidBy]) netDebts[split.paidBy] = {};
          netDebts[split.paidBy][currency] = (netDebts[split.paidBy][currency] || 0) - currentUserParticipant.amountOwed;
        }
      }
    });
    
    const summaries: DebtSummary[] = [];
    Object.entries(netDebts).forEach(([friendId, currencyAmounts]) => {
      const friend = friendMap.get(friendId);
      if (!friend) return;

      Object.entries(currencyAmounts).forEach(([currency, amount]) => {
        if (Math.abs(amount) < 0.01) return;

        const initials = friend.displayName 
          ? (friend.displayName.split(' ').length > 1 ? `${friend.displayName.split(' ')[0][0]}${friend.displayName.split(' ')[1][0]}` : friend.displayName.substring(0,2))
          : friend.email.substring(0,2);

        summaries.push({
          friendId,
          friendDisplayName: friend.displayName || friend.email,
          friendEmail: friend.email,
          friendAvatarText: initials.toUpperCase(),
          netAmount: amount,
          currency: currency as CurrencyCode,
        });
      });
    });
      
    return summaries.sort((a,b) => a.currency.localeCompare(b.currency) || Math.abs(b.netAmount) - Math.abs(a.netAmount));

  }, [currentUserProfile, friends, personalSplits]);
  
  const formatCurrencyDisplay = (amount: number, currencyCode: CurrencyCode) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currencyCode }).format(amount);
  };

  const hasMixedCurrenciesInDebts = useMemo(() => {
    if (debtSummaries.length <= 1) return false;
    const currencies = new Set(debtSummaries.map(d => d.currency));
    return currencies.size > 1;
  }, [debtSummaries]);

  if (isLoadingPage) {
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
            This view summarizes net balances between you and your friends based on unsettled personal splits, broken down by currency.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {hasMixedCurrenciesInDebts && (
            <Alert variant="default" className="mb-4 text-xs bg-amber-50 border-amber-200 text-amber-700">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <UIDescription className="pl-1">
                Debts involve multiple currencies. Each line item represents a debt in a specific currency. No automatic currency conversion is applied.
              </UIDescription>
            </Alert>
          )}
          {debtSummaries.length === 0 ? (
            <div className="text-center py-10">
                <Users className="mx-auto h-12 w-12 text-muted-foreground" />
                <p className="mt-4 text-muted-foreground text-lg">All clear! No outstanding personal debts with friends.</p>
                <p className="text-sm text-muted-foreground mt-2">Or, you haven't split any personal expenses yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {debtSummaries.map(summary => (
                <Card key={`${summary.friendId}-${summary.currency}`} className="shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      {/* Person on the left */}
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Avatar className="h-10 w-10">
                           <AvatarImage src="https://placehold.co/100x100.png" alt={summary.netAmount > 0 ? summary.friendDisplayName : (currentUserProfile?.displayName || "You")} data-ai-hint="person avatar" />
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
                           {formatCurrencyDisplay(Math.abs(summary.netAmount), summary.currency)}
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
                           <AvatarImage src="https://placehold.co/100x100.png" alt={summary.netAmount < 0 ? summary.friendDisplayName : (currentUserProfile?.displayName || "You")} data-ai-hint="person avatar"/>
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
