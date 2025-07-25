'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext'; // ✅ updated path
import { Loader2 } from 'lucide-react';
import { useRouter } from "next/navigation";


export default function LoginPage() {
  const { login, user, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loadingLogin, setLoadingLogin] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push("/");
    }
  }, [loading, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoadingLogin(true);
    try {
      await login(email, password);
      router.push("/");
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoadingLogin(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-background dark:bg-gray-900 text-foreground dark:text-gray-100 px-2 sm:px-4">
      <Card className="w-full max-w-xs sm:max-w-md md:max-w-lg shadow-xl bg-card dark:bg-gray-800 text-card-foreground dark:text-gray-100">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-2xl sm:text-3xl font-bold text-primary dark:text-gray-100">Welcome Back</CardTitle>
          <p className="text-muted-foreground dark:text-gray-300 text-xs sm:text-sm">Log in to submit or view shift reports</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            <div className="space-y-1">
              <label htmlFor="email" className="block text-sm font-medium text-foreground dark:text-gray-100">Email</label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-card dark:bg-gray-700 text-foreground dark:text-gray-100"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="password" className="block text-sm font-medium text-foreground dark:text-gray-100">Password</label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-card dark:bg-gray-700 text-foreground dark:text-gray-100"
              />
            </div>
            {error && (
              <div className="text-destructive text-sm text-center font-medium">{error}</div>
            )}
            <Button type="submit" className="w-full" disabled={loadingLogin}>
              {loadingLogin ? (
                <span className="flex justify-center items-center gap-2">
                  <Loader2 className="h-4 w-4 text-primary animate-spin" /> Logging in...
                </span>
              ) : (
                'Login'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
