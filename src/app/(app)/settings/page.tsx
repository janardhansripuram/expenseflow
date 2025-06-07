
"use client";

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { ThemeToggle } from "@/components/core/ThemeToggle";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { getUserProfile, updateUserProfile } from '@/lib/firebase/firestore';
import { updateProfile as updateAuthProfile } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import type { UserProfile } from '@/lib/types';
import { Loader2, Save } from 'lucide-react';

const profileSchema = z.object({
  displayName: z.string().min(2, "Display name must be at least 2 characters.").max(50, "Display name must be 50 characters or less."),
  email: z.string().email().optional(), // Email is not editable here, just for display
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [userProfileData, setUserProfileData] = useState<UserProfile | null>(null);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: "",
      email: "",
    },
  });

  useEffect(() => {
    async function fetchProfile() {
      if (user) {
        setIsLoadingProfile(true);
        try {
          const profile = await getUserProfile(user.uid);
          if (profile) {
            setUserProfileData(profile);
            form.reset({
              displayName: profile.displayName || '',
              email: profile.email,
            });
          }
        } catch (error) {
          console.error("Failed to fetch user profile:", error);
          toast({ variant: "destructive", title: "Error", description: "Could not load your profile." });
        } finally {
          setIsLoadingProfile(false);
        }
      }
    }
    fetchProfile();
  }, [user, form, toast]);

  async function onSubmit(values: ProfileFormData) {
    if (!user || !userProfileData) {
      toast({ variant: "destructive", title: "Error", description: "User not found." });
      return;
    }
    setIsSavingProfile(true);
    try {
      await updateUserProfile(user.uid, { displayName: values.displayName });
      if (auth.currentUser) {
        await updateAuthProfile(auth.currentUser, { displayName: values.displayName });
      }
      toast({ title: "Profile Updated", description: "Your display name has been updated." });
      setUserProfileData(prev => prev ? { ...prev, displayName: values.displayName } : null);
    } catch (error) {
      console.error("Failed to update profile:", error);
      toast({ variant: "destructive", title: "Update Failed", description: "Could not update your profile." });
    } finally {
      setIsSavingProfile(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-headline text-foreground">Settings</h1>
        <p className="text-muted-foreground">Manage your account and application preferences.</p>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline">Appearance</CardTitle>
          <CardDescription>Customize the look and feel of the application.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <Label htmlFor="theme-toggle" className="text-base font-medium">Theme</Label>
                <p className="text-sm text-muted-foreground">
                  Select your preferred light or dark theme.
                </p>
              </div>
              <ThemeToggle />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline">Profile</CardTitle>
          <CardDescription>Update your personal information.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingProfile ? (
            <div className="flex justify-center items-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : userProfileData ? (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="displayName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Display Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Your display name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} disabled />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">Email address cannot be changed.</p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <CardFooter className="p-0 pt-2">
                  <Button type="submit" disabled={isSavingProfile}>
                    {isSavingProfile ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save Changes
                  </Button>
                </CardFooter>
              </form>
            </Form>
          ) : (
            <p className="text-muted-foreground">Could not load profile data.</p>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline">Account</CardTitle>
          <CardDescription>Manage your account settings.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Account management features (e.g., change password, delete account) coming soon.</p>
        </CardContent>
      </Card>
    </div>
  );
}
```