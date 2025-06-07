
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
import { Loader2, ArrowLeft, UserPlus, Users, Trash2, ShieldAlert, Edit, CircleDollarSign, List, Split, Edit2, Scale, TrendingUp, TrendingDown, Handshake, CheckSquare, Save, ArrowRight, Landmark, History, ReceiptText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { getGroupDetails, getFriends, addMembersToGroup, removeMemberFromGroup, getUserProfile, getExpensesByGroupId, updateGroupDetails, getSplitExpensesByGroupId, updateSplitParticipantSettlement, logGroupActivity, getGroupActivityLog } from "@/lib/firebase/firestore";
import type { Group, Friend, UserProfile, GroupMemberDetail, Expense, SplitExpense, GroupMemberBalance, SplitParticipant, GroupActivityLogEntry } from "@/lib/types";
import Image from "next/image";
import { format, formatDistanceToNow } from "date-fns";
import { GroupExpenseSplitDialog } from "@/components/groups/GroupExpenseSplitDialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";


const groupNameSchema = z.object({
  name: z.string().min(1, "Group name is required").max(100, "Group name must be 100 characters or less"),
});
type GroupNameFormData = z.infer<typeof groupNameSchema>;

interface PairwiseDebt {
  from: GroupMemberDetail;
  to: GroupMemberDetail;
  amount: number;
}


export default function GroupDetailsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const params = useParams();
  const groupId = params.groupId as string;

  const [group, setGroup] = useState<Group | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);
  const [groupExpenses, setGroupExpenses] = useState<Expense[]>([]);
  const [splitExpensesForGroup, setSplitExpensesForGroup] = useState<SplitExpense[]>([]);
  const [groupMemberBalances, setGroupMemberBalances] = useState<GroupMemberBalance[]>([]);
  const [pairwiseDebts, setPairwiseDebts] = useState<PairwiseDebt[]>([]);
  const [activityLog, setActivityLog] = useState<GroupActivityLogEntry[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingExpenses, setIsLoadingExpenses] = useState(true);
  const [isLoadingSplits, setIsLoadingSplits] = useState(true);
  const [isLoadingBalances, setIsLoadingBalances] = useState(true);
  const [isLoadingPairwiseDebts, setIsLoadingPairwiseDebts] = useState(true);
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

  const fetchGroupData = useCallback(async (refreshAll = false) => {
    if (!user || !groupId) return;

    if (refreshAll) {
        setIsLoading(true);
        setIsLoadingExpenses(true);
        setIsLoadingSplits(true);
        setIsLoadingBalances(true);
        setIsLoadingPairwiseDebts(true);
        setIsLoadingActivityLog(true);
    } else {
        setIsLoadingExpenses(true); 
        setIsLoadingSplits(true);
        setIsLoadingBalances(true);
        setIsLoadingPairwiseDebts(true);
        setIsLoadingActivityLog(true);
    }
    
    try {
      const groupDataPromise = getGroupDetails(groupId);
      const expensesPromise = getExpensesByGroupId(groupId);
      const splitsPromise = getSplitExpensesByGroupId(groupId);
      const activityLogPromise = getGroupActivityLog(groupId, 20);
      
      let friendsPromise = Promise.resolve(friends); 
      let profilePromise = Promise.resolve(currentUserProfile);

      if (refreshAll || friends.length === 0 || !currentUserProfile) {
        friendsPromise = getFriends(user.uid);
        profilePromise = getUserProfile(user.uid);
      }

      const [groupData, fetchedFriends, fetchedProfile, expensesForGroup, groupSplits, fetchedLog] = await Promise.all([
        groupDataPromise, friendsPromise, profilePromise, expensesPromise, splitsPromise, activityLogPromise
      ]);

      if (!groupData) {
        toast({ variant: "destructive", title: "Error", description: "Group not found." });
        router.push("/groups");
        return;
      }
      if (!groupData.memberIds.includes(user.uid)) {
         toast({ variant: "destructive", title: "Access Denied", description: "You are not a member of this group." });
         router.push("/groups");
         return;
      }
      
      setGroup(groupData);
      if (refreshAll || groupNameForm.getValues("name") !== groupData.name) {
        groupNameForm.setValue("name", groupData.name);
      }
      setFriends(fetchedFriends || friends);
      setCurrentUserProfile(fetchedProfile || currentUserProfile);
      setGroupExpenses(expensesForGroup);
      setSplitExpensesForGroup(groupSplits);
      setActivityLog(fetchedLog);

    } catch (error) {
      console.error("Failed to fetch group details:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not load group details or expenses." });
    } finally {
      if (refreshAll) setIsLoading(false);
      setIsLoadingExpenses(false);
      setIsLoadingSplits(false);
      setIsLoadingActivityLog(false);
    }
  }, [user, groupId, toast, router, groupNameForm, friends, currentUserProfile]);


  useEffect(() => {
    fetchGroupData(true); 
  }, []); 


  useEffect(() => {
    if (!group || isLoadingExpenses || isLoadingSplits || !currentUserProfile) {
      setIsLoadingBalances(true);
      return;
    }
    setIsLoadingBalances(true);
    
    const balances: Record<string, { paidForGroup: number; owesToOthersInGroup: number }> = {};
    const splitOriginalExpenseIds = new Set(splitExpensesForGroup.map(s => s.originalExpenseId));

    group.memberDetails.forEach(member => {
      balances[member.uid] = { paidForGroup: 0, owesToOthersInGroup: 0 };
    });
    
    groupExpenses.forEach(expense => {
      if (!splitOriginalExpenseIds.has(expense.id!) && balances[expense.userId]) {
        balances[expense.userId].paidForGroup += expense.amount;
      }
    });
    
    splitExpensesForGroup.forEach(split => {
        if (balances[split.paidBy]) {
            let amountPaidByPayerForOthersInThisSplit = 0;
            split.participants.forEach(participant => {
                if (participant.userId !== split.paidBy && !participant.isSettled) {
                    amountPaidByPayerForOthersInThisSplit += participant.amountOwed;
                }
            });
            balances[split.paidBy].paidForGroup += amountPaidByPayerForOthersInThisSplit;
        }

        split.participants.forEach(participant => {
            if (balances[participant.userId] && participant.userId !== split.paidBy && !participant.isSettled) {
                balances[participant.userId].owesToOthersInGroup += participant.amountOwed;
            }
        });
    });
    
    const finalBalances: GroupMemberBalance[] = group.memberDetails.map(member => {
      const paid = balances[member.uid]?.paidForGroup || 0;
      const owed = balances[member.uid]?.owesToOthersInGroup || 0;
      return {
        uid: member.uid,
        displayName: member.displayName || member.email,
        email: member.email,
        paidForGroup: paid,
        owesToOthersInGroup: owed,
        netBalance: paid - owed,
      };
    }).sort((a,b) => b.netBalance - a.netBalance); 

    setGroupMemberBalances(finalBalances);
    setIsLoadingBalances(false);
  }, [group, groupExpenses, splitExpensesForGroup, isLoadingExpenses, isLoadingSplits, currentUserProfile]);

  useEffect(() => {
    if (isLoadingBalances || !groupMemberBalances.length || !group) {
      setIsLoadingPairwiseDebts(true);
      setPairwiseDebts([]);
      return;
    }
    setIsLoadingPairwiseDebts(true);

    let mutableDebtors = groupMemberBalances
      .filter(m => m.netBalance < -0.005) 
      .map(m => ({ uid: m.uid, amount: Math.abs(m.netBalance) }))
      .sort((a, b) => b.amount - a.amount);

    let mutableCreditors = groupMemberBalances
      .filter(m => m.netBalance > 0.005) 
      .map(m => ({ uid: m.uid, amount: m.netBalance }))
      .sort((a, b) => b.amount - a.amount);
    
    const calculatedDebts: PairwiseDebt[] = [];

    while (mutableDebtors.length > 0 && mutableCreditors.length > 0) {
      const debtor = mutableDebtors[0];
      const creditor = mutableCreditors[0];
      const amountToSettle = Math.min(debtor.amount, creditor.amount);

      if (amountToSettle > 0.005) {
        const fromProfile = group.memberDetails.find(m => m.uid === debtor.uid);
        const toProfile = group.memberDetails.find(m => m.uid === creditor.uid);
        if (fromProfile && toProfile) {
           calculatedDebts.push({ from: fromProfile, to: toProfile, amount: amountToSettle });
        }
      }

      debtor.amount -= amountToSettle;
      creditor.amount -= amountToSettle;

      if (debtor.amount < 0.005) mutableDebtors.shift();
      if (creditor.amount < 0.005) mutableCreditors.shift();
    }
    
    setPairwiseDebts(calculatedDebts);
    setIsLoadingPairwiseDebts(false);

  }, [groupMemberBalances, isLoadingBalances, group]);


  const handleToggleFriendSelection = (friendId: string) => {
    setSelectedFriendsToAdd(prev => ({ ...prev, [friendId]: !prev[friendId] }));
  };

  const handleAddMembers = async () => {
    if (!group || !user || !currentUserProfile) return;
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
      fetchGroupData(true); 
    } catch (error: any) {
      toast({ variant: "destructive", title: "Failed to Add Members", description: error.message || "Could not add members." });
    } finally {
      setIsProcessingMember(null);
    }
  };

  const handleRemoveMember = async (memberIdToRemove: string) => {
    if (!group || !user || !currentUserProfile) return;
    if (memberIdToRemove === group.createdBy && group.memberIds.length > 1) {
        toast({variant: "destructive", title: "Action Not Allowed", description: "The group creator cannot be removed if other members exist. Transfer ownership or remove other members first."});
        return;
    }
     if (memberIdToRemove === user.uid && group.memberIds.length === 1 && group.createdBy === user.uid) {
    } else if (memberIdToRemove === user.uid) {
    } else if (user.uid !== group.createdBy) {
        toast({variant: "destructive", title: "Action Not Allowed", description: "Only the group creator can remove other members."});
        return;
    }

    setIsProcessingMember(memberIdToRemove);
    try {
      const memberToRemoveProfile = group.memberDetails.find(m => m.uid === memberIdToRemove);
      await removeMemberFromGroup(groupId, currentUserProfile, memberIdToRemove, memberToRemoveProfile?.displayName || memberToRemoveProfile?.email);
      toast({ title: "Member Action Processed", description: "The member has been removed or you have left the group." });
      
      if (memberIdToRemove === user.uid || (group.memberIds.length === 1 && group.memberIds[0] === memberIdToRemove)) {
        router.push("/groups"); 
      } else {
        fetchGroupData(true); 
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Failed to Remove Member", description: error.message || "Could not remove member." });
    } finally {
      setIsProcessingMember(null);
    }
  };
  
  const handleOpenSplitDialog = (expense: Expense) => {
    setExpenseToSplit(expense);
    setIsSplitExpenseDialogOpen(true);
  };

  const handleEditGroupName = async (values: GroupNameFormData) => {
    if (!group || !user || user.uid !== group.createdBy || !currentUserProfile) {
      toast({ variant: "destructive", title: "Unauthorized", description: "Only the group creator can edit the group name." });
      return;
    }
    setIsSavingGroupName(true);
    try {
      await updateGroupDetails(groupId, currentUserProfile, { name: values.name });
      toast({ title: "Group Name Updated", description: `Group name changed to "${values.name}".` });
      setGroup(prev => prev ? { ...prev, name: values.name } : null); 
      setIsEditGroupNameDialogOpen(false);
      fetchGroupData(false); 
    } catch (error) {
      console.error("Error updating group name:", error);
      toast({ variant: "destructive", title: "Update Failed", description: "Could not update group name." });
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
        fetchGroupData(false); 
    } catch (error: any) {
        console.error("Error settling participant:", error);
        toast({ variant: "destructive", title: "Update Failed", description: "Could not update settlement status."});
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
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const friendsNotInGroup = friends.filter(friend => !group?.memberIds.includes(friend.uid));
  const creatorDetails = group?.memberDetails.find(m => m.uid === group.createdBy);

  if (isLoading) {
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
  
  const isCurrentUserCreator = user?.uid === group.createdBy;
  
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
                  <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary">
                    <Edit2 className="h-5 w-5" />
                    <span className="sr-only">Edit Group Name</span>
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
                            {member.uid === user?.uid && <span className="ml-2 text-xs text-accent font-medium">(You)</span>}
                        </p>
                        <p className="text-xs text-muted-foreground">{member.email}</p>
                        </div>
                    </div>
                    {(isCurrentUserCreator && member.uid !== user?.uid) || (member.uid === user?.uid && group.memberIds.length > 1) ? (
                        <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-destructive hover:text-destructive/80"
                                disabled={isProcessingMember === member.uid}
                            >
                            {isProcessingMember === member.uid ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                            <span className="ml-1.5 hidden sm:inline">{member.uid === user?.uid ? "Leave" : "Remove"}</span>
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                {member.uid === user?.uid ? "You are about to leave this group." : `This will remove ${member.displayName || member.email} from the group.`}
                                This action cannot be undone.
                            </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleRemoveMember(member.uid)} className="bg-destructive hover:bg-destructive/90">
                                {isProcessingMember === member.uid ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : (member.uid === user?.uid ? "Leave Group" : "Remove Member")}
                            </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                        </AlertDialog>
                    ): (member.uid === user?.uid && group.memberIds.length === 1 && isCurrentUserCreator && (
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive/80" disabled={isProcessingMember === member.uid}>
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
                                            <p className="font-semibold text-sm">{formatCurrency(expense.amount)}</p>
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
                    <CardDescription>Summary of who owes whom within the group based on formalized splits and direct, unsplit expenses.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoadingBalances ? (
                        <div className="flex items-center justify-center py-10">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <p className="ml-2">Loading balances...</p>
                        </div>
                    ) : groupMemberBalances.length > 0 ? (
                        <ScrollArea className="h-[200px] md:h-[240px]">
                            <div className="space-y-3 pr-2">
                                {groupMemberBalances.map(memberBalance => (
                                    <Card key={memberBalance.uid} className="shadow-sm">
                                        <CardContent className="p-3">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <Avatar className="h-8 w-8">
                                                        <AvatarImage src="https://placehold.co/40x40.png" alt={memberBalance.displayName} data-ai-hint="person avatar"/>
                                                        <AvatarFallback>{getInitials(memberBalance.displayName, memberBalance.email)}</AvatarFallback>
                                                    </Avatar>
                                                    <span className="font-medium text-sm">{memberBalance.displayName} {memberBalance.uid === user?.uid ? "(You)" : ""}</span>
                                                </div>
                                                <Badge variant={memberBalance.netBalance >= 0 ? "default" : "destructive"} className={cn(memberBalance.netBalance >= 0 ? "bg-green-600 hover:bg-green-700 text-white" : "", "text-white")}>
                                                    {memberBalance.netBalance >= 0 ? <TrendingUp className="mr-1 h-4 w-4"/> : <TrendingDown className="mr-1 h-4 w-4"/>}
                                                    {formatCurrency(memberBalance.netBalance)}
                                                </Badge>
                                            </div>
                                            <div className="mt-2 text-xs text-muted-foreground grid grid-cols-2 gap-x-2">
                                                <p>Paid for Group: <span className="font-medium text-green-600">{formatCurrency(memberBalance.paidForGroup)}</span></p>
                                                <p>Owes from Splits: <span className="font-medium text-red-600">{formatCurrency(memberBalance.owesToOthersInGroup)}</span></p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </ScrollArea>
                    ) : (
                        <p className="text-muted-foreground text-center py-4">No balance data to display.</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-4">
                        &quot;Paid for Group&quot; = (Direct expenses you paid - if not split) + (Amounts others owed you from group splits you paid for).
                        <br/>
                        &quot;Owes from Splits&quot; = Your unsettled share from group splits paid by others.
                        Net Balance reflects your overall financial position within the group.
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
                                                    Total: {formatCurrency(split.totalAmount)} | You paid for this split.
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
                                                                        <p className="text-xs text-red-600">Owes You: {formatCurrency(participant.amountOwed)}</p>
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
                                                                                Are you sure you want to mark {participantDetail?.displayName || participantDetail?.email} as settled for their share of {formatCurrency(participant.amountOwed)} for the expense &quot;{split.originalExpenseDescription}&quot;?
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
                    <CardDescription>A simplified summary of debts within the group to help settle up.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoadingPairwiseDebts ? (
                        <div className="flex items-center justify-center py-10">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <p className="ml-2">Calculating debts...</p>
                        </div>
                    ) : pairwiseDebts.length > 0 ? (
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
                                                    <span className="text-xs text-destructive font-semibold">{formatCurrency(debt.amount)}</span>
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
                    ) : (
                        <p className="text-muted-foreground text-center py-6">All clear! No outstanding debts within the group based on current balances.</p>
                    )}
                     <p className="text-xs text-muted-foreground mt-4">
                        This is a simplified settlement plan. To settle, {pairwiseDebts.length > 0 ? "each person on the left should pay the indicated amount to the person on the right." : "no payments are needed."} Marking individual splits as settled will update these recommendations.
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
                                            {formatDistanceToNow(log.timestamp.toDate(), { addSuffix: true })}
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
            if (!isOpen) fetchGroupData(false); 
          }}
          expenseToSplit={expenseToSplit}
          group={group}
          currentUserProfile={currentUserProfile}
        />
      )}
    </div>
  );
}
