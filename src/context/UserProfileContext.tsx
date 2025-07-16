"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebaseClient";
import { useAuth } from "./AuthContext";

export interface UserProfile {
  name: string;
  company: string;
  category: string;
  role: 'technician' | 'operator'; // <-- Added role field
}

interface UserProfileContextType {
  profile: UserProfile | null;
  setProfile: (profile: UserProfile) => Promise<void>;
  loading: boolean;
}

const UserProfileContext = createContext<UserProfileContextType | undefined>(undefined);

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
    const fetchProfile = async () => {
      setLoading(true);
      const ref = doc(db, "users", user.uid);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data();
        setProfileState({
          name: data.name || "",
          company: data.company || "",
          category: data.category || "",
          role: data.role || "operator", // Default to operator if missing
        });
      } else {
        setProfileState({ name: "", company: "", category: "", role: "operator" });
      }
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
