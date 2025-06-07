
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ListChecks, PlusCircle } from "lucide-react"; // Changed from BellRing for better context
import Image from "next/image";
import { useToast } from "@/hooks/use-toast";

export default function RemindersPage() {
  const { toast } = useToast();

  const handleComingSoon = () => {
    toast({
      title: "Feature Coming Soon",
      description: "Reminder creation and management is currently under development.",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline text-foreground">Reminders</h1>
          <p className="text-muted-foreground">Set up reminders for upcoming bills or payments.</p>
        </div>
        <Button onClick={handleComingSoon} disabled>
          <PlusCircle className="mr-2 h-4 w-4" /> Add Reminder
        </Button>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline flex items-center">
            <ListChecks className="mr-2 h-6 w-6 text-primary" />
            Payment Reminders Feature
          </CardTitle>
          <CardDescription>This feature is coming soon. Never miss a payment again!</CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <Image 
            src="https://placehold.co/600x300.png" 
            alt="Placeholder for reminders interface" 
            width={600} 
            height={300}
            className="rounded-md mx-auto border shadow-sm my-6"
            data-ai-hint="calendar notification alert"
          />
          <p className="text-muted-foreground text-lg">
            You&apos;ll be able to set reminders for recurring expenses, due dates, or when someone owes you money.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Keep your finances organized and on time.
          </p>
           <div className="mt-6 p-4 bg-muted/50 rounded-md text-center">
             <p className="text-sm text-foreground">
                <strong>Note:</strong> Full reminder functionality will be implemented in a future update.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
