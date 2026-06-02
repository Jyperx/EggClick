'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface MouseTooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  offset?: { x: number; y: number };
}

export default function MouseTooltip({ content, children, offset = { x: 15, y: 15 } }: MouseTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isMounted, setIsMounted] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleMouseMove = (e: React.MouseEvent) => {
    setPosition({ x: e.clientX, y: e.clientY });
  };

  return (
    <>
      <div 
        ref={triggerRef}
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onMouseMove={handleMouseMove}
        className="inline-block"
      >
        {children}
      </div>
      
      {isMounted && isVisible && createPortal(
        <div 
          className="pointer-events-none fixed z-[9999] bg-slate-900/95 border border-slate-700/50 text-slate-200 text-xs font-bold px-3 py-2 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.8)] backdrop-blur-md whitespace-nowrap"
          style={{ 
            left: `${position.x + offset.x}px`, 
            top: `${position.y + offset.y}px`,
            transition: 'opacity 0.1s ease',
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          {content}
        </div>,
        document.body
      )}
    </>
  );
}
