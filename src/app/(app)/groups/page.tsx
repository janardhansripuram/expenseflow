
"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Users, PlusCircle, Loader2, User, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { createGroup, getGroupsForUser, getFriends, getUserProfile } from "@/lib/firebase/firestore";
import type { Group, Friend, UserProfile } from "@/lib/types";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import Link from "next/link";
import Image from "next/image";
import { Timestamp } from "firebase/firestore"; // Import Timestamp

export default function GroupsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [isLoadingGroups, setIsLoadingGroups] = useState(true);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [selectedFriends, setSelectedFriends] = useState<Record<string, boolean>>({});
  const [isCreateGroupDialogOpen, setIsCreateGroupDialogOpen] = useState(false);

  const fetchInitialData = useCallback(async () => {
    if (!user) return;
    setIsLoadingGroups(true);
    try {
      const profile = await getUserProfile(user.uid);
      setCurrentUserProfile(profile);

      const [userGroups, userFriends] = await Promise.all([
        getGroupsForUser(user.uid),
        getFriends(user.uid),
      ]);
      setGroups(userGroups);
      setFriends(userFriends);
    } catch (error) {
      console.error("Failed to fetch groups data:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not load groups data." });
    } finally {
      setIsLoadingGroups(false);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !currentUserProfile || !newGroupName.trim()) {
      toast({ variant: "destructive", title: "Error", description: "Group name is required." });
      return;
    }

    const initialMemberIds = Object.entries(selectedFriends)
      .filter(([, isSelected]) => isSelected)
      .map(([friendId]) => friendId);
    
    const allMemberIdsSet = new Set([currentUserProfile.uid, ...initialMemberIds]);
    const allMemberIds = Array.from(allMemberIdsSet);

    if (allMemberIds.length === 0) { // Should not happen if creator is always added
        toast({variant: "destructive", title: "Error", description: "A group must have at least one member (the creator)."});
        return;
    }
    
    setIsCreatingGroup(true);
    try {
        const memberProfilesToCreate: UserProfile[] = [];
        for (const uid of allMemberIds) {
            if (uid === currentUserProfile.uid) {
                memberProfilesToCreate.push(currentUserProfile);
            } else {
                const friendProfile = friends.find(f => f.uid === uid);
                if (friendProfile) {
                     // Construct a UserProfile-like object from Friend data
                    memberProfilesToCreate.push({ 
                        uid: friendProfile.uid, 
                        email: friendProfile.email, 
                        displayName: friendProfile.displayName, 
                        createdAt: Timestamp.now() // Placeholder, actual profile has its own createdAt
                    });
                } else {
                    // This case should ideally not happen if selection is only from friends
                    // and creator is currentUserProfile
                    const fetchedProfile = await getUserProfile(uid);
                    if (fetchedProfile) memberProfilesToCreate.push(fetchedProfile);
                    else throw new Error(`Could not fetch profile for UID: ${uid}`);
                }
            }
        }
        
        if (memberProfilesToCreate.length !== allMemberIds.length) {
            throw new Error("Could not resolve all member profiles for group creation.");
        }

        await createGroup(currentUserProfile, newGroupName, memberProfilesToCreate);
        toast({ title: "Group Created", description: `Group "${newGroupName}" has been successfully created.` });
        setNewGroupName("");
        setSelectedFriends({});
        fetchInitialData(); 
        setIsCreateGroupDialogOpen(false);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Failed to Create Group", description: error.message || "An unexpected error occurred." });
    } finally {
      setIsCreatingGroup(false);
    }
  };

  const handleToggleFriendSelection = (friendId: string) => {
    setSelectedFriends(prev => ({
      ...prev,
      [friendId]: !prev[friendId],
    }));
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline text-foreground">Groups</h1>
          <p className="text-muted-foreground">Manage shared expenses within groups.</p>
        </div>
        <Dialog open={isCreateGroupDialogOpen} onOpenChange={setIsCreateGroupDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" /> Create New Group
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Group</DialogTitle>
              <DialogDescription>
                Enter a name for your group and select initial members.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateGroup} className="space-y-4">
              <div>
                <Label htmlFor="group-name" className="text-right">
                  Group Name
                </Label>
                <Input
                  id="group-name"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="e.g., Apartment Bills, Road Trip"
                  required
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Add Members (from Friends)</Label>
                {friends.length > 0 ? (
                  <ScrollArea className="h-48 mt-1 rounded-md border p-2">
                    {friends.map((friend) => (
                      <div key={friend.uid} className="flex items-center justify-between p-2 hover:bg-muted/50 rounded-md">
                        <Label htmlFor={`friend-${friend.uid}`} className="flex items-center gap-2 cursor-pointer">
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
                          id={`friend-${friend.uid}`}
                          checked={!!selectedFriends[friend.uid]}
                          onCheckedChange={() => handleToggleFriendSelection(friend.uid)}
                        />
                      </div>
                    ))}
                  </ScrollArea>
                ) : (
                  <p className="text-sm text-muted-foreground mt-1">Add some friends first to invite them to groups.</p>
                )}
              </div>
              <DialogFooter className="pt-2">
                 <DialogClose asChild>
                    <Button type="button" variant="outline">Cancel</Button>
                 </DialogClose>
                <Button type="submit" disabled={isCreatingGroup || !newGroupName.trim()}>
                  {isCreatingGroup ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                  Create Group
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline">Your Groups</CardTitle>
          <CardDescription>List of groups you are a member of.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingGroups ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="ml-2">Loading groups...</p>
            </div>
          ) : groups.length > 0 ? (
            <div className="space-y-3">
              {groups.map((group) => (
                <Card key={group.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-lg text-primary">{group.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {group.memberIds.length} member{group.memberIds.length === 1 ? '' : 's'}
                        </p>
                      </div>
                      <Link href={`/groups/${group.id}`} passHref>
                        <Button variant="outline" size="sm"> 
                          View Details <ChevronRight className="ml-1 h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                    <div className="mt-3">
                      <p className="text-xs text-muted-foreground mb-1">Members:</p>
                      <div className="flex flex-wrap gap-1">
                        {group.memberDetails.slice(0, 5).map(member => (
                           <Image 
                            key={member.uid}
                            src={`https://placehold.co/24x24.png?text=${getInitials(member.displayName, member.email)}`} 
                            alt={member.displayName || member.email} 
                            width={24} 
                            height={24} 
                            className="rounded-full border-2 border-background"
                            title={member.displayName || member.email}
                            data-ai-hint="person avatar" 
                          />
                        ))}
                        {group.memberDetails.length > 5 && (
                          <span className="flex items-center justify-center h-6 w-6 rounded-full bg-muted text-xs text-muted-foreground border-2 border-background">
                            +{group.memberDetails.length - 5}
                          </span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="text-xs text-muted-foreground p-4 pt-0">
                      Created by: {group.memberDetails.find(m => m.uid === group.createdBy)?.displayName || group.memberDetails.find(m => m.uid === group.createdBy)?.email || 'Unknown'}
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
             <div className="text-center py-10">
              <Users className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-4 text-lg text-muted-foreground">No groups yet.</p>
              <p className="text-sm text-muted-foreground">Create a group to start sharing expenses with others.</p>
            </div>
          )}
        </CardContent>
      </Card>
       <Card className="shadow-lg mt-6">
        <CardHeader>
            <CardTitle className="font-headline">Group Expense Management</CardTitle>
            <CardDescription>Advanced features for groups are coming soon.</CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <Image 
            src="https://placehold.co/600x300.png" 
            alt="Placeholder for group management interface" 
            width={600} 
            height={300}
            className="rounded-md mx-auto border shadow-sm my-6"
            data-ai-hint="team collaboration people"
          />
          <p className="text-muted-foreground text-sm">
            Soon you&apos;ll be able to add shared expenses to groups, track balances, and settle up with members.
          </p>
           <div className="mt-4 p-3 bg-muted/50 rounded-md text-left text-xs">
             <p className="text-foreground font-medium">Upcoming Group Features:</p>
             <ul className="list-disc list-inside text-muted-foreground pl-2 mt-1">
                <li>Adding expenses directly to groups.</li>
                <li>Tracking who paid for what and who owes whom.</li>
                <li>Settling group debts.</li>
             </ul>
          </div>
        </CardContent>
       </Card>
    </div>
  );
}
