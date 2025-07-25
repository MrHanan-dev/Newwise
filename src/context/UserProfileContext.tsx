"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebaseClient";
import { useAuth } from "./AuthContext";

export interface UserProfile {
  name: string;
  company: string;
  category: string;
  role: string; // Allow any role from backend
}

interface UserProfileContextType {
  profile: UserProfile | null;
  setProfile: (profile: UserProfile) => Promise<void>;
  loading: boolean;
}

const UserProfileContext = createContext<UserProfileContextType | undefined>(undefined);

// Utility to extract and format name from email (alphabets only, first letter capitalized)
function nameFromEmail(email: string): string {
  if (!email) return '';
  const [raw] = email.split('@');
  // Remove all non-alphabetic characters
  const lettersOnly = raw.replace(/[^a-zA-Z]/g, '');
  if (!lettersOnly) return '';
  return lettersOnly.charAt(0).toUpperCase() + lettersOnly.slice(1).toLowerCase();
}

export const UserProfileProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [profile, setProfileState] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setProfileState(null);
      setLoading(false);
      return;
    }
    console.log('[UserProfileProvider] user:', user);
    const fetchProfile = async () => {
      setLoading(true);
      const ref = doc(db, "users", user.uid);
      const snap = await getDoc(ref);
      let profileData: UserProfile;
      if (snap.exists()) {
        const data = snap.data();
        let name = data.name || '';
        // If name is missing, extract from email
        if (!name && user.email) {
          console.log('[UserProfileProvider] Name missing, extracting from email:', user.email);
          name = nameFromEmail(user.email);
          // Update Firestore with the generated name
          try {
            await setDoc(ref, { ...data, name }, { merge: true });
            console.log('[UserProfileProvider] Name set in Firestore:', name);
          } catch (err) {
            console.error('[UserProfileProvider] Error setting name in Firestore:', err);
          }
        }
        // Debug log for role
        console.log('[UserProfileProvider] Fetched role from Firestore:', data.role);
        profileData = {
          name,
          company: data.company || "",
          category: data.category || "",
          role: data.role || "operator", // Default to operator if missing
        };
      } else {
        // No profile exists, create one with name from email
        let name = user.email ? nameFromEmail(user.email) : "";
        profileData = { name, company: "", category: "", role: "operator" };
        try {
          await setDoc(ref, profileData, { merge: true });
          console.log('[UserProfileProvider] New profile created in Firestore:', profileData);
        } catch (err) {
          console.error('[UserProfileProvider] Error creating profile in Firestore:', err);
        }
      }
      setProfileState(profileData);
      setLoading(false);
    };
    fetchProfile();
  }, [user]);

  const setProfile = async (newProfile: UserProfile) => {
    if (!user) return;
    await setDoc(doc(db, "users", user.uid), newProfile, { merge: true });
    setProfileState(newProfile);
  };

  return (
    <UserProfileContext.Provider value={{ profile, setProfile, loading }}>
      {children}
    </UserProfileContext.Provider>
  );
};

export const useUserProfileContext = () => {
  const ctx = useContext(UserProfileContext);
  if (!ctx) throw new Error("useUserProfileContext must be used within UserProfileProvider");
  return ctx;
};
