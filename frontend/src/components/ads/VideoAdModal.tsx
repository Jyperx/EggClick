'use client';
import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface VideoAdModalProps {
  onAdComplete: () => void;
  onCancel: () => void;
}

export function VideoAdModal({ onAdComplete, onCancel }: VideoAdModalProps) {
  const [hasStarted, setHasStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(15); // Simulación de 15 segundos
  const [canClose, setCanClose] = useState(false);
  const [loading, setLoading] = useState(false);
  const { data: session } = useSession();

  const startAd = () => {
    setHasStarted(true);
  };

  useEffect(() => {
    if (hasStarted && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (hasStarted && timeLeft <= 0) {
      setCanClose(true);
    }
  }, [hasStarted, timeLeft]);

  const handleFinish = async () => {
    if (!canClose) return;
    setLoading(true);
    try {
      onAdComplete(); // Avisar al componente padre que se vio el anuncio
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95">
      <div className="bg-gray-900 border border-gray-700 rounded-xl max-w-lg w-full p-6 text-center shadow-2xl relative mx-4">
        
        {/* Simulación del "Video" */}
        <div className="w-full aspect-video bg-black flex items-center justify-center mb-6 rounded border border-gray-800">
          {!hasStarted ? (
            <button
              onClick={startAd}
              className="bg-pink-600 hover:bg-pink-500 text-white font-black py-4 px-8 rounded-xl shadow-[0_0_20px_rgba(219,39,119,0.5)] transition-all active:scale-95"
            >
              ▶ VER ANUNCIO
            </button>
          ) : (
            <p className="text-pink-500 animate-pulse flex flex-col items-center">
              <span className="text-3xl mb-2">📺</span>
              Reproduciendo anuncio...
            </p>
          )}
        </div>

        <h3 className="text-xl font-bold text-white mb-2">
          {!hasStarted ? "Requiere ver un anuncio" : canClose ? "¡Recompensa Lista!" : "Enfriando el huevo..."}
        </h3>
        
        <p className="text-gray-400 mb-6">
          {!hasStarted 
            ? "Haz clic en reproducir para ver un anuncio y enfriar el huevo al instante."
            : canClose 
            ? "Gracias por ver el anuncio. Tu huevo se ha enfriado por completo." 
            : `El anuncio terminará en ${timeLeft} segundos.`}
        </p>

        {canClose ? (
          <button
            onClick={handleFinish}
            disabled={loading}
            className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-3 px-4 rounded-lg transition-colors"
          >
            {loading ? "Reclamando..." : "Cerrar y Jugar"}
          </button>
        ) : (
          <button
            onClick={onCancel}
            disabled={hasStarted}
            className={`w-full font-bold py-3 px-4 rounded-lg transition-colors ${hasStarted ? 'bg-gray-800 text-gray-600 cursor-not-allowed' : 'bg-gray-800 hover:bg-gray-700 text-gray-300'}`}
          >
            {hasStarted ? "Por favor espera..." : "Cancelar (No enfriar)"}
          </button>
        )}
      </div>
    </div>
  );
}
