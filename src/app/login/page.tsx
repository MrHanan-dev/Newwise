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
    <div className="relative min-h-screen flex items-center justify-center bg-gradient-to-tr from-slate-100 to-sky-100 dark:from-background dark:to-gray-900 px-2 sm:px-4 overflow-hidden">
      {/* Enhanced animated SVG background: more blobs, particles, gradients */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none z-0 animate-pulse"
        width="100%"
        height="100%"
        viewBox="0 0 1440 900"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ opacity: 0.22 }}
      >
        {/* Layered gradients */}
        <defs>
          <radialGradient id="bg1" cx="50%" cy="50%" r="80%" fx="50%" fy="50%">
            <stop offset="0%" stopColor="#e0e7ef" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#f8fafc" stopOpacity="0.2" />
          </radialGradient>
          <radialGradient id="bg2" cx="80%" cy="20%" r="60%" fx="80%" fy="20%">
            <stop offset="0%" stopColor="#bae6fd" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#f0f9ff" stopOpacity="0.1" />
          </radialGradient>
        </defs>
        <rect width="1440" height="900" fill="url(#bg1)" />
        <rect width="1440" height="900" fill="url(#bg2)" />
        {/* Animated lines */}
        <g>
          <path d="M0 200 Q720 400 1440 200" stroke="#38bdf8" strokeWidth="2" fill="none">
            <animate attributeName="d" values="M0 200 Q720 400 1440 200;M0 220 Q720 380 1440 220;M0 200 Q720 400 1440 200" dur="8s" repeatCount="indefinite" />
          </path>
          <path d="M0 700 Q720 500 1440 700" stroke="#2563eb" strokeWidth="2" fill="none">
            <animate attributeName="d" values="M0 700 Q720 500 1440 700;M0 680 Q720 520 1440 680;M0 700 Q720 500 1440 700" dur="10s" repeatCount="indefinite" />
          </path>
        </g>
        {/* Stars/particles */}
        <g>
          {[...Array(12)].map((_, i) => (
            <circle key={i} cx={100 + i * 110} cy={80 + (i % 2) * 300} r={1.2 + (i % 3)} fill="#60a5fa" opacity="0.7">
              <animate attributeName="cy" values={`${80 + (i % 2) * 300};${100 + (i % 2) * 320};${80 + (i % 2) * 300}`} dur={`${6 + i % 5}s`} repeatCount="indefinite" />
            </circle>
          ))}
        </g>
        {/* More twinkling stars */}
        <g>
          <circle cx="400" cy="300" r="1.2" fill="#a5b4fc">
            <animate attributeName="cy" values="300;320;300" dur="9s" repeatCount="indefinite" />
          </circle>
          <circle cx="1100" cy="600" r="1.8" fill="#bae6fd">
            <animate attributeName="cy" values="600;620;600" dur="11s" repeatCount="indefinite" />
          </circle>
          <circle cx="300" cy="700" r="1.5" fill="#7dd3fc">
            <animate attributeName="cy" values="700;680;700" dur="7s" repeatCount="indefinite" />
          </circle>
        </g>
        {/* Floating blobs */}
        <g>
          <ellipse cx="400" cy="200" rx="120" ry="60" fill="#38bdf8" opacity="0.13">
            <animate attributeName="cx" values="400;600;400" dur="16s" repeatCount="indefinite" />
            <animate attributeName="cy" values="200;300;200" dur="14s" repeatCount="indefinite" />
          </ellipse>
          <ellipse cx="1100" cy="700" rx="100" ry="50" fill="#2563eb" opacity="0.10">
            <animate attributeName="cx" values="1100;900;1100" dur="18s" repeatCount="indefinite" />
            <animate attributeName="cy" values="700;600;700" dur="15s" repeatCount="indefinite" />
          </ellipse>
          <ellipse cx="800" cy="400" rx="80" ry="40" fill="#60a5fa" opacity="0.09">
            <animate attributeName="cx" values="800;1000;800" dur="20s" repeatCount="indefinite" />
            <animate attributeName="cy" values="400;500;400" dur="17s" repeatCount="indefinite" />
          </ellipse>
          {/* Extra blobs for depth */}
          <ellipse cx="1200" cy="200" rx="60" ry="30" fill="#f0f9ff" opacity="0.12">
            <animate attributeName="cx" values="1200;1000;1200" dur="22s" repeatCount="indefinite" />
            <animate attributeName="cy" values="200;300;200" dur="19s" repeatCount="indefinite" />
          </ellipse>
          <ellipse cx="200" cy="800" rx="70" ry="35" fill="#bae6fd" opacity="0.10">
            <animate attributeName="cx" values="200;400;200" dur="18s" repeatCount="indefinite" />
            <animate attributeName="cy" values="800;700;800" dur="15s" repeatCount="indefinite" />
          </ellipse>
        </g>
      </svg>
      <Card className="w-full max-w-xs sm:max-w-md md:max-w-lg shadow-2xl border border-border bg-white/30 backdrop-blur-md dark:bg-card/50 dark:backdrop-blur-md">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-2xl sm:text-3xl font-bold text-primary">Welcome Back</CardTitle>
          <p className="text-muted-foreground text-xs sm:text-sm">Log in to submit or view shift reports</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            <div className="space-y-1">
              <label htmlFor="email" className="block text-sm font-medium">Email</label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="password" className="block text-sm font-medium">Password</label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && (
              <div className="text-destructive text-sm text-center font-medium">{error}</div>
            )}
            <Button type="submit" className="w-full" disabled={loadingLogin}>
              {loadingLogin ? (
                <span className="flex justify-center items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Logging in...
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
