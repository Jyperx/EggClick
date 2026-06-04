'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Check, X } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface DailySpinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSpinResult: (prize: number) => void;
  userId: string;
  token: string;
  forceRefresh: () => void;
  inventory: any;
}

const SlotReel = ({ finalDigit, isSpinning, delayStop }: { finalDigit: string, isSpinning: boolean, delayStop: number }) => {
  const [spinning, setSpinning] = useState(false);

  useEffect(() => {
    if (isSpinning) {
      setSpinning(true);
    } else {
      if (finalDigit !== '') {
        const timer = setTimeout(() => setSpinning(false), delayStop);
        return () => clearTimeout(timer);
      }
    }
  }, [isSpinning, finalDigit, delayStop]);

  return (
    <div className="w-16 sm:w-20 h-24 sm:h-32 bg-gradient-to-b from-neutral-900 via-black to-neutral-900 border-[3px] border-yellow-700/80 rounded-xl overflow-hidden relative flex justify-center items-center shadow-[inset_0_0_20px_rgba(0,0,0,1)]">
      {/* Sombra interna para dar profundidad de tambor */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/80 pointer-events-none z-10" />

      {spinning ? (
        <motion.div
          animate={{ y: [0, -800] }}
          transition={{ repeat: Infinity, duration: 0.25, ease: "linear" }}
          className="absolute top-0 flex flex-col items-center text-5xl sm:text-6xl font-black text-yellow-500/30 blur-[1px]"
        >
          {/* Lista larga de numeros para el tambor giratorio */}
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n, i) => (
            <div key={i} className="h-24 sm:h-32 flex items-center justify-center">{n}</div>
          ))}
        </motion.div>
      ) : (
        <motion.div
          key={finalDigit}
          initial={{ y: -50, opacity: 0, scale: 0.5 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 20 }}
          className="text-6xl sm:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-200 to-yellow-600 drop-shadow-[0_0_15px_rgba(234,179,8,1)] z-0"
        >
          {finalDigit || '0'}
        </motion.div>
      )}
    </div>
  );
};

