
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Split } from "lucide-react";
import Image from "next/image";

export default function SplitExpensesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-headline text-foreground">Split Expenses</h1>
        <p className="text-muted-foreground">Easily divide shared costs with friends or groups.</p>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline flex items-center">
            <Split className="mr-2 h-6 w-6 text-primary" />
            Coming Soon: Expense Splitting
          </CardTitle>
          <CardDescription>Share expenses effortlessly!</CardDescription>
        </CardHeader>
        <CardContent className="text-center">
           <Image 
            src="https://placehold.co/600x300.png" 
            alt="Placeholder for expense splitting interface" 
            width={600} 
            height={300}
            className="rounded-md mx-auto border shadow-sm my-6"
            data-ai-hint="friends sharing money"
          />
          <p className="text-muted-foreground text-lg">
            This feature will allow you to select expenses, choose participants, and calculate who owes what.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Stay tuned for updates on group expense management and individual splits.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
