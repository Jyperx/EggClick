'use client';
import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface VideoAdModalProps {
  onAdComplete: () => void;
  onCancel: () => void;
}

export function VideoAdModal({ onAdComplete, onCancel }: VideoAdModalProps) {
  const [timeLeft, setTimeLeft] = useState(15); // Simulación de 15 segundos
  const [canClose, setCanClose] = useState(false);
  const [loading, setLoading] = useState(false);
  const { data: session } = useSession();

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanClose(true);
    }
  }, [timeLeft]);

  const handleFinish = async () => {
    if (!canClose) return;
    setLoading(true);
    try {
      // Llamada al backend para saltar el cooldown
      // Se asume que el token JWT está disponible o el session envía cookie
      // Para NextAuth con FastAPI, solemos mandar el token en la cabecera
      // Dependiendo de tu config, si usas cookies de NextAuth podrías no necesitar enviarlo manual.
      // Aquí simulamos que se resetea por el servidor. En la realidad la función onAdComplete() 
      // podría llamar al endpoint. Por limpieza lo dejamos delegar al padre si es necesario, 
      // pero también podemos dispararlo directo si le pasamos el token:
      
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
          <p className="text-gray-500 animate-pulse flex flex-col items-center">
            <span className="text-3xl mb-2">📺</span>
            [Anuncio Simulado de AdSense/Monetag]
          </p>
        </div>

        <h3 className="text-xl font-bold text-white mb-2">
          {canClose ? "¡Recompensa Lista!" : "Enfriando el huevo..."}
        </h3>
        
        <p className="text-gray-400 mb-6">
          {canClose 
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
            className="w-full bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold py-3 px-4 rounded-lg transition-colors"
          >
            Cancelar (No enfriar)
          </button>
        )}
      </div>
    </div>
  );
}
