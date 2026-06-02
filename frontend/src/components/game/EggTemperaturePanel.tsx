import React, { useMemo, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Flame } from 'lucide-react';

interface EggTemperaturePanelProps {
  sessionClicks: number;
  cooldownTime: number;
  timeSinceLastClick: number;
  inactivityTimeLimit: number;
  onWatchAdClick?: () => void;
}

export default function EggTemperaturePanel({
  sessionClicks,
  cooldownTime,
  timeSinceLastClick,
  inactivityTimeLimit,
  onWatchAdClick
}: EggTemperaturePanelProps) {
  
  const thresholds = useMemo(() => [0, 200, 400, 600, 800, 1000, 1200, 1400], []);
  
  let phase = 0;
  while (phase < thresholds.length - 1 && sessionClicks >= thresholds[phase + 1]) {
      phase++;
  }

  // Calcular temperatura basado en el modelo propuesto
  const temperature = useMemo(() => {
    const baseTemps = [0, 50, 70, 80, 85, 90, 95, 98];
    const penaltyMap: Record<number, number> = {
        0: 0, 200: 5, 400: 10, 600: 20, 800: 40, 1000: 80, 1200: 160, 1400: 300
    };

    const prevThresh = thresholds[phase];
    const nextThresh = phase < thresholds.length - 1 ? thresholds[phase + 1] : prevThresh + 200;
    const baseTemp = baseTemps[phase];

    let currentActiveTemp = baseTemp;
    
    if (cooldownTime > 0) {
        // Enfriándose del sobrecalentamiento (100°C) hacia la temperatura base de la nueva fase
        const triggerThresh = prevThresh === 0 ? 200 : prevThresh;
        const penalty = penaltyMap[triggerThresh] || 5; 
        const coolingRatio = Math.min(1, Math.max(0, cooldownTime / penalty));
        currentActiveTemp = baseTemp + (100 - baseTemp) * coolingRatio;
    } else {
        // Calentándose hacia 100°C
        const progress = Math.min(1, Math.max(0, (sessionClicks - prevThresh) / (nextThresh - prevThresh)));
        currentActiveTemp = baseTemp + progress * (100 - baseTemp);
    }

    // Si hay inactividad y NO estamos en cooldown, se enfría lentamente hacia 0°C
    if (timeSinceLastClick > 0 && cooldownTime <= 0) {
        const inactivityRatio = Math.max(0, 1 - (timeSinceLastClick / inactivityTimeLimit));
        currentActiveTemp = currentActiveTemp * inactivityRatio;
    }

    return currentActiveTemp;
  }, [sessionClicks, cooldownTime, timeSinceLastClick, inactivityTimeLimit, phase, thresholds]);

  // Color dinámico según la temperatura
  const getColor = (temp: number) => {
    if (temp >= 100) return 'text-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,1)]';
    if (temp > 85) return 'text-orange-500 drop-shadow-[0_0_10px_rgba(249,115,22,0.8)]';
    if (temp > 50) return 'text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.6)]';
    if (temp > 20) return 'text-cyan-300 drop-shadow-[0_0_8px_rgba(103,232,249,0.5)]';
    return 'text-blue-300 drop-shadow-[0_0_5px_rgba(147,197,253,0.3)]';
  };

  const getBgColor = (temp: number) => {
    if (temp >= 100) return 'bg-red-500/20 border-red-500/50 shadow-[0_0_30px_rgba(239,68,68,0.3)]';
    if (temp > 85) return 'bg-orange-500/20 border-orange-500/40 shadow-[0_0_20px_rgba(249,115,22,0.2)]';
    if (temp > 50) return 'bg-yellow-500/10 border-yellow-500/30 shadow-[0_0_15px_rgba(250,204,21,0.1)]';
    if (temp > 20) return 'bg-cyan-500/10 border-cyan-500/20';
    return 'bg-slate-900/80 border-slate-700 shadow-xl';
  };

  return (
    <motion.div 
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className={`fixed bottom-[2.5rem] left-4 right-4 md:left-auto md:bottom-8 md:right-8 flex flex-row md:flex-row items-center md:items-stretch justify-between md:justify-start gap-2 md:gap-4 p-3 md:p-6 rounded-2xl md:rounded-3xl backdrop-blur-xl border ${getBgColor(temperature)} transition-all duration-500 z-[45]`}
    >
      {/* Indicadores de Fuego */}
      <div className="flex flex-row md:flex-col-reverse justify-between gap-1 md:border-r border-white/10 md:pr-5 py-1">
          {Array.from({ length: 5 }).map((_, i) => {
              const threshold = (i + 1) * 20;
              const isLit = temperature >= threshold - 5;
              const isPulsing = temperature >= 100 && i === 4;
              return (
                 <Flame 
                    key={i} 
                    className={`w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 transition-all duration-500 ${isLit ? getColor(temperature) : 'text-slate-700/30'} ${isPulsing ? 'animate-pulse scale-125' : ''}`} 
                 />
              );
          })}
      </div>

      {/* Contenido Principal */}
      <div className="flex flex-col items-center justify-center flex-1 md:min-w-[180px]">
        <div className="hidden md:flex text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1 items-center gap-2 drop-shadow-md">
           ESTADO DEL HUEVO
           {cooldownTime > 0 && (
             <span className="text-red-400 animate-pulse drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]">⚠️ ALARMA</span>
           )}
        </div>
        
        <div className="flex items-end justify-center gap-1 my-0 md:my-2 w-full">
          <motion.span 
             key={Math.floor(temperature)}
             initial={{ scale: 1.1, opacity: 0.8 }}
             animate={{ scale: 1, opacity: 1 }}
             className={`text-3xl sm:text-4xl md:text-7xl font-black tabular-nums tracking-tighter ${getColor(temperature)} transition-all duration-300 drop-shadow-[0_4px_15px_rgba(0,0,0,0.6)]`}
             style={{ WebkitTextStroke: temperature >= 85 ? '1px rgba(255,255,255,0.2)' : 'none' }}
          >
            {temperature.toFixed(1)}
          </motion.span>
          <span className={`text-xl md:text-2xl font-black mb-1 md:mb-2 ${getColor(temperature)} drop-shadow-[0_2px_5px_rgba(0,0,0,0.8)]`}>°C</span>
        </div>

        <div className="hidden md:block w-full mt-2 h-3 bg-black/60 rounded-full overflow-hidden relative shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)]">
           <motion.div 
             className={`h-full ${temperature >= 100 ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,1)]' : temperature > 85 ? 'bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,1)]' : temperature > 50 ? 'bg-yellow-400' : 'bg-cyan-400'}`}
             initial={{ width: `${Math.min(100, Math.max(0, temperature))}%` }}
             animate={{ width: `${Math.min(100, Math.max(0, temperature))}%` }}
             transition={{ ease: "linear", duration: 0.5 }}
           />
        </div>

        <div className="hidden md:flex w-full justify-between items-center mt-3 px-1">
          <span className="text-sm font-black text-slate-400 uppercase tracking-wider drop-shadow-md">
             FASE {phase + 1}
          </span>
          
          {cooldownTime > 0 ? (
             <div className="flex flex-col items-end">
               <span className="text-sm font-black text-red-400 uppercase animate-pulse drop-shadow-[0_0_8px_rgba(239,68,68,0.8)] tracking-wider">
                 ENFRIANDO: {cooldownTime}s
               </span>
               {onWatchAdClick && (
                 <button 
                   onClick={onWatchAdClick}
                   className="mt-1 text-[11px] bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-1 px-2 rounded cursor-pointer whitespace-nowrap active:scale-95 transition-transform"
                 >
                   📺 Ver Anuncio
                 </button>
               )}
             </div>
          ) : sessionClicks > 0 ? (
             <span className="text-sm font-black text-cyan-400 uppercase drop-shadow-[0_0_8px_rgba(34,211,238,0.8)] tracking-wider">
               REINICIO: {Math.max(0, inactivityTimeLimit - timeSinceLastClick)}s
             </span>
          ) : null}
        </div>
      </div>

      {/* Solo Móvil: Información a la derecha */}
      <div className="md:hidden flex flex-col items-end justify-center min-w-[70px]">
          {cooldownTime > 0 ? (
             <>
               <span className="text-[10px] sm:text-xs font-black text-red-400 uppercase animate-pulse drop-shadow-[0_0_8px_rgba(239,68,68,0.8)] tracking-wider text-right">
                 {cooldownTime}s
               </span>
               {onWatchAdClick && (
                 <button 
                   onClick={onWatchAdClick}
                   className="mt-1 text-[9px] bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-1 px-1.5 rounded cursor-pointer whitespace-nowrap active:scale-95"
                 >
                   📺 Anuncio
                 </button>
               )}
             </>
          ) : sessionClicks > 0 ? (
             <span className="text-[10px] sm:text-xs font-black text-cyan-400 uppercase drop-shadow-[0_0_8px_rgba(34,211,238,0.8)] tracking-wider">
               {Math.max(0, inactivityTimeLimit - timeSinceLastClick)}s
             </span>
          ) : (
             <span className="text-[10px] sm:text-xs font-black text-slate-500 uppercase">
               FASE {phase + 1}
             </span>
          )}
      </div>

      {cooldownTime > 0 && (
          <div className="hidden md:block absolute -top-4 -right-4 bg-gradient-to-br from-red-500 to-red-700 text-white text-base font-black px-4 py-2 rounded-full animate-bounce shadow-[0_0_20px_rgba(220,38,38,1)] border-2 border-red-300">
              {cooldownTime}s
          </div>
      )}
    </motion.div>
  );
}
