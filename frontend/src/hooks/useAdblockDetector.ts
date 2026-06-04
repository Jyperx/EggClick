'use client';

import { useState, useEffect } from 'react';

export function useAdblockDetector() {
  const [hasAdblock, setHasAdblock] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const checkAdblock = async () => {
      try {
        // Hacemos un fetch a una URL que todos los adblockers bloquean por defecto
        const res = await fetch('https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js', {
          method: 'HEAD',
          mode: 'no-cors',
          cache: 'no-store'
        });
        
        // Si no lanza error, el fetch pasó (aunque sea opaco por no-cors)
        if (isMounted) setHasAdblock(false);
      } catch (error) {
        // Si el fetch falla de inmediato, fue bloqueado a nivel de red por el adblocker
        if (isMounted) setHasAdblock(true);
      }
    };

    // Revisar después de un momento para asegurar que las extensiones cargaron
    const timer = setTimeout(checkAdblock, 1500);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, []);

  return hasAdblock;
}
