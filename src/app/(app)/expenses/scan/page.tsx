
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Camera, UploadCloud } from "lucide-react";
import Image from "next/image";

export default function ScanReceiptPage() {
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
          <h1 className="text-3xl font-bold tracking-tight font-headline text-foreground">Scan Receipt (OCR)</h1>
          <p className="text-muted-foreground">Extract expense details automatically from your receipts.</p>
        </div>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline">Upload or Capture Receipt</CardTitle>
          <CardDescription>Choose an image file or use your camera.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Button variant="outline" className="w-full h-32 flex flex-col items-center justify-center text-center" disabled>
              <UploadCloud className="h-10 w-10 mb-2 text-primary" />
              <span className="font-medium">Upload Receipt Image</span>
              <span className="text-xs text-muted-foreground">(Coming Soon)</span>
            </Button>
            <Button variant="outline" className="w-full h-32 flex flex-col items-center justify-center text-center" disabled>
              <Camera className="h-10 w-10 mb-2 text-primary" />
              <span className="font-medium">Use Camera</span>
              <span className="text-xs text-muted-foreground">(Coming Soon)</span>
            </Button>
          </div>
          
          <div className="text-center">
            <Image 
              src="https://placehold.co/400x250.png" 
              alt="Placeholder for receipt preview" 
              width={400} 
              height={250}
              className="rounded-md mx-auto border shadow-sm"
              data-ai-hint="receipt document"
            />
            <p className="text-sm text-muted-foreground mt-2">Receipt preview will appear here.</p>
          </div>

          <Button className="w-full" disabled>
            Extract Details (Coming Soon)
          </Button>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline">Extracted Details</CardTitle>
          <CardDescription>Review the details extracted by the AI. (This section will populate after extraction)</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No details extracted yet. Scan a receipt to begin.</p>
          {/* Placeholder for form fields pre-filled by OCR */}
        </CardContent>
      </Card>
    </div>
  );
}
