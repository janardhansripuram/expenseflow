import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Save, Paperclip } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function AddExpensePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/expenses">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back to Expenses</span>
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline text-foreground">Add New Expense</h1>
          <p className="text-muted-foreground">Manually enter your expense details below.</p>
        </div>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline">Expense Details</CardTitle>
          <CardDescription>Fill in the information for your new expense.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input id="description" placeholder="e.g., Coffee with client" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <Input id="amount" type="number" placeholder="e.g., 5.00" />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select>
                <SelectTrigger id="category">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="food">Food & Dining</SelectItem>
                  <SelectItem value="transport">Transportation</SelectItem>
                  <SelectItem value="utilities">Utilities</SelectItem>
                  <SelectItem value="entertainment">Entertainment</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input id="date" type="date" />
            </div>

            <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea id="notes" placeholder="Add any relevant notes here..." />
            </div>

            <div className="space-y-2">
                <Label htmlFor="receipt">Receipt (Optional)</Label>
                <Input id="receipt" type="file" />
                <p className="text-xs text-muted-foreground">Attach an image or PDF of your receipt.</p>
            </div>
            
            <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" asChild>
                    <Link href="/expenses">Cancel</Link>
                </Button>
                <Button type="submit" disabled>
                    <Save className="mr-2 h-4 w-4" /> Save Expense (Coming Soon)
                </Button>
            </div>
          </form>
        </CardContent>
      </Card>
       <Card className="shadow-lg mt-6">
        <CardHeader>
            <CardTitle className="font-headline">Scan Receipt (OCR)</CardTitle>
            <CardDescription>Automatically fill details by scanning your receipt.</CardDescription>
        </CardHeader>
        <CardContent>
            <Button className="w-full" variant="secondary" disabled>
                <Paperclip className="mr-2 h-4 w-4" /> Scan with OCR (Coming Soon)
            </Button>
        </CardContent>
       </Card>
    </div>
  );
}
