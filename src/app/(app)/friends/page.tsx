
"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, Mail, MessageSquare, Trash2, UserCheck, UserX, Loader2, Send, Inbox } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import {
  sendFriendRequest,
  getIncomingFriendRequests,
  acceptFriendRequest,
  rejectFriendRequest,
  getFriends,
  removeFriend,
  getUserProfile,
} from "@/lib/firebase/firestore";
import type { UserProfile, FriendRequest, Friend } from "@/lib/types";
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
import { formatDistanceToNow } from 'date-fns';


export default function FriendsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
  const [friendEmail, setFriendEmail] = useState("");
  
  const [isLoadingFriends, setIsLoadingFriends] = useState(true);
  const [isLoadingRequests, setIsLoadingRequests] = useState(true);
  const [isSendingRequest, setIsSendingRequest] = useState(false);
  const [isProcessingRequest, setIsProcessingRequest] = useState<string | null>(null); // stores request ID
  const [isRemovingFriend, setIsRemovingFriend] = useState<string | null>(null); // stores friend UID


  const fetchInitialData = useCallback(async () => {
    if (!user) return;
    setIsLoadingFriends(true);
    setIsLoadingRequests(true);
    try {
      const profile = await getUserProfile(user.uid);
      setCurrentUserProfile(profile);

      const [userFriends, userRequests] = await Promise.all([
        getFriends(user.uid),
        getIncomingFriendRequests(user.uid),
      ]);
      setFriends(userFriends);
      setIncomingRequests(userRequests);
    } catch (error) {
      console.error("Failed to fetch friends data:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not load friends data." });
    } finally {
      setIsLoadingFriends(false);
      setIsLoadingRequests(false);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  const handleSendFriendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !currentUserProfile || !friendEmail.trim()) return;
    setIsSendingRequest(true);
    try {
      const result = await sendFriendRequest(user.uid, currentUserProfile.email, currentUserProfile.displayName, friendEmail);
      if (result.success) {
        toast({ title: "Friend Request Sent", description: result.message });
        setFriendEmail(""); // Clear input
      } else {
        toast({ variant: "destructive", title: "Failed to Send Request", description: result.message });
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message || "Could not send friend request." });
    } finally {
      setIsSendingRequest(false);
    }
  };

  const handleAcceptRequest = async (request: FriendRequest) => {
    if (!user || !currentUserProfile) return;
    setIsProcessingRequest(request.id);

    const fromUserProfile = await getUserProfile(request.fromUserId);
    const toUserProfile = currentUserProfile; // Current user is the one accepting

    if (!fromUserProfile) {
        toast({ variant: "destructive", title: "Error", description: "Could not find sender's profile." });
        setIsProcessingRequest(null);
        return;
    }

    try {
      await acceptFriendRequest(request.id, fromUserProfile, toUserProfile);
      toast({ title: "Friend Added", description: `You are now friends with ${request.fromUserDisplayName || request.fromUserEmail}.` });
      fetchInitialData(); // Refresh lists
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message || "Could not accept friend request." });
    } finally {
      setIsProcessingRequest(null);
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    setIsProcessingRequest(requestId);
    try {
      await rejectFriendRequest(requestId);
      toast({ title: "Request Rejected" });
      fetchInitialData(); // Refresh lists
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message || "Could not reject friend request." });
    } finally {
      setIsProcessingRequest(null);
    }
  };

  const handleRemoveFriend = async (friendUid: string) => {
    if (!user) return;
    setIsRemovingFriend(friendUid);
    try {
      await removeFriend(user.uid, friendUid);
      toast({ title: "Friend Removed" });
      fetchInitialData(); // Refresh lists
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message || "Could not remove friend." });
    } finally {
      setIsRemovingFriend(null);
    }
  };
  
  const getInitials = (name?: string, email?: string) => {
    if (name) {
      const parts = name.split(' ');
      if (parts.length > 1) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      return name.substring(0,2).toUpperCase();
    }
    if (email) return email.substring(0,2).toUpperCase();
    return '??';
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline text-foreground">Friends</h1>
          <p className="text-muted-foreground">Manage your connections for easy expense splitting and sharing.</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="mr-2 h-4 w-4" /> Add New Friend
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add Friend</DialogTitle>
              <DialogDescription>
                Enter the email address of the user you want to add as a friend.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSendFriendRequest} className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="friend-email" className="text-right">
                  Email
                </Label>
                <Input
                  id="friend-email"
                  type="email"
                  value={friendEmail}
                  onChange={(e) => setFriendEmail(e.target.value)}
                  placeholder="friend@example.com"
                  className="col-span-3"
                  required
                />
              </div>
              <DialogFooter>
                <DialogClose asChild>
                   <Button type="button" variant="outline">Cancel</Button>
                </DialogClose>
                <Button type="submit" disabled={isSendingRequest || !friendEmail.trim()}>
                  {isSendingRequest ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4"/>}
                  Send Request
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Incoming Friend Requests */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline">Incoming Friend Requests</CardTitle>
          <CardDescription>Respond to users who want to connect with you.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingRequests ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="ml-2">Loading requests...</p>
            </div>
          ) : incomingRequests.length > 0 ? (
            <div className="space-y-3">
              {incomingRequests.map((req) => (
                <div key={req.id} className="flex items-center justify-between p-3 rounded-md border bg-card hover:bg-muted/50">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                       <AvatarImage src="https://placehold.co/100x100.png" alt={req.fromUserDisplayName || req.fromUserEmail} data-ai-hint="person avatar" />
                      <AvatarFallback>{getInitials(req.fromUserDisplayName, req.fromUserEmail)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-sm">{req.fromUserDisplayName || req.fromUserEmail}</p>
                      <p className="text-xs text-muted-foreground">{req.fromUserEmail}</p>
                      <p className="text-xs text-muted-foreground">Sent {formatDistanceToNow(req.createdAt.toDate(), { addSuffix: true })}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleAcceptRequest(req)}
                        disabled={isProcessingRequest === req.id}
                    >
                      {isProcessingRequest === req.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <UserCheck className="h-4 w-4 text-green-600" />}
                      <span className="ml-1.5 hidden sm:inline">Accept</span>
                    </Button>
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleRejectRequest(req.id)}
                        disabled={isProcessingRequest === req.id}
                        className="text-destructive hover:text-destructive/80"
                    >
                       {isProcessingRequest === req.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <UserX className="h-4 w-4" />}
                       <span className="ml-1.5 hidden sm:inline">Reject</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10">
              <Inbox className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-4 text-lg text-muted-foreground">No incoming friend requests.</p>
              <p className="text-sm text-muted-foreground">When someone sends you a request, it will appear here.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Current Friends List */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline">Your Friends</CardTitle>
          <CardDescription>List of your current connections.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingFriends ? (
             <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="ml-2">Loading friends...</p>
            </div>
          ) : friends.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {friends.map((friend) => (
                <Card key={friend.uid} className="overflow-hidden shadow-md hover:shadow-lg transition-shadow">
                  <CardContent className="p-4 flex flex-col items-center text-center">
                    <Avatar className="w-16 h-16 mb-3 border-2 border-primary/50">
                       <AvatarImage src="https://placehold.co/100x100.png" alt={friend.displayName || friend.email} data-ai-hint="person avatar" />
                      <AvatarFallback>{getInitials(friend.displayName, friend.email)}</AvatarFallback>
                    </Avatar>
                    <p className="font-semibold text-md text-foreground">{friend.displayName || friend.email}</p>
                    <p className="text-xs text-muted-foreground">{friend.email}</p>
                    <div className="mt-3 flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => toast({ title: "Coming Soon", description: "Chat functionality is under development."})} disabled>
                        <MessageSquare className="mr-1.5 h-3.5 w-3.5" /> Chat
                      </Button>
                       <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleRemoveFriend(friend.uid)} 
                        disabled={isRemovingFriend === friend.uid}
                        className="text-destructive hover:text-destructive/80"
                        title="Remove friend"
                        >
                        {isRemovingFriend === friend.uid ? <Loader2 className="h-4 w-4 animate-spin"/> : <Trash2 className="h-4 w-4" />}
                         <span className="sr-only">Remove friend</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
             <div className="text-center py-10">
              <Users className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-4 text-lg text-muted-foreground">No friends added yet.</p>
              <p className="text-sm text-muted-foreground">Use the "Add New Friend" button above to send a request and start connecting!</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
