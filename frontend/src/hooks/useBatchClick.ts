import { useState, useRef, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { getDeviceFingerprint } from "../lib/fingerprint";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export function useBatchClick(
  flushInterval: number = 2000,
  onUpdate?: (coins: number, inventory?: any) => void,
  inventory?: Record<string, any>,
  reloadUser?: () => void,
  userWsRef?: React.MutableRefObject<WebSocket | null>,
  isEggBroken?: boolean,
) {
  const clicksToFlush = useRef(0);
  const frozenClicksToFlush = useRef(0);
  const overheatPenaltyClicksToFlush = useRef(0);
  const overheatClicksBuffer = useRef(0);
  const [showOverheatWarning, setShowOverheatWarning] = useState(false);
  const usedIceHandsInBatch = useRef(0);
  const { data: session, status } = useSession();
  const cachedToken = useRef<string | null>(null);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  // Cachear el token JWT al inicio para que esté disponible en síncrono (ej. beforeunload)
  useEffect(() => {
    if (session?.user?.email) {
      fetch("/api/auth/token")
        .then((res) => res.json())
        .then((data) => {
          if (data.token) {
            cachedToken.current = data.token;
          }
        })
        .catch(console.error);
    }
  }, [session]);

  const fingerprintRef = useRef<string>("unknown");

  useEffect(() => {
    getDeviceFingerprint().then((fp) => (fingerprintRef.current = fp));
  }, []);

  // Mecánica de Sobrecalentamiento
  const [sessionClicks, setSessionClicks] = useState(0);
  const [timeSinceLastClick, setTimeSinceLastClick] = useState(0);
  const [cooldownTime, setCooldownTime] = useState(0);
  const [isFrozen, setIsFrozen] = useState(false);
  const [freezeTimeLeft, setFreezeTimeLeft] = useState(0);

  const consumeMultipliersVisually = (generatedClicks: number) => {
    if (generatedClicks <= 0) return;
    setLocalHamAss((p) => {
      const toUse = Math.min(p, generatedClicks);
      return Math.max(0, p - toUse);
    });
    setLocalMartillo((p) => {
      if (localHamAss === 0) {
        const toUse = Math.min(p, generatedClicks);
        return Math.max(0, p - toUse);
      }
      return p;
    });
  };

  // Manejador del timer de congelamiento
  useEffect(() => {
    if (freezeTimeLeft > 0) {
      setIsFrozen(true);
      const timer = setTimeout(() => {
        setFreezeTimeLeft((prev) => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      setIsFrozen(false);
    }
  }, [freezeTimeLeft]);

  const [localMartillo, setLocalMartillo] = useState(0);
  const [localIceHand, setLocalIceHand] = useState(0);
  const [localHamAss, setLocalHamAss] = useState(0);
  const [localTouchMe, setLocalTouchMe] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const usedTouchMeSecondsInBatch = useRef(0);

  const prevServerIce = useRef(0);
  useEffect(() => {
    const serverUses = inventory?.ice_hand_uses || 0;
    const delta = serverUses - prevServerIce.current;
    if (delta > 0) {
      setLocalIceHand((prev) => prev + delta);
    }
    prevServerIce.current = serverUses;
  }, [inventory?.ice_hand_uses]);

  const prevServerMartillo = useRef(0);
  useEffect(() => {
    const serverUses = inventory?.martillo_uses || 0;
    const delta = serverUses - prevServerMartillo.current;
    if (delta > 0) {
      setLocalMartillo((prev) => prev + delta);
    }
    prevServerMartillo.current = serverUses;
  }, [inventory?.martillo_uses]);

  const prevServerHamAss = useRef(0);
  useEffect(() => {
    const serverUses = inventory?.hamass_uses || 0;
    const delta = serverUses - prevServerHamAss.current;
    if (delta > 0) {
      setLocalHamAss((prev) => prev + delta);
    }
    prevServerHamAss.current = serverUses;
  }, [inventory?.hamass_uses]);

  const prevServerTouchMe = useRef(0);
  useEffect(() => {
    const serverSecs = inventory?.touchme_seconds || 0;
    const delta = serverSecs - prevServerTouchMe.current;
    if (delta > 0) {
      setLocalTouchMe((prev) => prev + delta);
    }
    prevServerTouchMe.current = serverSecs;
  }, [inventory?.touchme_seconds]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isHolding && localTouchMe > 0 && !isEggBroken) {
      const lastTouchTick = Date.now();
      let prevTick = lastTouchTick;

      timer = setInterval(() => {
        const now = Date.now();
        const deltaSecs = (now - prevTick) / 1000;

        if (deltaSecs >= 0.25) {
          setLocalTouchMe((prev) => {
            const actualSecs = Math.min(deltaSecs, prev);
            if (actualSecs > 0) {
              usedTouchMeSecondsInBatch.current += actualSecs;
              prevTick += actualSecs * 1000;
              
              setSessionClicks((prevSession) => {
                if (freezeTimeLeft > 0) return prevSession;
                const getHighestThreshold = (c: number) => Math.floor(c / 200) * 200;
                let finalClicks = prevSession + (actualSecs * 20);
                
                if (finalClicks % 200 >= 190 && localIceHand > 0) {
                  usedIceHandsInBatch.current += 1;
                  setLocalIceHand((p) => Math.max(0, p - 1));
                  setFreezeTimeLeft(5);
                  finalClicks = getHighestThreshold(finalClicks);
                  setTimeout(() => window.dispatchEvent(new Event("force_flush_egg_clicks")), 0);
                } else {
                  const oldThresh = getHighestThreshold(prevSession);
                  const newThresh = getHighestThreshold(finalClicks);
                  if (newThresh > oldThresh) {
                    const penaltyMap: Record<number, number> = {
                      1400: 300, 1200: 160, 1000: 80, 800: 40, 600: 20, 400: 10, 200: 5,
                    };
                    const penalty = penaltyMap[newThresh] || 0;
                    if (penalty > 0) {
                      setTimeout(() => {
                        setCooldownTime(penalty);
                        const storageKey = `egg_cooldown_end_${session?.user?.email || 'anon'}`;
                        localStorage.setItem(storageKey, (Date.now() + penalty * 1000).toString());
                        window.dispatchEvent(new Event("force_flush_egg_clicks"));
                      }, 0);
                    }
                  }
                }
                return finalClicks;
              });
              
              return Number((prev - actualSecs).toFixed(2));
            }
            clearInterval(timer);
            return 0;
          });
        }
      }, 250);
    }
    return () => clearInterval(timer);
  }, [isHolding, isEggBroken]);

  const registerClick = (isAuto: boolean = false) => {
    if (status === "unauthenticated") {
      setShowLoginPrompt(true);
      setTimeout(() => setShowLoginPrompt(false), 2000);
      return false;
    }

    // Si está quemado (en cooldown), no permite clics y castiga clics manuales excesivos
    if (cooldownTime > 0) {
      if (!isAuto) {
        overheatClicksBuffer.current += 1;
        // Margen de gracia: 5 clics
        if (overheatClicksBuffer.current > 5) {
          const penaltySecs = 10;
          setCooldownTime(prev => prev + penaltySecs);

          const storageKey = `egg_cooldown_end_${session?.user?.email || 'anon'}`;
          const stored = localStorage.getItem(storageKey);
          const currentEnd = stored ? parseInt(stored) : Date.now();
          localStorage.setItem(storageKey, (currentEnd + penaltySecs * 1000).toString());

          overheatPenaltyClicksToFlush.current += 1;

          setShowOverheatWarning(true);
          setTimeout(() => setShowOverheatWarning(false), 2000);

          // Forzar envío para que el servidor lo sepa
          setTimeout(() => window.dispatchEvent(new Event("force_flush_egg_clicks")), 0);
        }
      }
      return false;
    } else {
      overheatClicksBuffer.current = 0; // Resetear buffer si no está quemado
    }

    if (!isAuto) {
      lastActivityTimestamp.current = Date.now();
      setTimeSinceLastClick(0);
      clicksToFlush.current += 1;
      consumeMultipliersVisually(1);

      setSessionClicks((prevSession) => {
        if (freezeTimeLeft > 0) {
          frozenClicksToFlush.current += 1;
          return prevSession;
        }

        const getHighestThreshold = (c: number) => Math.floor(c / 200) * 200;
        const newClicks = prevSession + 1;
        let finalClicks = newClicks;

        if (newClicks % 200 >= 190 && localIceHand > 0) {
          usedIceHandsInBatch.current += 1;
          setLocalIceHand((p) => Math.max(0, p - 1));
          setFreezeTimeLeft(5);
          finalClicks = getHighestThreshold(newClicks);

          setTimeout(() => {
            window.dispatchEvent(new Event("force_flush_egg_clicks"));
          }, 0);
        } else {
          const oldThresh = getHighestThreshold(prevSession);
          const newThresh = getHighestThreshold(newClicks);

          if (newThresh > oldThresh) {
            const penaltyMap: Record<number, number> = {
              1400: 300, 1200: 160, 1000: 80, 800: 40, 600: 20, 400: 10, 200: 5,
            };
            const penalty = penaltyMap[newThresh] || 0;

            setTimeout(() => {
              setCooldownTime(penalty);
              const storageKey = `egg_cooldown_end_${session?.user?.email || 'anon'}`;
              localStorage.setItem(storageKey, (Date.now() + penalty * 1000).toString());
              window.dispatchEvent(new Event("force_flush_egg_clicks"));
            }, 0);
          }
        }

        const sessionKey = `egg_session_clicks_${session?.user?.email || 'anon'}`;
        localStorage.setItem(sessionKey, finalClicks.toString());
        return finalClicks;
      });
    }

    return true;
  };

  // Manejo del contador regresivo de castigo
  useEffect(() => {
    if (cooldownTime <= 0) {
      return;
    }
    const timer = setInterval(() => {
      setCooldownTime((prev) => {
        if (prev <= 1) {
          console.log(
            `[⏱️ TICK] Cooldown finalizado locally (0s). Huevo listo para clicks.`,
          );
          const storageKey = `egg_cooldown_end_${session?.user?.email || 'anon'}`;
          localStorage.removeItem(storageKey);
          return 0;
        }
        console.log(
          `[🔥 COOLDOWN TICK] Huevo sobrecalentado. Tiempo restante local: ${prev - 1}s`,
        );
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownTime, sessionClicks]);

  // Autoclicker local state
  const [isAutoclicking, setIsAutoclicking] = useState(false);
  const [localAutoclicker, setLocalAutoclicker] = useState(0);
  const usedAutoclickerSecondsInBatch = useRef(0);

  const prevServerAutoclicker = useRef(0);
  useEffect(() => {
    const serverSeconds = inventory?.autoclicker_seconds || 0;
    const delta = serverSeconds - prevServerAutoclicker.current;
    if (delta > 0) {
      setLocalAutoclicker((prev) => prev + delta);
    }
    prevServerAutoclicker.current = serverSeconds;
  }, [inventory?.autoclicker_seconds]);

  const lastAutoclickerTick = useRef(Date.now());

  useEffect(() => {
    if (localAutoclicker > 0 && cooldownTime <= 0 && !isEggBroken) {
      setIsAutoclicking(true);
      lastAutoclickerTick.current = Date.now();

      const timer = setInterval(() => {
        const now = Date.now();
        const deltaSecs = (now - lastAutoclickerTick.current) / 1000;

        if (deltaSecs >= 0.5) {
          setLocalAutoclicker((prev) => {
            const actualSecs = Math.min(deltaSecs, prev);
            if (actualSecs > 0) {
              usedAutoclickerSecondsInBatch.current += actualSecs;
              consumeMultipliersVisually(actualSecs * 2);
              lastActivityTimestamp.current = Date.now();
              setTimeSinceLastClick(0);
              
              setSessionClicks((prevSession) => {
                if (freezeTimeLeft > 0) return prevSession;
                const getHighestThreshold = (c: number) => Math.floor(c / 200) * 200;
                let finalClicks = prevSession + (actualSecs * 2);
                
                if (finalClicks % 200 >= 190 && localIceHand > 0) {
                  usedIceHandsInBatch.current += 1;
                  setLocalIceHand((p) => Math.max(0, p - 1));
                  setFreezeTimeLeft(5);
                  finalClicks = getHighestThreshold(finalClicks);
                  setTimeout(() => window.dispatchEvent(new Event("force_flush_egg_clicks")), 0);
                } else {
                  const oldThresh = getHighestThreshold(prevSession);
                  const newThresh = getHighestThreshold(finalClicks);
                  if (newThresh > oldThresh) {
                    const penaltyMap: Record<number, number> = {
                      1400: 300, 1200: 160, 1000: 80, 800: 40, 600: 20, 400: 10, 200: 5,
                    };
                    const penalty = penaltyMap[newThresh] || 0;
                    if (penalty > 0) {
                      setTimeout(() => {
                        setCooldownTime(penalty);
                        const storageKey = `egg_cooldown_end_${session?.user?.email || 'anon'}`;
                        localStorage.setItem(storageKey, (Date.now() + penalty * 1000).toString());
                        window.dispatchEvent(new Event("force_flush_egg_clicks"));
                      }, 0);
                    }
                  }
                }
                return finalClicks;
              });
            }

            lastAutoclickerTick.current += actualSecs * 1000;
            return Number((prev - actualSecs).toFixed(2));
          });
        }
      }, 500);
      return () => {
        clearInterval(timer);
        setIsAutoclicking(false);
      };
    } else {
      setIsAutoclicking(false);
    }
  }, [localAutoclicker, cooldownTime, freezeTimeLeft, session?.user?.email, isEggBroken]);

  const latestFetchId = useRef(0);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (
        clicksToFlush.current > 0 ||
        frozenClicksToFlush.current > 0 ||
        usedAutoclickerSecondsInBatch.current > 0 ||
        usedTouchMeSecondsInBatch.current > 0 ||
        bypassTokenPending.current
      ) {
        const batch = clicksToFlush.current;
        const frozenBatch = frozenClicksToFlush.current;
        const penaltyBatch = overheatPenaltyClicksToFlush.current;
        const usedIce = usedIceHandsInBatch.current;
        const usedAuto = usedAutoclickerSecondsInBatch.current;
        const usedTouch = usedTouchMeSecondsInBatch.current;
        const bypass = bypassTokenPending.current;
        const userId = session?.user?.email || "anon_user";
        const ts = Date.now();

        const data = JSON.stringify({
          user_id: userId,
          clicks: batch,
          frozen_clicks: frozenBatch,
          overheat_penalty_clicks: penaltyBatch,
          timestamp: ts,
          used_ice_hands: usedIce,
          used_autoclicker_seconds: usedAuto,
          used_touchme_seconds: usedTouch,
          bypass_cooldown_token: bypass,
          jwt_token: cachedToken.current,
        });

        localStorage.setItem(`pending_egg_batch_${userId}`, data);
        if (cachedToken.current) {
          fetch(`${API_URL}/api/v1/clicks/`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${cachedToken.current}`,
            },
            body: data,
            keepalive: true,
          }).catch(() => { });
        } else {
          navigator.sendBeacon(
            `${API_URL}/api/v1/clicks/beacon`,
            new Blob([data], { type: "text/plain" }),
          );
        }
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        console.log("[🛡️ ANESTHESIA] Pestaña oculta. Forzando guardado sincrónico.");
        flushBatch(true);
      } else {
        // Al regresar a la pestaña, evitamos que se penalice inmediatamente por inactividad
        lastActivityTimestamp.current = Date.now();
        if (clicksToFlush.current > 0 || frozenClicksToFlush.current > 0) {
          flushBatch(true);
        }
      }
    };
    window.addEventListener("visibilitychange", handleVisibility);

    const flushBatch = (isForce = false) => {
      if (
        clicksToFlush.current > 0 ||
        frozenClicksToFlush.current > 0 ||
        overheatPenaltyClicksToFlush.current > 0 ||
        usedAutoclickerSecondsInBatch.current > 0 ||
        usedTouchMeSecondsInBatch.current > 0 ||
        bypassTokenPending.current
      ) {
        const batch = clicksToFlush.current;
        const frozenBatch = frozenClicksToFlush.current;
        const penaltyBatch = overheatPenaltyClicksToFlush.current;
        const usedIce = usedIceHandsInBatch.current;
        const usedAuto = usedAutoclickerSecondsInBatch.current;
        const usedTouch = usedTouchMeSecondsInBatch.current;
        const bypass = bypassTokenPending.current;

        const userId = session?.user?.email || "anon_user";
        const currentFetchId = ++latestFetchId.current;

        if (!cachedToken.current) return;

        const payload = {
          user_id: userId,
          clicks: batch,
          frozen_clicks: frozenBatch,
          overheat_penalty_clicks: penaltyBatch,
          timestamp: currentFetchId,
          jwt_token: cachedToken.current,
          used_ice_hands: usedIce,
          used_autoclicker_seconds: usedAuto,
          used_touchme_seconds: usedTouch,
          bypass_cooldown_token: bypass,
          device_fingerprint: fingerprintRef.current,
        };

        // GUARANTEED DELIVERY: Guardar en localStorage ANTES de enviar. 
        // Si el usuario recarga, el lote no se pierde. syncServerState lo limpiará.
        localStorage.setItem(`pending_egg_batch_${userId}`, JSON.stringify(payload));

        console.log(
          `[🚀 FLUSH] Enviando lote al servidor -> Manuales: ${batch}, Automáticos: ${usedAuto}s, Helados: ${frozenBatch}`,
        );

        if (
          userWsRef?.current &&
          userWsRef.current.readyState === WebSocket.OPEN
        ) {
          userWsRef.current.send(
            JSON.stringify({ type: "click_batch", batch: payload }),
          );

          clicksToFlush.current = 0;
          frozenClicksToFlush.current = 0;
          overheatPenaltyClicksToFlush.current = 0;
          usedIceHandsInBatch.current = 0;
          usedAutoclickerSecondsInBatch.current = 0;
          usedTouchMeSecondsInBatch.current = 0;
          bypassTokenPending.current = null;
        } else {
          // Fallback HTTP si WS está cerrado o no disponible
          fetch(`${API_URL}/api/v1/clicks/`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${cachedToken.current}`,
            },
            body: JSON.stringify(payload),
            keepalive: true,
          })
            .then(() => {
              clicksToFlush.current = 0;
              frozenClicksToFlush.current = 0;
              overheatPenaltyClicksToFlush.current = 0;
              usedIceHandsInBatch.current = 0;
              usedAutoclickerSecondsInBatch.current = 0;
              usedTouchMeSecondsInBatch.current = 0;
              bypassTokenPending.current = null;
            })
            .catch(console.error);
        }
      }
    };

    const interval = setInterval(flushBatch, flushInterval);

    // Creamos un manejador intermedio para que el objeto Event no choque con el parámetro isForce
    const handleForceFlush = () => flushBatch();

    window.addEventListener("force_flush_egg_clicks", handleForceFlush);

    return () => {
      clearInterval(interval);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("force_flush_egg_clicks", handleForceFlush);
    };
  }, [flushInterval, onUpdate, session]);

  const bypassTokenPending = useRef<string | null>(null);
  const lastBypassTimestamp = useRef<number>(0);

  const resetCooldown = (token?: string) => {
    setCooldownTime(0);
    setSessionClicks(0);
    const storageKey = `egg_cooldown_end_${session?.user?.email || 'anon'}`;
    localStorage.removeItem(storageKey);
    lastBypassTimestamp.current = Date.now();
    if (token) {
      bypassTokenPending.current = token;
    }
  };

  // Inicializamos el Shadow-State completo de temperatura para evitar el "Flicker a 0°"
  useEffect(() => {
    const userKey = session?.user?.email || 'anon';
    const storedCooldown = localStorage.getItem(`egg_cooldown_end_${userKey}`);
    if (storedCooldown) {
      const endTime = parseInt(storedCooldown);
      const remaining = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
      if (remaining > 0) {
        setCooldownTime(remaining);
      } else {
        localStorage.removeItem(`egg_cooldown_end_${userKey}`);
      }
    } else {
      setCooldownTime(0);
    }

    const storedSessionClicks = localStorage.getItem(`egg_session_clicks_${userKey}`);
    if (storedSessionClicks) {
      setSessionClicks(parseInt(storedSessionClicks));
    } else {
      setSessionClicks(0);
    }

    const storedInactivity = localStorage.getItem(`egg_inactivity_${userKey}`);
    if (storedInactivity) {
      setTimeSinceLastClick(parseInt(storedInactivity));
    } else {
      setTimeSinceLastClick(0);
    }
  }, [session?.user?.email]);

  // Sincronizar el tiempo de inactividad real desde el servidor al cargar
  // Ya no usamos parsing de fechas para evitar problemas de desincronización del reloj del PC
  useEffect(() => {
    // Este useEffect se mantiene solo por compatibilidad, pero la inicialización real viene de syncServerState
  }, []);

  const getInactivityTimeout = (clicks: number) => {
    if (clicks >= 1400) return 1800;
    if (clicks >= 1200) return 1200;
    if (clicks >= 1000) return 600;
    if (clicks >= 800) return 300;
    if (clicks >= 600) return 120;
    if (clicks >= 400) return 60;
    if (clicks >= 200) return 30;
    return 15;
  };

  const inactivityTimeLimit = getInactivityTimeout(sessionClicks);

  const lastActivityTimestamp = useRef<number>(Date.now());

  useEffect(() => {
    if (sessionClicks === 0) {
      setTimeSinceLastClick(0);
      return;
    }
    const timer = setInterval(() => {
      // Usamos Date.now() para que no se pause si el usuario cambia de pestaña (throttling del navegador)
      const now = Date.now();
      const secondsInactive = Math.floor(
        (now - lastActivityTimestamp.current) / 1000,
      );

      setTimeSinceLastClick((prev) => {
        // PREVENIR INACTIVIDAD SI AUTOCLICKER ESTA CORRIENDO
        if (localAutoclicker > 0) {
          lastActivityTimestamp.current = Date.now();
          return 0;
        }

        if (secondsInactive >= inactivityTimeLimit && cooldownTime <= 0) {
          console.log(
            `[⏱️ INACTIVO] Inactividad superada (${secondsInactive}s >= ${inactivityTimeLimit}s). Reseteando huevo a 0.`,
          );
          setSessionClicks(0); // El huevo se enfrió por inactividad
          const userKey = session?.user?.email || 'anon';
          localStorage.removeItem(`egg_session_clicks_${userKey}`);
          localStorage.removeItem(`egg_inactivity_${userKey}`);
          return 0;
        }
        if (secondsInactive !== prev) {
          console.log(
            `[⏱️ INACTIVO TICK] Segundos inactivos: ${secondsInactive}s (Límite: ${inactivityTimeLimit}s)`,
          );
        }
        const userKey = session?.user?.email || 'anon';
        localStorage.setItem(`egg_inactivity_${userKey}`, secondsInactive.toString());
        return secondsInactive;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [sessionClicks, cooldownTime, inactivityTimeLimit]);

  // Este useEffect se mantiene solo por compatibilidad
  // El verdadero Shadow-State se carga arriba y se sobreescribe con syncServerState

  const syncServerState = useCallback(
    (
      serverSessionClicks: number,
      serverCooldownTime: number,
      serverTimeSinceLastClick: number = 0,
    ) => {
      console.log(
        `[🌐 WS RECV] Recibido estado del servidor -> Clics: ${serverSessionClicks}, Cooldown: ${serverCooldownTime}s, Inactividad: ${serverTimeSinceLastClick}s`,
      );

      // El servidor nos confirmó que procesó el estado. Limpiamos el respaldo.
      const batchUserKey = session?.user?.email || 'anon_user';
      localStorage.removeItem(`pending_egg_batch_${batchUserKey}`);

      // Comparamos el tiempo local con el del servidor para evitar saltos locos
      const localTimeSinceLastClick = Math.floor((Date.now() - lastActivityTimestamp.current) / 1000);
      let finalTimeSinceLastClick = localTimeSinceLastClick;

      // Si el servidor dice que estamos MUCHO menos inactivos (ej: click en otro dispositivo),
      // adoptamos el valor del servidor.
      // Si la diferencia es pequeña (<= 3s), es solo lag de confirmación de nuestro último click,
      // así que mantenemos el valor local para no resetear el timer visualmente.
      if (localTimeSinceLastClick - serverTimeSinceLastClick > 3) {
        finalTimeSinceLastClick = serverTimeSinceLastClick;
      }

      // Actualizamos el timestamp de inactividad basándonos en el valor final decidido
      lastActivityTimestamp.current = Date.now() - finalTimeSinceLastClick * 1000;

      setSessionClicks((prev) => {
        // Si el servidor nos dice que tenemos 0, es un reseteo estricto por inactividad o cooldown expirado
        // EXCEPCIÓN: Si tenemos clics locales pendientes por enviar (clicksToFlush > 0), el servidor está leyendo un estado viejo
        if (serverSessionClicks === 0) {
          if (clicksToFlush.current > 0) {
            console.log(
              "[🛡️ ANESTHESIA] Ignorando reseteo a 0 del servidor porque hay clics locales sin enviar.",
            );
            return prev;
          }
          // Limpiamos la cola de clicks pendientes manuales para no resucitar la temperatura
          clicksToFlush.current = 0;
          return 0;
        }
        // Anestesia de saltos: Si el servidor envía un valor menor (ej. lectura sucia de game.py antes de que el worker procese)
        // Mantenemos el mayor para evitar que la barra retroceda visualmente
        return Math.max(prev, serverSessionClicks);
      });

      setCooldownTime((prev) => {
        // Si acabamos de resetear el cooldown (hace menos de 5 segs), ignoramos los paquetes viejos
        if (Date.now() - lastBypassTimestamp.current < 5000 && serverCooldownTime > 0) {
          return 0;
        }

        if (serverCooldownTime === 0 && prev > 0) {
          console.log(
            `[🛡️ ANESTHESIA] Manteniendo cooldown local (${prev}s) a pesar de que el servidor reporta 0 (posible lag).`,
          );
          return prev;
        }

        let newCooldown = serverCooldownTime || 0;

        // Evita saltos locos por respuestas desordenadas o lag del worker ARQ
        if (serverCooldownTime > 0 && prev > 0) {
          // Solo actualizamos si el server reporta un tiempo significativamente mayor
          // (lo que indicaría que se sumó una nueva penalidad por clics extra)
          if (serverCooldownTime > prev + 3) {
            newCooldown = serverCooldownTime;
          } else {
            newCooldown = prev;
          }
        }

        const userKey = session?.user?.email || 'anon';
        if (newCooldown > 0) {
          localStorage.setItem(
            `egg_cooldown_end_${userKey}`,
            (Date.now() + newCooldown * 1000).toString(),
          );
        } else {
          localStorage.removeItem(`egg_cooldown_end_${userKey}`);
        }

        return newCooldown;
      });

      setTimeSinceLastClick(finalTimeSinceLastClick);

      const userKey = session?.user?.email || 'anon';
      localStorage.setItem(
        `egg_session_clicks_${userKey}`,
        serverSessionClicks.toString(),
      );
      localStorage.setItem(
        `egg_inactivity_${userKey}`,
        finalTimeSinceLastClick.toString(),
      );
    },
    [session?.user?.email],
  );

  return {
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
    localIceHand,
    localTouchMe,
    setIsHolding,
    resetCooldown,
    timeSinceLastClick,
    inactivityTimeLimit,
    syncServerState,
    showOverheatWarning,
    cachedToken,
  };
}