export const DailySpinModal: React.FC<DailySpinModalProps> = ({
  isOpen,
  onClose,
  onSpinResult,
  userId,
  token,
  forceRefresh,
  inventory
}) => {
  const [isSpinning, setIsSpinning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prizeWon, setPrizeWon] = useState<number | null>(null);
  const [showCoins, setShowCoins] = useState(false);
  const [coinsList, setCoinsList] = useState<any[]>([]);
  const [purchaseStatus, setPurchaseStatus] = useState<'idle' | 'buying' | 'success'>('idle');
  const [buyQty, setBuyQty] = useState(1);
  const [timeLeft, setTimeLeft] = useState<string>('');
  const coinSoundRef = useRef<HTMLAudioElement | null>(null);
  const giroSoundRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    coinSoundRef.current = new Audio('/sounds/monedas.mp3');
    coinSoundRef.current.volume = 0.7;
    
    giroSoundRef.current = new Audio('/sounds/giro.mp3');
    giroSoundRef.current.loop = true;
    giroSoundRef.current.volume = 0.5;
  }, []);

  const currentUTCDateString = new Date().toISOString().split('T')[0];
  const isNewDay = inventory?.spin_tracker_date !== currentUTCDateString;
  const availableSpins = isNewDay ? 1 : (inventory?.available_spins || 0);
  const purchasedSpinsCount = isNewDay ? 0 : (inventory?.purchased_spins_count || 0);
  const superSpinUsed = isNewDay ? false : (inventory?.super_spin_used || false);

  // Estados locales optimistas para la UI, sin afectar el dinero global hasta recoger
  const [displayAvailableSpins, setDisplayAvailableSpins] = useState(isNewDay ? 1 : (inventory?.available_spins || 0));
  const [displaySuperSpinUsed, setDisplaySuperSpinUsed] = useState(superSpinUsed);

  const isSuperSpin = displayAvailableSpins > 0 && !displaySuperSpinUsed;

  // Limpiar y sincronizar estado al abrir/cerrar
  useEffect(() => {
    if (isOpen) {
      setDisplayAvailableSpins(isNewDay ? 1 : (inventory?.available_spins || 0));
      setDisplaySuperSpinUsed(superSpinUsed);
    } else {
      setPrizeWon(null);
      setIsSpinning(false);
      setError(null);
      setShowCoins(false);
    }
  }, [isOpen]);

  // Contador de tiempo para el próximo supergiro
  useEffect(() => {
    if (!isOpen) return;
    const updateTime = () => {
      const now = new Date();
      const tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
      const diff = tomorrow.getTime() - now.getTime();
      const h = Math.floor(diff / (1000 * 60 * 60)).toString().padStart(2, '0');
      const m = Math.floor((diff / 1000 / 60) % 60).toString().padStart(2, '0');
      const s = Math.floor((diff / 1000) % 60).toString().padStart(2, '0');
      setTimeLeft(`${h}h ${m}m ${s}s`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  useEffect(() => {
    if (prizeWon !== null) {
      setShowCoins(true);
      const generated = Array.from({ length: 50 }).map((_, i) => ({
        id: i,
        x: Math.random() * 100,
        delay: Math.random() * 1.5,
        duration: 1 + Math.random() * 2,
        size: 20 + Math.random() * 30
      }));
      setCoinsList(generated);
    } else {
      setShowCoins(false);
      setCoinsList([]);
    }
  }, [prizeWon]);

  const handleSpin = async () => {
    if (displayAvailableSpins <= 0) return;

    setIsSpinning(true);
    setError(null);
    setPrizeWon(null);
    setDisplayAvailableSpins((prev: number) => Math.max(0, prev - 1));
    setDisplaySuperSpinUsed(true);

    if (giroSoundRef.current) {
      giroSoundRef.current.currentTime = 0;
      giroSoundRef.current.play().catch(() => {});
    }

    try {
      const res = await fetch(`${API_URL}/api/v1/game/user/${userId}/daily-spin`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || 'Error al girar');
      }

      // Dejamos que el tambor gire libremente por 1 segundo, 
      // luego inyectamos el resultado y los tambores pararn secuencialmente.
      setTimeout(() => {
        setIsSpinning(false);
        setPrizeWon(data.prize);
        
        if (giroSoundRef.current) {
          giroSoundRef.current.pause();
        }

        // Reproducir sonido de monedas al revelar el premio
        if (coinSoundRef.current) {
          coinSoundRef.current.currentTime = 0;
          coinSoundRef.current.play().catch(() => { });
        }

        // El último tambor frena a los 900ms (ver delayStop ms abajo).
        // Esperamos un poco más y cerramos para entregar el premio.
        setTimeout(() => {
          onSpinResult(data.prize);
        }, 2000);
      }, 1000);

    } catch (err: any) {
      setIsSpinning(false);
      if (giroSoundRef.current) {
        giroSoundRef.current.pause();
      }
      setError(err.message);
      // Rollback optimistic state
      setDisplayAvailableSpins(inventory?.available_spins || 0);
      setDisplaySuperSpinUsed(superSpinUsed);
    }
  };

  const handleBuy = async () => {
    if (purchaseStatus !== 'idle' || buyQty < 1) return;
    setPurchaseStatus('buying');
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/v1/game/user/${userId}/buy-spins`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ count: buyQty })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Error al comprar');

      // Actualización optimista instantánea
      setDisplayAvailableSpins((prev: number) => prev + buyQty);
      forceRefresh(); // Refresca en segundo plano el dinero global

      setPurchaseStatus('success');
      setTimeout(() => {
        setPurchaseStatus(prev => prev === 'success' ? 'idle' : prev);
      }, 1500);

    } catch (err: any) {
      setError(err.message);
      setPurchaseStatus('idle');
    }
  };

  // Convertimos el premio en string de 4 digitos: ej. 50 -> "0050"
  const prizeStr = prizeWon !== null ? prizeWon.toString().padStart(4, '0') : '';

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isSpinning && prizeWon === null) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleBackdropClick}
          transition={{ duration: 0.05 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 overflow-hidden"
        >
          {/* Lluvia de Monedas (Fondo del Modal) */}
          {showCoins && coinsList.map(coin => (
            <motion.img
              key={coin.id}
              src="/sprites/moneda.png"
              className="absolute z-0 pointer-events-none drop-shadow-[0_0_10px_rgba(250,204,21,0.6)]"
              style={{ width: coin.size, height: coin.size, left: `${coin.x}%` }}
              initial={{ top: '-10%', opacity: 1, rotate: 0 }}
              animate={{ top: '110%', rotate: 360 }}
              transition={{ duration: coin.duration, delay: coin.delay, ease: 'linear', repeat: Infinity }}
            />
          ))}

          <motion.div
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            className="bg-neutral-950 border-2 border-yellow-600/50 rounded-3xl p-6 sm:p-10 max-w-lg w-full relative overflow-hidden shadow-[0_0_80px_rgba(234,179,8,0.15)] text-center flex flex-col items-center"
          >
            {/* Fondo radiante optimizado (sin repaints costosos) */}
            <div className="absolute inset-0 opacity-20 pointer-events-none flex justify-center items-center overflow-hidden">
              <div className="w-[150%] h-[150%] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-yellow-600/40 via-black to-black" />
            </div>

            {/* Botón Cerrar (X) */}
            {(!isSpinning && prizeWon === null) && (
              <button
                onClick={onClose}
                className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors z-50 p-2"
              >
                <X className="w-6 h-6" />
              </button>
            )}

            <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-yellow-500 to-yellow-600 mb-1 mt-2 relative z-10 uppercase tracking-widest drop-shadow-lg flex items-center justify-center gap-3">
              EGG SLOT
            </h2>
            <div className="flex flex-col items-center justify-center mb-8 relative z-10">
              {isSuperSpin ? (
                <span className="text-white font-black bg-gradient-to-r from-purple-600 to-pink-600 px-3 py-1 rounded-full text-xs tracking-[0.2em] shadow-[0_0_15px_rgba(168,85,247,0.8)] border border-pink-400">
                  SUPERGIRO (+PROBABILIDAD)
                </span>
              ) : (
                <span className="text-yellow-500/70 font-bold uppercase tracking-widest text-sm">
                  Giro Normal
                </span>
              )}
            </div>

            {/* Máquina Tragamonedas (Tambores) */}
            <div className="flex gap-2 sm:gap-4 mb-10 relative z-10 p-4 bg-black rounded-2xl border-4 border-yellow-800/80 shadow-[0_0_30px_rgba(234,179,8,0.2)]">
              {/* JACKPOT BANNER ANIMATION */}
              <AnimatePresence>
                {prizeWon !== null && prizeWon >= 500 && (
                  <motion.div
                    initial={{ scale: 0.1, y: 50, opacity: 0, rotate: -10 }}
                    animate={{ scale: [1, 1.2, 1], y: -80, opacity: 1, rotate: [-10, 10, -5, 5, 0] }}
                    transition={{ type: "spring", bounce: 0.6, duration: 0.8 }}
                    className="absolute left-0 right-0 z-50 flex justify-center pointer-events-none"
                  >
                    <div className="bg-gradient-to-r from-red-600 via-yellow-500 to-red-600 px-6 py-2 rounded-full border-4 border-white shadow-[0_0_50px_rgba(250,204,21,1)]">
                      <span className="text-4xl sm:text-5xl font-black text-white uppercase tracking-widest drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)]">
                        ¡JACKPOT!
                      </span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <SlotReel finalDigit={prizeStr[0]} isSpinning={isSpinning} delayStop={0} />
              <SlotReel finalDigit={prizeStr[1]} isSpinning={isSpinning} delayStop={300} />
              <SlotReel finalDigit={prizeStr[2]} isSpinning={isSpinning} delayStop={600} />
              <SlotReel finalDigit={prizeStr[3]} isSpinning={isSpinning} delayStop={900} />
            </div>

            {error && (
              <p className="text-red-400 text-sm mb-6 bg-red-950 p-3 rounded-xl relative z-10 font-bold border border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.3)]">
                {error}
              </p>
            )}

            <div className="flex gap-4 relative z-10 w-full mb-4 text-xs font-bold text-white/50 justify-between px-2 tracking-wider">
              <span>DISPONIBLES: <span className="text-white text-sm">{displayAvailableSpins}</span></span>
              <span>LÍMITE COMPRAS: <span className="text-white text-sm">{purchasedSpinsCount}/10</span></span>
            </div>

            <div className="flex flex-col gap-3 relative z-10 w-full">
              {/* Controles Principales (Recoger / Girar) */}
              <div className="flex gap-3 w-full">
                {(!isSpinning && prizeWon === null && displayAvailableSpins <= 0) ? (
                  <button
                    onClick={onClose}
                    className="flex-1 py-4 px-4 rounded-xl font-black uppercase border shadow-lg text-neutral-400 bg-neutral-900 hover:bg-neutral-800 hover:text-white border-neutral-800 hover:border-neutral-600"
                  >
                    Cerrar
                  </button>
                ) : prizeWon !== null ? (
                  <button
                    onClick={() => {
                      setPrizeWon(null);
                      setIsSpinning(false);
                    }}
                    className="flex-1 py-4 px-4 rounded-xl font-black uppercase border shadow-lg bg-neutral-800 text-white hover:bg-neutral-700 border-neutral-600"
                  >
                    Recoger Premio
                  </button>
                ) : null}

                {!prizeWon && displayAvailableSpins > 0 && (
                  <button
                    onClick={handleSpin}
                    disabled={isSpinning}
                    className={`flex-2 py-4 px-8 rounded-xl font-black text-2xl uppercase tracking-wider w-full shadow-lg transform-gpu
                          ${isSpinning
                        ? 'bg-neutral-800 text-neutral-600 cursor-not-allowed border border-neutral-700'
                        : isSuperSpin
                          ? 'bg-gradient-to-b from-purple-500 to-pink-600 text-white hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(236,72,153,0.6)] border-2 border-pink-300'
                          : 'bg-gradient-to-b from-yellow-400 to-orange-600 text-black hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(234,179,8,0.5)] border-2 border-yellow-300'
                      }
                        `}
                  >
                    {isSpinning ? 'GIRANDO...' : 'GIRAR!'}
                  </button>
                )}
              </div>

              {/* Opciones de Compra (Solo visible si no has ganado un premio aún y no estas girando) */}
              {!prizeWon && !isSpinning && (
                <div className="flex flex-col gap-2 w-full mt-2 bg-slate-900/50 p-3 rounded-xl border border-yellow-700/30">
                  <div className="text-center text-xs font-black text-slate-400 uppercase tracking-widest mb-1">
                    Comprar Giros Adicionales
                  </div>
                  <div className="flex gap-3 w-full">
                    {/* Selector de cantidad */}
                    <div className="flex items-center bg-black/50 rounded-xl border border-white/10 p-1">
                      <button
                        onClick={() => setBuyQty((prev: number) => Math.max(1, prev - 1))}
                        disabled={purchaseStatus !== 'idle' || buyQty <= 1}
                        className="w-10 h-10 flex items-center justify-center text-white hover:bg-white/10 rounded-lg disabled:opacity-50 transition-colors"
                      >
                        <span className="text-xl font-bold">-</span>
                      </button>
                      <div className="w-12 text-center font-black text-lg text-yellow-400">
                        {buyQty}
                      </div>
                      <button
                        onClick={() => setBuyQty((prev: number) => Math.min(10 - purchasedSpinsCount, prev + 1))}
                        disabled={purchaseStatus !== 'idle' || purchasedSpinsCount + buyQty >= 10}
                        className="w-10 h-10 flex items-center justify-center text-white hover:bg-white/10 rounded-lg disabled:opacity-50 transition-colors"
                      >
                        <span className="text-xl font-bold">+</span>
                      </button>
                    </div>

                    {/* Botón de Pagar */}
                    <button
                      onClick={handleBuy}
                      disabled={purchaseStatus !== 'idle' || purchasedSpinsCount + buyQty > 10}
                      className="flex-1 py-3 rounded-xl bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 border border-yellow-500/50 font-black text-sm uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(234,179,8,0.15)] transition-all active:scale-95"
                    >
                      {purchaseStatus === 'buying' ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Procesando</>
                      ) : purchaseStatus === 'success' ? (
                        <><Check className="w-5 h-5 text-green-400" /> ¡Comprados!</>
                      ) : (
                        <>
                          PAGAR {buyQty * 100}
                          <img src="/sprites/moneda.png" width={18} height={18} className="drop-shadow-[0_0_5px_rgba(250,204,21,0.8)]" />
                        </>
                      )}
                    </button>
                  </div>
                  {10 - purchasedSpinsCount <= 0 && (
                    <div className="text-center text-xs text-red-400 font-bold mt-1">Límite diario alcanzado (10/10)</div>
                  )}
                </div>
              )}
            </div>

            {!prizeWon && !isSpinning && (
              <div className="text-center mt-4 text-[10px] font-black text-neutral-500 uppercase tracking-widest pt-2">
                Próximo Supergiro gratis en: <span className="text-yellow-500">{timeLeft}</span>
              </div>
            )}

            {prizeWon !== null && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0 pointer-events-none flex items-center justify-center z-50 mix-blend-screen bg-yellow-500/10"
              />
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
