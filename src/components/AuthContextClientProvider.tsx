"use client";
import { AuthProvider } from "@/context/AuthContext";
import ServiceWorkerRegistration from '@/components/ServiceWorkerRegistration';

export default function AuthContextClientProvider({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ServiceWorkerRegistration />
      {children}
    </AuthProvider>
  );
}
