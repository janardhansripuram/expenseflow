
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserPlus, Mail, MessageSquare, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Placeholder data for friends
const placeholderFriends = [
  { id: "1", name: "Alice Wonderland", email: "alice@example.com", initials: "AW", avatarUrl: "https://placehold.co/100x100.png?text=AW" },
  { id: "2", name: "Bob The Builder", email: "bob@example.com", initials: "BB", avatarUrl: "https://placehold.co/100x100.png?text=BB" },
  { id: "3", name: "Charlie Chaplin", email: "charlie@example.com", initials: "CC", avatarUrl: "https://placehold.co/100x100.png?text=CC" },
];

export default function FriendsPage() {
  const { toast } = useToast();

  const handleComingSoon = () => {
    toast({
      title: "Feature Coming Soon",
      description: "This functionality is currently under development.",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline text-foreground">Friends</h1>
          <p className="text-muted-foreground">Manage your connections for easy expense splitting and sharing.</p>
        </div>
        <Button onClick={handleComingSoon} disabled>
          <UserPlus className="mr-2 h-4 w-4" /> Add New Friend
        </Button>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline">Your Connections</CardTitle>
          <CardDescription>This feature is currently under development. Below is a mock-up of how your friends list might look.</CardDescription>
        </CardHeader>
        <CardContent>
          {placeholderFriends.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {placeholderFriends.map((friend) => (
                <Card key={friend.id} className="overflow-hidden shadow-md hover:shadow-lg transition-shadow">
                  <CardContent className="p-4 flex flex-col items-center text-center">
                    <Avatar className="w-20 h-20 mb-3 border-2 border-primary/50">
                      <AvatarImage src={friend.avatarUrl} alt={friend.name} data-ai-hint="person portrait" />
                      <AvatarFallback>{friend.initials}</AvatarFallback>
                    </Avatar>
                    <p className="font-semibold text-lg text-foreground">{friend.name}</p>
                    <p className="text-sm text-muted-foreground">{friend.email}</p>
                    <div className="mt-3 flex gap-2">
                      <Button variant="outline" size="sm" onClick={handleComingSoon} disabled>
                        <MessageSquare className="mr-1.5 h-3.5 w-3.5" /> Chat
                      </Button>
                       <Button variant="ghost" size="icon" onClick={handleComingSoon} disabled className="text-destructive hover:text-destructive/80">
                        <Trash2 className="h-4 w-4" />
                         <span className="sr-only">Remove friend</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-10">
              <UserPlus className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-4 text-lg text-muted-foreground">No friends added yet.</p>
              <p className="text-sm text-muted-foreground">Once this feature is live, you'll see your connections here.</p>
            </div>
          )}
          <div className="mt-6 p-4 bg-muted/50 rounded-md text-center">
             <p className="text-sm text-foreground">
                <strong>Coming Soon:</strong> Full friend management, including adding, removing, and inviting friends. This will integrate with expense splitting and group features.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
