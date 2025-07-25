"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { useToast } from '@/hooks/use-toast';
import { useUserProfileContext } from '@/context/UserProfileContext';
import type { UserProfile } from '@/context/UserProfileContext';
import { BottomNavigationBar } from '@/components/shared/BottomNavigationBar';
import { UserCircle } from 'lucide-react';

function getInitials(name: string) {
  if (!name) return '';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0][0]?.toUpperCase() || '';
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function ProfilePage() {
  const router = useRouter();
  const { toast } = useToast();
  const { profile, setProfile, loading: profileLoading } = useUserProfileContext();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<UserProfile>({ name: "", company: "", category: "", role: "operator" });

  useEffect(() => {
    if (profile) {
      setForm(profile);
    }
  }, [profile]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await setProfile(form);
    setSaving(false);
    toast({ title: "Profile Saved", description: "Your profile has been updated.", variant: "default" });
    router.refresh();
  };

  if (profileLoading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] py-8 px-2 w-full bg-background text-foreground">
      {/* Show user role at the top */}
      {profile && (
        <div className="mb-4 px-4 py-2 rounded-lg font-semibold text-primary bg-card shadow border border-border">
          You are logged in as <span>{profile.role.charAt(0).toUpperCase() + profile.role.slice(1)}</span>
        </div>
      )}
      <Card className="w-full max-w-xs sm:max-w-md md:max-w-lg bg-gradient-to-br from-white via-blue-50 to-blue-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 text-card-foreground shadow-2xl border-2 border-blue-100 dark:border-blue-900 rounded-3xl p-0">
        <CardHeader className="flex flex-col items-center gap-2 pt-8 pb-4">
          {/* Avatar with initials */}
          <div className="w-20 h-20 rounded-full bg-blue-200 dark:bg-blue-900 flex items-center justify-center shadow-lg border-4 border-white dark:border-gray-900 mb-2">
            {profile?.name ? (
              <span className="text-3xl font-bold text-blue-700 dark:text-blue-200">{getInitials(profile.name)}</span>
            ) : (
              <UserCircle className="w-16 h-16 text-blue-400 dark:text-blue-700" />
            )}
          </div>
          <CardTitle className="text-2xl font-bold text-primary mb-1">Profile</CardTitle>
          <div className="text-muted-foreground text-sm text-center">Manage your account details below</div>
        </CardHeader>
        <hr className="border-t border-blue-100 dark:border-blue-900 mx-8" />
        <CardContent className="pt-6 pb-8 px-6">
          <form onSubmit={handleSave} className="flex flex-col gap-4">
            <div>
              <label className="text-sm font-medium text-foreground" htmlFor="name">Name</label>
              <Input
                id="name"
                name="name"
                placeholder="Your Name"
                value={form.name}
                onChange={handleChange}
                required
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground" htmlFor="company">Company</label>
              <Input
                id="company"
                name="company"
                placeholder="Company Name"
                value={form.company}
                onChange={handleChange}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground" htmlFor="category">Category</label>
              <Input
                id="category"
                name="category"
                placeholder="Category"
                value={form.category}
                onChange={handleChange}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground" htmlFor="role">Role</label>
              <Input
                id="role"
                name="role"
                placeholder="Role"
                value={form.role}
                disabled
                className="mt-1 bg-gray-100 dark:bg-gray-800 cursor-not-allowed"
              />
            </div>
            <hr className="border-t border-blue-100 dark:border-blue-900 my-2" />
            <Button
              type="submit"
              disabled={saving}
              className="mt-2 w-full rounded-xl bg-gradient-to-r from-blue-500 to-blue-400 text-white font-bold py-3 shadow-lg hover:from-blue-600 hover:to-blue-500 transition-all text-lg"
            >
              {saving ? "Saving..." : "Save Profile"}
            </Button>
          </form>
        </CardContent>
      </Card>
      {/* Bottom navigation bar */}
      <BottomNavigationBar />
    </div>
  );
}
