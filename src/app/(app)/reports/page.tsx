
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";
import Image from "next/image";

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-headline text-foreground">Reports</h1>
        <p className="text-muted-foreground">Analyze your spending patterns and generate financial reports.</p>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline flex items-center">
            <BarChart3 className="mr-2 h-6 w-6 text-primary" />
            Coming Soon: Detailed Reports
          </CardTitle>
          <CardDescription>Get ready for powerful insights into your finances!</CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <Image 
            src="https://placehold.co/600x300.png" 
            alt="Placeholder for reports interface" 
            width={600} 
            height={300}
            className="rounded-md mx-auto border shadow-sm my-6"
            data-ai-hint="financial report dashboard"
          />
          <p className="text-muted-foreground text-lg">
            We are currently building a comprehensive reporting module.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Soon, you&apos;ll be able to visualize spending by category, track trends over time, and export your data.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
