
"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import { Loader2, ArrowLeft, UserPlus, Users, Trash2, ShieldAlert, Edit, CircleDollarSign, List, Split, Edit2, Scale, TrendingUp, TrendingDown, Handshake, CheckSquare, Save, ArrowRight, Landmark, History, ReceiptText, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { getGroupDetails, getFriends, addMembersToGroup, removeMemberFromGroup, getUserProfile, getExpensesByGroupId, updateGroupDetails, getSplitExpensesByGroupId, updateSplitParticipantSettlement, logGroupActivity, getGroupActivityLog, ActivityActionType } from "@/lib/firebase/firestore";
import type { Group, Friend, UserProfile, GroupMemberDetail, Expense, SplitExpense, GroupMemberBalance, SplitParticipant, GroupActivityLogEntry, CurrencyCode } from "@/lib/types";
import { SUPPORTED_CURRENCIES } from "@/lib/types";
import Image from "next/image";
import { format, formatDistanceToNow } from "date-fns";
import { GroupExpenseSplitDialog } from "@/components/groups/GroupExpenseSplitDialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription as UIAlertDescription } from "@/components/ui/alert";


const groupNameSchema = z.object({
  name: z.string().min(1, "Group name is required").max(100, "Group name must be 100 characters or less"),
});
type GroupNameFormData = z.infer<typeof groupNameSchema>;

interface PairwiseDebt {
  from: GroupMemberDetail;
  to: GroupMemberDetail;
  amount: number;
  currency: CurrencyCode;
}


export default function GroupDetailsPage() {
  const { authUser, userProfile: authUserProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const params = useParams();
  const groupId = params.groupId as string;

  const [group, setGroup] = useState<Group | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);
  const [groupExpenses, setGroupExpenses] = useState<Expense[]>([]);
  const [splitExpensesForGroup, setSplitExpensesForGroup] = useState<SplitExpense[]>([]);
  const [activityLog, setActivityLog] = useState<GroupActivityLogEntry[]>([]);
  
  const [isLoadingPage, setIsLoadingPage] = useState(true); // Overall page loader
  const [isLoadingExpenses, setIsLoadingExpenses] = useState(true);
  const [isLoadingSplits, setIsLoadingSplits] = useState(true);
  const [isLoadingActivityLog, setIsLoadingActivityLog] = useState(true);
  const [isProcessingMember, setIsProcessingMember] = useState<string | null>(null);
  const [isAddMembersDialogOpen, setIsAddMembersDialogOpen] = useState(false);
  const [selectedFriendsToAdd, setSelectedFriendsToAdd] = useState<Record<string, boolean>>({});

  const [isSplitExpenseDialogOpen, setIsSplitExpenseDialogOpen] = useState(false);
  const [expenseToSplit, setExpenseToSplit] = useState<Expense | null>(null);

  const [isEditGroupNameDialogOpen, setIsEditGroupNameDialogOpen] = useState(false);
  const [isSavingGroupName, setIsSavingGroupName] = useState(false);
  const [isProcessingSettlement, setIsProcessingSettlement] = useState<string | null>(null); // splitId-participantId


  const groupNameForm = useForm<GroupNameFormData>({
    resolver: zodResolver(groupNameSchema),
    defaultValues: { name: "" },
  });

  const formatCurrency = (amount: number, currencyCode: CurrencyCode = 'USD') => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currencyCode }).format(amount);
  };

  const fetchGroupData = useCallback(async (refreshAll = false) => {
    if (!authUser || !groupId) {
        setGroup(null);
        setCurrentUserProfile(null);
        setFriends([]);
        setGroupExpenses([]);
        setSplitExpensesForGroup([]);
        setActivityLog([]);
        setIsLoadingExpenses(false);
        setIsLoadingSplits(false);
        setIsLoadingActivityLog(false);
        setIsLoadingPage(false);
        return;
    }

    if (refreshAll) {
        setIsLoadingPage(true);
    }
    setIsLoadingExpenses(true);
    setIsLoadingSplits(true);
    setIsLoadingActivityLog(true);
    
    try {
      const groupDataPromise = getGroupDetails(groupId);
      const expensesPromise = getExpensesByGroupId(groupId);
      const splitsPromise = getSplitExpensesByGroupId(groupId);
      const activityLogPromise = getGroupActivityLog(groupId, 20);
      
      let friendsPromise = Promise.resolve(friends); 
      let profilePromise = Promise.resolve(currentUserProfile);

      if (refreshAll || friends.length === 0 || !currentUserProfile) {
        friendsPromise = getFriends(authUser.uid);
        profilePromise = authUserProfile || getUserProfile(authUser.uid); // Use profile from auth context if available
      }

      const [groupData, fetchedFriends, fetchedProfile, expensesForGroup, groupSplits, fetchedLog] = await Promise.all([
        groupDataPromise, friendsPromise, profilePromise, expensesPromise, splitsPromise, activityLogPromise
      ]);

      if (!groupData) {
        toast({ variant: "destructive", title: "Error", description: "Group not found." });
        router.push("/groups");
        setIsLoadingPage(false);
        return;
      }
      if (!groupData.memberIds.includes(authUser.uid)) {
         toast({ variant: "destructive", title: "Access Denied", description: "You are not a member of this group." });
         router.push("/groups");
         setIsLoadingPage(false);
         return;
      }
      
      setGroup(groupData);
      if (refreshAll || groupNameForm.getValues("name") !== groupData.name) {
        groupNameForm.setValue("name", groupData.name);
      }
      setFriends(fetchedFriends || friends); // Maintain existing if not refreshing all
      setCurrentUserProfile(fetchedProfile || currentUserProfile); // Maintain existing if not refreshing all

      setGroupExpenses(expensesForGroup);
      setSplitExpensesForGroup(groupSplits);
      setActivityLog(fetchedLog);

    } catch (error) {
      console.error("Failed to fetch group details:", error);
      toast({ variant: "destructive", title: "Error Loading Group", description: "Could not load group details, expenses, or activity. Please try again." });
      setGroup(null); // Clear data on error
    } finally {
      if (refreshAll) setIsLoadingPage(false);
      setIsLoadingExpenses(false);
      setIsLoadingSplits(false);
      setIsLoadingActivityLog(false);
    }
  }, [authUser, groupId, toast, router, groupNameForm, friends, currentUserProfile, authUserProfile]);


  useEffect(() => {
    if (authLoading) {
      setIsLoadingPage(true);
      return;
    }
    if (authUser) {
      setIsLoadingPage(true); // Page will fetch its data
      fetchGroupData(true); // Initial full fetch
    } else {
      setGroup(null);
      setCurrentUserProfile(null);
      setFriends([]);
      setGroupExpenses([]);
      setSplitExpensesForGroup([]);
      setActivityLog([]);
      setIsLoadingPage(false);
      setIsLoadingExpenses(false);
      setIsLoadingSplits(false);
      setIsLoadingActivityLog(false);
    }
  }, [authLoading, authUser, groupId, fetchGroupData]); // groupId ensures re-fetch if navigating between group pages

