'use client';
import { useState } from 'react';
import { formatCurrency, CountryCode } from '@/lib/currency';
import { ShopItemType } from './StorePanel';
import { ShoppingCart, Zap, Lock, Loader2, Check, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from 'next-auth/react';
import Image from 'next/image';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface Props {
    item: ShopItemType;
    userCountry: CountryCode;
    eggCoins: number;
}

export default function ShopItemCard({ item, userCountry, eggCoins }: Props) {
    const { data: session } = useSession();
    const isCrypto = item.cost_egg_coins !== null;
    const canAfford = isCrypto && eggCoins >= (item.cost_egg_coins as number);
    
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [showFloatingCoin, setShowFloatingCoin] = useState(false);

    const imageMap: Record<number, string> = {
        1: '/sprites/autoclicker.png',
        2: '/sprites/martillo_x5.png',
        3: '/sprites/mano_congelada.png',
        4: '/sprites/touchme.png',
        5: '/sprites/hamass.png'
    };
    const imageUrl = imageMap[item.id];

    const handleBuy = async () => {
        if (!isCrypto) return; // USD not supported yet
        if (!canAfford) return;
        if (!session?.user?.email) return;

        setStatus('loading');
        try {
            const tokenRes = await fetch('/api/auth/token');
            const { token } = await tokenRes.json();

            const res = await fetch(`${API_URL}/api/v1/shop/buy/${item.id}`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({})
            });
            const data = await res.json();
            
            if (res.ok) {
                setStatus('success');
                setShowFloatingCoin(true);
                window.dispatchEvent(new CustomEvent('egg_coins_update'));
                
                setTimeout(() => {
                    setStatus('idle');
                    setShowFloatingCoin(false);
                }, 2000);
            } else {
                setStatus('error');
                setTimeout(() => setStatus('idle'), 2000);
            }
        } catch (error) {
            console.error(error);
            setStatus('error');
            setTimeout(() => setStatus('idle'), 2000);
        }
    };

    return (
        <div className="relative group w-full h-full">
            {/* Borde Grueso Negro */}
            <div className="bg-[#0A0A0A] p-2 md:p-3 rounded-[1.5rem] shadow-[0_10px_20px_rgba(0,0,0,0.5)] h-full flex flex-col transition-transform duration-300 group-hover:-translate-y-2">
                
                {/* Fondo de la carta (Oscuro) */}
                <div className="bg-gradient-to-b from-slate-800 to-slate-950 rounded-[1rem] flex-1 flex flex-col relative overflow-hidden border border-slate-700/50">
                    
                    {/* Badge de Precio */}
                    <div className="absolute top-0 left-0 bg-[#0A0A0A] text-white px-3 py-2 rounded-br-[1rem] flex items-center justify-center gap-1 z-20 border-r border-b border-slate-800/50 shadow-md">
                        <span className="font-black text-lg leading-none">{item.cost_egg_coins}</span>
                        <Image src="/sprites/moneda.png" alt="EGGC" width={14} height={14} unoptimized />
                    </div>

                    {/* Nombre del Ítem */}
                    <div className="pt-3 px-3 pb-0 text-right z-10 relative h-10 flex items-start justify-end">
                        <h3 className="text-sm md:text-base font-black text-white uppercase tracking-widest leading-tight drop-shadow-md truncate max-w-[65%] text-right">
                            {item.name}
                        </h3>
                    </div>

                    {/* Imagen (Más compacta) */}
                    <div className="relative h-28 md:h-36 w-full flex-shrink-0 flex items-center justify-center z-10">
                        {imageUrl && (
                            <div className="w-full h-full relative px-4">
                                <Image 
                                    src={imageUrl} 
                                    alt={item.name} 
                                    fill 
                                    unoptimized
                                    className="object-contain drop-shadow-[0_10px_15px_rgba(0,0,0,0.8)] group-hover:scale-110 transition-transform duration-500 ease-out" 
                                />
                            </div>
                        )}
                    </div>

                    {/* Panel Inferior */}
                    <div className="mt-auto p-2 flex flex-col gap-2 z-20">
                        <div className="bg-[#0A0A0A]/80 rounded-xl p-3 flex flex-col gap-3 shadow-inner border border-white/5">
                            <p className="text-slate-400 text-[10px] md:text-xs font-bold text-center leading-snug min-h-[2.5rem] flex items-center justify-center line-clamp-3">
                                {item.description}
                            </p>
                            
                            <div className="relative w-full">
                                <AnimatePresence>
                                    {showFloatingCoin && (
                                        <motion.div 
                                            initial={{ opacity: 0, y: 0, scale: 0.5 }}
                                            animate={{ opacity: 1, y: -40, scale: 1.2 }}
                                            exit={{ opacity: 0 }}
                                            transition={{ duration: 0.8, ease: "easeOut" }}
                                            className="absolute top-0 left-1/2 -translate-x-1/2 text-red-400 font-black flex items-center gap-1 drop-shadow-[0_0_10px_rgba(239,68,68,0.8)] z-50 pointer-events-none"
                                        >
                                            -{item.cost_egg_coins} <Image src="/sprites/moneda.png" alt="EGGC" width={12} height={12} unoptimized />
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                <button 
                                    disabled={!isCrypto || !canAfford || status !== 'idle'}
                                    onClick={handleBuy}
                                    className={`w-full py-2.5 rounded-lg font-black text-xs uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all ${
                                        status === 'success' ? 'bg-emerald-500 text-white shadow-[0_4px_0_#059669]' :
                                        status === 'error' ? 'bg-red-600 text-white shadow-[0_4px_0_#991b1b]' :
                                        isCrypto && canAfford
                                            ? 'bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white shadow-[0_4px_0_#9f1239] active:shadow-[0_0px_0_#9f1239] active:translate-y-1'
                                            : 'bg-[#1A1A1A] text-[#444] cursor-not-allowed border border-[#333]'
                                    }`}
                                >
                                    {status === 'loading' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                    {status === 'success' && <Check className="w-4 h-4 animate-bounce" />}
                                    {status === 'error' && <XCircle className="w-4 h-4" />}
                                    
                                    {status === 'success' && <span>¡Comprado!</span>}
                                    {status === 'error' && <span>Error</span>}
                                    
                                    {status === 'idle' && (
                                        <>
                                            {!isCrypto && <Lock className="w-3.5 h-3.5" />}
                                            {isCrypto && canAfford && <ShoppingCart className="w-4 h-4" />}
                                            {isCrypto ? (canAfford ? 'Comprar' : 'Muy Caro') : 'Solo USD'}
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                    
                </div>
            </div>
        </div>
    );
}
