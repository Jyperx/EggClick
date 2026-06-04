'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import AdSenseRewarded from '../ads/AdSenseRewarded';

interface EggProps {
  onEggClick: (isAuto?: boolean) => void;
  sessionClicks?: number;
  cooldownTime?: number;
  isFrozen?: boolean;
  freezeTimeLeft?: number;
  isAutoclicking?: boolean;
  localMartillo?: number;
  localHamAss?: number;
  localTouchMe?: number;
  setIsHolding?: (b: boolean) => void;
  inventory?: Record<string, any>;
  autoClickTrigger?: number;
  resetCooldown?: (payload?: any) => void;
  userId?: string;
  showOverheatWarning?: boolean;
  isEggBroken?: boolean;
}

export default function Egg({ onEggClick, sessionClicks = 0, cooldownTime = 0, isFrozen = false, freezeTimeLeft = 0, isAutoclicking = false, localMartillo, localHamAss, localTouchMe, setIsHolding, inventory = {}, autoClickTrigger = 0, resetCooldown, userId = 'anon_user', showOverheatWarning = false, isEggBroken = false }: EggProps) {
  const floatingContainerRef = useRef<HTMLDivElement>(null);
  const eggVisualRef = useRef<HTMLDivElement>(null);
  const [isHoldingLocal, setIsHoldingLocal] = useState(false);
  const [isIdle, setIsIdle] = useState(true);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const activePointers = useRef<Set<number>>(new Set());

  const resetIdleTimer = () => {
    setIsIdle(false);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => setIsIdle(true), 3000);
  };

  useEffect(() => {
    resetIdleTimer();
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        const ctx = new AudioContextClass();
        audioContextRef.current = ctx;
        fetch('/sounds/huevo.mp3')
          .then(res => res.arrayBuffer())
          .then(buffer => ctx.decodeAudioData(buffer))
          .then(decoded => {
            audioBufferRef.current = decoded;
          })
          .catch(e => console.error("Error loading audio:", e));
      }
    }
  }, []);

  const playClickSound = () => {
    if (!audioContextRef.current || !audioBufferRef.current) return;
    const ctx = audioContextRef.current;
    
    // Unlock audio context on mobile
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    
    const source = ctx.createBufferSource();
    source.buffer = audioBufferRef.current;
    
    const gainNode = ctx.createGain();
    gainNode.gain.value = 0.5; // Volúmen al 50%
    
    source.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    source.start(0);
  };
  const isOverheated = cooldownTime > 0;
  const martilloUses = localMartillo !== undefined ? localMartillo : (inventory.martillo_uses || 0);
  const hamassUses = localHamAss !== undefined ? localHamAss : (inventory.hamass_uses || 0);
  const touchMeSecs = localTouchMe !== undefined ? localTouchMe : (inventory.touchme_seconds || 0);

  const spawnCrack = (x: number, y: number) => {
    const container = floatingContainerRef.current;
    if (!container) return;
    if (container.querySelectorAll('.crack-element').length > 5) {
      const first = container.querySelector('.crack-element');
      if (first) container.removeChild(first);
    }
    const el = document.createElement('div');
    el.className = 'absolute z-20 pointer-events-none text-white text-4xl crack-element';
    el.style.left = `${x - 20}px`;
    el.style.top = `${y - 20}px`;
    el.textContent = '💥';
    el.style.animation = 'crackFade 0.5s ease-out forwards';
    el.addEventListener('animationend', () => {
      if (el.parentNode === container) container.removeChild(el);
    });
    container.appendChild(el);
  };

  const spawnFloatingText = (x: number, y: number, text: string, type: string) => {
    const container = floatingContainerRef.current;
    if (!container) return;
    if (container.querySelectorAll('.floating-text').length > 25) {
      const first = container.querySelector('.floating-text');
      if (first) container.removeChild(first);
    }

    const el = document.createElement('div');
    let colorClass = 'text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.8)] text-3xl z-50';
    let animationClass = 'floatTextNormal';
    
    if (type === 'hamass') {
      colorClass = 'text-red-500 drop-shadow-[0_0_20px_rgba(239,68,68,1)] text-5xl z-[60] scale-150';
      animationClass = 'floatTextHamass';
    } else if (type === 'martillo') {
      colorClass = 'text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.8)] text-4xl z-50';
    } else if (type === 'touchme') {
      colorClass = 'text-fuchsia-400 drop-shadow-[0_0_10px_rgba(232,121,249,0.8)] text-3xl z-50';
    }

    el.className = `absolute font-black pointer-events-none floating-text ${colorClass} will-change-transform`;
    el.style.left = `${x - 20}px`;
    el.style.top = `${y - 20}px`;
    el.textContent = text;
    el.style.animation = `${animationClass} ${type === 'hamass' ? '1s' : '0.8s'} ease-out forwards`;

    el.addEventListener('animationend', () => {
      if (el.parentNode === container) container.removeChild(el);
    });

    container.appendChild(el);
  };

  const triggerWobble = () => {
    if (eggVisualRef.current) {
      eggVisualRef.current.classList.remove('animate-wobble');
      void eggVisualRef.current.offsetWidth; // force reflow
      eggVisualRef.current.classList.add('animate-wobble');
    }
  };

  useEffect(() => {
    if (autoClickTrigger > 0 && !isOverheated) {
      if (typeof document !== 'undefined' && !document.hidden) {
        playClickSound();
        triggerWobble();
        resetIdleTimer();

        const rectWidth = 250;
        const rectHeight = 300;
        const x = rectWidth / 2 + (Math.random() * 80 - 40);
        const y = rectHeight / 2 + (Math.random() * 80 - 40);

        if (martilloUses > 0 || hamassUses > 0) {
          spawnCrack(x, y);
        }

        const powerText = hamassUses > 0 ? "+100" : martilloUses > 0 ? "+5" : "+1";
        const type = hamassUses > 0 ? "hamass" : martilloUses > 0 ? "martillo" : "normal";
        spawnFloatingText(x, y, powerText, type);
      }
    }
  }, [autoClickTrigger, isOverheated, martilloUses, hamassUses]);

  useEffect(() => {
    if (isHoldingLocal && touchMeSecs > 0 && !isOverheated && !isEggBroken) {
      let counter = 0;
      const timer = setInterval(() => {
        onEggClick(true);
        counter++;
        if (counter % 3 === 0) playClickSound();
        triggerWobble();

        const rectWidth = 250;
        const rectHeight = 325;
        const x = rectWidth / 2 + (Math.random() * 80 - 40);
        const y = rectHeight / 2 + (Math.random() * 80 - 40);

        spawnFloatingText(x, y, "⚡", "touchme");
      }, 50); // 20 clics por segundo
      return () => clearInterval(timer);
    }
  }, [isHoldingLocal, touchMeSecs, isOverheated, isEggBroken]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activePointers.current.size >= 2) return;
    activePointers.current.add(e.pointerId);

    setIsHoldingLocal(true);
    if (setIsHolding) setIsHolding(true);

    onEggClick();
    if (isOverheated) return;

    playClickSound();
    resetIdleTimer();

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (martilloUses > 0 || hamassUses > 0) {
      spawnCrack(x, y);
    }

    const powerText = hamassUses > 0 ? "+100" : martilloUses > 0 ? "+5" : "+1";
    const type = hamassUses > 0 ? "hamass" : martilloUses > 0 ? "martillo" : "normal";
    spawnFloatingText(x, y, powerText, type);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    activePointers.current.delete(e.pointerId);
    if (activePointers.current.size === 0) {
      setIsHoldingLocal(false);
      if (setIsHolding) setIsHolding(false);
    }
  };

  // Porcentaje de calor dinámico por fase (ciclos de 200)
  let heatPercentage = ((sessionClicks % 200) / 200) * 100;
  
  let rgbColor = '236, 72, 153'; // Pink base
  let eggGradient = 'linear-gradient(to bottom, #c084fc, #ec4899, #f97316)';
  let borderColor = '#f9a8d4';
  let glowOpacity = 0.4;
  let glowScale = 1;
  
  if (cooldownTime > 0 || heatPercentage >= 75) {
    rgbColor = '239, 68, 68'; // Red
    eggGradient = 'linear-gradient(to bottom, #fca5a5, #ef4444, #991b1b)';
    borderColor = '#fca5a5';
    glowOpacity = 0.8;
    glowScale = 1.3;
  } else if (heatPercentage >= 50) {
    rgbColor = '249, 115, 22'; // Orange
    eggGradient = 'linear-gradient(to bottom, #fdba74, #f97316, #c2410c)';
    borderColor = '#fdba74';
    glowOpacity = 0.6;
    glowScale = 1.15;
  } else if (heatPercentage >= 25) {
    rgbColor = '250, 204, 21'; // Yellow
    eggGradient = 'linear-gradient(to bottom, #fde047, #eab308, #a16207)';
    borderColor = '#fde047';
    glowOpacity = 0.5;
    glowScale = 1.05;
  }

  const saturate = isFrozen ? 1 : isOverheated ? 1.2 : 1 + (Math.floor(heatPercentage / 25) * 25 / 200);
  const brightness = isFrozen ? 1.1 : isOverheated ? 0.9 : 1;
  const isHeatingUp = heatPercentage > 50 && !isOverheated && !isFrozen;
  const isPhase3Wall = cooldownTime > 0; // Show AdSense as long as it is overheated

  return (
    <div className="relative flex items-center justify-center w-full max-w-sm mx-auto flex-1">

      {/* AdSense a la izquierda del huevo */}
      {isPhase3Wall && (
        <div className="absolute z-50 right-[calc(100%+20px)] top-1/2 -translate-y-1/2 w-[280px] flex justify-end">
          <AdSenseRewarded
            onRewardEarned={(token) => {
              if (resetCooldown) resetCooldown(token);
            }}
          />
        </div>
      )}

      <div
        className="absolute w-[250px] h-[300px] rounded-full blur-[80px] pointer-events-none transition-transform duration-300 will-change-transform"
        style={{
          backgroundColor: isFrozen ? 'rgba(6, 182, 212, 0.8)' : isOverheated ? 'rgba(220, 38, 38, 0.9)' : `rgba(${rgbColor}, ${glowOpacity})`,
          transform: `translateZ(0) scale(${isOverheated ? 1.2 : glowScale})`,
          animation: isOverheated || isFrozen ? 'pulse 1s infinite' : 'none'
        }}
      ></div>

      <AnimatePresence>
        {showOverheatWarning && (
          <motion.div
            initial={{ opacity: 0, x: -20, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -20, scale: 0.8 }}
            className="absolute top-1/2 left-[calc(100%+20px)] -translate-y-1/2 bg-slate-900/95 border-2 border-red-500 rounded-2xl px-5 py-3 shadow-[0_0_30px_rgba(239,68,68,0.4)] z-[100] whitespace-nowrap pointer-events-none flex flex-col gap-1 before:content-[''] before:absolute before:-left-[20px] before:top-1/2 before:-translate-y-1/2 before:border-[10px] before:border-transparent before:border-r-red-500 after:content-[''] after:absolute after:-left-[16px] after:top-1/2 after:-translate-y-1/2 after:border-[8px] after:border-transparent after:border-r-slate-900"
          >
            <p className="text-white font-black text-sm uppercase text-left tracking-wider">¡Huevo al límite!</p>
            <p className="text-red-400 text-xs font-bold text-left flex items-center gap-1">
              <span className="animate-pulse">🔥</span> +10s de penalidad
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes floatTextNormal {
          0% { transform: translate(0, 0) scale(1); opacity: 1; }
          100% { transform: translate(0, -100px) scale(1); opacity: 0; }
        }
        @keyframes floatTextHamass {
          0% { transform: translate(0, 0) scale(1); opacity: 1; }
          100% { transform: translate(0, -150px) scale(1); opacity: 0; }
        }
        @keyframes crackFade {
          0% { transform: scale(0.5); opacity: 1; }
          100% { transform: scale(2); opacity: 0; }
        }
        @keyframes eggWobble {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-5deg); }
          75% { transform: rotate(5deg); }
        }
        .animate-wobble {
          animation: eggWobble 0.15s ease-in-out;
        }
        @keyframes idleShake {
          0%, 20%, 100% { transform: rotate(0deg); }
          2%, 6%, 10%, 14%, 18% { transform: rotate(-3deg); }
          4%, 8%, 12%, 16% { transform: rotate(3deg); }
        }
        .animate-idle-shake {
          animation: idleShake 5s ease-in-out infinite;
          transform-origin: bottom center;
        }
      `}</style>

      {/* Contenedor Vanilla DOM para partículas flotantes */}
      <div ref={floatingContainerRef} className="absolute inset-0 pointer-events-none z-50"></div>

      <motion.div
        ref={eggVisualRef}
        whileHover={!isOverheated && !isPhase3Wall ? { scale: 1.05 } : {}}
        whileTap={!isOverheated && !isPhase3Wall ? { scale: 0.9 } : {}}
        animate={
          isOverheated
            ? { x: [-5, 5, -5, 5, 0], transition: { repeat: Infinity, duration: 0.4 } }
            : {}
        }
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onContextMenu={(e) => e.preventDefault()}
        className={`z-10 select-none relative ${(isOverheated || isPhase3Wall) ? 'cursor-not-allowed opacity-90' : 'cursor-pointer'} touch-none ${isIdle && !isOverheated && !isPhase3Wall ? 'animate-idle-shake' : ''}`}
      >        <div
          className="rounded-[50%_50%_50%_50%/60%_60%_40%_40%] border-4 flex items-center justify-center relative overflow-hidden transition-transform will-change-transform"
          style={{
            width: 'clamp(180px, 42vw, 250px)',
            height: 'clamp(230px, 52vw, 325px)',
            background: isFrozen ? 'linear-gradient(to bottom, #a5f3fc, #06b6d4, #0891b2)' : isOverheated ? 'linear-gradient(to bottom, #fca5a5, #ef4444, #b91c1c)' : eggGradient,
            borderColor: isFrozen ? '#cffafe' : isOverheated ? '#f87171' : borderColor,
            boxShadow: `0 0 50px rgba(${rgbColor}, 0.8)`,
            filter: `saturate(${saturate}) brightness(${brightness})`,
          }}
        >


          <div className="absolute top-4 left-6 w-12 h-16 bg-white rounded-full blur-md opacity-30 transform rotate-12 pointer-events-none"></div>

          {isFrozen && (
            <div className="absolute inset-0 bg-cyan-400/30 mix-blend-overlay flex flex-col items-center justify-center z-10 pointer-events-none">
              <div className="absolute w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-40"></div>
              {freezeTimeLeft !== undefined && freezeTimeLeft > 0 && (
                <span className="text-white text-6xl font-black drop-shadow-[0_0_15px_rgba(6,182,212,1)] z-20">
                  {freezeTimeLeft}s
                </span>
              )}
              <span className="text-cyan-100 text-xs font-bold uppercase tracking-widest mt-2 drop-shadow-[0_0_5px_rgba(6,182,212,1)] z-20">
                ¡INMUNIDAD!
              </span>
            </div>
          )}



          {isOverheated && (
            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center backdrop-blur-sm z-20">
              <span className="text-red-500 text-4xl md:text-5xl font-black drop-shadow-[0_0_10px_rgba(220,38,38,1)] text-center px-2">
                {cooldownTime > 86400 ? "BANNED" : `${cooldownTime}s`}
              </span>
              <span className="text-white text-[10px] md:text-xs font-bold uppercase tracking-widest mt-2 animate-pulse text-center leading-tight px-2">
                {cooldownTime > 86400 ? "POR TOCAR MUCHO EL HUEVO" : "¡SOBRECALENTADO!"}
              </span>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
