
"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Loader2, ArrowLeft, UserPlus, Users, Trash2, ShieldAlert, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { getGroupDetails, getFriends, addMembersToGroup, removeMemberFromGroup, getUserProfile } from "@/lib/firebase/firestore";
import type { Group, Friend, UserProfile, GroupMemberDetail } from "@/lib/types";
import Image from "next/image";

export default function GroupDetailsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const params = useParams();
  const groupId = params.groupId as string;

  const [group, setGroup] = useState<Group | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessingMember, setIsProcessingMember] = useState<string | null>(null); // memberId being added/removed
  const [isAddMembersDialogOpen, setIsAddMembersDialogOpen] = useState(false);
  const [selectedFriendsToAdd, setSelectedFriendsToAdd] = useState<Record<string, boolean>>({});

  const fetchGroupData = useCallback(async () => {
    if (!user || !groupId) return;
    setIsLoading(true);
    try {
      const [groupData, userFriends, profile] = await Promise.all([
        getGroupDetails(groupId),
        getFriends(user.uid),
        getUserProfile(user.uid)
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
      setFriends(userFriends);
      setCurrentUserProfile(profile);

    } catch (error) {
      console.error("Failed to fetch group details:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not load group details." });
    } finally {
      setIsLoading(false);
    }
  }, [user, groupId, toast, router]);

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
    
    // Convert Friend[] to UserProfile[] for the firestore function
    const newMemberUserProfiles: UserProfile[] = newMemberFriendProfiles.map(f => ({
        uid: f.uid,
        email: f.email,
        displayName: f.displayName,
        createdAt: f.addedAt // Using addedAt as a stand-in for createdAt for UserProfile structure
    }));

    setIsProcessingMember("adding"); // Generic state for adding
    try {
      await addMembersToGroup(groupId, newMemberUserProfiles);
      toast({ title: "Members Added", description: "New members have been added to the group." });
      setSelectedFriendsToAdd({});
      setIsAddMembersDialogOpen(false);
      fetchGroupData(); // Refresh group data
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
      
      // If the current user removed themselves or the group was deleted (last member removed)
      if (memberIdToRemove === user.uid || (group.memberIds.length === 1 && group.memberIds[0] === memberIdToRemove)) {
        router.push("/groups");
      } else {
        fetchGroupData(); // Refresh group data
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Failed to Remove Member", description: error.message || "Could not remove member." });
    } finally {
      setIsProcessingMember(null);
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
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline text-primary">{group.name}</h1>
          <p className="text-muted-foreground">
            Created by: {creatorDetails?.displayName || creatorDetails?.email || 'Unknown'}
            <span className="mx-2">|</span>
            {group.memberIds.length} member{group.memberIds.length === 1 ? '' : 's'}
          </p>
        </div>
      </div>

      <Card className="shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="font-headline flex items-center"><Users className="mr-2 h-5 w-5"/>Group Members</CardTitle>
            <CardDescription>Manage who is part of this group.</CardDescription>
          </div>
           {isCurrentUserCreator && (
            <Dialog open={isAddMembersDialogOpen} onOpenChange={setIsAddMembersDialogOpen}>
                <DialogTrigger asChild>
                    <Button size="sm">
                    <UserPlus className="mr-2 h-4 w-4" /> Add Members
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
            <div className="space-y-3">
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
                  {/* Allow removing other members if current user is creator, or allow current user to leave */}
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
                           <span className="ml-1.5 hidden sm:inline">{member.uid === user?.uid ? "Leave Group" : "Remove"}</span>
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
                  ): (member.uid === user?.uid && group.memberIds.length === 1 && isCurrentUserCreator && ( // Case: Creator is the only member.
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
          ) : (
            <p className="text-muted-foreground text-center py-4">This group has no members.</p>
          )}
        </CardContent>
      </Card>
      
      {/* Placeholder for Group Expenses and Settings */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline flex items-center"><Edit className="mr-2 h-5 w-5"/>Group Settings & Expenses</CardTitle>
          <CardDescription>Manage group settings and track shared expenses (Coming Soon).</CardDescription>
        </CardHeader>
        <CardContent>
            <p className="text-muted-foreground">Functionality to edit group name, manage group-specific expenses, and view balances will be available here in a future update.</p>
            <Image 
                src="https://placehold.co/600x200.png?text=Group+Expenses+UI"
                alt="Placeholder for group expenses UI"
                width={600}
                height={200}
                className="rounded-md mx-auto border shadow-sm my-4"
                data-ai-hint="finance chart team"
            />
        </CardContent>
      </Card>
    </div>
  );
}
