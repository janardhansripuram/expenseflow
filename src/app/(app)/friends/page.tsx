
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UserPlus } from "lucide-react";
import Image from "next/image";

export default function FriendsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-headline text-foreground">Friends</h1>
        <p className="text-muted-foreground">Manage your connections for easy expense splitting and sharing.</p>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline flex items-center">
            <UserPlus className="mr-2 h-6 w-6 text-primary" />
            Coming Soon: Friends & Connections
          </CardTitle>
          <CardDescription>Keep track of who you share expenses with.</CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <Image 
            src="https://placehold.co/600x300.png" 
            alt="Placeholder for friends list interface" 
            width={600} 
            height={300}
            className="rounded-md mx-auto border shadow-sm my-6"
            data-ai-hint="social network connection"
          />
          <p className="text-muted-foreground text-lg">
            This section will allow you to add friends, making it quicker to split bills and manage shared group expenses.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Simplifying shared finances is our goal!
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
