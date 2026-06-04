'use client';

import { useEffect, useRef } from 'react';

export default function HeatParticles({ sessionClicks, isEggBroken, isOverheated = false }: { sessionClicks: number, isEggBroken: boolean, isOverheated?: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const clicksRef = useRef(sessionClicks);
  const overheatedRef = useRef(isOverheated);

  // Mantener la referencia actualizada sin re-renderizar
  useEffect(() => {
    clicksRef.current = sessionClicks;
    overheatedRef.current = isOverheated;
  }, [sessionClicks, isOverheated]);

  useEffect(() => {
    if (isEggBroken) return;

    const spawnInterval = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      if (!containerRef.current) return;
      const container = containerRef.current;

      const currentClicks = clicksRef.current;
      const heatPercentage = overheatedRef.current ? 100 : ((currentClicks % 200) / 200) * 100;
      
      let colorClass = 'bg-pink-500 shadow-[0_0_15px_rgba(236,72,153,1)]';
      let spawnCount = 1;
      
      if (heatPercentage >= 75) {
        colorClass = 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,1)]';
        spawnCount = 3;
      } else if (heatPercentage >= 50) {
        colorClass = 'bg-orange-500 shadow-[0_0_15px_rgba(249,115,22,1)]';
        spawnCount = 2;
      } else if (heatPercentage >= 25) {
        colorClass = 'bg-yellow-400 shadow-[0_0_15px_rgba(250,204,21,1)]';
        spawnCount = 2;
      }

      for (let i = 0; i < spawnCount; i++) {
        // Limitar nodos en el DOM para evitar fugas de memoria
        if (container.childNodes.length > 35) {
          const firstChild = container.firstChild;
          if (firstChild) container.removeChild(firstChild);
        }

        const size = Math.random() * 4 + 3;
        const duration = Math.random() * 3 + 3;
        const left = Math.random() * 100;

        const particle = document.createElement('div');
        particle.className = `absolute rounded-full will-change-transform ${colorClass}`;
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        particle.style.left = `${left}vw`;
        particle.style.bottom = '-20px';
        
        // CSS Animation puramente acelerada por hardware
        particle.style.animation = `floatUp ${duration}s linear forwards`;
        
        particle.addEventListener('animationend', () => {
          if (particle.parentNode === container) {
            container.removeChild(particle);
          }
        });

        container.appendChild(particle);
      }
    }, 400);

    return () => clearInterval(spawnInterval);
  }, [isEggBroken]);

  return (
    <>
      <style>{`
        @keyframes floatUp {
          0% { transform: translate3d(0, 0, 0); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translate3d(0, -110vh, 0); opacity: 0; }
        }
      `}</style>
      <div ref={containerRef} className="absolute inset-0 pointer-events-none overflow-hidden z-10" />
    </>
  );
}
