
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, PlusCircle } from "lucide-react";
import Image from "next/image";
import { useToast } from "@/hooks/use-toast";

export default function GroupsPage() {
  const { toast } = useToast();

  const handleComingSoon = () => {
    toast({
      title: "Feature Coming Soon",
      description: "Group creation and management is currently under development.",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline text-foreground">Groups</h1>
          <p className="text-muted-foreground">Manage shared expenses within groups of friends, family, or colleagues.</p>
        </div>
        <Button onClick={handleComingSoon} disabled>
          <PlusCircle className="mr-2 h-4 w-4" /> Create New Group
        </Button>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline flex items-center">
            <Users className="mr-2 h-6 w-6 text-primary" />
            Coming Soon: Group Expense Management
          </CardTitle>
          <CardDescription>Collaborate on finances with ease.</CardDescription>
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
          <p className="text-muted-foreground text-lg">
            Create groups, invite members, add shared expenses, and track balances all in one place.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Perfect for roommates, travel buddies, or any shared financial endeavors.
          </p>
           <div className="mt-6 p-4 bg-muted/50 rounded-md text-center">
             <p className="text-sm text-foreground">
                <strong>Note:</strong> Full group functionality, including creation, member invites, and shared expense tracking, will be implemented in a future update.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
