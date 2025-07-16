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
    <div className="flex flex-col items-center justify-center min-h-[60vh] py-4 sm:py-8 px-2 w-full bg-background text-foreground">
      {/* Show user role at the top */}
      {profile && (
        <div className="mb-4 px-4 py-2 rounded-lg font-semibold text-primary bg-card">
          You are logged in as <span style={{ textTransform: 'capitalize' }}>{profile.role}</span>
        </div>
      )}
      <Card className="w-full max-w-xs sm:max-w-md md:max-w-lg shadow-xl bg-card text-card-foreground">
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl md:text-2xl text-primary">Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="flex flex-col gap-3 sm:gap-4">
            <label className="text-sm font-medium text-foreground" htmlFor="name">
              Name
            </label>
            <Input
              id="name"
              name="name"
              placeholder="Your Name"
              value={form.name}
              onChange={handleChange}
              required
            />
            <label className="text-sm font-medium text-foreground" htmlFor="company">
              Company
            </label>
            <Input
              id="company"
              name="company"
              placeholder="Company Name"
              value={form.company}
              onChange={handleChange}
            />
            <label className="text-sm font-medium text-foreground" htmlFor="category">
              Category
            </label>
            <Input
              id="category"
              name="category"
              placeholder="Category"
              value={form.category}
              onChange={handleChange}
            />
            <label className="text-sm font-medium text-foreground" htmlFor="role">
              Role
            </label>
            <Input
              id="role"
              name="role"
              placeholder="Role"
              value={form.role}
              disabled
            />
            <Button type="submit" disabled={saving} className="mt-2 w-full">
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
