import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { PlusCircle, ListFilter } from "lucide-react";

export default function ExpensesPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline text-foreground">My Expenses</h1>
          <p className="text-muted-foreground">View and manage your recorded expenses.</p>
        </div>
        <div className="flex gap-2">
            <Button variant="outline" disabled>
                <ListFilter className="mr-2 h-4 w-4" /> Filter
            </Button>
            <Button asChild>
            <Link href="/expenses/add">
                <PlusCircle className="mr-2 h-4 w-4" /> Add New Expense
            </Link>
            </Button>
        </div>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline">Expense List</CardTitle>
          <CardDescription>All your expenses will be listed here.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-10">
            <p className="text-muted-foreground text-lg">No expenses recorded yet.</p>
            <p className="text-sm text-muted-foreground mt-2">Start by adding your first expense!</p>
            <Button asChild className="mt-4">
                <Link href="/expenses/add">Add Expense</Link>
            </Button>
          </div>
          {/* Placeholder for table or list of expenses */}
        </CardContent>
      </Card>
    </div>
  );
}
