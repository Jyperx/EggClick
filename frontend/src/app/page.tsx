'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Egg from '@/components/game/Egg';
import PrizePool from '@/components/game/PrizePool';
import StorePanel from '@/components/shop/StorePanel';
import LeaderboardPanel from '@/components/social/LeaderboardPanel';
import ClanModal from '@/components/social/ClanModal';
import EggTemperaturePanel from '@/components/game/EggTemperaturePanel';
import FloatingNotifications, { NotificationItem } from '@/components/game/FloatingNotifications';
import { useBatchClick } from '@/hooks/useBatchClick';
import { CountryCode, formatCurrency } from '@/lib/currency';
import { ShoppingBag, Trophy, Loader2, WifiOff, Gift, X, Shield, Gamepad2, Settings, LogOut, User, ShieldAlert, ShieldCheck, ChevronRight, ChevronLeft } from 'lucide-react';
import { DailySpinModal } from '@/components/game/DailySpinModal';

import { getRankInfo } from '@/lib/ranking';
import { getClanTheme } from '@/lib/clanThemes';
import { useSession, signIn, signOut } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';

import AnimatedCounter from '@/components/ui/AnimatedCounter';
import Image from 'next/image';
import MouseTooltip from '@/components/ui/MouseTooltip';
import { CookieBanner } from '@/components/ui/CookieBanner';
import { TutorialModal } from '@/components/ui/TutorialModal';
import { VideoAdModal } from '@/components/ads/VideoAdModal';
import Link from 'next/link';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const WS_URL = API_URL.replace(/^http/, 'ws');

