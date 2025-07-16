'use client';

import { ReactNode, useState } from 'react';
import { cn } from '@/lib/utils';

interface FancyButtonProps {
  onClick?: () => void;
  className?: string;
  children?: ReactNode;
}

export default function FancyButton({ onClick, className, children }: FancyButtonProps) {
  const [active, setActive] = useState(false);

  return (
    <div className={cn('relative w-[120px] h-[60px] mx-4 group', className)}>
      {/* SVG filters */}
      <svg className="absolute w-0 h-0">
        <filter id="glow1">
          <feColorMatrix
            values="1 0 0 0 0 
                    0 1 0 0 0 
                    0 0 1 0 0 
                    0 0 0 9 0"
          />
        </filter>
        <filter id="glow2">
          <feColorMatrix
            values="1 0 0 0 0 
                    0 1 0 0 0 
                    0 0 1 0 0 
                    0 0 0 3 0"
          />
        </filter>
        <filter id="glow3">
          <feColorMatrix
            values="1 0 0 0.2 0 
                    0 1 0 0.2 0 
                    0 0 1 0.2 0 
                    0 0 0 2 0"
          />
        </filter>
      </svg>

      {/* Hidden real button */}
      <button
        className="absolute z-10 w-full h-full rounded-[17px] opacity-0 cursor-pointer"
        onClick={onClick}
        onMouseDown={() => setActive(true)}
        onMouseUp={() => setActive(false)}
        onMouseLeave={() => setActive(false)}
      />

      {/* Backdrop */}
      <div className="absolute inset-[-9900%] bg-[radial-gradient(circle_at_50%_50%,#0000_0,#0000_20%,#111111aa_50%)] bg-[3px_3px] -z-10" />

      {/* Animated spinning glow */}
      <div
        className={cn(
          'absolute inset-0 rounded-xl blur-[2em] opacity-50 -z-10',
          active ? 'opacity-100' : '',
          'before:content-[""] before:absolute before:inset-[-150%] before:animate-[speen_8s_cubic-bezier(0.56,0.15,0.28,0.86)_infinite,_woah_4s_infinite] before:bg-[linear-gradient(90deg,#f50_30%,#0000_50%,#05f_70%)]',
          'group-hover:before:animate-running'
        )}
        style={{ filter: 'url(#glow1)' }}
      />

      {/* Inner border */}
      <div className="relative z-0 bg-[#0005] p-[3px] rounded-[14px]">
        <div
          className="flex items-center justify-center w-[120px] h-[60px] text-white bg-[#111215] rounded-[14px]"
          style={{
            clipPath:
              'path("M 90 0 C 115 0 120 5 120 30 C 120 55 115 60 90 60 L 30 60 C 5 60 0 55 0 30 C 0 5 5 0 30 0 Z")',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
