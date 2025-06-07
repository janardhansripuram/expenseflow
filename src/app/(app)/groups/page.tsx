
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";
import Image from "next/image";

export default function GroupsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-headline text-foreground">Groups</h1>
        <p className="text-muted-foreground">Manage shared expenses within groups of friends, family, or colleagues.</p>
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
        </CardContent>
      </Card>
    </div>
  );
}