const groupMemberBalances: GroupMemberBalance[] = useMemo(() => {
    if (!group || isLoadingExpenses || isLoadingSplits || !currentUserProfile) {
        return [];
    }

    const balances: Record<string, { paidForGroup: Partial<Record<CurrencyCode, number>>; owesToOthersInGroup: Partial<Record<CurrencyCode, number>> }> = {};
    group.memberDetails.forEach(member => {
        balances[member.uid] = { paidForGroup: {}, owesToOthersInGroup: {} };
    });

    const splitOriginalExpenseIds = new Set(splitExpensesForGroup.map(s => s.originalExpenseId));

    // Direct expenses paid by a member for the group (not yet formally split)
    groupExpenses.forEach(expense => {
        if (!splitOriginalExpenseIds.has(expense.id!) && balances[expense.userId]) {
            const currency = expense.currency;
            balances[expense.userId].paidForGroup[currency] = (balances[expense.userId].paidForGroup[currency] || 0) + expense.amount;
        }
    });
    
    // Formally split expenses
    splitExpensesForGroup.forEach(split => {
        const splitCurrency = split.currency;
        if (balances[split.paidBy]) {
            let amountPayerContributedForOthersInThisSplit = 0;
            split.participants.forEach(participant => {
                if (participant.userId !== split.paidBy && !participant.isSettled && group.memberIds.includes(participant.userId)) {
                    amountPayerContributedForOthersInThisSplit += participant.amountOwed;
                }
            });
            balances[split.paidBy].paidForGroup[splitCurrency] = (balances[split.paidBy].paidForGroup[splitCurrency] || 0) + amountPayerContributedForOthersInThisSplit;
        }

        split.participants.forEach(participant => {
            if (balances[participant.userId] && participant.userId !== split.paidBy && !participant.isSettled && group.memberIds.includes(participant.userId)) {
                balances[participant.userId].owesToOthersInGroup[splitCurrency] = (balances[participant.userId].owesToOthersInGroup[splitCurrency] || 0) + participant.amountOwed;
            }
        });
    });
    
    return group.memberDetails.map(member => {
        const paid = balances[member.uid]?.paidForGroup || {};
        const owed = balances[member.uid]?.owesToOthersInGroup || {};
        const netBalance: Partial<Record<CurrencyCode, number>> = {};
        
        const allCurrencies = new Set([...Object.keys(paid), ...Object.keys(owed)]) as Set<CurrencyCode>;
        allCurrencies.forEach(curr => {
            netBalance[curr] = (paid[curr] || 0) - (owed[curr] || 0);
        });

        return {
            uid: member.uid,
            displayName: member.displayName || member.email,
            email: member.email,
            paidForGroup: paid,
            owesToOthersInGroup: owed,
            netBalance: netBalance,
        };
    });
  }, [group, groupExpenses, splitExpensesForGroup, isLoadingExpenses, isLoadingSplits, currentUserProfile]);


  const pairwiseDebts: PairwiseDebt[] = useMemo(() => {
    if (groupMemberBalances.length === 0 || !group) {
        return [];
    }

    const allCurrenciesInBalances = new Set<CurrencyCode>();
    groupMemberBalances.forEach(balance => {
        Object.keys(balance.netBalance).forEach(curr => allCurrenciesInBalances.add(curr as CurrencyCode));
    });

    const calculatedDebts: PairwiseDebt[] = [];

    allCurrenciesInBalances.forEach(currency => {
        let mutableDebtors = groupMemberBalances
            .filter(m => (m.netBalance[currency] || 0) < -0.005)
            .map(m => ({ uid: m.uid, amount: Math.abs(m.netBalance[currency] || 0) }))
            .sort((a, b) => b.amount - a.amount);

        let mutableCreditors = groupMemberBalances
            .filter(m => (m.netBalance[currency] || 0) > 0.005)
            .map(m => ({ uid: m.uid, amount: m.netBalance[currency] || 0 }))
            .sort((a, b) => b.amount - a.amount);

        while (mutableDebtors.length > 0 && mutableCreditors.length > 0) {
            const debtor = mutableDebtors[0];
            const creditor = mutableCreditors[0];
            const amountToSettle = Math.min(debtor.amount, creditor.amount);

            if (amountToSettle > 0.005) {
                const fromProfile = group.memberDetails.find(m => m.uid === debtor.uid);
                const toProfile = group.memberDetails.find(m => m.uid === creditor.uid);
                if (fromProfile && toProfile) {
                    calculatedDebts.push({ from: fromProfile, to: toProfile, amount: amountToSettle, currency });
                }
            }

            debtor.amount -= amountToSettle;
            creditor.amount -= amountToSettle;

            if (debtor.amount < 0.005) mutableDebtors.shift();
            if (creditor.amount < 0.005) mutableCreditors.shift();
        }
    });
    return calculatedDebts.sort((a,b) => a.currency.localeCompare(b.currency) || Math.abs(b.amount) - Math.abs(a.amount));
  }, [groupMemberBalances, group]);

  const groupBalancesHasMixedCurrencies = useMemo(() => {
    const currencies = new Set<CurrencyCode>();
    groupMemberBalances.forEach(balance => {
        Object.keys(balance.netBalance).forEach(curr => currencies.add(curr as CurrencyCode));
    });
    return currencies.size > 1;
  }, [groupMemberBalances]);

  const pairwiseDebtsHasMixedCurrencies = useMemo(() => {
    const currencies = new Set(pairwiseDebts.map(d => d.currency));
    return currencies.size > 1;
  }, [pairwiseDebts]);


  const handleToggleFriendSelection = (friendId: string) => {
    setSelectedFriendsToAdd(prev => ({ ...prev, [friendId]: !prev[friendId] }));
  };

  const handleAddMembers = async () => {
    if (!group || !authUser || !currentUserProfile) return;
    const newMemberFriendProfiles = Object.entries(selectedFriendsToAdd)
      .filter(([, isSelected]) => isSelected)
      .map(([friendId]) => friends.find(f => f.uid === friendId))
      .filter(f => f !== undefined) as Friend[];

    if (newMemberFriendProfiles.length === 0) {
      toast({ title: "No members selected", description: "Please select at least one friend to add." });
      return;
    }
    
    const newMemberUserProfiles: UserProfile[] = newMemberFriendProfiles.map(f => ({
        uid: f.uid,
        email: f.email,
        displayName: f.displayName,
        createdAt: f.addedAt 
    }));

    setIsProcessingMember("adding"); 
    try {
      await addMembersToGroup(groupId, currentUserProfile, newMemberUserProfiles);
      toast({ title: "Members Added", description: "New members have been added to the group." });
      setSelectedFriendsToAdd({});
      setIsAddMembersDialogOpen(false);
      if(authUser) fetchGroupData(true); 
    } catch (error: any) {
      toast({ variant: "destructive", title: "Failed to Add Members", description: error.message || "Could not add selected members to the group." });
    } finally {
      setIsProcessingMember(null);
    }
  };

  const handleRemoveMember = async (memberIdToRemove: string) => {
    if (!group || !authUser || !currentUserProfile) return;
    if (memberIdToRemove === group.createdBy && group.memberIds.length > 1) {
        toast({variant: "destructive", title: "Action Not Allowed", description: "The group creator cannot be removed if other members exist. Transfer ownership or remove other members first."});
        return;
    }
     if (memberIdToRemove === authUser.uid && group.memberIds.length === 1 && group.createdBy === authUser.uid) {
        // Allow if it's the last member and they are the creator (will delete group)
    } else if (memberIdToRemove === authUser.uid) {
        // Allow if it's the current user leaving
    } else if (authUser.uid !== group.createdBy) {
        toast({variant: "destructive", title: "Action Not Allowed", description: "Only the group creator can remove other members."});
        return;
    }

    setIsProcessingMember(memberIdToRemove);
    try {
      const memberToRemoveProfile = group.memberDetails.find(m => m.uid === memberIdToRemove);
      await removeMemberFromGroup(groupId, currentUserProfile, memberIdToRemove, memberToRemoveProfile?.displayName || memberToRemoveProfile?.email || 'Unknown User');
      toast({ title: "Member Action Processed", description: "The member has been removed or you have left the group." });
      
      if (memberIdToRemove === authUser.uid || (group.memberIds.length === 1 && group.memberIds[0] === memberIdToRemove)) {
        router.push("/groups"); 
      } else {
        if(authUser) fetchGroupData(true); 
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Failed to Remove Member", description: error.message || "Could not process member removal or leave the group." });
    } finally {
      setIsProcessingMember(null);
    }
  };
  
  const handleOpenSplitDialog = (expense: Expense) => {
    setExpenseToSplit(expense);
    setIsSplitExpenseDialogOpen(true);
  };

  const handleEditGroupName = async (values: GroupNameFormData) => {
    if (!group || !authUser || authUser.uid !== group.createdBy || !currentUserProfile) {
      toast({ variant: "destructive", title: "Unauthorized", description: "Only the group creator can edit the group name." });
      return;
    }
    setIsSavingGroupName(true);
    try {
      await updateGroupDetails(groupId, currentUserProfile, { name: values.name });
      toast({ title: "Group Name Updated", description: `Group name changed to "${values.name}".` });
      setGroup(prev => prev ? { ...prev, name: values.name } : null); 
      setIsEditGroupNameDialogOpen(false);
      if(authUser) fetchGroupData(false); 
    } catch (error: any) {
      console.error("Error updating group name:", error);
      toast({ variant: "destructive", title: "Update Failed", description: error.message || "Could not update the group name." });
    } finally {
      setIsSavingGroupName(false);
    }
  };

  const handleSettleSplitParticipant = async (splitId: string, participantUserId: string) => {
    if (!splitId || !currentUserProfile) return;
    const split = splitExpensesForGroup.find(s => s.id === splitId);
    const participant = split?.participants.find(p => p.userId === participantUserId);
    if (!split || !participant) return;

    setIsProcessingSettlement(`${splitId}-${participantUserId}`);
    try {
        await updateSplitParticipantSettlement(groupId, currentUserProfile, splitId, participantUserId, true, participant.displayName || participant.email || 'A participant', split.originalExpenseDescription);
        toast({ title: "Settlement Updated", description: "Participant marked as settled."});
        if(authUser) fetchGroupData(false); 
    } catch (error: any) {
        console.error("Error settling participant:", error);
        toast({ variant: "destructive", title: "Update Failed", description: error.message || "Could not update the settlement status for the participant."});
    } finally {
        setIsProcessingSettlement(null);
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
  
  const friendsNotInGroup = useMemo(() => {
    return friends.filter(friend => !group?.memberIds.includes(friend.uid));
  }, [friends, group]);
  
  const creatorDetails = useMemo(() => {
    return group?.memberDetails.find(m => m.uid === group.createdBy);
  }, [group]);

  if (isLoadingPage) {
    return (
      <div className="flex h-[calc(100vh-10rem)] items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="text-center py-10">
        <ShieldAlert className="mx-auto h-12 w-12 text-destructive" />
        <h2 className="mt-4 text-xl font-semibold">Group Not Found</h2>
        <p className="text-muted-foreground">The group you are looking for does not exist or you may not have access.</p>
        <Button asChild className="mt-4">
          <Link href="/groups"><ArrowLeft className="mr-2 h-4 w-4"/> Back to Groups</Link>
        </Button>
      </div>
    );
  }
  
  const isCurrentUserCreator = authUser?.uid === group.createdBy;
  
  const actionableSplitsForCurrentUser = useMemo(() => {
    if (!currentUserProfile || !splitExpensesForGroup) return [];
    return splitExpensesForGroup.filter(split =>
      split.paidBy === currentUserProfile.uid &&
      split.participants.some(p => p.userId !== split.paidBy && !p.isSettled)
    );
  }, [splitExpensesForGroup, currentUserProfile]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/groups">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back to Groups</span>
          </Link>
        </Button>
        <div className="flex-grow">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight font-headline text-primary">{group.name}</h1>
            {isCurrentUserCreator && (
              <Dialog open={isEditGroupNameDialogOpen} onOpenChange={setIsEditGroupNameDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary" aria-label="Edit Group Name">
                    <Edit2 className="h-5 w-5" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Edit Group Name</DialogTitle>
                    <DialogDescription>Change the name of your group.</DialogDescription>
                  </DialogHeader>
                  <Form {...groupNameForm}>
                    <form onSubmit={groupNameForm.handleSubmit(handleEditGroupName)} className="space-y-4 py-2">
                      <FormField
                        control={groupNameForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>New Group Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter new group name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <DialogFooter>
                        <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                        <Button type="submit" disabled={isSavingGroupName}>
                          {isSavingGroupName ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4"/>}
                          Save Name
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            )}
          </div>
          <p className="text-muted-foreground">
            Created by: {creatorDetails?.displayName || creatorDetails?.email || 'Unknown'}
            <span className="mx-2">|</span>
            {group.memberIds.length} member{group.memberIds.length === 1 ? '' : 's'}
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="shadow-lg lg:col-span-1">
            <CardHeader className="flex flex-row items-center justify-between">
            <div>
                <CardTitle className="font-headline flex items-center"><Users className="mr-2 h-5 w-5"/>Group Members</CardTitle>
                <CardDescription>View members. The group creator can add or remove members. Members can leave the group.</CardDescription>
            </div>
            {isCurrentUserCreator && (
                <Dialog open={isAddMembersDialogOpen} onOpenChange={setIsAddMembersDialogOpen}>
                    <DialogTrigger asChild>
                        <Button size="sm" variant="outline">
                        <UserPlus className="mr-2 h-4 w-4" /> Add
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                        <DialogTitle>Add Members to {group.name}</DialogTitle>
                        <DialogDescription>
                            Select friends to add to this group.
                        </DialogDescription>
                        </DialogHeader>
                        {friendsNotInGroup.length > 0 ? (
                        <ScrollArea className="h-60 mt-2 rounded-md border p-2">
                            {friendsNotInGroup.map((friend) => (
                            <div key={friend.uid} className="flex items-center justify-between p-2 hover:bg-muted/50 rounded-md">
                                <Label htmlFor={`friend-add-${friend.uid}`} className="flex items-center gap-2 cursor-pointer">
                                <Image 
                                    src="https://placehold.co/40x40.png" 
                                    alt={friend.displayName || friend.email} 
                                    width={32} 
                                    height={32} 
                                    className="rounded-full"
                                    data-ai-hint="person avatar"
                                />
                                <span>{friend.displayName || friend.email}</span>
                                </Label>
                                <Checkbox
                                id={`friend-add-${friend.uid}`}
                                checked={!!selectedFriendsToAdd[friend.uid]}
                                onCheckedChange={() => handleToggleFriendSelection(friend.uid)}
                                />
                            </div>
                            ))}
                        </ScrollArea>
                        ) : (
                        <p className="text-sm text-muted-foreground mt-2">All your friends are already in this group or you have no friends to add.</p>
                        )}
                        <DialogFooter className="pt-2">
                        <DialogClose asChild>
                            <Button type="button" variant="outline">Cancel</Button>
                        </DialogClose>
                        <Button onClick={handleAddMembers} disabled={isProcessingMember === "adding" || Object.values(selectedFriendsToAdd).every(v => !v)}>
                            {isProcessingMember === "adding" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                            Add Selected Members
                        </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
            </CardHeader>
            <CardContent>
            {group.memberDetails.length > 0 ? (
                <ScrollArea className="h-80">
                <div className="space-y-3 pr-2">
                {group.memberDetails.map((member) => (
                    <div key={member.uid} className="flex items-center justify-between p-3 rounded-md border bg-card hover:bg-muted/50">
                    <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                        <AvatarImage src="https://placehold.co/100x100.png" alt={member.displayName || member.email} data-ai-hint="person avatar"/>
                        <AvatarFallback>{getInitials(member.displayName, member.email)}</AvatarFallback>
                        </Avatar>
                        <div>
                        <p className="font-semibold text-sm">{member.displayName || member.email}
                            {member.uid === group.createdBy && <span className="ml-2 text-xs text-primary font-medium">(Creator)</span>}
                            {member.uid === authUser?.uid && <span className="ml-2 text-xs text-accent font-medium">(You)</span>}
                        </p>
                        <p className="text-xs text-muted-foreground">{member.email}</p>
                        </div>
                    </div>
                    {(isCurrentUserCreator && member.uid !== authUser?.uid) || (member.uid === authUser?.uid && group.memberIds.length > 1) ? (
                        <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-destructive hover:text-destructive/80"
                                disabled={isProcessingMember === member.uid}
                                aria-label={member.uid === authUser?.uid ? "Leave group" : "Remove member"}
                            >
                            {isProcessingMember === member.uid ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                            <span className="ml-1.5 hidden sm:inline">{member.uid === authUser?.uid ? "Leave" : "Remove"}</span>
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                {member.uid === authUser?.uid ? "You are about to leave this group." : `This will remove ${member.displayName || member.email} from the group.`}
                                This action cannot be undone.
                            </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleRemoveMember(member.uid)} className="bg-destructive hover:bg-destructive/90">
                                {isProcessingMember === member.uid ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : (member.uid === authUser?.uid ? "Leave Group" : "Remove Member")}
                            </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                        </AlertDialog>
                    ): (member.uid === authUser?.uid && group.memberIds.length === 1 && isCurrentUserCreator && (
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="text-destructive hover:text-destructive/80" 
                                    disabled={isProcessingMember === member.uid}
                                    aria-label="Delete group"
                                >
                                    {isProcessingMember === member.uid ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                    <span className="ml-1.5 hidden sm:inline">Delete Group</span>
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>Delete Group?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    You are the only member and the creator. Removing yourself will delete the group. This action cannot be undone.
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleRemoveMember(member.uid)} className="bg-destructive hover:bg-destructive/90">
                                    Delete Group
                                </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    ))
                    }
                    </div>
                ))}
                </div>
                </ScrollArea>
            ) : (
                <p className="text-muted-foreground text-center py-4">This group has no members.</p>
            )}
            </CardContent>
        </Card>

        <div className="lg:col-span-2 space-y-6">
            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle className="font-headline flex items-center"><CircleDollarSign className="mr-2 h-5 w-5"/>Group Expenses</CardTitle>
                    <CardDescription>
                        Expenses associated with {group.name}. 
                        Direct expenses you paid (if not yet formally split) contribute to your &quot;Paid for Group&quot; balance. 
                        Formally split expenses are detailed in the &quot;Settle Debts Owed To You&quot; section if you are the payer.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoadingExpenses ? (
                        <div className="flex items-center justify-center py-10">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <p className="ml-2">Loading expenses...</p>
                        </div>
                    ) : groupExpenses.length > 0 ? (
                        <ScrollArea className="h-[200px] md:h-[240px]">
                        <div className="space-y-3 pr-2">
                            {groupExpenses.map(expense => (
                                <Card key={expense.id} className="shadow-sm">
                                    <CardContent className="p-3">
                                    <div className="flex justify-between items-start">
                                        <div>
                                        <p className="font-medium text-sm">{expense.description}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {format(new Date(expense.date), "MMM dd, yyyy")} - {expense.category}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            Added by: {group.memberDetails.find(m => m.uid === expense.userId)?.displayName || group.memberDetails.find(m => m.uid === expense.userId)?.email || 'Unknown user'}
                                        </p>
                                        </div>
                                        <div className="text-right flex flex-col items-end gap-1">
                                            <p className="font-semibold text-sm">{formatCurrency(expense.amount, expense.currency)}</p>
                                            <Button 
                                                variant="outline" 
                                                size="sm" 
                                                className="text-xs"
                                                onClick={() => handleOpenSplitDialog(expense)}
                                            >
                                                <Split className="mr-1.5 h-3.5 w-3.5"/> Split This Expense
                                            </Button>
                                        </div>
                                    </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                        </ScrollArea>
                    ) : (
                        <div className="text-center py-10">
                            <ReceiptText className="mx-auto h-12 w-12 text-muted-foreground" />
                            <p className="mt-4 text-muted-foreground text-lg">No expenses recorded for this group yet.</p>
                            <p className="text-sm text-muted-foreground mt-2">Add an expense to get started!</p>
                        </div>
                    )}
                    <Button 
                        variant="default" 
                        className="w-full mt-6" 
                        onClick={() => router.push(`/expenses/add?groupId=${groupId}&groupName=${encodeURIComponent(group.name)}`)}
                    >
                        <CircleDollarSign className="mr-2 h-4 w-4" /> Add New Expense to This Group
                    </Button>
                </CardContent>
            </Card>

            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle className="font-headline flex items-center"><Scale className="mr-2 h-5 w-5"/>Group Balances</CardTitle>
                    <CardDescription>Summary of who owes whom within the group, broken down by currency.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoadingExpenses || isLoadingSplits ? (
                        <div className="flex items-center justify-center py-10">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <p className="ml-2">Loading balances...</p>
                        </div>
                    ) : groupMemberBalances.length > 0 ? (
                        <>
                        {groupBalancesHasMixedCurrencies && (
                            <Alert variant="default" className="mb-4 text-xs bg-amber-50 border-amber-200 text-amber-700">
                                <AlertTriangle className="h-4 w-4 text-amber-600" />
                                <UIAlertDescription>
                                Balances involve multiple currencies. All amounts are shown in their original currency without conversion.
                                </UIAlertDescription>
                            </Alert>
                        )}
                        <ScrollArea className="h-[250px] md:h-[300px]">
                            <div className="space-y-4 pr-2">
                                {groupMemberBalances.map(memberBalance => (
                                    <Card key={memberBalance.uid} className="shadow-sm">
                                        <CardHeader className="p-3 pb-1">
                                            <div className="flex items-center gap-2">
                                                <Avatar className="h-8 w-8">
                                                    <AvatarImage src="https://placehold.co/40x40.png" alt={memberBalance.displayName} data-ai-hint="person avatar"/>
                                                    <AvatarFallback>{getInitials(memberBalance.displayName, memberBalance.email)}</AvatarFallback>
                                                </Avatar>
                                                <span className="font-medium text-sm">{memberBalance.displayName} {memberBalance.uid === authUser?.uid ? "(You)" : ""}</span>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="p-3 pt-1">
                                            {Object.keys(memberBalance.netBalance).length === 0 && Object.keys(memberBalance.paidForGroup).length === 0 && Object.keys(memberBalance.owesToOthersInGroup).length === 0 && (
                                                <p className="text-xs text-muted-foreground text-center py-2">No balance activity yet.</p>
                                            )}
                                            {(Object.keys(memberBalance.netBalance) as CurrencyCode[]).map(currency => {
                                                const net = memberBalance.netBalance[currency] || 0;
                                                const paid = memberBalance.paidForGroup[currency] || 0;
                                                const owed = memberBalance.owesToOthersInGroup[currency] || 0;
                                                if (Math.abs(net) < 0.01 && Math.abs(paid) < 0.01 && Math.abs(owed) < 0.01) return null;
                                                
                                                return (
                                                <div key={currency} className="mt-2 border-t pt-2">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="text-xs font-semibold text-muted-foreground">{currency} Balance:</span>
                                                        <Badge variant={net >= 0 ? "default" : "destructive"} className={cn(net >= 0 ? "bg-green-600 hover:bg-green-700" : "", "text-white")}>
                                                            {net >= 0 ? <TrendingUp className="mr-1 h-4 w-4"/> : <TrendingDown className="mr-1 h-4 w-4"/>}
                                                            {formatCurrency(net, currency)}
                                                        </Badge>
                                                    </div>
                                                    <div className="text-xs text-muted-foreground grid grid-cols-2 gap-x-2">
                                                        <p>Paid for Group: <span className="font-medium text-green-600">{formatCurrency(paid, currency)}</span></p>
                                                        <p>Owes from Splits: <span className="font-medium text-red-600">{formatCurrency(owed, currency)}</span></p>
                                                    </div>
                                                </div>
                                                );
                                            })}
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </ScrollArea>
                        </>
                    ) : (
                        <p className="text-muted-foreground text-center py-4">No balance data to display.</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-4">
                        &quot;Paid for Group&quot; = (Direct expenses you paid - if not split) + (Amounts others owed you from group splits you paid for).
                        <br/>
                        &quot;Owes from Splits&quot; = Your unsettled share from group splits paid by others.
                        Net Balance reflects your overall financial position within the group for each currency.
                    </p>
                </CardContent>
            </Card>

             <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle className="font-headline flex items-center"><Handshake className="mr-2 h-5 w-5 text-primary"/>Settle Debts Owed To You (Group Splits)</CardTitle>
                    <CardDescription>Manage shares owed to you from group splits you paid for.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoadingSplits ? (
                        <div className="flex items-center justify-center py-10">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <p className="ml-2">Loading splits...</p>
                        </div>
                    ) : actionableSplitsForCurrentUser.length > 0 ? (
                        <ScrollArea className="h-[250px] md:h-[300px]">
                            <div className="space-y-4 pr-2">
                                {actionableSplitsForCurrentUser.map(split => {
                                    return (
                                        <Card key={split.id} className="shadow-sm">
                                            <CardHeader className="pb-2">
                                                <CardTitle className="text-md">{split.originalExpenseDescription}</CardTitle>
                                                <CardDescription>
                                                    Total: {formatCurrency(split.totalAmount, split.currency)} ({split.currency}) | You paid for this split.
                                                </CardDescription>
                                            </CardHeader>
                                            <CardContent className="space-y-2">
                                                {split.participants
                                                    .filter(p => p.userId !== split.paidBy && !p.isSettled)
                                                    .map(participant => {
                                                        const participantDetail = group.memberDetails.find(m => m.uid === participant.userId);
                                                        return (
                                                            <div key={participant.userId} className="flex items-center justify-between p-2 bg-muted/30 rounded-md">
                                                                <div className="flex items-center gap-2">
                                                                    <Avatar className="h-7 w-7">
                                                                        <AvatarImage src="https://placehold.co/40x40.png" alt={participantDetail?.displayName || participantDetail?.email} data-ai-hint="person avatar" />
                                                                        <AvatarFallback>{getInitials(participantDetail?.displayName, participantDetail?.email)}</AvatarFallback>
                                                                    </Avatar>
                                                                    <div>
                                                                        <p className="text-sm font-medium">{participantDetail?.displayName || participantDetail?.email}</p>
                                                                        <p className="text-xs text-red-600">Owes You: {formatCurrency(participant.amountOwed, split.currency)}</p>
                                                                    </div>
                                                                </div>
                                                                <AlertDialog>
                                                                    <AlertDialogTrigger asChild>
                                                                        <Button variant="outline" size="sm" className="text-xs" disabled={isProcessingSettlement === `${split.id}-${participant.userId}`}>
                                                                            {isProcessingSettlement === `${split.id}-${participant.userId}` ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckSquare className="mr-1.5 h-3 w-3"/>}
                                                                            Mark Settled
                                                                        </Button>
                                                                    </AlertDialogTrigger>
                                                                    <AlertDialogContent>
                                                                        <AlertDialogHeader>
                                                                            <AlertDialogTitle>Confirm Settlement</AlertDialogTitle>
                                                                            <AlertDialogDescription>
                                                                                Are you sure you want to mark {participantDetail?.displayName || participantDetail?.email} as settled for their share of {formatCurrency(participant.amountOwed, split.currency)} for the expense &quot;{split.originalExpenseDescription}&quot;?
                                                                            </AlertDialogDescription>
                                                                        </AlertDialogHeader>
                                                                        <AlertDialogFooter>
                                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                            <AlertDialogAction onClick={() => split.id && handleSettleSplitParticipant(split.id, participant.userId)}>Confirm</AlertDialogAction>
                                                                        </AlertDialogFooter>
                                                                    </AlertDialogContent>
                                                                </AlertDialog>
                                                            </div>
                                                        );
                                                })}
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>
                        </ScrollArea>
                    ) : (
                        <p className="text-muted-foreground text-center py-6">
                            All shares owed to you in group splits are settled, or you haven&apos;t paid for any group splits with outstanding shares from others.
                        </p>
                    )}
                </CardContent>
            </Card>

            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle className="font-headline flex items-center"><Landmark className="mr-2 h-5 w-5"/>Who Owes Whom (Simplified)</CardTitle>
                    <CardDescription>A simplified summary of debts within the group to help settle up, per currency.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoadingExpenses || isLoadingSplits ? ( 
                        <div className="flex items-center justify-center py-10">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <p className="ml-2">Calculating debts...</p>
                        </div>
                    ) : pairwiseDebts.length > 0 ? (
                         <>
                         {pairwiseDebtsHasMixedCurrencies && (
                            <Alert variant="default" className="mb-4 text-xs bg-amber-50 border-amber-200 text-amber-700">
                                <AlertTriangle className="h-4 w-4 text-amber-600" />
                                <UIAlertDescription>
                                Debts involve multiple currencies. Each line item represents a debt in a specific currency.
                                </UIAlertDescription>
                            </Alert>
                         )}
                         <ScrollArea className="h-[200px] md:h-[240px]">
                            <div className="space-y-3 pr-2">
                                {pairwiseDebts.map((debt, index) => (
                                    <Card key={index} className="shadow-sm">
                                        <CardContent className="p-3">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <Avatar className="h-8 w-8">
                                                        <AvatarImage src="https://placehold.co/40x40.png" alt={debt.from.displayName || debt.from.email} data-ai-hint="person avatar"/>
                                                        <AvatarFallback>{getInitials(debt.from.displayName, debt.from.email)}</AvatarFallback>
                                                    </Avatar>
                                                    <span className="font-medium text-sm">{debt.from.displayName || debt.from.email} {debt.from.uid === currentUserProfile?.uid ? "(You)" : ""}</span>
                                                </div>
                                                <div className="flex flex-col items-center">
                                                    <ArrowRight className="h-5 w-5 text-muted-foreground"/>
                                                    <span className="text-xs text-destructive font-semibold">{formatCurrency(debt.amount, debt.currency)}</span>
                                                </div>
                                                <div className="flex items-center gap-2 justify-end">
                                                    <span className="font-medium text-sm text-right">{debt.to.displayName || debt.to.email} {debt.to.uid === currentUserProfile?.uid ? "(You)" : ""}</span>
                                                    <Avatar className="h-8 w-8">
                                                        <AvatarImage src="https://placehold.co/40x40.png" alt={debt.to.displayName || debt.to.email} data-ai-hint="person avatar"/>
                                                        <AvatarFallback>{getInitials(debt.to.displayName, debt.to.email)}</AvatarFallback>
                                                    </Avatar>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </ScrollArea>
                         </>
                    ) : (
                        <p className="text-muted-foreground text-center py-6">All clear! No outstanding debts within the group based on current balances.</p>
                    )}
                     <p className="text-xs text-muted-foreground mt-4">
                        This is a simplified settlement plan. To settle, {pairwiseDebts.length > 0 ? "each person on the left should pay the indicated amount (in the specified currency) to the person on the right." : "no payments are needed."} Marking individual splits as settled will update these recommendations.
                    </p>
                </CardContent>
            </Card>

            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle className="font-headline flex items-center"><History className="mr-2 h-5 w-5 text-primary"/>Activity Log</CardTitle>
                    <CardDescription>Recent activity within this group.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoadingActivityLog ? (
                        <div className="flex items-center justify-center py-10">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <p className="ml-2">Loading activity...</p>
                        </div>
                    ) : activityLog.length > 0 ? (
                        <ScrollArea className="h-[250px] md:h-[300px]">
                            <div className="space-y-3 pr-2">
                                {activityLog.map(log => (
                                    <div key={log.id} className="p-3 border rounded-md bg-muted/30">
                                        <p className="text-sm">
                                            <span className="font-semibold">{log.actorDisplayName || 'System'}</span> {log.details}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    ) : (
                         <div className="text-center py-10">
                            <History className="mx-auto h-12 w-12 text-muted-foreground" />
                            <p className="mt-4 text-lg text-muted-foreground">No activity recorded for this group yet.</p>
                            <p className="text-sm text-muted-foreground mt-2">Actions like adding members or expenses will appear here.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
      </div>
      
      {expenseToSplit && group && currentUserProfile && (
        <GroupExpenseSplitDialog
          isOpen={isSplitExpenseDialogOpen}
          onOpenChange={(isOpen) => {
            setIsSplitExpenseDialogOpen(isOpen);
            if (!isOpen && authUser) fetchGroupData(false); 
          }}
          expenseToSplit={expenseToSplit}
          group={group}
          currentUserProfile={currentUserProfile}
        />
      )}
    </div>
  );
}
