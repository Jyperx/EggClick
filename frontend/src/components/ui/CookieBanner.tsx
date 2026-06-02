'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export function CookieBanner() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Verificar si el usuario ya aceptó las cookies previamente
    const consent = localStorage.getItem('cookie_consent');
    if (!consent) {
      setShowBanner(true);
    }
  }, []);

  const acceptCookies = () => {
    localStorage.setItem('cookie_consent', 'true');
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 w-full bg-gray-900 border-t border-gray-800 p-4 z-50 shadow-2xl">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-gray-300 text-sm flex-1">
          Utilizamos cookies y almacenamiento local para mantener tu sesión activa, sincronizar tu progreso y ofrecer anuncios relevantes. Al continuar utilizando este sitio web, aceptas nuestro uso de cookies de acuerdo con nuestra{' '}
          <Link href="/privacy" className="text-yellow-500 hover:text-yellow-400 underline">
            Política de Privacidad
          </Link>.
        </div>
        <div className="flex-shrink-0">
          <button 
            onClick={acceptCookies}
            className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-2 px-6 rounded-lg transition-colors whitespace-nowrap"
          >
            Aceptar y Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
