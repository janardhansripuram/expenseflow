
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
import { updateProfile as updateAuthProfile, EmailAuthProvider, reauthenticateWithCredential, updatePassword, deleteUser } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import type { UserProfile } from '@/lib/types';
import { Loader2, Save, ShieldAlert, Trash2, KeyRound } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useRouter } from 'next/navigation';

const profileSchema = z.object({
  displayName: z.string().min(2, "Display name must be at least 2 characters.").max(50, "Display name must be 50 characters or less."),
  email: z.string().email().optional(), 
});
type ProfileFormData = z.infer<typeof profileSchema>;

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required."),
  newPassword: z.string().min(6, "New password must be at least 6 characters."),
  confirmNewPassword: z.string(),
}).refine(data => data.newPassword === data.confirmNewPassword, {
  message: "New passwords do not match.",
  path: ["confirmNewPassword"],
});
type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;

const reAuthSchema = z.object({
  password: z.string().min(1, "Password is required."),
});
type ReAuthFormData = z.infer<typeof reAuthSchema>;


export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [userProfileData, setUserProfileData] = useState<UserProfile | null>(null);

  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const [isDeleteAccountReAuthOpen, setIsDeleteAccountReAuthOpen] = useState(false);
  const [isDeleteAccountConfirmOpen, setIsDeleteAccountConfirmOpen] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);


  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: { displayName: "", email: "" },
  });

  const changePasswordForm = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmNewPassword: "" },
  });

  const reAuthForm = useForm<ReAuthFormData>({
    resolver: zodResolver(reAuthSchema),
    defaultValues: { password: "" },
  });


  useEffect(() => {
    async function fetchProfile() {
      if (user) {
        setIsLoadingProfile(true);
        try {
          const profile = await getUserProfile(user.uid);
          if (profile) {
            setUserProfileData(profile);
            profileForm.reset({
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
  }, [user, profileForm, toast]);

  async function onProfileSubmit(values: ProfileFormData) {
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

  async function onChangePasswordSubmit(values: ChangePasswordFormData) {
    if (!user || !user.email) {
        toast({ variant: "destructive", title: "Error", description: "User not found or email missing."});
        return;
    }
    setIsChangingPassword(true);
    try {
        const credential = EmailAuthProvider.credential(user.email, values.currentPassword);
        await reauthenticateWithCredential(user, credential);
        await updatePassword(user, values.newPassword);
        toast({ title: "Password Changed", description: "Your password has been successfully updated." });
        setIsChangePasswordOpen(false);
        changePasswordForm.reset();
    } catch (error: any) {
        console.error("Failed to change password:", error);
        let description = "Could not change your password. Please verify your current password.";
        if (error.code === 'auth/wrong-password') {
            description = "Incorrect current password. Please try again.";
        } else if (error.code === 'auth/too-many-requests') {
            description = "Too many failed attempts. Please try again later.";
        }
        toast({ variant: "destructive", title: "Password Change Failed", description });
    } finally {
        setIsChangingPassword(false);
    }
  }

  async function onDeleteAccountReAuthSubmit(values: ReAuthFormData) {
    if (!user || !user.email) {
      toast({ variant: "destructive", title: "Error", description: "User not found or email missing." });
      return;
    }
    setIsDeletingAccount(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, values.password);
      await reauthenticateWithCredential(user, credential);
      setIsDeleteAccountReAuthOpen(false); // Close re-auth dialog
      reAuthForm.reset();
      setIsDeleteAccountConfirmOpen(true); // Open final confirmation dialog
    } catch (error: any) {
      console.error("Failed to re-authenticate for deletion:", error);
      let description = "Could not verify your password.";
       if (error.code === 'auth/wrong-password') {
            description = "Incorrect password. Please try again.";
        } else if (error.code === 'auth/too-many-requests') {
            description = "Too many failed attempts. Please try again later.";
        }
      toast({ variant: "destructive", title: "Re-authentication Failed", description });
    } finally {
      setIsDeletingAccount(false); // Reset general deleting flag, confirmation will handle its own
    }
  }

  async function confirmDeleteAccount() {
    if (!user) return;
    setIsDeletingAccount(true);
    try {
        await deleteUser(user);
        toast({ title: "Account Deleted", description: "Your account has been permanently deleted." });
        router.push("/login"); // Redirect to login or home page
    } catch (error: any) {
        console.error("Failed to delete account:", error);
        toast({ variant: "destructive", title: "Deletion Failed", description: "Could not delete your account. Please try logging out and back in, then try again." });
        setIsDeletingAccount(false);
    } finally {
        setIsDeleteAccountConfirmOpen(false);
        // No need to setIsDeletingAccount(false) here if redirecting
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
            <Form {...profileForm}>
              <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-6">
                <FormField
                  control={profileForm.control}
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
                  control={profileForm.control}
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
          <CardTitle className="font-headline">Account Security</CardTitle>
          <CardDescription>Manage your account security settings.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            {/* Change Password Section */}
            <Dialog open={isChangePasswordOpen} onOpenChange={setIsChangePasswordOpen}>
                <DialogTrigger asChild>
                    <Button variant="outline">
                        <KeyRound className="mr-2 h-4 w-4"/> Change Password
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Change Password</DialogTitle>
                        <DialogDescription>Enter your current and new password below.</DialogDescription>
                    </DialogHeader>
                    <Form {...changePasswordForm}>
                        <form onSubmit={changePasswordForm.handleSubmit(onChangePasswordSubmit)} className="space-y-4 py-2">
                            <FormField
                                control={changePasswordForm.control}
                                name="currentPassword"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Current Password</FormLabel>
                                        <FormControl><Input type="password" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={changePasswordForm.control}
                                name="newPassword"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>New Password</FormLabel>
                                        <FormControl><Input type="password" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={changePasswordForm.control}
                                name="confirmNewPassword"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Confirm New Password</FormLabel>
                                        <FormControl><Input type="password" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <DialogFooter className="pt-2">
                                <DialogClose asChild><Button type="button" variant="outline" disabled={isChangingPassword}>Cancel</Button></DialogClose>
                                <Button type="submit" disabled={isChangingPassword}>
                                    {isChangingPassword ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>}
                                    Save New Password
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>

            <div className="border-t pt-4 mt-4">
                <h3 className="text-md font-semibold mb-2 text-destructive">Danger Zone</h3>
                 {/* Delete Account Section */}
                <Dialog open={isDeleteAccountReAuthOpen} onOpenChange={setIsDeleteAccountReAuthOpen}>
                    <DialogTrigger asChild>
                        <Button variant="destructive">
                            <Trash2 className="mr-2 h-4 w-4"/> Delete Account
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle className="text-destructive flex items-center"><ShieldAlert className="mr-2 h-5 w-5"/>Confirm Your Identity</DialogTitle>
                            <DialogDescription>
                                To delete your account, please enter your current password to confirm it&apos;s you.
                            </DialogDescription>
                        </DialogHeader>
                        <Form {...reAuthForm}>
                            <form onSubmit={reAuthForm.handleSubmit(onDeleteAccountReAuthSubmit)} className="space-y-4 py-2">
                                <FormField
                                    control={reAuthForm.control}
                                    name="password"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Current Password</FormLabel>
                                            <FormControl><Input type="password" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <DialogFooter className="pt-2">
                                     <DialogClose asChild><Button type="button" variant="outline" disabled={isDeletingAccount}>Cancel</Button></DialogClose>
                                    <Button type="submit" variant="destructive" disabled={isDeletingAccount}>
                                        {isDeletingAccount ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <KeyRound className="mr-2 h-4 w-4"/>}
                                        Confirm Identity
                                    </Button>
                                </DialogFooter>
                            </form>
                        </Form>
                    </DialogContent>
                </Dialog>

                <AlertDialog open={isDeleteAccountConfirmOpen} onOpenChange={setIsDeleteAccountConfirmOpen}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle className="text-destructive flex items-center"><ShieldAlert className="mr-2 h-5 w-5"/>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete your account and all associated data from Firebase Authentication.
                                <br/><br/>
                                <strong className="font-semibold">Important:</strong> Your data in Firestore (expenses, groups, etc.) will <strong className="text-destructive">NOT</strong> be automatically deleted by this action. For complete data removal, please contact support (this would typically be handled by backend cleanup functions not implemented in this demo).
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => setIsDeletingAccount(false)} disabled={isDeletingAccount}>Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                                onClick={confirmDeleteAccount} 
                                disabled={isDeletingAccount}
                                className="bg-destructive hover:bg-destructive/90"
                            >
                                {isDeletingAccount ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Trash2 className="mr-2 h-4 w-4"/>}
                                Yes, delete my account
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
                <p className="text-xs text-muted-foreground mt-2">
                    Deleting your account is irreversible. Please be certain.
                </p>
            </div>

        </CardContent>
      </Card>
    </div>
  );
}
