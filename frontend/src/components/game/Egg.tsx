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
}

export default function Egg({ onEggClick, sessionClicks = 0, cooldownTime = 0, isFrozen = false, freezeTimeLeft = 0, isAutoclicking = false, localMartillo, localHamAss, localTouchMe, setIsHolding, inventory = {}, autoClickTrigger = 0, resetCooldown, userId = 'anon_user', showOverheatWarning = false }: EggProps) {
  const [wobble, setWobble] = useState(false);
  const [cracks, setCracks] = useState<{ id: number; x: number; y: number }[]>([]);
  const [floatingTexts, setFloatingTexts] = useState<{ id: number; x: number; y: number; text: string; type?: string }[]>([]);
  const [isHoldingLocal, setIsHoldingLocal] = useState(false);
  const clickSoundRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    clickSoundRef.current = new Audio('/sounds/huevo.mp3');
    clickSoundRef.current.volume = 0.5;
  }, []);

  const playClickSound = () => {
    if (!clickSoundRef.current) return;
    const clone = clickSoundRef.current.cloneNode() as HTMLAudioElement;
    clone.volume = 0.5;
    clone.play().catch(() => { });
  };
  const isOverheated = cooldownTime > 0;
  const martilloUses = localMartillo !== undefined ? localMartillo : (inventory.martillo_uses || 0);
  const hamassUses = localHamAss !== undefined ? localHamAss : (inventory.hamass_uses || 0);
  const touchMeSecs = localTouchMe !== undefined ? localTouchMe : (inventory.touchme_seconds || 0);

  useEffect(() => {
    if (autoClickTrigger > 0 && !isOverheated) {
      if (typeof document !== 'undefined' && !document.hidden) {
        setWobble(true);
        setTimeout(() => setWobble(false), 150);

        const rectWidth = 250;
        const rectHeight = 300;
        const x = rectWidth / 2 + (Math.random() * 80 - 40);
        const y = rectHeight / 2 + (Math.random() * 80 - 40);

        if (martilloUses > 0 || hamassUses > 0) {
          setCracks(prev => [...prev.slice(-4), { id: Date.now() + Math.random(), x, y }]);
        }

        const powerText = hamassUses > 0 ? "+100" : martilloUses > 0 ? "+5" : "+1";
        const type = hamassUses > 0 ? "hamass" : martilloUses > 0 ? "martillo" : "normal";
        setFloatingTexts(prev => [...prev.slice(-19), { id: Date.now() + Math.random(), x, y, text: powerText, type }]);
      }
    }
  }, [autoClickTrigger, isOverheated, martilloUses, hamassUses]);

  useEffect(() => {
    if (isHoldingLocal && touchMeSecs > 0 && !isOverheated) {
      const timer = setInterval(() => {
        onEggClick(true);
        setWobble(true);
        setTimeout(() => setWobble(false), 20);

        const rectWidth = 250;
        const rectHeight = 325;
        const x = rectWidth / 2 + (Math.random() * 80 - 40);
        const y = rectHeight / 2 + (Math.random() * 80 - 40);

        setFloatingTexts(prev => [...prev.slice(-29), { id: Date.now() + Math.random(), x, y, text: "⚡", type: "touchme" }]);
      }, 50); // 20 clics por segundo
      return () => clearInterval(timer);
    }
  }, [isHoldingLocal, touchMeSecs, isOverheated]);

  const handlePointerDown = () => {
    setIsHoldingLocal(true);
    if (setIsHolding) setIsHolding(true);
  };

  const handlePointerUp = () => {
    setIsHoldingLocal(false);
    if (setIsHolding) setIsHolding(false);
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    onEggClick();
    if (isOverheated) return;

    playClickSound();

    setWobble(true);
    setTimeout(() => setWobble(false), 150);

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (martilloUses > 0 || hamassUses > 0) {
      setCracks(prev => [...prev.slice(-4), { id: Date.now() + Math.random(), x, y }]);
    }

    const powerText = hamassUses > 0 ? "+100" : martilloUses > 0 ? "+5" : "+1";
    const type = hamassUses > 0 ? "hamass" : martilloUses > 0 ? "martillo" : "normal";
    setFloatingTexts(prev => [...prev.slice(-19), { id: Date.now() + Math.random(), x, y, text: powerText, type }]);
  };

  // Porcentaje de calor dinámico por fase (ciclos de 200)
  let heatPercentage = ((sessionClicks % 200) / 200) * 100;

  const saturate = isFrozen ? 1 : isOverheated ? 1.2 : 1 + (heatPercentage / 200);
  const brightness = isFrozen ? 1.1 : isOverheated ? 0.8 : 1;
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
        className={`absolute w-[250px] h-[300px] rounded-full blur-[80px] pointer-events-none transition-all duration-300 ${isPhase3Wall ? 'opacity-40' : ''}`}
        style={{
          backgroundColor: isFrozen ? 'rgba(6, 182, 212, 0.8)' : isOverheated ? 'rgba(220, 38, 38, 0.9)' : `rgba(236, 72, 153, ${0.4 + (heatPercentage / 200)})`,
          transform: isHeatingUp ? `scale(${1 + (heatPercentage / 500)})` : 'scale(1)',
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

      <motion.div
        whileHover={!isOverheated && !isPhase3Wall ? { scale: 1.05 } : {}}
        whileTap={!isOverheated && !isPhase3Wall ? { scale: 0.9 } : {}}
        animate={
          isOverheated
            ? { x: [-5, 5, -5, 5, 0], transition: { repeat: Infinity, duration: 0.4 } }
            : wobble
              ? { rotate: [-5, 5, -5, 5, 0], transition: { duration: 0.15 } }
              : {}
        }
        transition={{ duration: 0.1 }}
        onClick={handleClick}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onContextMenu={(e) => e.preventDefault()}
        className={`z-10 select-none relative ${(isOverheated || isPhase3Wall) ? 'cursor-not-allowed opacity-90' : 'cursor-pointer'} touch-none`}
      >
        {floatingTexts.map(ft => {
          let textColorClass = 'text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.8)] text-3xl z-50';
          if (ft.type === 'hamass') {
            textColorClass = 'text-red-500 drop-shadow-[0_0_20px_rgba(239,68,68,1)] text-5xl z-[60]';
          } else if (ft.type === 'martillo') {
            textColorClass = 'text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.8)] text-4xl z-50';
          } else if (ft.type === 'touchme') {
            textColorClass = 'text-fuchsia-400 drop-shadow-[0_0_10px_rgba(232,121,249,0.8)] text-3xl z-50';
          }
          return (
            <motion.div
              key={ft.id}
              initial={{ opacity: 1, x: ft.x - 20, y: ft.y - 20, scale: ft.type === 'hamass' ? 1.5 : 1 }}
              animate={{ opacity: 0, y: ft.y - (ft.type === 'hamass' ? 150 : 120), scale: 1 }}
              transition={{ duration: ft.type === 'hamass' ? 1 : 0.8, ease: "easeOut" }}
              className={`absolute font-black pointer-events-none ${textColorClass}`}
            >
              {ft.text}
            </motion.div>
          );
        })}


        <div
          className="rounded-[50%_50%_50%_50%/60%_60%_40%_40%] shadow-[0_0_50px_rgba(236,72,153,0.8)] border-4 flex items-center justify-center relative overflow-hidden transition-all duration-100"
          style={{
            width: 'clamp(180px, 42vw, 250px)',
            height: 'clamp(230px, 52vw, 325px)',
            background: isFrozen ? 'linear-gradient(to bottom, #a5f3fc, #06b6d4, #0891b2)' : isOverheated ? 'linear-gradient(to bottom, #fca5a5, #ef4444, #b91c1c)' : 'linear-gradient(to bottom, #c084fc, #ec4899, #f97316)',
            borderColor: isFrozen ? '#cffafe' : isOverheated ? '#f87171' : '#f9a8d4',
            filter: `saturate(${saturate}) brightness(${brightness})`,
          }}
        >

          {!isFrozen && !isOverheated && (
            <div
              className="absolute inset-0 bg-red-600 mix-blend-overlay transition-opacity duration-300 pointer-events-none"
              style={{ opacity: heatPercentage / 100 }}
            />
          )}
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

          {cracks.map(crack => (
            <motion.div
              key={crack.id}
              initial={{ opacity: 1, scale: 0.5 }}
              animate={{ opacity: 0, scale: 2 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="absolute z-20 pointer-events-none text-white text-4xl"
              style={{ left: crack.x - 20, top: crack.y - 20 }}
            >
              💥
            </motion.div>
          ))}

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
