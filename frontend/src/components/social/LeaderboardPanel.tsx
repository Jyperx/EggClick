'use client';
import { useState, useEffect, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trophy, Users, User as UserIcon } from 'lucide-react';
import Image from 'next/image';
import { getRankInfo } from '@/lib/ranking';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface LeaderboardPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

export default memo(function LeaderboardPanel({ isOpen, onClose }: LeaderboardPanelProps) {
    const [tab, setTab] = useState<'users' | 'clans'>('users');
    const [users, setUsers] = useState<any[]>([]);
    const [clans, setClans] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setLoading(true);
            Promise.all([
                fetch(`${API_URL}/api/v1/leaderboard/users`).then(res => res.json()),
                fetch(`${API_URL}/api/v1/leaderboard/clans`).then(res => res.json())
            ])
            .then(([usersData, clansData]) => {
                setUsers(usersData);
                setClans(clansData);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
        }
    }, [isOpen]);

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-slate-950/95"
                    />
                    
                    <motion.div 
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="relative w-full max-w-2xl max-h-[85vh] bg-slate-950 border border-amber-500/20 rounded-[2rem] overflow-hidden shadow-2xl flex flex-col"
                    >
                        <div className="p-6 border-b border-white/10 bg-black/20 flex justify-between items-center relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-500 via-amber-500 to-orange-500"></div>
                            <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-400 uppercase tracking-widest flex items-center gap-3">
                                <Trophy className="text-yellow-400 w-8 h-8" />
                                Ranking Global
                            </h2>
                            <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="flex border-b border-white/5 bg-black/10">
                            <button 
                                onClick={() => setTab('users')}
                                className={`flex-1 py-4 font-bold tracking-widest uppercase flex items-center justify-center gap-2 transition-colors ${tab === 'users' ? 'text-yellow-400 border-b-2 border-yellow-400 bg-slate-800/30' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900'}`}
                            >
                                <UserIcon className="w-4 h-4" /> Top Jugadores
                            </button>
                            <button 
                                onClick={() => setTab('clans')}
                                className={`flex-1 py-4 font-bold tracking-widest uppercase flex items-center justify-center gap-2 transition-colors ${tab === 'clans' ? 'text-yellow-400 border-b-2 border-yellow-400 bg-slate-800/30' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900'}`}
                            >
                                <Users className="w-4 h-4" /> Top Clanes
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6">
                            {loading ? (
                                <div className="flex justify-center items-center h-40">
                                    <div className="w-10 h-10 border-4 border-yellow-500/30 border-t-yellow-500 rounded-full animate-spin"></div>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-3">
                                    {(tab === 'users' ? users : clans).map((item, i) => (
                                        <motion.div 
                                            key={i}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: i * 0.05 }}
                                            className={`p-4 rounded-xl flex items-center justify-between border ${i === 0 ? 'bg-gradient-to-r from-yellow-900/40 to-amber-900/20 border-yellow-500/50 shadow-[0_0_15px_rgba(234,179,8,0.2)]' : i === 1 ? 'bg-gradient-to-r from-slate-400/20 to-slate-500/10 border-slate-400/50' : i === 2 ? 'bg-gradient-to-r from-amber-700/20 to-amber-800/10 border-amber-600/50' : 'bg-slate-800/30 border-slate-700'}`}
                                        >
                                            <div className="flex items-center gap-4">
                                                <span className={`text-2xl font-black w-8 text-center ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-slate-300' : i === 2 ? 'text-amber-500' : 'text-slate-500'}`}>
                                                    #{i + 1}
                                                </span>
                                                <div className="flex items-center gap-2" title={tab === 'users' ? getRankInfo(item.clicks).name : 'Clan Shield'}>
                                                    {tab === 'users' ? (
                                                        <Image src={`/sprites/ranked/${getRankInfo(item.clicks).id}.png`} alt="Rank" width={32} height={32} unoptimized className={`drop-shadow-md ${getRankInfo(item.clicks).scaleClass}`} />
                                                    ) : (
                                                        <Image src={`/sprites/clan/${item.shield_id || 1}.png`} alt="Clan Shield" width={32} height={32} unoptimized className="drop-shadow-md" />
                                                    )}
                                                    <span className={`font-bold text-lg ${i === 0 ? 'text-yellow-100' : 'text-white'}`}>
                                                        {tab === 'users' ? item.username : item.name}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className={`font-black text-xl ${i === 0 ? 'text-yellow-400' : 'text-slate-200'}`}>{item.clicks.toLocaleString()}</div>
                                                <div className="text-[10px] text-slate-500 font-bold tracking-widest uppercase">Clics</div>
                                            </div>
                                        </motion.div>
                                    ))}
                                    {(tab === 'users' ? users : clans).length === 0 && (
                                        <div className="text-center p-8 text-slate-500 font-bold uppercase tracking-widest">
                                            Aún no hay datos
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
});
