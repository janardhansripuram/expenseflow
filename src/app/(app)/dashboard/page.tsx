import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, PlusCircle, BarChart3 } from "lucide-react";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back! Here&apos;s an overview of your finances.</p>
        </div>
        <Button asChild>
          <Link href="/expenses/add">
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Expense
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader>
            <CardTitle className="font-headline text-xl">Recent Activity</CardTitle>
            <CardDescription>A summary of your latest transactions.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">No recent activity to display yet.</p>
              <Button variant="outline" className="w-full" asChild>
                <Link href="/expenses">
                  View All Expenses <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader>
            <CardTitle className="font-headline text-xl">Spending Overview</CardTitle>
            <CardDescription>Visualize your spending habits.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center text-center">
              <Image 
                src="https://placehold.co/300x200.png" 
                alt="Placeholder chart" 
                width={300} 
                height={200} 
                className="rounded-md mb-4"
                data-ai-hint="finance chart"
              />
              <p className="text-sm text-muted-foreground mb-4">Detailed charts will appear here once you add expenses.</p>
              <Button variant="secondary" className="w-full" asChild>
                <Link href="/reports">
                  <BarChart3 className="mr-2 h-4 w-4" /> Go to Reports
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader>
            <CardTitle className="font-headline text-xl">Quick Actions</CardTitle>
            <CardDescription>Get started with common tasks.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="default" className="w-full" asChild>
              <Link href="/expenses/add">Add Expense</Link>
            </Button>
            <Button variant="outline" className="w-full" disabled>Create Group (Coming Soon)</Button>
            <Button variant="outline" className="w-full" disabled>Split Expense (Coming Soon)</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