export default function GamePage() {
  const { data: session, status } = useSession();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [eggCoins, setEggCoins] = useState(0);
  const [clanEggCoins, setClanEggCoins] = useState(0);
  const [isStoreOpen, setIsStoreOpen] = useState(false);
  const [isDailySpinOpen, setIsDailySpinOpen] = useState(false);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [isClanOpen, setIsClanOpen] = useState(false);
  const [userClanId, setUserClanId] = useState<number | null>(null);
  const [userClanName, setUserClanName] = useState<string | null>(null);
  const [userClanShieldId, setUserClanShieldId] = useState<number>(1);
  const userClanIdRef = useRef<number | null>(null);
  const [username, setUsername] = useState<string>('');
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [editUsername, setEditUsername] = useState('');
  const [nameSuggestions, setNameSuggestions] = useState<string[]>([]);
  const [showAdModal, setShowAdModal] = useState(false);

  const handleCloseStore = useCallback(() => setIsStoreOpen(false), []);
  const handleCloseLeaderboard = useCallback(() => setIsLeaderboardOpen(false), []);
  const handleCloseClan = useCallback(() => setIsClanOpen(false), []);

  const [globalClicksRequired, setGlobalClicksRequired] = useState(1_000_000_000);

  const [globalClicks, setGlobalClicks] = useState(0);
  const [baseUsdPrize, setBaseUsdPrize] = useState(150.00);
  const [isEggBroken, setIsEggBroken] = useState(false);
  const [eggWinner, setEggWinner] = useState<string | null>(null);
  const [seasonMode, setSeasonMode] = useState<string>("ganador_absoluto");
  const [seasonWinners, setSeasonWinners] = useState<any[]>([]);
  const [brokenEggTab, setBrokenEggTab] = useState<'info' | 'contact'>('info');
  const [showNewSeasonModal, setShowNewSeasonModal] = useState(false);
  const [showContactForm, setShowContactForm] = useState(false);
  const [contactMethod, setContactMethod] = useState('');
  const [contactDetails, setContactDetails] = useState('');
  const [contactSubmitted, setContactSubmitted] = useState(false);
  
  const [userCountry, setUserCountry] = useState<CountryCode>('CO');
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [totalClicks, setTotalClicks] = useState(0);

  // Inventario
  const [inventory, setInventory] = useState<Record<string, any>>({});
  const [isUserLoaded, setIsUserLoaded] = useState(false);
  const [isMultiTabBlocked, setIsMultiTabBlocked] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const [isBanned, setIsBanned] = useState(false);
  const [banReason, setBanReason] = useState<string | null>(null);
  const [banExpiresAt, setBanExpiresAt] = useState<string | null>(null);
  const [banTimeLeft, setBanTimeLeft] = useState<string | null>(null);
  
  const [isUnbannedModalOpen, setIsUnbannedModalOpen] = useState(false);
  const [unbanCompensation, setUnbanCompensation] = useState(0);
  const [appealMessage, setAppealMessage] = useState("");
  const [isAppealing, setIsAppealing] = useState(false);
  const [appealStatus, setAppealStatus] = useState<"idle" | "success" | "error">("idle");

  const submitAppeal = async () => {
    if (!appealMessage.trim()) return;
    setIsAppealing(true);
    setAppealStatus("idle");
    try {
      const res = await fetch(`${API_URL}/api/v1/game/appeal`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${cachedToken.current}`
        },
        body: JSON.stringify({ message: appealMessage })
      });
      if (res.ok) {
        setAppealStatus("success");
      } else {
        setAppealStatus("error");
      }
    } catch {
      setAppealStatus("error");
    }
    setIsAppealing(false);
  };

  useEffect(() => {
    if (!isBanned || !banExpiresAt) return;
    const interval = setInterval(() => {
      const expires = new Date(banExpiresAt).getTime();
      const now = Date.now();
      const diff = expires - now;
      if (diff <= 0) {
        setBanTimeLeft("Expirado (Recarga la página)");
        clearInterval(interval);
      } else {
        const h = Math.floor(diff / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diff % (1000 * 60)) / 1000);
        setBanTimeLeft(`${h}h ${m}m ${s}s`);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isBanned, banExpiresAt]);

  const submitContactInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactMethod || !contactDetails) return;
    try {
      const res = await fetch(`${API_URL}/api/v1/game/contact-info`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${cachedToken.current}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ contact_method: contactMethod, contact_details: contactDetails })
      });
      if (res.ok) {
        setContactSubmitted(true);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAdComplete = async () => {
    setShowAdModal(false);
    try {
      const res = await fetch(`${API_URL}/api/v1/clicks/skip_cooldown_ad`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${cachedToken.current}`,
          'Content-Type': 'application/json'
        }
      });
      if (res.ok) {
        resetCooldown(); // Limpia estado local
        reloadUser(); // Recarga estado desde el servidor
      }
    } catch (e) {
      console.error(e);
    }
  };

  const syncInterval = useRef<NodeJS.Timeout | null>(null);
  const userWsRef = useRef<WebSocket | null>(null);
  const [isWsConnected, setIsWsConnected] = useState(false);

  // Animaciones de monedas
  const [coinPopups, setCoinPopups] = useState<{ id: number, val: number }[]>([]);
  const [taxPopups, setTaxPopups] = useState<{ id: number, val: number }[]>([]);
  const [clanPopups, setClanPopups] = useState<{ id: number, val: number }[]>([]);
  const [coinBounce, setCoinBounce] = useState(false);
  const prevCoinsRef = useRef(0);

  useEffect(() => {
    if (eggCoins > prevCoinsRef.current) {
      const diff = Math.floor(eggCoins) - Math.floor(prevCoinsRef.current);
      if (diff > 0 && prevCoinsRef.current > 0) {
        setCoinPopups(prev => [...prev.slice(-4), { id: Date.now() + Math.random(), val: diff }]);
        setCoinBounce(true);
        setTimeout(() => setCoinBounce(false), 300);
      }
    }
    if (eggCoins > 0 || prevCoinsRef.current === 0) {
      prevCoinsRef.current = eggCoins;
    }
  }, [eggCoins]);

  useEffect(() => {
    const handleClanUpdate = (e: any) => {
      const data = e.detail;
      // Use functional state update to check the CURRENT userClanId without stale closures!
      setUserClanId(currentClanId => {
        if (currentClanId !== null && String(currentClanId) === String(data.clan_id)) {
          setClanEggCoins(data.egg_coins);
          // Trigger popup solo si viene con tax (no para sync general)
          if (data.tax && data.tax > 0) {
            setClanPopups(prev => [...prev.slice(-4), { id: Date.now() + Math.random(), val: data.tax }]);
          }
        }
        return currentClanId;
      });
    };
    const handleClanTax = (e: any) => {
      const tax = e.detail;
      setTaxPopups(prev => [...prev.slice(-4), { id: Date.now() + Math.random(), val: tax }]);
    };
    window.addEventListener('clan_update_event', handleClanUpdate);
    window.addEventListener('clan_tax_paid', handleClanTax);
    return () => {
      window.removeEventListener('clan_update_event', handleClanUpdate);
      window.removeEventListener('clan_tax_paid', handleClanTax);
    };
  }, []);

  const {
    registerClick,
    showLoginPrompt,
    sessionClicks,
    cooldownTime,
    isFrozen,
    freezeTimeLeft,
    isAutoclicking,
    localAutoclicker,
    localMartillo,
    localHamAss,
    localTouchMe,
    setIsHolding,
    localIceHand,
    resetCooldown,
    timeSinceLastClick,
    inactivityTimeLimit,
    syncServerState,
    showOverheatWarning,
    cachedToken
  } = useBatchClick(500, (newEggCoins, newInventory) => {
    setEggCoins(newEggCoins);
    if (newInventory) setInventory(newInventory);
  }, inventory, undefined, userWsRef, isEggBroken);

  const currentUTCDateString = new Date().toISOString().split('T')[0];

  // Lazy evaluation for frontend display
  const availableSpins = isUserLoaded && session
    ? (inventory?.spin_tracker_date !== currentUTCDateString ? 1 : (inventory?.available_spins || 0))
    : 0;

  const closeDailySpin = () => {
    setIsDailySpinOpen(false);
    reloadUser();
  };

  const reloadUser = useCallback(async () => {
    if (status === 'authenticated' && session?.user?.email) {

      // 1. DEDUPLICACIÓN: Forzar procesamiento de beacon pendiente (Race Condition Fix)
      const userKey = session?.user?.email || 'anon_user';
      const pendingBatchStr = localStorage.getItem(`pending_egg_batch_${userKey}`);
      if (pendingBatchStr) {
        try {
          // Await garantiza que el backend actualice su DB ANTES de que hagamos el GET de estado.
          await fetch(`${API_URL}/api/v1/clicks/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: pendingBatchStr
          }).then(res => {
            if (res.ok || res.status === 400 || res.status === 401) {
              // Solo eliminamos el batch pendiente si la petición llegó al servidor.
              localStorage.removeItem(`pending_egg_batch_${userKey}`);
            }
          }).catch(() => { });

          // Esperamos 1.5 segundos para darle tiempo al Worker (ARQ) de procesar el lote en Redis
          // antes de pedir el estado del usuario, evitando así la condición de carrera.
          await new Promise(resolve => setTimeout(resolve, 1500));
        } catch (e) { }
      }

      fetch(`${API_URL}/api/v1/game/user/${session?.user?.email}?t=${Date.now()}`, { cache: 'no-store' })
        .then(res => res.json())
        .then(data => {
          if (data) {
            setEggCoins(data.egg_coins || 0);
            if (data.clan_id) {
              setClanEggCoins(data.clan_egg_coins || 0);
            }
            setUserClanId(data.clan_id || null);
            userClanIdRef.current = data.clan_id || null;
            setUserClanName(data.clan_name || null);
            setUserClanShieldId(data.clan_shield_id || 1);
            setUsername(data.username || session?.user?.name?.split(' ')[0] || '');
            setEditUsername(data.username || session?.user?.name?.split(' ')[0] || '');
            setTotalClicks(data.total_clicks || 0);
            localClicksToNextCoin.current = (data.total_clicks || 0) % 10;

            if (data.country) {
              setUserCountry(data.country as CountryCode);
              setShowCountryModal(false);
            } else {
              setShowCountryModal(true);
            }
            if (data.inventory) setInventory(data.inventory);
            if (data.is_banned) {
              setIsBanned(true);
              setBanReason(data.ban_reason || "Violación de los términos del servicio.");
              setBanExpiresAt(data.ban_expires_at || null);
            }

            syncServerState(data.session_clicks || 0, data.cooldown_time || 0, data.time_since_last_click || 0);
            setIsUserLoaded(true);
          }
        })
        .catch(console.error);
    } else if (status === 'unauthenticated') {
      setIsUserLoaded(true);
    }
  }, [status, session, syncServerState]);

  useEffect(() => {
    const fetchGameState = () => {
      fetch(`${API_URL}/api/v1/game/state?t=${Date.now()}`, { cache: 'no-store' })
        .then(res => res.json())
        .then(data => {
          if (data && typeof data.current_clicks === 'number') {
            setGlobalClicks(prev => (data.current_clicks < 100 && prev > 10000) ? data.current_clicks : Math.max(prev, data.current_clicks));
          }
          if (data && typeof data.required_clicks === 'number') {
            setGlobalClicksRequired(data.required_clicks);
          }
          if (data && typeof data.prize_usd === 'number') {
            setBaseUsdPrize(data.prize_usd);
          }
          if (data && data.is_active === false) {
            setIsEggBroken(true);
            setEggWinner(data.winner || "Desconocido");
            if (data.season_mode) setSeasonMode(data.season_mode);
            if (data.winners) setSeasonWinners(data.winners);
          } else {
            setIsEggBroken(false);
          }
        })
        .catch(console.error);
    };

    // 1. Obtener estado inicial seguro vía HTTP (Fallback garantizado)
    fetchGameState();

    // Refetch al volver a la pestaña (BFCache / Mobile Wake)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchGameState();
        setIsLoggingIn(false); // Reset login spinner on back navigation
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    // Evento específico para Back/Forward Cache (BFCache)
    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        fetchGameState();
        setIsLoggingIn(false);
      }
    };
    window.addEventListener("pageshow", handlePageShow);

    // 2. Abrir WebSocket para tiempo real
    let ws: WebSocket;
    let reconnectTimeout: NodeJS.Timeout;

    const connectWS = () => {
      ws = new WebSocket(`${WS_URL}/ws/game`);

      ws.onopen = () => {
        setIsWsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'state_update') {
            setGlobalClicks(prev => (data.current_clicks < 100 && prev > 10000) ? data.current_clicks : Math.max(prev, data.current_clicks));
            setBaseUsdPrize(data.prize_usd);
          } else if (data.type === 'user_click') {
            const newNotif: NotificationItem = {
              id: Math.random().toString(36).substr(2, 9),
              username: data.username,
              clicks: data.clicks
            };
            setNotifications(prev => {
              const updated = [...prev, newNotif];
              if (updated.length > 5) return updated.slice(updated.length - 5);
              return updated;
            });
            setTimeout(() => {
              setNotifications(prev => prev.filter(n => n.id !== newNotif.id));
            }, 2500);
          } else if (data.type === 'clan_update') {
            window.dispatchEvent(new CustomEvent('clan_update_event', { detail: data }));
          } else if (data.type === 'egg_broken') {
            setIsEggBroken(true);
            setEggWinner(data.winner);
            setGlobalClicks(globalClicksRequired);
            setSeasonMode(data.season_mode || "ganador_absoluto");
            setSeasonWinners(data.winners || []);
            setShowContactForm(false);
            setContactSubmitted(false);
          } else if (data.type === 'new_season_started') {
            setIsEggBroken(false);
            setEggWinner(null);
            setGlobalClicks(0);
            setGlobalClicksRequired(data.total_clicks);
            if (data.prize_usd) setBaseUsdPrize(data.prize_usd);
            if (data.season_mode) setSeasonMode(data.season_mode);
            setSeasonWinners([]);
            setShowNewSeasonModal(true);
          }
        } catch (err) { }
      };

      ws.onclose = () => {
        setIsWsConnected(false);
        reconnectTimeout = setTimeout(connectWS, 3000);
      };
    };

    connectWS();
    return () => {
      clearTimeout(reconnectTimeout);
      if (ws) ws.close();
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, []);

  // 3. WebSocket Privado del Usuario (Para estado individual en tiempo real)
  useEffect(() => {
    if (status !== 'authenticated' || !session?.user?.email) return;

    let userReconnectTimeout: NodeJS.Timeout;

    const connectUserWS = () => {
      if (!cachedToken.current) {
        userReconnectTimeout = setTimeout(connectUserWS, 1000);
        return;
      }
      const ws = new WebSocket(`${WS_URL}/ws/user/${session?.user?.email}?token=${cachedToken.current}`);
      userWsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'force_disconnect' && data.reason === 'multiple_tabs') {
            setIsMultiTabBlocked(true);
            if (userWsRef.current) {
              userWsRef.current.onclose = null;
              userWsRef.current.close();
            }
            return;
          }

          if (data.type === 'banned') {
            setIsBanned(true);
            setBanReason(data.reason || "Violación de los términos del servicio.");
            setBanExpiresAt(data.expires_at || null);
            if (userWsRef.current) {
              userWsRef.current.onclose = null;
              userWsRef.current.close();
            }
            return;
          }

          if (data.type === 'unbanned') {
            setIsBanned(false);
            setUnbanCompensation(data.compensation_coins || 0);
            setIsUnbannedModalOpen(true);
            reloadUser();
            setTimeout(() => {
              setIsUnbannedModalOpen(false);
            }, 6000);
            return;
          }

          if (data.session_clicks !== undefined) {
            syncServerState(data.session_clicks, data.cooldown_time || 0, data.time_since_last_click || 0);
          }
          if (data.egg_coins !== undefined) {
            setEggCoins(data.egg_coins);
          }
          if (data.clan_egg_coins !== undefined) {
            setClanEggCoins(data.clan_egg_coins);
          }
          if (data.total_clicks !== undefined) {
            setTotalClicks(data.total_clicks);
          }
          if (data.inventory !== undefined) {
            setInventory(data.inventory);
          }
          if (data.clan_tax !== undefined && data.clan_tax > 0) {
            window.dispatchEvent(new CustomEvent('clan_tax_paid', { detail: data.clan_tax }));
          }
        } catch (e) {
          console.error("Error parsing user WS message:", e);
        }
      };

      ws.onclose = () => {
        userWsRef.current = null;
        userReconnectTimeout = setTimeout(connectUserWS, 3000);
      };
    };

    connectUserWS();

    return () => {
      clearTimeout(userReconnectTimeout);
      if (userWsRef.current) {
        userWsRef.current.onclose = null; // Evitar que close() dispare la reconexión
        userWsRef.current.close();
        userWsRef.current = null;
      }
    };
  }, [status, session, syncServerState]);

  // Cargar estado inicial del usuario si hay sesión
  useEffect(() => {
    reloadUser();

    // Escuchar compras en la tienda
    const handleUpdate = () => reloadUser();
    window.addEventListener('egg_coins_update', handleUpdate);
    return () => window.removeEventListener('egg_coins_update', handleUpdate);
  }, [session, status]);

  // Variable local mutable para predecir cuándo subirán las monedas (Optimistic UI)
  const localClicksToNextCoin = useRef(0);
  const [autoClickTrigger, setAutoClickTrigger] = useState(0);

  // Handler cuando el usuario hace clic en el huevo
  const handleEggClick = (isAuto: boolean = false) => {
    //if (!cachedToken || status === "unauthenticated") {
    //setShowLoginPrompt(true);
    //setTimeout(() => setShowLoginPrompt(false), 2000);
    //return;
    //}

    // Prevent local over-clicks if goal is reached
    if (globalClicksRequired > 0 && globalClicks >= globalClicksRequired) {
      return;
    }

    if (isEggBroken) return; // No permitir clics si el huevo está roto

    const allowed = registerClick(isAuto);
    if (allowed) {
      // Optimistic UI para Clics Globales
      const power = localHamAss > 0 ? 100 : (localMartillo > 0 ? 5 : 1);
      setGlobalClicks(prev => {
        const next = prev + power;
        if (globalClicksRequired > 0 && next >= globalClicksRequired) {
          // Force immediate flush so the server calculates the winner without waiting for the batch interval
          setTimeout(() => window.dispatchEvent(new Event("force_flush_egg_clicks")), 0);
        }
        return next;
      });
      setTotalClicks(prev => prev + power);

      // Optimistic UI para EggCoins (Predice 1 moneda cada 10 clics)
      localClicksToNextCoin.current += power;
      if (localClicksToNextCoin.current >= 10) {
        const newCoinsEarned = Math.floor(localClicksToNextCoin.current / 10);
        setEggCoins(prev => prev + newCoinsEarned);
        localClicksToNextCoin.current = localClicksToNextCoin.current % 10;
      }
    }
  };

  const autoClickRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    autoClickRef.current = () => {
      handleEggClick(true);
      setAutoClickTrigger(prev => prev + 1);
    };
  });

  useEffect(() => {
    if (isAutoclicking) {
      const timer = setInterval(() => {
        if (autoClickRef.current) autoClickRef.current();
      }, 500);
      return () => clearInterval(timer);
    }
  }, [isAutoclicking]);

  if (status === 'authenticated' && !isUserLoaded) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />
        <div className="z-10 flex flex-col items-center gap-6">
          <Loader2 className="w-16 h-16 text-pink-500 animate-spin drop-shadow-[0_0_15px_rgba(236,72,153,0.8)]" />
          <h2 className="text-2xl font-black text-white uppercase tracking-widest animate-pulse">Sincronizando Estado...</h2>
        </div>
      </div>
    );
  }

  return (
    <main className="h-[100dvh] bg-slate-950 text-white flex flex-col items-center py-4 px-4 font-sans selection:bg-pink-500/30 overflow-hidden relative">

      {/* Efecto de cuadrícula de fondo */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-950 pointer-events-none" />

      {/* Botón de Clan (Esquina Superior Izquierda) - Oculto en Móvil */}
      <div className="absolute top-6 left-8 z-50 hidden md:flex items-center gap-3 origin-top-left">
        {status === 'authenticated' && (
          <MouseTooltip content="Sistema de Clanes">
            <button
              onClick={() => setIsClanOpen(true)}
              className={`bg-slate-950 hover:bg-slate-900 text-white px-4 py-2 rounded-xl font-black text-sm uppercase tracking-widest flex items-center gap-2 border shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)] transition-all active:scale-95 ${userClanName ? `${getClanTheme(userClanShieldId).border} ${getClanTheme(userClanShieldId).boxGlow}` : 'border-yellow-500/20'}`}
            >
              {userClanName ? (
                <div className="flex items-center gap-2">
                  <Image src={`/sprites/clan/${userClanShieldId}.png`} alt="Clan Shield" width={32} height={32} unoptimized className={getClanTheme(userClanShieldId).dropGlow} />
                  <span className={`hidden md:inline ${getClanTheme(userClanShieldId).text} ${getClanTheme(userClanShieldId).textGlow}`}>{userClanName}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-xl">🛡️</span>
                  <span className="hidden md:inline text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.3)]">UNIRSE A UN CLAN</span>
                </div>
              )}
            </button>
          </MouseTooltip>
        )}
      </div>

      {/* Logo Central (Esquina Superior Centro) */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-40 hidden sm:flex flex-col items-center pointer-events-none">
        <h1 className="text-2xl md:text-3xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 via-orange-400 to-red-500 drop-shadow-[0_4px_10px_rgba(249,115,22,0.8)] pr-2">
          EGGCLICK
        </h1>
        <div className="w-1/2 h-px bg-gradient-to-r from-transparent via-orange-500 to-transparent mt-1"></div>
      </div>

      {/* Menú de Usuario (Esquina Superior Derecha) - Oculto en Móvil */}
      <div className="absolute top-6 right-8 z-50 hidden md:flex flex-col items-end gap-3 origin-top-right">
        {status === 'authenticated' ? (
          <>
            <div className="flex items-center gap-3 bg-slate-900/60 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 shadow-[0_0_15px_rgba(0,0,0,0.5)]">
              <MouseTooltip content={getRankInfo(totalClicks).name}>
                <div className="flex items-center gap-2 cursor-help">
                  <Image src={`/sprites/ranked/${getRankInfo(totalClicks).id}.png`} alt="Rank" width={24} height={24} unoptimized className={`drop-shadow-md ${getRankInfo(totalClicks).scaleClass}`} />
                  <span className="text-sm text-white font-black truncate max-w-[120px]">{username}</span>
                </div>
              </MouseTooltip>
              <div className="w-px h-5 bg-white/20 hidden md:block"></div>
              <div className="flex items-center gap-2">
                <MouseTooltip content="Configurar Perfil">
                  <button onClick={() => { setEditUsername(username); setNameSuggestions([]); setShowProfileModal(true); }} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 hover:text-white rounded-lg text-[10px] font-black tracking-wider uppercase text-slate-400 transition-colors flex items-center gap-1">
                    ⚙️ Ajustes
                  </button>
                </MouseTooltip>

                <button onClick={() => signOut()} className="px-3 py-1.5 bg-red-900/40 border border-red-500/30 hover:bg-red-500 hover:text-white rounded-lg text-[10px] font-black tracking-wider uppercase text-red-400 transition-colors">Salir</button>
              </div>
            </div>

            <div className="relative flex flex-col items-center mt-2">
              <MouseTooltip content="Ruleta Diaria">
                <button
                  onClick={() => setIsDailySpinOpen(true)}
                  className="relative px-4 py-2 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 border-2 transition-all active:scale-95 bg-yellow-400 text-yellow-950 border-yellow-200 shadow-[inset_0_2px_8px_rgba(255,255,255,0.6),0_0_20px_rgba(250,204,21,0.6)] hover:bg-yellow-300"
                >
                  <div className="relative flex items-center justify-center w-7 h-5 mr-1">
                    <motion.img
                      src="/sprites/moneda.png"
                      className="absolute left-0 top-1 w-3.5 h-3.5 z-10 drop-shadow-[0_2px_2px_rgba(0,0,0,0.6)]"
                      animate={{ y: [0, -2, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 0 }}
                    />
                    <motion.img
                      src="/sprites/moneda.png"
                      className="absolute left-3.5 top-1 w-3.5 h-3.5 z-10 drop-shadow-[0_2px_2px_rgba(0,0,0,0.6)]"
                      animate={{ y: [0, -2, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
                    />
                    <motion.img
                      src="/sprites/moneda.png"
                      className="absolute left-[7px] top-[-2px] w-4 h-4 z-20 drop-shadow-[0_3px_3px_rgba(0,0,0,0.7)]"
                      animate={{ y: [0, -3, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
                    />
                  </div>

                  <span>CASINO</span>
                </button>
              </MouseTooltip>
              {(isUserLoaded && session && inventory?.spin_tracker_date !== currentUTCDateString) && (
                <span className="absolute -bottom-4 text-[9px] font-black text-yellow-300 drop-shadow-[0_0_5px_rgba(250,204,21,1)] uppercase tracking-widest animate-bounce">SUPERGIRO</span>
              )}
            </div>
          </>
        ) : (
          <button
            onClick={() => {
              setIsLoggingIn(true);
              signIn('google');
            }}
            disabled={isLoggingIn}
            className="px-5 py-2.5 bg-gradient-to-br from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 rounded-xl text-xs font-black tracking-widest uppercase text-white shadow-[0_0_20px_rgba(79,70,229,0.5)] transition-all active:scale-95 flex items-center justify-center min-w-[140px] disabled:opacity-70 disabled:cursor-wait"
          >
            {isLoggingIn ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Iniciar Sesión'}
          </button>
        )}
      </div>

      <div className="flex-1 w-full max-w-4xl flex flex-col items-center justify-start md:justify-start z-10 relative py-0 md:py-2 gap-0 md:gap-8 mt-1 md:mt-10">
        {/* Barra superior estilo HUD de Videojuego */}
        <div className="w-full flex items-center justify-center mt-2 sm:mt-4 z-10">
          <div className="flex flex-col md:flex-row items-center gap-2 md:gap-4 bg-slate-900/60 backdrop-blur-xl border border-white/10 p-2 sm:p-3 md:p-6 rounded-[2rem] shadow-[0_0_40px_rgba(0,0,0,0.5)] ring-1 ring-black/50 scale-[0.85] sm:scale-95 md:scale-100 origin-top w-[110%] sm:w-[100%] md:w-auto mx-auto shrink-0">

            {/* Controles de la Izquierda (Billeteras y Botones) */}
            <div className="flex flex-col gap-3 w-full md:w-auto">

              {/* Fila Superior: Tu Billetera + Botones (Oculto en móvil si no hay sesión) */}
              <div className={`items-end gap-4 justify-center md:justify-start ${status === 'authenticated' ? 'flex' : 'hidden md:flex'}`}>

                {/* Tu Billetera */}
                <div className="flex flex-col items-center">
                  <div className="text-[10px] font-black text-slate-400 tracking-[0.2em] uppercase mb-1 whitespace-nowrap">TU BILLETERA</div>
                  <div className="relative flex items-center justify-center">
                    <AnimatePresence>
                      {coinPopups.map(popup => (
                        <motion.div
                          key={popup.id}
                          initial={{ opacity: 1, y: 0, scale: 0.5 }}
                          animate={{ opacity: 0, y: -40, scale: 1.5 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                          className="absolute -top-4 right-0 z-50 text-yellow-400 font-black drop-shadow-[0_0_10px_rgba(250,204,21,1)] text-lg pointer-events-none"
                        >
                          +{popup.val}
                        </motion.div>
                      ))}
                      {taxPopups.map(popup => (
                        <motion.div
                          key={`tax-${popup.id}`}
                          initial={{ opacity: 1, y: 0, scale: 0.5 }}
                          animate={{ opacity: 0, y: 40, scale: 1.5 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 1.2, ease: "easeOut" }}
                          className="absolute top-10 right-0 z-50 text-emerald-400 font-black drop-shadow-[0_0_10px_rgba(52,211,153,1)] text-sm pointer-events-none"
                        >
                          +{popup.val} al Clan!
                        </motion.div>
                      ))}
                    </AnimatePresence>
                    <div className="bg-slate-950 px-4 py-2 rounded-xl border border-yellow-500/20 flex items-center justify-center min-w-[130px] shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)]">
                      <span className="font-black text-xl text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.6)] tabular-nums mr-2">
                        <AnimatedCounter value={Math.floor(eggCoins)} />
                      </span>
                      <motion.img src="/sprites/moneda.png" width={22} height={22} />
                    </div>
                  </div>
                </div>

                {/* Botones de Tienda y Ranking */}
                <div className="flex items-center gap-2 mb-0.5">
                  <button
                    onClick={() => setIsStoreOpen(true)}
                    className="bg-slate-950 hover:bg-slate-900 text-pink-400 px-6 py-2.5 rounded-xl font-black text-sm uppercase tracking-widest flex items-center gap-2 border-2 border-pink-500/50 shadow-[inset_0_2px_10px_rgba(0,0,0,0.5),0_0_15px_rgba(236,72,153,0.3)] transition-all active:scale-95"
                  >
                    <ShoppingBag className="w-5 h-5 drop-shadow-[0_0_8px_rgba(236,72,153,0.8)]" />
                    <span className="drop-shadow-[0_0_8px_rgba(236,72,153,0.8)]">Tienda</span>
                  </button>

                  <MouseTooltip content="Ranking Global">
                    <button
                      onClick={() => setIsLeaderboardOpen(true)}
                      className="hidden md:flex bg-slate-950 hover:bg-slate-900 text-amber-400 px-4 py-2.5 rounded-xl font-black text-sm uppercase tracking-widest items-center border-2 border-amber-500/50 shadow-[inset_0_2px_10px_rgba(0,0,0,0.5),0_0_15px_rgba(245,158,11,0.3)] transition-all active:scale-95"
                    >
                      <Trophy className="w-5 h-5 drop-shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
                    </button>
                  </MouseTooltip>
                </div>
              </div>

              {/* Botón de Iniciar Sesión Prominente (Solo Móvil, reemplaza billetera) */}
              {status !== 'authenticated' && (
                <div className="flex md:hidden items-center justify-center w-full px-2">
                  <button
                    onClick={() => {
                      setIsLoggingIn(true);
                      signIn('google');
                    }}
                    disabled={isLoggingIn}
                    className="w-full px-6 py-4 bg-gradient-to-br from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 rounded-2xl text-sm font-black tracking-widest uppercase text-white shadow-[0_0_30px_rgba(79,70,229,0.5)] transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-wait border border-blue-400/30"
                  >
                    {isLoggingIn ? <Loader2 className="w-5 h-5 animate-spin" /> : <><User className="w-5 h-5" /> Iniciar Sesión para Jugar</>}
                  </button>
                </div>
              )}

              {/* Fila Inferior: Tesoro Clan (Oculto en móvil) */}
              {userClanId && (
                <div className="hidden md:flex flex-col items-center w-full mt-1 relative">
                  <div className="text-[10px] font-black text-amber-500 tracking-[0.2em] uppercase mb-1 whitespace-nowrap drop-shadow-[0_0_5px_rgba(245,158,11,0.8)]">TESORO CLAN</div>

                  <AnimatePresence>
                    {clanPopups.map(popup => (
                      <motion.div
                        key={`clan-${popup.id}`}
                        initial={{ opacity: 1, y: 0, scale: 0.5 }}
                        animate={{ opacity: 0, y: -30, scale: 1.3 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1.0, ease: "easeOut" }}
                        className="absolute -top-6 right-8 z-50 text-amber-400 font-black drop-shadow-[0_0_10px_rgba(245,158,11,1)] text-md pointer-events-none"
                      >
                        +{popup.val.toFixed(1)}
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  <div className="bg-slate-950 px-4 py-2 rounded-xl border border-amber-400/50 flex items-center justify-center min-w-[130px] shadow-[inset_0_2px_10px_rgba(0,0,0,0.5),0_0_15px_rgba(245,158,11,0.2)]">
                    <span className="font-black text-xl text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.6)] tabular-nums mr-2">
                      <AnimatedCounter value={Math.floor(clanEggCoins)} />
                    </span>
                    <motion.img src="/sprites/moneda.png" width={22} height={22} className="hue-rotate-15 drop-shadow-[0_0_5px_rgba(245,158,11,0.5)]" />
                  </div>
                </div>
              )}

            </div>

            {/* Divisor */}
            <div className="hidden md:block w-px h-16 bg-gradient-to-b from-transparent via-slate-600 to-transparent mx-2"></div>
            {/* Separador móvil */}
            <div className="md:hidden w-full h-px bg-gradient-to-r from-transparent via-slate-600 to-transparent my-2"></div>

            {/* Prize Pool ajustado */}
            <div className="scale-95 origin-center">
              <PrizePool baseUsdAmount={baseUsdPrize} userCountry={userCountry} />
            </div>

          </div>
        </div>

        {/* Modal de Bloqueo Multi-pestaña */}
        <AnimatePresence>
          {isMultiTabBlocked && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="fixed inset-0 bg-slate-950/95 z-[999] flex items-center justify-center p-4"
            >
              <div className="bg-slate-900 border border-red-500/50 p-8 rounded-3xl flex flex-col items-center text-center max-w-md shadow-[0_0_40px_rgba(239,68,68,0.3)]">
                <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mb-6">
                  <span className="text-4xl">⚠️</span>
                </div>
                <h2 className="text-2xl font-black text-white mb-4 uppercase tracking-widest text-red-400">Sesión Pausada</h2>
                <p className="text-slate-400 mb-8 leading-relaxed">
                  Has iniciado sesión en otra pestaña o dispositivo. Para mantener el juego justo, solo puedes farmear desde una sola pantalla a la vez.
                </p>
                <button
                  onClick={() => window.location.reload()}
                  className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(239,68,68,0.4)] uppercase tracking-widest text-sm"
                >
                  Jugar aquí
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Contador Global Animado */}
        <div className="text-center space-y-0 md:space-y-1 -mt-6 sm:-mt-2 md:mt-6 scale-90 md:scale-100 z-10">
          <h1 suppressHydrationWarning className="text-5xl md:text-6xl font-black text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.5)] tracking-tighter tabular-nums leading-none">
            <AnimatedCounter value={globalClicks} />
          </h1>
          <p suppressHydrationWarning className="text-pink-400 font-bold uppercase tracking-widest text-xs drop-shadow-[0_0_5px_rgba(244,114,182,1)] mt-2">
            Clics / {globalClicksRequired.toLocaleString()}
          </p>
        </div>

        {/* El Huevo Interactivo */}
        <div className="flex flex-col items-center justify-center gap-2 sm:gap-4 my-0 md:my-2 relative flex-1 w-full md:scale-100 origin-top min-h-0">
          <Egg onEggClick={(isAuto) => handleEggClick(isAuto)} sessionClicks={sessionClicks} cooldownTime={cooldownTime} isFrozen={isFrozen} freezeTimeLeft={freezeTimeLeft} isAutoclicking={isAutoclicking} localMartillo={localMartillo} localHamAss={localHamAss} localTouchMe={localTouchMe} setIsHolding={setIsHolding} inventory={inventory} autoClickTrigger={autoClickTrigger} resetCooldown={(sendToServer) => resetCooldown(sendToServer ? 'force' : undefined)} userId={session?.user?.email || 'anon_user'} showOverheatWarning={showOverheatWarning} isEggBroken={isEggBroken} />

          {/* Indicador de Desconexión sobre el huevo */}
          {!isWsConnected && status === 'authenticated' && !isMultiTabBlocked && (
            <div className="absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 animate-pulse pointer-events-none flex flex-col items-center justify-center gap-1">
              <WifiOff className="w-12 h-12 text-white drop-shadow-[0_0_15px_rgba(0,0,0,1)]" />
              <span className="text-white font-black uppercase tracking-[0.2em] text-[10px] md:text-xs drop-shadow-[0_2px_8px_rgba(0,0,0,1)]">Reconectando...</span>
            </div>
          )}

          {showLoginPrompt && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-900/70 border border-red-500/50 backdrop-blur-md text-white font-black uppercase tracking-widest text-sm md:text-base px-8 py-6 rounded-3xl shadow-[0_0_40px_rgba(239,68,68,0.3)] z-50 animate-bounce pointer-events-none flex flex-col items-center justify-center gap-2 text-center w-max max-w-[90vw]">
              <span className="text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,1)] text-3xl">⚠️</span>
              <span className="drop-shadow-[0_0_5px_rgba(0,0,0,1)]">¡Regístrate o Inicia Sesión<br />para Jugar!</span>
            </div>
          )}

          {/* Indicadores de Buffs Activos */}
          <div className="fixed right-2 top-1/2 -translate-y-1/2 md:static md:translate-y-0 flex flex-col md:flex-row flex-wrap justify-center gap-2 md:gap-3 z-[60] md:z-0 min-h-10 md:px-4 pointer-events-none">
            {localAutoclicker > 0 && (
              <div className="bg-slate-950/80 backdrop-blur-md border border-blue-500/50 p-1.5 md:px-3 md:py-1.5 rounded-lg md:rounded-xl text-xs md:text-sm font-black text-white shadow-[inset_0_0_15px_rgba(59,130,246,0.2),0_0_10px_rgba(59,130,246,0.3)] flex flex-col md:flex-row items-center gap-1 md:gap-2">
                <Image src="/sprites/autoclicker.png" alt="Auto" width={24} height={24} unoptimized className="w-5 h-5 md:w-6 md:h-6 drop-shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
                <div className="flex flex-col md:flex-row items-center gap-0 md:gap-2">
                  <span className="hidden md:inline text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.8)]">Auto</span>
                  <span className="text-white text-[10px] md:text-sm">{localAutoclicker}s</span>
                </div>
              </div>
            )}
            {localIceHand > 0 && (
              <div className="bg-slate-950/80 backdrop-blur-md border border-cyan-500/50 p-1.5 md:px-3 md:py-1.5 rounded-lg md:rounded-xl text-xs md:text-sm font-black text-white shadow-[inset_0_0_15px_rgba(6,182,212,0.2),0_0_10px_rgba(6,182,212,0.3)] flex flex-col md:flex-row items-center gap-1 md:gap-2">
                <Image src="/sprites/mano_congelada.png" alt="Ice" width={24} height={24} unoptimized className="w-5 h-5 md:w-6 md:h-6 drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
                <div className="flex flex-col md:flex-row items-center gap-0 md:gap-2">
                  <span className="hidden md:inline text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]">Congelar</span>
                  <span className="text-white text-[10px] md:text-sm">{localIceHand}</span>
                </div>
              </div>
            )}
            {localMartillo > 0 && (
              <div className="bg-slate-950/80 backdrop-blur-md border border-amber-500/50 p-1.5 md:px-3 md:py-1.5 rounded-lg md:rounded-xl text-xs md:text-sm font-black text-white shadow-[inset_0_0_15px_rgba(245,158,11,0.2),0_0_10px_rgba(245,158,11,0.3)] flex flex-col md:flex-row items-center gap-1 md:gap-2">
                <Image src="/sprites/martillo_x5.png" alt="x5" width={24} height={24} unoptimized className="w-5 h-5 md:w-6 md:h-6 drop-shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
                <div className="flex flex-col md:flex-row items-center gap-0 md:gap-2">
                  <span className="hidden md:inline text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.8)]">Martillo</span>
                  <span className="text-white text-[10px] md:text-sm">{localMartillo}u</span>
                </div>
              </div>
            )}
            {localHamAss > 0 && (
              <div className="bg-slate-950/80 backdrop-blur-md border border-red-500/50 p-1.5 md:px-3 md:py-1.5 rounded-lg md:rounded-xl text-xs md:text-sm font-black text-white shadow-[inset_0_0_15px_rgba(239,68,68,0.2),0_0_10px_rgba(239,68,68,0.3)] flex flex-col md:flex-row items-center gap-1 md:gap-2">
                <Image src="/sprites/hamass.png" alt="x100" width={24} height={24} unoptimized className="w-5 h-5 md:w-6 md:h-6 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                <div className="flex flex-col md:flex-row items-center gap-0 md:gap-2">
                  <span className="hidden md:inline text-red-400 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]">HamAss</span>
                  <span className="text-white text-[10px] md:text-sm">{localHamAss}u</span>
                </div>
              </div>
            )}
            {localTouchMe > 0 && (
              <div className="bg-slate-950/80 backdrop-blur-md border border-fuchsia-500/50 p-1.5 md:px-3 md:py-1.5 rounded-lg md:rounded-xl text-xs md:text-sm font-black text-white shadow-[inset_0_0_15px_rgba(217,70,239,0.2),0_0_10px_rgba(217,70,239,0.3)] flex flex-col md:flex-row items-center gap-1 md:gap-2">
                <Image src="/sprites/touchme.png" alt="TouchMe" width={24} height={24} unoptimized className="w-5 h-5 md:w-6 md:h-6 drop-shadow-[0_0_8px_rgba(217,70,239,0.8)]" />
                <div className="flex flex-col md:flex-row items-center gap-0 md:gap-2">
                  <span className="hidden md:inline text-fuchsia-400 drop-shadow-[0_0_8px_rgba(217,70,239,0.8)]">TouchMe</span>
                  <span className="text-white text-[10px] md:text-sm">{localTouchMe}s</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Panel de Temperatura (Siempre visible) */}
        {session && (
          <EggTemperaturePanel
            sessionClicks={sessionClicks}
            cooldownTime={cooldownTime}
            timeSinceLastClick={timeSinceLastClick}
            inactivityTimeLimit={inactivityTimeLimit}
            onWatchAdClick={() => setShowAdModal(true)}
          />
        )}
        <FloatingNotifications notifications={notifications} />

        {/* Modal de Selección de País para Cuentas Nuevas */}
        <AnimatePresence>
          {showCountryModal && status === 'authenticated' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-950/95 z-[100] flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="bg-slate-900 border border-slate-700 p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl shadow-[0_0_50px_rgba(236,72,153,0.1)] max-w-md w-full text-center flex flex-col max-h-[85vh] sm:max-h-[90vh]"
              >
                <h2 className="text-lg sm:text-2xl font-black text-white uppercase tracking-widest mb-1 sm:mb-2">¡Bienvenido a Egg!</h2>
                <p className="text-slate-400 text-xs sm:text-sm mb-3 sm:mb-6">Configura tu perfil para empezar a jugar.</p>

                <div className="mb-3 sm:mb-4 text-left flex-shrink-0">
                  <label className="block text-white/70 text-xs sm:text-sm font-bold mb-1.5 sm:mb-2">Tu Nombre de Usuario</label>
                  <input
                    type="text"
                    maxLength={15}
                    value={editUsername}
                    onChange={e => { setEditUsername(e.target.value); setNameSuggestions([]); }}
                    className="w-full bg-black/40 border border-white/20 rounded-lg px-3 sm:px-4 py-2.5 sm:py-3 text-white focus:outline-none focus:border-pink-500 font-bold text-sm sm:text-base"
                  />
                  {nameSuggestions.length > 0 && (
                    <div className="mt-2 sm:mt-3">
                      <p className="text-red-400 text-xs font-bold mb-2">❌ Este nombre ya está en uso. ¿Qué tal estos?</p>
                      <div className="flex flex-wrap gap-2">
                        {nameSuggestions.map(s => (
                          <button
                            key={s}
                            onClick={() => { setEditUsername(s); setNameSuggestions([]); }}
                            className="px-3 py-1.5 bg-pink-500/20 hover:bg-pink-500/40 border border-pink-500/50 text-pink-300 rounded-lg text-xs font-bold transition-colors"
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <label className="block text-white/70 text-xs sm:text-sm font-bold mb-1.5 sm:mb-2 text-left flex-shrink-0">Moneda de la Tienda (País)</label>
                <div className="flex-1 min-h-0 overflow-y-auto mb-3 sm:mb-6 bg-slate-950/50 rounded-xl border border-slate-700 text-left custom-scrollbar scroll-smooth">
                  {[
                    { code: 'US', name: 'Estados Unidos', curr: 'USD' },
                    { code: 'CO', name: 'Colombia', curr: 'COP' },
                    { code: 'MX', name: 'México', curr: 'MXN' },
                    { code: 'AR', name: 'Argentina', curr: 'ARS' },
                    { code: 'ES', name: 'España', curr: 'EUR' },
                    { code: 'CL', name: 'Chile', curr: 'CLP' },
                    { code: 'PE', name: 'Perú', curr: 'PEN' },
                    { code: 'CR', name: 'Costa Rica', curr: 'CRC' },
                    { code: 'CU', name: 'Cuba', curr: 'CUP' },
                    { code: 'SV', name: 'El Salvador', curr: 'USD' },
                    { code: 'GT', name: 'Guatemala', curr: 'GTQ' },
                    { code: 'HN', name: 'Honduras', curr: 'HNL' },
                    { code: 'NI', name: 'Nicaragua', curr: 'NIO' },
                    { code: 'PA', name: 'Panamá', curr: 'USD' },
                    { code: 'PR', name: 'Puerto Rico', curr: 'USD' },
                    { code: 'DO', name: 'Rep. Dominicana', curr: 'DOP' },
                    { code: 'BO', name: 'Bolivia', curr: 'BOB' },
                    { code: 'BR', name: 'Brasil', curr: 'BRL' },
                    { code: 'EC', name: 'Ecuador', curr: 'USD' },
                    { code: 'PY', name: 'Paraguay', curr: 'PYG' },
                    { code: 'UY', name: 'Uruguay', curr: 'UYU' },
                    { code: 'VE', name: 'Venezuela', curr: 'VES' },
                    { code: 'GB', name: 'Reino Unido', curr: 'GBP' },
                    { code: 'CA', name: 'Canadá', curr: 'CAD' },
                    { code: 'OTHER', name: 'Otro País', curr: 'USD' }
                  ].map(c => (
                    <button
                      key={c.code}
                      onClick={() => setUserCountry(c.code as CountryCode)}
                      className={`w-full flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 border-b border-slate-800/50 last:border-0 transition-colors text-sm ${userCountry === c.code ? 'bg-pink-500/20 text-pink-400' : 'text-slate-300 hover:bg-slate-800'}`}
                    >
                      <span className="font-bold">{c.name}</span>
                      <span className={`text-[10px] sm:text-xs font-black tracking-widest px-2 py-0.5 sm:py-1 rounded-md ${userCountry === c.code ? 'bg-pink-500/30' : 'bg-slate-800 text-slate-500'}`}>
                        {c.curr}
                      </span>
                    </button>
                  ))}
                </div>

                <button
                  onClick={async () => {
                    if (!session?.user?.email || !editUsername.trim()) return;
                    const res = await fetch(`${API_URL}/api/v1/game/user/${session.user.email}/profile`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ country: userCountry, username: editUsername.trim() })
                    });
                    const data = await res.json();
                    if (data.status === 'success') {
                      setUsername(editUsername.trim());
                      setNameSuggestions([]);
                      setShowCountryModal(false);
                      reloadUser();
                    } else {
                      if (data.suggestions) {
                        setNameSuggestions(data.suggestions);
                      } else {
                        alert(data.message || 'Error guardando perfil');
                      }
                    }
                  }}
                  className="w-full flex-shrink-0 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white py-3 sm:py-4 rounded-xl font-black uppercase tracking-widest text-sm shadow-[0_0_20px_rgba(236,72,153,0.4)] transition-all active:scale-95"
                >
                  Comenzar a Jugar
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modal de Configuración de Perfil (Username) */}
        <AnimatePresence>
          {showProfileModal && status === 'authenticated' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={(e) => {
                if (e.target === e.currentTarget) setShowProfileModal(false);
              }}
              className="fixed inset-0 bg-slate-950/90 z-[9999] flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="bg-slate-900 border border-slate-700 p-6 md:p-8 rounded-3xl shadow-[0_0_50px_rgba(236,72,153,0.1)] max-w-md w-full text-center flex flex-col relative"
              >
                <button
                  onClick={() => setShowProfileModal(false)}
                  className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
                <h2 className="text-2xl font-black text-white uppercase tracking-widest mb-4 mt-2">Tu Perfil</h2>

                <div className="flex flex-col items-center bg-black/40 border border-white/10 rounded-2xl p-6 mb-6">
                  <Image src={`/sprites/ranked/${getRankInfo(totalClicks).id}.png`} alt="Rank" width={80} height={80} unoptimized className={`drop-shadow-lg ${getRankInfo(totalClicks).scaleClass} mb-3`} />
                  <div className="text-xl md:text-2xl font-black text-white uppercase tracking-wider">{getRankInfo(totalClicks).name}</div>
                  <div className="text-xs md:text-sm text-yellow-400 font-bold uppercase tracking-widest mt-2 bg-yellow-500/10 px-4 py-1.5 rounded-full border border-yellow-500/20 shadow-[0_0_10px_rgba(250,204,21,0.2)]">
                    {totalClicks.toLocaleString()} Clics Totales
                  </div>
                </div>

                <div className="mb-6 text-left">
                  <label className="block text-white/70 text-sm font-bold mb-2">Cambiar Nombre de Usuario</label>
                  <input
                    type="text"
                    maxLength={15}
                    value={editUsername}
                    onChange={e => { setEditUsername(e.target.value); setNameSuggestions([]); }}
                    className="w-full bg-black/40 border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-pink-500 font-bold"
                  />
                  {nameSuggestions.length > 0 && (
                    <div className="mt-3">
                      <p className="text-red-400 text-xs font-bold mb-2">❌ Este nombre ya está en uso. Sugerencias:</p>
                      <div className="flex flex-wrap gap-2">
                        {nameSuggestions.map(s => (
                          <button
                            key={s}
                            onClick={() => { setEditUsername(s); setNameSuggestions([]); }}
                            className="px-3 py-1.5 bg-pink-500/20 hover:bg-pink-500/40 border border-pink-500/50 text-pink-300 rounded-lg text-xs font-bold transition-colors"
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setEditUsername(username);
                      setShowProfileModal(false);
                    }}
                    className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={async () => {
                      if (!session?.user?.email || !editUsername.trim()) return;
                      const res = await fetch(`${API_URL}/api/v1/game/user/${session.user.email}/profile`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ country: userCountry, username: editUsername.trim() })
                      });
                      const data = await res.json();
                      if (data.status === 'success') {
                        setUsername(editUsername.trim());
                        setNameSuggestions([]);
                        setShowProfileModal(false);
                      } else {
                        if (data.suggestions) {
                          setNameSuggestions(data.suggestions);
                        } else {
                          alert(data.message || 'Error guardando perfil');
                        }
                      }
                    }}
                    className="flex-1 py-3 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-bold rounded-xl transition-colors"
                  >
                    Guardar
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      <StorePanel
        isOpen={isStoreOpen}
        onClose={handleCloseStore}
        userCountry={userCountry}
        eggCoins={eggCoins}
      />

      <LeaderboardPanel
        isOpen={isLeaderboardOpen}
        onClose={handleCloseLeaderboard}
      />

      <ClanModal
        isOpen={isClanOpen}
        onClose={handleCloseClan}
        userId={session?.user?.email || ''}
        userClanId={userClanId}
        userEggCoins={eggCoins}
        onClanJoined={(clanId, cost) => {
          setUserClanId(clanId);
          setEggCoins(prev => Math.max(0, prev - cost));
          reloadUser();
        }}
      />

      {session && (
        <DailySpinModal
          isOpen={isDailySpinOpen}
          onClose={closeDailySpin}
          onSpinResult={(prize) => {
            // El backend ya sumó el premio automáticamente y se sincronizó vía WS.
            // No sumamos manualmente para evitar duplicar el premio temporalmente.
          }}
          userId={session?.user?.email || ''}
          token={cachedToken.current || ''}
          forceRefresh={reloadUser}
          inventory={inventory}
        />
      )}

      {/* MODAL DE HUEVO ROTO PREMIUM (REDISEÑADO) */}
      <AnimatePresence>
        {isEggBroken && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[999] flex items-center justify-center bg-black/95 p-4 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ type: "spring", damping: 20, stiffness: 100 }}
              className="relative w-full max-w-2xl bg-slate-950/90 border-2 border-yellow-500 rounded-3xl p-8 flex flex-col items-center shadow-[0_0_50px_rgba(234,179,8,0.2)] overflow-hidden"
            >
              {/* Resplandor de fondo interno */}
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-yellow-500/10 via-transparent to-transparent pointer-events-none" />

              {/* Título e Icono principal condicional */}
              {brokenEggTab === 'info' ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full flex flex-col items-center">
                  {(() => {
                    if (status === 'unauthenticated') {
                      return (
                        <>
                          <motion.div
                            initial={{ rotate: -10, scale: 0.8 }}
                            animate={{ rotate: [0, -10, 10, -10, 10, 0], scale: [1, 1.1, 1] }}
                            transition={{ duration: 1.5, ease: "easeInOut", times: [0, 0.2, 0.4, 0.6, 0.8, 1] }}
                          >
                            <ShieldAlert className="w-16 h-16 md:w-20 md:h-20 text-yellow-500 mb-4 drop-shadow-[0_0_20px_rgba(234,179,8,0.6)]" />
                          </motion.div>
                          <h2 className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-200 to-yellow-600 mb-2 text-center uppercase tracking-widest drop-shadow-sm">
                            ¡HUEVO ROTO!
                          </h2>
                          <p className="text-yellow-200/80 text-sm md:text-lg mb-6 text-center font-medium">
                            La temporada ha finalizado.
                          </p>
                          <button
                            onClick={() => {
                              setIsLoggingIn(true);
                              signIn('google');
                            }}
                            className="w-full mb-6 py-4 bg-white hover:bg-gray-100 text-gray-900 font-bold rounded-xl transition-colors shadow-lg flex items-center justify-center gap-3 uppercase tracking-wider text-sm md:text-base"
                          >
                            <svg className="w-5 h-5 md:w-6 md:h-6" viewBox="0 0 24 24">
                              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                            </svg>
                            Iniciar sesión para ver si ganaste
                          </button>
                        </>
                      );
                    }
                    const isWinner = seasonWinners.find(w => w.user_id === (session?.user?.email || 'anon_user') || w.username === username);
                    if (isWinner) {
                      return (
                        <>
                          <motion.div
                            initial={{ rotate: -10, scale: 0.8 }}
                            animate={{ rotate: [0, -10, 10, -10, 10, 0], scale: [1, 1.1, 1] }}
                            transition={{ duration: 1.5, ease: "easeInOut", times: [0, 0.2, 0.4, 0.6, 0.8, 1] }}
                          >
                            <Trophy className="w-16 h-16 md:w-24 md:h-24 text-yellow-500 mb-4 drop-shadow-[0_0_25px_rgba(234,179,8,0.8)]" />
                          </motion.div>
                          <h2 className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-200 to-yellow-600 mb-2 text-center uppercase tracking-widest drop-shadow-sm">
                            ¡ERES UN GANADOR!
                          </h2>
                          <p className="text-yellow-400 font-bold text-sm md:text-xl mb-6 uppercase tracking-wider bg-yellow-500/10 px-4 py-1 rounded-full border border-yellow-500/50 text-center">
                            {isWinner.reason}
                          </p>
                        </>
                      );
                    } else {
                      return (
                        <>
                          <motion.div
                            initial={{ rotate: -10, scale: 0.8 }}
                            animate={{ rotate: [0, -10, 10, -10, 10, 0], scale: [1, 1.1, 1] }}
                            transition={{ duration: 1.5, ease: "easeInOut", times: [0, 0.2, 0.4, 0.6, 0.8, 1] }}
                          >
                            <ShieldAlert className="w-16 h-16 md:w-20 md:h-20 text-yellow-500 mb-4 drop-shadow-[0_0_20px_rgba(234,179,8,0.6)]" />
                          </motion.div>
                          <h2 className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-200 to-yellow-600 mb-2 text-center uppercase tracking-widest drop-shadow-sm">
                            ¡HUEVO ROTO!
                          </h2>
                          <p className="text-yellow-200/80 text-sm md:text-lg mb-6 text-center font-medium">
                            La temporada ha finalizado.
                          </p>
                        </>
                      );
                    }
                  })()}

                  <div className="w-full bg-slate-900/80 rounded-2xl p-4 md:p-6 border border-yellow-500/30 shadow-inner relative z-10 mb-6 flex flex-col items-center">
                    <span className="text-slate-400 font-black uppercase tracking-widest text-xs md:text-sm mb-4">TABLA DE GANADORES</span>
                    
                    {seasonWinners.length > 0 ? (
                      <div className="w-full overflow-x-auto rounded-xl border border-slate-700">
                        <table className="w-full text-left text-xs md:text-sm text-slate-300 min-w-[300px]">
                          <thead className="bg-slate-800 text-slate-400 uppercase tracking-wider">
                            <tr>
                              <th className="px-3 md:px-4 py-3 font-black">Jugador</th>
                              <th className="px-3 md:px-4 py-3 font-black">Posición</th>
                              <th className="px-3 md:px-4 py-3 font-black text-right">Premio</th>
                            </tr>
                          </thead>
                          <tbody>
                            {seasonWinners.map((w, idx) => (
                              <tr key={idx} className="border-t border-slate-700/50 hover:bg-slate-700/30 transition-colors">
                                <td className="px-3 md:px-4 py-3 md:py-4 font-bold text-white text-xs md:text-base">{w.username}</td>
                                <td className="px-3 md:px-4 py-3 md:py-4 text-[10px] md:text-xs font-semibold text-yellow-500">{w.reason.toUpperCase()}</td>
                                <td className="px-3 md:px-4 py-3 md:py-4 text-right font-black text-green-400 text-xs md:text-base">${w.prize_usd.toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center w-full">
                        <span className="text-2xl md:text-5xl font-black text-white truncate block">
                          {eggWinner || 'Desconocido'}
                        </span>
                      </div>
                    )}
                  </div>

                  {seasonWinners.some(w => w.user_id === (session?.user?.email || 'anon_user') || w.username === username) && (
                    <button 
                      onClick={() => setBrokenEggTab('contact')}
                      className="w-full mb-6 p-4 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white font-black rounded-2xl relative z-10 shadow-[0_0_20px_rgba(34,197,94,0.3)] hover:shadow-[0_0_30px_rgba(34,197,94,0.5)] transition-all flex items-center justify-center gap-2 uppercase tracking-widest active:scale-95 text-sm md:text-base"
                    >
                      <Trophy className="w-5 h-5 text-yellow-300" />
                      Reclamar Premio
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  )}

                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 2.0 }}
                    className="text-yellow-500/50 uppercase tracking-widest text-[10px] md:text-xs font-bold text-center relative z-10"
                  >
                    El juego está en pausa.<br />
                    Preparando la nueva temporada...
                  </motion.p>
                </motion.div>
              ) : (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="w-full flex flex-col items-center relative z-10">
                  <button 
                    onClick={() => setBrokenEggTab('info')}
                    className="absolute -top-4 left-0 text-slate-400 hover:text-white transition-colors flex items-center gap-1 text-xs font-bold uppercase tracking-widest"
                  >
                    <ChevronLeft className="w-4 h-4" /> Volver
                  </button>

                  <div className="w-full mt-6 mb-2 p-5 md:p-8 bg-green-950/40 border-2 border-green-500/50 rounded-2xl shadow-[0_0_20px_rgba(34,197,94,0.1)]">
                    <div className="flex flex-col items-center mb-6">
                      <Trophy className="w-12 h-12 md:w-16 md:h-16 text-yellow-400 mb-3 drop-shadow-[0_0_15px_rgba(234,179,8,0.5)]" />
                      <h3 className="text-green-400 font-black text-center uppercase tracking-widest text-lg md:text-xl">Reclama tu premio</h3>
                    </div>

                    {contactSubmitted ? (
                      <div className="text-center font-bold text-green-300 bg-green-900/40 p-4 rounded-xl border border-green-500/30 text-sm md:text-base">
                        ¡Datos enviados! Nos pondremos en contacto contigo pronto.
                      </div>
                    ) : (
                      <form onSubmit={submitContactInfo} className="flex flex-col gap-4 md:gap-5">
                        <div>
                          <label className="text-[10px] md:text-xs font-bold text-green-200/80 mb-2 block uppercase tracking-wider">Método de Contacto</label>
                          <input 
                            type="text" 
                            required
                            value={contactMethod}
                            onChange={(e) => setContactMethod(e.target.value)}
                            className="w-full bg-black/50 border border-green-500/30 rounded-xl px-4 py-3 md:py-4 text-white focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-400 transition-all placeholder-green-900/50 font-medium text-sm md:text-base" 
                            placeholder="Ej. Binance, PayPal, WhatsApp"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] md:text-xs font-bold text-green-200/80 mb-2 block uppercase tracking-wider">Tus Datos</label>
                          <input 
                            type="text" 
                            required
                            value={contactDetails}
                            onChange={(e) => setContactDetails(e.target.value)}
                            className="w-full bg-black/50 border border-green-500/30 rounded-xl px-4 py-3 md:py-4 text-white focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-400 transition-all placeholder-green-900/50 font-medium text-sm md:text-base" 
                            placeholder="Ej. usuario@ejemplo.com"
                          />
                        </div>
                        <button type="submit" className="mt-4 w-full bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white font-black py-4 rounded-xl transition-all shadow-[0_0_15px_rgba(34,197,94,0.3)] hover:shadow-[0_0_25px_rgba(34,197,94,0.5)] active:scale-95 uppercase tracking-wider text-sm md:text-base">
                          ENVIAR MIS DATOS
                        </button>
                      </form>
                    )}
                  </div>
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL DE CUENTA BANEADA */}
      <AnimatePresence>
        {isBanned && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-[999] flex items-center justify-center bg-black/95 p-4 backdrop-blur-md"
          >
            <div className="relative w-full max-w-lg bg-red-950/80 border-2 border-red-500 rounded-3xl p-8 flex flex-col items-center shadow-[0_0_50px_rgba(239,68,68,0.3)] text-center">
              <ShieldAlert className="w-16 h-16 text-red-500 mb-4 drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]" />
              <h2 className="text-3xl md:text-4xl font-black text-red-500 uppercase tracking-widest mb-4">
                CUENTA BANEADA
              </h2>
              <p className="text-red-200/80 text-lg mb-4">
                {banReason || "Tu cuenta ha sido suspendida permanentemente por violar los términos del servicio o utilizar herramientas no autorizadas."}
              </p>
              
              <div className="bg-red-900/50 p-4 rounded-xl border border-red-500/50 mb-6">
                <span className="text-red-300 font-bold block mb-1">Tiempo Restante:</span>
                <span className="text-2xl font-mono text-white">
                  {banExpiresAt === 'permaban' ? 'INDEFINIDO' : banTimeLeft || 'Calculando...'}
                </span>
              </div>
              
              {appealStatus === "success" ? (
                <div className="bg-green-900/50 text-green-400 border border-green-500/50 rounded-xl p-3 mb-6 w-full font-bold">
                  ¡Apelación enviada con éxito! Espera la respuesta de los administradores.
                </div>
              ) : (
                <div className="w-full mb-6 text-left">
                  <label className="block text-red-300 text-xs font-bold uppercase mb-2 ml-1">¿Crees que fue un error? Envía una apelación:</label>
                  <textarea 
                    value={appealMessage}
                    onChange={(e) => setAppealMessage(e.target.value)}
                    placeholder="Escribe tu mensaje aquí..."
                    className="w-full bg-black/50 border border-red-500/30 rounded-xl p-3 text-white placeholder-red-500/50 resize-none h-24 focus:outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400 transition-all"
                  />
                  {appealStatus === "error" && <p className="text-red-400 text-xs font-bold mt-1">Hubo un error al enviar la apelación. Intenta de nuevo.</p>}
                  <button
                    onClick={submitAppeal}
                    disabled={isAppealing || !appealMessage.trim()}
                    className="mt-2 w-full px-4 py-2 bg-red-800 hover:bg-red-700 disabled:opacity-50 text-white font-bold rounded-xl transition-colors uppercase text-sm tracking-wider"
                  >
                    {isAppealing ? "Enviando..." : "Enviar Apelación"}
                  </button>
                </div>
              )}
              
              <button
                onClick={() => signOut()}
                className="px-8 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-colors uppercase tracking-wider shadow-lg w-full"
              >
                Cerrar Sesión
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL DE DESBANEO */}
      <AnimatePresence>
        {isUnbannedModalOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 pointer-events-none"
          >
            <div className="relative w-full max-w-sm bg-green-950/90 border-2 border-green-500 rounded-3xl p-8 flex flex-col items-center shadow-[0_0_50px_rgba(34,197,94,0.4)] text-center">
              <ShieldCheck className="w-20 h-20 text-green-400 mb-4 drop-shadow-[0_0_15px_rgba(34,197,94,0.8)] animate-pulse" />
              <h2 className="text-2xl md:text-3xl font-black text-green-400 uppercase tracking-widest mb-2">
                ¡Cuenta Desbaneada!
              </h2>
              <p className="text-green-200/80 text-sm mb-4">
                Tu cuenta ha sido reactivada. ¡Vuelve a jugar!
              </p>
              
              {unbanCompensation > 0 && (
                <div className="bg-yellow-900/40 border border-yellow-500/50 rounded-xl p-3 w-full flex flex-col items-center gap-1">
                  <span className="text-yellow-500 text-xs font-bold uppercase">Compensación recibida</span>
                  <div className="flex items-center gap-2">
                    <Image src="/sprites/moneda.png" alt="Coin" width={20} height={20} className="drop-shadow-md" />
                    <span className="text-yellow-400 font-black text-xl">+{unbanCompensation}</span>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {showAdModal && (
        <VideoAdModal
          onAdComplete={handleAdComplete}
          onCancel={() => setShowAdModal(false)}
        />
      )}

      <CookieBanner />
      <TutorialModal />

      {/* Navigation Sidebar (Mobile) */}
      <div className="md:hidden fixed left-2 top-1/2 -translate-y-1/2 z-40 flex flex-col items-center gap-3 bg-slate-900/80 backdrop-blur-xl border border-white/10 p-2 rounded-full shadow-[0_0_20px_rgba(0,0,0,0.5)]">
        {/* Clan */}
        <button onClick={() => setIsClanOpen(true)} className="flex flex-col items-center gap-1 active:scale-95 transition-transform relative p-1">
          <div className="relative">
            {userClanName ? (
              <Image src={`/sprites/clan/${userClanShieldId}.png`} alt="Clan" width={28} height={28} unoptimized className={getClanTheme(userClanShieldId).dropGlow} />
            ) : (
              <Shield className="w-6 h-6 text-amber-500 drop-shadow-[0_0_5px_rgba(245,158,11,0.5)]" />
            )}
          </div>
        </button>

        <div className="w-6 h-px bg-slate-800"></div>

        {/* Botón Ranking (Móvil) */}
        <button onClick={() => setIsLeaderboardOpen(true)} className="flex flex-col items-center gap-1 active:scale-95 transition-transform relative p-1">
          <Trophy className="w-6 h-6 text-yellow-500 drop-shadow-md" />
        </button>

        <div className="w-6 h-px bg-slate-800"></div>

        {/* Casino */}
        <button onClick={() => setIsDailySpinOpen(true)} className="flex flex-col items-center gap-1 active:scale-95 transition-transform relative p-1">
          <div className="relative">
            <Image src="/sprites/moneda.png" alt="Casino" width={28} height={28} unoptimized className="drop-shadow-[0_0_10px_rgba(250,204,21,0.8)]" />
            <div className="absolute inset-0 bg-yellow-400/30 rounded-full animate-ping opacity-50 blur-[2px]"></div>
          </div>
          {(isUserLoaded && session && inventory?.spin_tracker_date !== currentUTCDateString) && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-ping shadow-[0_0_5px_rgba(239,68,68,1)]"></span>
          )}
        </button>

        <div className="w-6 h-px bg-slate-800"></div>

        {status === 'authenticated' && (
          <>
            {/* Perfil */}
            <button onClick={() => { setEditUsername(username); setNameSuggestions([]); setShowProfileModal(true); }} className="flex flex-col items-center gap-1 active:scale-95 transition-transform p-1">
              <Settings className="w-6 h-6 text-slate-300 drop-shadow-md" />
            </button>

            <div className="w-6 h-px bg-slate-800"></div>

            {/* Salir */}
            <button onClick={() => signOut()} className="flex flex-col items-center gap-1 active:scale-95 transition-transform text-red-500/80 hover:text-red-400 p-1">
              <LogOut className="w-6 h-6 drop-shadow-md" />
            </button>
          </>
        )}
      </div>

      {/* Footer para enlaces legales de AdSense */}
      <footer className="fixed bottom-0 w-full text-center py-1 sm:py-2 bg-black/50 text-[10px] sm:text-xs text-gray-500 z-[50] backdrop-blur-sm pointer-events-none">
        <div className="pointer-events-auto inline-flex gap-4">
          <Link href="/privacy" className="hover:text-yellow-400 transition-colors">Privacidad</Link>
          <Link href="/terms" className="hover:text-yellow-400 transition-colors">Términos</Link>
          <Link href="/about" className="hover:text-yellow-400 transition-colors">Reglas</Link>
        </div>
      </footer>

      {/* MODAL DE NUEVA TEMPORADA */}
      <AnimatePresence>
        {showNewSeasonModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[999] flex items-center justify-center bg-black/95 p-4 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.8, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: "spring", damping: 20, stiffness: 100 }}
              className="relative w-full max-w-xl bg-slate-950/90 border-2 border-yellow-500 rounded-3xl p-8 flex flex-col items-center shadow-[0_0_50px_rgba(234,179,8,0.2)] overflow-hidden"
            >
              {/* Resplandor de fondo interno */}
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-yellow-500/10 via-transparent to-transparent pointer-events-none" />

              <button 
                onClick={() => setShowNewSeasonModal(false)}
                className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors z-10"
              >
                <X size={28} />
              </button>
              
              <motion.div
                initial={{ rotate: -10, scale: 0.8 }}
                animate={{ rotate: [0, -10, 10, -10, 10, 0], scale: [1, 1.1, 1] }}
                transition={{ duration: 1.5, ease: "easeInOut", times: [0, 0.2, 0.4, 0.6, 0.8, 1] }}
              >
                <Trophy className="w-20 h-20 text-yellow-500 mb-4 drop-shadow-[0_0_20px_rgba(234,179,8,0.6)]" />
              </motion.div>

              <h2 className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-200 to-yellow-600 mb-2 uppercase tracking-widest text-center drop-shadow-sm">
                ¡NUEVA TEMPORADA!
              </h2>
              <p className="text-yellow-200/80 text-sm md:text-lg mb-6 text-center font-medium">
                Una nueva era ha comenzado. ¡Prepara tus dedos y compite!
              </p>

              <div className="w-full bg-slate-900/80 rounded-2xl p-4 md:p-6 border border-yellow-500/30 shadow-inner relative z-10">
                <div className="flex flex-col items-center justify-center mb-4 pb-4 border-b border-yellow-500/20">
                  <span className="text-slate-400 font-black uppercase tracking-widest text-xs mb-1">PREMIO BASE INICIAL</span>
                  <span className="text-4xl md:text-5xl font-black text-green-400 drop-shadow-[0_0_10px_rgba(74,222,128,0.4)]">
                    {formatCurrency(baseUsdPrize, userCountry)}
                  </span>
                </div>

                <div className="flex flex-col items-center text-center">
                  <span className="inline-block px-3 py-1 rounded-full bg-yellow-500/20 border border-yellow-500/50 text-yellow-400 font-bold uppercase tracking-widest text-[10px] md:text-xs mb-3">
                    MODO: {seasonMode.replace('_', ' ')}
                  </span>
                  
                  <p className="text-sm md:text-base text-slate-300 leading-relaxed font-medium">
                    {seasonMode === 'ganador_absoluto' && (
                      <>El jugador que dé el <span className="text-yellow-400 font-bold">golpe de gracia definitivo</span> se llevará el <span className="text-green-400 font-bold">100% del premio</span>.</>
                    )}
                    {seasonMode === 'carrera_clicks' && (
                      <>El premio se dividirá entre los 3 jugadores que den <span className="text-yellow-400 font-bold">más clics durante toda la temporada</span>: <br/><br/>
                      <span className="text-green-400 font-bold">50%</span> al 1er puesto, <span className="text-green-400 font-bold">30%</span> al 2do y <span className="text-green-400 font-bold">20%</span> al 3ro.</>
                    )}
                    {seasonMode === 'el_golpe' && (
                      <>El que dé el <span className="text-yellow-400 font-bold">golpe de gracia</span> se lleva el <span className="text-green-400 font-bold">50% del premio</span>. <br/><br/>
                      El otro 50% se reparte entre los 2 que <span className="text-yellow-400 font-bold">más clics den</span> (<span className="text-green-400 font-bold">30%</span> al 1ro, <span className="text-green-400 font-bold">20%</span> al 2do).</>
                    )}
                  </p>
                </div>
              </div>

              <button 
                onClick={() => setShowNewSeasonModal(false)}
                className="mt-8 w-full py-4 bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-slate-950 font-black text-xl rounded-2xl transition-all shadow-[0_0_20px_rgba(234,179,8,0.4)] hover:shadow-[0_0_30px_rgba(234,179,8,0.6)] active:scale-95 uppercase tracking-wider"
              >
                ¡A Romper el Huevo!
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
