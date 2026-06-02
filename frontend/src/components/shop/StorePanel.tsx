'use client';
import { useState, useEffect, memo } from 'react';
import ShopItemCard from './ShopItemCard';
import { CountryCode } from '@/lib/currency';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

export interface ShopItemType {
    id: number;
    name: string;
    description: string;
    cost_egg_coins: number | null;
    cost_usd: number | null;
}

interface StorePanelProps {
    isOpen: boolean;
    onClose: () => void;
    userCountry: CountryCode;
    eggCoins: number;
}

export default memo(function StorePanel({ isOpen, onClose, userCountry, eggCoins }: StorePanelProps) {
    const [items, setItems] = useState<ShopItemType[]>([]);

    useEffect(() => {
        // Prefetch items en segundo plano al montar el componente
        fetch('http://localhost:8000/api/v1/shop/items', { cache: 'no-store' })
            .then(res => res.json())
            .then(data => setItems(data))
            .catch(err => console.error("Error cargando la tienda:", err));
    }, []);

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-slate-950/95"
                    />
                    
                    {/* Modal */}
                    <motion.div 
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="relative w-full max-w-4xl max-h-[85vh] bg-slate-950 border border-pink-500/20 rounded-[2rem] overflow-hidden shadow-2xl flex flex-col"
                    >
                        {/* Header Tienda */}
                        <div className="p-6 border-b border-white/10 bg-black/20 flex justify-between items-center relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500"></div>
                            <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400 uppercase tracking-widest drop-shadow-sm">Black Market</h2>
                            
                            <div className="flex items-center gap-6">
                                <div className="hidden md:flex items-center gap-3 bg-slate-950 px-4 py-2 rounded-xl border border-yellow-500/20 shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)]">
                                    <span className="text-[10px] font-black text-slate-400 tracking-[0.2em] uppercase">Saldo</span>
                                    <span className="font-black text-xl text-yellow-400">{eggCoins}</span>
                                    <Image src="/sprites/moneda.png" alt="EGGC" width={20} height={20} unoptimized className="drop-shadow-md" />
                                </div>
                                <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                        </div>

                        {/* Contenido / Catálogo */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-8 relative">
                            {items.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-64 opacity-60">
                                    <div className="w-12 h-12 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                                    <p className="text-slate-400 font-bold uppercase tracking-widest text-xs animate-pulse">Abasteciendo Inventario...</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {items.map(item => (
                                        <ShopItemCard key={item.id} item={item} userCountry={userCountry} eggCoins={eggCoins} />
                                    ))}
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
});
