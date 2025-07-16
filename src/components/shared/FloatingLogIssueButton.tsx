"use client";
import { useRouter } from 'next/navigation';
import { PlusCircle } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';

export default function FloatingLogIssueButton() {
  const router = useRouter();
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            className="fixed bottom-6 right-6 z-50 h-16 w-16 md:h-20 md:w-20 rounded-full bg-gradient-to-br from-blue-500 to-green-400 text-white shadow-2xl flex items-center justify-center text-4xl transition-transform duration-300 hover:scale-110 active:scale-95 animate-bounce-fab border-4 border-white focus:outline-none focus:ring-4 focus:ring-blue-300"
            aria-label="Log new issue"
            onClick={() => router.push('/')}
            style={{ boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)' }}
          >
            <PlusCircle className="h-10 w-10 md:h-14 md:w-14" />
          </button>
        </TooltipTrigger>
        <TooltipContent>Log a new issue <span className="ml-2 text-xs text-muted-foreground">[L]</span></TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Add animation keyframes in your global CSS or Tailwind config:
// .animate-bounce-fab { animation: bounce-fab 1.6s infinite; }
// @keyframes bounce-fab { 0%, 100% { transform: translateY(0); } 20% { transform: translateY(-8px); } 40% { transform: translateY(-16px); } 60% { transform: translateY(-8px); } 80% { transform: translateY(0); } } 