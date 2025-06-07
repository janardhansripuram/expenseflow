
"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ArrowLeft, Save, Camera, UploadCloud, Loader2, RefreshCw, CheckCircle, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { addExpense } from "@/lib/firebase/firestore";
import type { ExpenseFormData } from "@/lib/types";
import { extractExpenseFromReceipt, ExtractExpenseOutput } from "@/ai/flows/extract-expense-from-receipt";
import Image from "next/image";
import { format } from "date-fns";
import { Alert, AlertTitle } from "@/components/ui/alert";

const expenseSchema = z.object({
  description: z.string().min(1, "Description is required"),
  amount: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
    message: "Amount must be a positive number",
  }),
  category: z.string().min(1, "Category is required"),
  date: z.string().refine(val => !isNaN(new Date(val).valueOf()), {
    message: "Valid date is required",
  }),
  merchantName: z.string().optional(),
  notes: z.string().optional(),
});

type ExtendedExpenseFormData = ExpenseFormData & { merchantName?: string };

export default function ScanReceiptPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractExpenseOutput | null>(null);
  
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [isCameraMode, setIsCameraMode] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<ExtendedExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      description: "",
      amount: "",
      category: "",
      date: format(new Date(), "yyyy-MM-dd"),
      merchantName: "",
      notes: "",
    },
  });

  const resetFormAndState = useCallback(() => {
    form.reset({
      description: "",
      amount: "",
      category: "",
      date: format(new Date(), "yyyy-MM-dd"),
      merchantName: "",
      notes: "",
    });
    setSelectedImageUri(null);
    setExtractedData(null);
    setIsCameraMode(false);
    if (videoRef.current && videoRef.current.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  }, [form]);
  
  useEffect(() => {
    return () => { // Cleanup camera stream on component unmount
      if (videoRef.current && videoRef.current.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImageUri(reader.result as string);
        setExtractedData(null); // Clear previous extracted data
        form.reset(); // Clear form fields
        setIsCameraMode(false); // Exit camera mode if active
        if (videoRef.current && videoRef.current.srcObject) {
          (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
          videoRef.current.srcObject = null;
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const startCamera = async () => {
    resetFormAndState();
    setIsCameraMode(true);
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        setHasCameraPermission(true);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error("Error accessing camera:", error);
        setHasCameraPermission(false);
        setIsCameraMode(false);
        toast({
          variant: "destructive",
          title: "Camera Access Denied",
          description: "Please enable camera permissions in your browser settings.",
        });
      }
    } else {
       setHasCameraPermission(false);
       setIsCameraMode(false);
       toast({ variant: "destructive", title: "Camera Not Supported", description: "Your browser does not support camera access."});
    }
  };

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext("2d");
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUri = canvas.toDataURL("image/jpeg");
        setSelectedImageUri(dataUri);
        setExtractedData(null);
        form.reset();
      }
      // Stop camera stream after capture
      if (video.srcObject) {
        (video.srcObject as MediaStream).getTracks().forEach(track => track.stop());
        video.srcObject = null;
      }
      setIsCameraMode(false); // Exit camera mode display
    }
  };

  const handleExtractDetails = async () => {
    if (!selectedImageUri) {
      toast({ title: "No Image", description: "Please select or capture an image first.", variant: "destructive" });
      return;
    }
    if (!user) {
      toast({ title: "Not Authenticated", description: "Please log in to extract details.", variant: "destructive" });
      return;
    }

    setIsExtracting(true);
    setExtractedData(null); // Clear previous data
    form.reset(); // Clear form fields before populating with new data

    try {
      const result = await extractExpenseFromReceipt({ photoDataUri: selectedImageUri });
      setExtractedData(result);
      form.setValue("description", result.description || "");
      form.setValue("amount", result.amount ? String(result.amount) : "");
      form.setValue("category", result.category || "");
      form.setValue("date", result.date || format(new Date(), "yyyy-MM-dd"));
      form.setValue("merchantName", result.merchantName || "");
      toast({ title: "Details Extracted", description: "Review and save the expense.", });
    } catch (error) {
      console.error("Failed to extract details:", error);
      toast({
        variant: "destructive",
        title: "Extraction Failed",
        description: "Could not extract details from the receipt. Please try a clearer image or manual entry.",
      });
    } finally {
      setIsExtracting(false);
    }
  };

  async function onSubmit(values: ExtendedExpenseFormData) {
    if (!user) {
      toast({ variant: "destructive", title: "Authentication Error", description: "You must be logged in to add an expense." });
      return;
    }
    setIsSubmitting(true);
    try {
      const expenseDataToSave: ExpenseFormData = {
        description: values.description,
        amount: values.amount,
        category: values.category,
        date: values.date,
        notes: `${values.merchantName ? `Merchant: ${values.merchantName}. ` : ''}${values.notes || ''}`.trim(),
      };
      await addExpense(user.uid, expenseDataToSave);
      toast({
        title: "Expense Added",
        description: "Your expense has been successfully recorded from the receipt.",
        action: <CheckCircle className="text-green-500" />
      });
      resetFormAndState();
      router.push("/expenses");
    } catch (error) {
      console.error("Failed to add expense from receipt:", error);
      toast({
        variant: "destructive",
        title: "Failed to Add Expense",
        description: "An error occurred while saving your expense. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }
  
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
          <CardTitle className="font-headline">1. Upload or Capture Receipt</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Button variant="outline" className="w-full h-24" onClick={() => fileInputRef.current?.click()}>
              <UploadCloud className="mr-2 h-6 w-6 text-primary" />
              Upload Receipt Image
            </Button>
            <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} className="hidden" />
            
            <Button variant="outline" className="w-full h-24" onClick={startCamera}>
              <Camera className="mr-2 h-6 w-6 text-primary" />
              Use Camera
            </Button>
          </div>
           {isCameraMode && hasCameraPermission === false && (
             <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Camera Access Denied</AlertTitle>
              <AlertDescription>
                Please enable camera permissions in your browser settings to use this feature.
                You might need to refresh the page after granting permission.
              </AlertDescription>
            </Alert>
           )}
            {isCameraMode && hasCameraPermission && (
              <div className="space-y-2">
                <video ref={videoRef} className="w-full aspect-video rounded-md border bg-muted" autoPlay playsInline muted />
                <Button onClick={captureImage} className="w-full">
                  <Camera className="mr-2 h-4 w-4" /> Capture from Camera
                </Button>
              </div>
            )}
            <canvas ref={canvasRef} className="hidden"></canvas>
        </CardContent>
      </Card>

      {selectedImageUri && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline">2. Review Image &amp; Extract</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center border rounded-md p-2">
              <Image 
                src={selectedImageUri} 
                alt="Selected receipt" 
                width={400} 
                height={selectedImageUri.startsWith('data:image') ? 500 : 250} // Adjust height dynamically for better aspect ratio
                className="rounded-md mx-auto max-h-[50vh] w-auto object-contain"
                data-ai-hint="receipt scan"
              />
            </div>
            <Button onClick={handleExtractDetails} className="w-full" disabled={isExtracting || !selectedImageUri}>
              {isExtracting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Extract Details from Image
            </Button>
          </CardContent>
        </Card>
      )}

      {(extractedData || selectedImageUri) && ( // Show form if data extracted or if user wants to manually fill after image selection
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline">3. Verify &amp; Save Expense</CardTitle>
            <CardDescription>
              {extractedData ? "AI has extracted the following details. Please verify and correct if needed." : "Fill in the details manually if OCR extraction is not perfect."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="merchantName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Merchant Name (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Starbucks" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Coffee with client" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="e.g., 5.00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="food">Food & Dining</SelectItem>
                          <SelectItem value="transport">Transportation</SelectItem>
                          <SelectItem value="utilities">Utilities</SelectItem>
                          <SelectItem value="entertainment">Entertainment</SelectItem>
                          <SelectItem value="health">Health & Wellness</SelectItem>
                          <SelectItem value="shopping">Shopping</SelectItem>
                          <SelectItem value="travel">Travel</SelectItem>
                          <SelectItem value="education">Education</SelectItem>
                          <SelectItem value="gifts">Gifts & Donations</SelectItem>
                          <SelectItem value="groceries">Groceries</SelectItem>
                          <SelectItem value="office supplies">Office Supplies</SelectItem>
                          <SelectItem value="clothing">Clothing</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes (Optional)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Add any relevant notes here..." {...field} />
                      </FormControl>
                      <FormDescription>Merchant name will be added to notes if provided above.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-between gap-2 pt-4">
                   <Button variant="outline" type="button" onClick={resetFormAndState}>
                      Clear / Scan Another
                  </Button>
                  <Button type="submit" disabled={isSubmitting || isExtracting}>
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save Expense
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
