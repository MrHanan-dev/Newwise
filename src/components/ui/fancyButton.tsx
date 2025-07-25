'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface FancyButtonProps {
  onClick?: () => void;
  className?: string;
  children?: ReactNode;
}

export default function FancyButton({ onClick, className, children }: FancyButtonProps) {
  return (
    <button
      className={cn(
        'w-[120px] h-[60px] rounded-xl bg-core-bright text-core-white font-semibold text-base flex items-center justify-center shadow-md hover:bg-core-corporate focus:outline-none focus:ring-2 focus:ring-core-corporate transition-colors',
        className
      )}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}
