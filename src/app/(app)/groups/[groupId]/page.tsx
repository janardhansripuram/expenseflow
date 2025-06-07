
"use client";

import React, { useEffect, useState, useCallback } from "react";
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
import { Loader2, ArrowLeft, UserPlus, Users, Trash2, ShieldAlert, Edit, CircleDollarSign, List, Split, Edit2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { getGroupDetails, getFriends, addMembersToGroup, removeMemberFromGroup, getUserProfile, getExpensesByGroupId, updateGroupDetails } from "@/lib/firebase/firestore";
import type { Group, Friend, UserProfile, GroupMemberDetail, Expense } from "@/lib/types";
import Image from "next/image";
import { format } from "date-fns";
import { GroupExpenseSplitDialog } from "@/components/groups/GroupExpenseSplitDialog";

const groupNameSchema = z.object({
  name: z.string().min(1, "Group name is required").max(100, "Group name must be 100 characters or less"),
});
type GroupNameFormData = z.infer<typeof groupNameSchema>;


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
  
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingExpenses, setIsLoadingExpenses] = useState(true);
  const [isProcessingMember, setIsProcessingMember] = useState<string | null>(null);
  const [isAddMembersDialogOpen, setIsAddMembersDialogOpen] = useState(false);
  const [selectedFriendsToAdd, setSelectedFriendsToAdd] = useState<Record<string, boolean>>({});

  const [isSplitExpenseDialogOpen, setIsSplitExpenseDialogOpen] = useState(false);
  const [expenseToSplit, setExpenseToSplit] = useState<Expense | null>(null);

  const [isEditGroupNameDialogOpen, setIsEditGroupNameDialogOpen] = useState(false);
  const [isSavingGroupName, setIsSavingGroupName] = useState(false);

  const groupNameForm = useForm<GroupNameFormData>({
    resolver: zodResolver(groupNameSchema),
    defaultValues: { name: "" },
  });

  const fetchGroupData = useCallback(async (refreshExpenses = false) => {
    if (!user || !groupId) return;
    if (!refreshExpenses) setIsLoading(true); // Only show main loader if not just refreshing expenses
    setIsLoadingExpenses(true);
    try {
      const promises: any[] = [
        getGroupDetails(groupId),
        getExpensesByGroupId(groupId)
      ];
      // Only fetch friends and profile if not already loaded or if main load
      if (!friends.length || !currentUserProfile || !refreshExpenses) {
        promises.splice(1,0, getFriends(user.uid));
        promises.splice(2,0, getUserProfile(user.uid));
      }
      
      const [groupData, fetchedFriends, fetchedProfile, expensesForGroup] = await Promise.all(promises.length === 4 ? promises : [promises[0], friends, currentUserProfile, promises[1]]);

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
      groupNameForm.setValue("name", groupData.name); // For edit dialog
      if (fetchedFriends) setFriends(fetchedFriends);
      if (fetchedProfile) setCurrentUserProfile(fetchedProfile);
      setGroupExpenses(expensesForGroup);

    } catch (error) {
      console.error("Failed to fetch group details:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not load group details or expenses." });
    } finally {
      setIsLoading(false);
      setIsLoadingExpenses(false);
    }
  }, [user, groupId, toast, router, friends, currentUserProfile, groupNameForm]);

  useEffect(() => {
    fetchGroupData();
  }, [fetchGroupData]);

  const handleToggleFriendSelection = (friendId: string) => {
    setSelectedFriendsToAdd(prev => ({ ...prev, [friendId]: !prev[friendId] }));
  };

  const handleAddMembers = async () => {
    if (!group || !user) return;
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
      await addMembersToGroup(groupId, newMemberUserProfiles);
      toast({ title: "Members Added", description: "New members have been added to the group." });
      setSelectedFriendsToAdd({});
      setIsAddMembersDialogOpen(false);
      fetchGroupData(); 
    } catch (error: any) {
      toast({ variant: "destructive", title: "Failed to Add Members", description: error.message || "Could not add members." });
    } finally {
      setIsProcessingMember(null);
    }
  };

  const handleRemoveMember = async (memberIdToRemove: string) => {
    if (!group || !user) return;
    if (memberIdToRemove === group.createdBy && group.memberIds.length > 1) {
        toast({variant: "destructive", title: "Action Not Allowed", description: "The group creator cannot be removed if other members exist. Transfer ownership or remove other members first."});
        return;
    }
     if (memberIdToRemove === user.uid && group.memberIds.length === 1) {
        // This will trigger group deletion by firestore function
    } else if (memberIdToRemove === user.uid) {
        // User is leaving the group
    } else if (user.uid !== group.createdBy) {
        toast({variant: "destructive", title: "Action Not Allowed", description: "Only the group creator can remove other members."});
        return;
    }

    setIsProcessingMember(memberIdToRemove);
    try {
      await removeMemberFromGroup(groupId, memberIdToRemove);
      toast({ title: "Member Removed", description: "The member has been removed from the group." });
      
      if (memberIdToRemove === user.uid || (group.memberIds.length === 1 && group.memberIds[0] === memberIdToRemove)) {
        router.push("/groups");
      } else {
        fetchGroupData(); 
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
    if (!group || !user || user.uid !== group.createdBy) {
      toast({ variant: "destructive", title: "Unauthorized", description: "Only the group creator can edit the group name." });
      return;
    }
    setIsSavingGroupName(true);
    try {
      await updateGroupDetails(groupId, { name: values.name });
      toast({ title: "Group Name Updated", description: `Group name changed to "${values.name}".` });
      setGroup(prev => prev ? { ...prev, name: values.name } : null);
      setIsEditGroupNameDialogOpen(false);
      // No need to call fetchGroupData here if only name changes locally,
      // but if other parts of groupData could be stale, fetch it.
      // We also need to refresh expenses if groupName is denormalized there.
      fetchGroupData(true); // Refresh expenses to get updated groupName if it's on expenses
    } catch (error) {
      console.error("Error updating group name:", error);
      toast({ variant: "destructive", title: "Update Failed", description: "Could not update group name." });
    } finally {
      setIsSavingGroupName(false);
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

      <div className="grid md:grid-cols-3 gap-6">
        <Card className="shadow-lg md:col-span-1">
            <CardHeader className="flex flex-row items-center justify-between">
            <div>
                <CardTitle className="font-headline flex items-center"><Users className="mr-2 h-5 w-5"/>Group Members</CardTitle>
                <CardDescription>Manage who is part of this group.</CardDescription>
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
                                    src={`https://placehold.co/40x40.png?text=${getInitials(friend.displayName, friend.email)}`} 
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
                        <AvatarImage src={`https://placehold.co/100x100.png?text=${getInitials(member.displayName, member.email)}`} alt={member.displayName || member.email} data-ai-hint="person avatar"/>
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
                                {group.memberIds.length === 1 && member.uid === group.createdBy ? " Removing the last member (creator) will delete the group." : ""}
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

        <Card className="shadow-lg md:col-span-2">
            <CardHeader>
                <CardTitle className="font-headline flex items-center"><CircleDollarSign className="mr-2 h-5 w-5"/>Group Expenses</CardTitle>
                <CardDescription>Expenses associated with {group.name}.</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoadingExpenses ? (
                    <div className="flex items-center justify-center py-10">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="ml-2">Loading expenses...</p>
                    </div>
                ) : groupExpenses.length > 0 ? (
                    <ScrollArea className="h-[300px]">
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
                        <List className="mx-auto h-12 w-12 text-muted-foreground" />
                        <p className="mt-4 text-muted-foreground text-lg">No expenses recorded for this group yet.</p>
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
      </div>
      
      <Card className="shadow-lg mt-6">
        <CardHeader>
          <CardTitle className="font-headline flex items-center"><ShieldAlert className="mr-2 h-5 w-5"/>Admin & Advanced Settings</CardTitle>
          <CardDescription>Further group management options (e.g., group balances, transfer ownership) are planned for future updates.</CardDescription>
        </CardHeader>
        <CardContent>
            <p className="text-muted-foreground">Functionality to calculate group balances, settle debts within the group, and manage advanced settings will be available here in a future update.</p>
            <Image 
                src="https://placehold.co/600x200.png?text=Advanced+Group+Features"
                alt="Placeholder for advanced group features UI"
                width={600}
                height={200}
                className="rounded-md mx-auto border shadow-sm my-4"
                data-ai-hint="dashboard charts analytics"
            />
        </CardContent>
      </Card>
      {expenseToSplit && group && (
        <GroupExpenseSplitDialog
          isOpen={isSplitExpenseDialogOpen}
          onOpenChange={setIsSplitExpenseDialogOpen}
          expenseToSplit={expenseToSplit}
          group={group}
          currentUserProfile={currentUserProfile}
        />
      )}
    </div>
  );
}
```