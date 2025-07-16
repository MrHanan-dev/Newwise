"use client";
import { useAuth } from "@/context/AuthContext";
import { usePathname } from "next/navigation";
import React from "react";
import { BottomNavigationBar } from '@/components/shared/BottomNavigationBar';
import AuthGate from '@/components/AuthGate';
import FloatingLogIssueButton from '@/components/shared/FloatingLogIssueButton';
import { Analytics } from '@vercel/analytics/react';
import { Toaster } from '@/components/ui/toaster';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";

  // Hide navigation and floating button on login page or if not authenticated
  const showNav = user && !isLoginPage;

  return (
    <>
      {showNav && <BottomNavigationBar />}
      <main className="w-full max-w-7xl mx-auto px-2 sm:px-4 md:px-8 py-4 md:py-8 flex-1 flex flex-col">
        <AuthGate>{children}</AuthGate>
      </main>
      <Analytics />
      <Toaster />
      {showNav && <FloatingLogIssueButton />}
    </>
  );
} 