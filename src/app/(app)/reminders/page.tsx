
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ListChecks } from "lucide-react"; // Changed from BellRing for better context
import Image from "next/image";

export default function RemindersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-headline text-foreground">Reminders</h1>
        <p className="text-muted-foreground">Set up reminders for upcoming bills or payments.</p>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline flex items-center">
            <ListChecks className="mr-2 h-6 w-6 text-primary" />
            Coming Soon: Payment Reminders
          </CardTitle>
          <CardDescription>Never miss a payment again!</CardDescription>
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
        </CardContent>
      </Card>
    </div>
  );
}
