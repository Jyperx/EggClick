import { useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface AdSenseRewardedProps {
    onRewardEarned: (token?: string) => void;
}

export default function AdSenseRewarded({ onRewardEarned }: AdSenseRewardedProps) {
    const [isPlaying, setIsPlaying] = useState(false);
    
    const showRewardedVideo = async () => {
        setIsPlaying(true);
        try {
            const res = await fetch(`${API_URL}/api/v1/ads/generate-token`);
            const data = await res.json();
            
            // Simulamos un anuncio de 5 segundos
            setTimeout(() => {
                setIsPlaying(false);
                onRewardEarned(data.token);
            }, 5000);
        } catch (error) {
            console.error("Error fetching ad token:", error);
            setIsPlaying(false);
        }
    };

    return (
        <div className="relative flex flex-col items-center justify-center space-y-4 bg-slate-900/95 p-6 rounded-2xl border-2 border-rose-500 shadow-[0_0_30px_rgba(244,63,94,0.3)] z-50 w-[280px] before:content-[''] before:absolute before:-right-[20px] before:top-1/2 before:-translate-y-1/2 before:border-[10px] before:border-transparent before:border-l-rose-500 after:content-[''] after:absolute after:-right-[16px] after:top-1/2 after:-translate-y-1/2 after:border-[10px] after:border-transparent after:border-l-slate-900">
            <h3 className="text-lg font-black text-white uppercase tracking-widest text-center drop-shadow-md">
                SUPER SOBRECALENTADO 🍳
            </h3>
            <p className="text-slate-300 text-xs text-center max-w-xs">
                Has tapeado demasiado y el huevo necesita enfriarse completamente.
            </p>
            {isPlaying ? (
                <div className="flex flex-col items-center py-4">
                    <div className="w-12 h-12 border-4 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="mt-4 text-xs font-bold text-pink-400 uppercase tracking-widest animate-pulse">Reproduciendo anuncio...</p>
                </div>
            ) : (
                <button 
                    onClick={showRewardedVideo}
                    className="w-full bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-400 hover:to-pink-500 text-white font-black py-3 px-6 rounded-xl uppercase tracking-widest text-sm shadow-[0_0_20px_rgba(244,63,94,0.4)] transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                    ▶ Ver Video para Enfriar
                </button>
            )}
        </div>
    );
}
