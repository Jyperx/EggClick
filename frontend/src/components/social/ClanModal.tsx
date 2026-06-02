'use client';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import Image from 'next/image';
import { getRankInfo } from '@/lib/ranking';
import { getClanTheme } from '@/lib/clanThemes';

interface Clan {
  id: number;
  name: string;
  description: string;
  leader_id: string;
  entry_fee: number;
  member_count: number;
  total_clicks: number;
  egg_coins: number;
  shield_id?: number;
  members?: { id: string; username: string; total_clicks: number }[];
}

interface ClanRequest {
  request_id: number;
  user_id: string;
  username: string;
}

export default function ClanModal({ 
  isOpen, 
  onClose, 
  userId, 
  userClanId,
  userEggCoins,
  onClanJoined
}: { 
  isOpen: boolean; 
  onClose: () => void;
  userId: string;
  userClanId: number | null;
  userEggCoins: number;
  onClanJoined: (clanId: number, coinsDeducted: number) => void;
}) {
  const [activeTab, setActiveTab] = useState<'my_clan' | 'search' | 'create'>('my_clan');
  const [clans, setClans] = useState<Clan[]>([]);
  const [myClan, setMyClan] = useState<Clan | null>(null);
  const [requests, setRequests] = useState<ClanRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Create Form
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newFee, setNewFee] = useState(0);
  const [newShieldId, setNewShieldId] = useState(1);

  // Solicitud pendiente local
  const [pendingClanId, setPendingClanId] = useState<number | null>(null);

  const fetchWithToken = async (url: string, options: RequestInit = {}) => {
    const tokenRes = await fetch('/api/auth/token');
    const { token } = await tokenRes.json();
    if (!token) throw new Error("No auth token");

    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`
      }
    });
  };

  useEffect(() => {
    const saved = localStorage.getItem('pendingClanId');
    if (saved) setPendingClanId(Number(saved));
  }, []);

  useEffect(() => {
    if (userClanId) {
      setActiveTab('my_clan');
      fetchMyClan();
    } else {
      setActiveTab('search');
      fetchAllClans();
    }
  }, [userClanId]);

  const sortedClans = React.useMemo(() => {
    return [...clans].sort((a, b) => {
       if (a.id === pendingClanId) return -1;
       if (b.id === pendingClanId) return 1;
       return b.member_count - a.member_count;
    });
  }, [clans, pendingClanId]);

  const fetchMyClan = async () => {
    if (!userClanId) return;
    try {
      const res = await fetchWithToken(`http://localhost:8000/api/v1/clans/${userClanId}`);
      if (res.ok) {
        const data = await res.json();
        setMyClan(data);
        if (data.leader_id === userId) {
          fetchRequests(data.id);
        }
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const fetchAllClans = async () => {
    try {
      const res = await fetch(`http://localhost:8000/api/v1/clans/`);
      if (res.ok) {
        setClans(await res.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchRequests = async (clanId: number) => {
    try {
      const res = await fetchWithToken(`http://localhost:8000/api/v1/clans/${clanId}/requests`);
      if (res.ok) {
        setRequests(await res.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (userEggCoins < 1000) {
      setError('Necesitas al menos 1000 EggCoins para crear un clan.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetchWithToken(`http://localhost:8000/api/v1/clans/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName,
          description: newDesc,
          entry_fee: newFee,
          shield_id: newShieldId
        })
      });
      const data = await res.json();
      if (res.ok) {
        onClanJoined(data.clan_id, 1000);
        setMyClan(null); // Force refetch
        setActiveTab('my_clan');
      } else {
        setError(data.detail || 'Error al crear el clan');
      }
    } catch (err) {
      setError('Error de conexión');
    }
    setLoading(false);
  };

  const handleJoin = async (clanId: number, fee: number) => {
    if (userEggCoins < fee) {
      setError(`Necesitas ${fee} EggCoins para enviar solicitud a este clan.`);
      return;
    }
    setLoading(true);
    try {
      const res = await fetchWithToken(`http://localhost:8000/api/v1/clans/${clanId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      const data = await res.json();
      if (res.ok) {
        setPendingClanId(clanId);
        localStorage.setItem('pendingClanId', clanId.toString());
      } else {
        setError(data.detail || 'Error al enviar solicitud');
      }
    } catch (err) {
      setError('Error de conexión');
    }
    setLoading(false);
  };

  const handleProcessRequest = async (reqId: number, action: 'accept' | 'reject') => {
    setLoading(true);
    try {
      const res = await fetchWithToken(`http://localhost:8000/api/v1/clans/${userClanId}/${action}/${reqId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      if (res.ok) {
        fetchRequests(userClanId!);
        fetchMyClan();
      } else {
        const data = await res.json();
        setError(data.detail || `Error al ${action} solicitud`);
      }
    } catch (err) {
      setError('Error de conexión');
    }
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 overscroll-contain">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-2xl bg-slate-900 rounded-2xl border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="flex justify-between items-center p-4 border-b border-white/10">
          <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-orange-400 to-amber-300">
            Sistema de Clanes
          </h2>
          <button onClick={onClose} className="text-white/50 hover:text-white transition-colors"><X className="w-6 h-6" /></button>
        </div>

        <div className="flex border-b border-white/10">
          <button 
            className={`flex-1 p-3 text-center font-medium transition-colors ${activeTab === 'my_clan' ? 'bg-orange-500/20 text-orange-400 border-b-2 border-orange-500' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
            onClick={() => { setActiveTab('my_clan'); fetchMyClan(); }}
          >
            Mi Clan
          </button>
          {!userClanId && (
            <>
              <button 
                className={`flex-1 p-3 text-center font-medium transition-colors ${activeTab === 'search' ? 'bg-orange-500/20 text-orange-400 border-b-2 border-orange-500' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
                onClick={() => { setActiveTab('search'); fetchAllClans(); }}
              >
                Buscar Clan
              </button>
              <button 
                className={`flex-1 p-3 text-center font-medium transition-colors ${activeTab === 'create' ? 'bg-orange-500/20 text-orange-400 border-b-2 border-orange-500' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
                onClick={() => setActiveTab('create')}
              >
                Crear Clan
              </button>
            </>
          )}
        </div>

        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar overscroll-contain will-change-scroll">
          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm">
              {error}
            </div>
          )}

          {loading && (
            <div className="flex flex-col items-center justify-center h-64 opacity-60">
              <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-white/50 font-bold uppercase tracking-widest text-xs animate-pulse">
                {activeTab === 'search' ? 'Buscando clanes...' : 'Cargando cuartel...'}
              </p>
            </div>
          )}

          {!loading && activeTab === 'my_clan' && (
            <div>
              {!userClanId ? (
                <div className="text-center py-8 text-white/60">
                  <p>Aún no perteneces a ningún clan.</p>
                  <p className="text-sm mt-2">Busca uno en la pestaña de Buscar o crea el tuyo propio.</p>
                </div>
              ) : myClan ? (
                <div className="space-y-6">
                  <div className="bg-slate-900/50 p-6 rounded-2xl border border-white/5 space-y-6">
                    <div className="flex flex-col items-center text-center gap-2">
                      <Image src={`/sprites/clan/${myClan.shield_id || 1}.png`} alt="Clan Shield" width={96} height={96} unoptimized className={`${getClanTheme(myClan.shield_id).dropGlow} mb-2`} />
                      <h3 className={`text-3xl font-black ${getClanTheme(myClan.shield_id).text} ${getClanTheme(myClan.shield_id).textGlow}`}>{myClan.name}</h3>
                      {myClan.description && <p className="text-white/50 text-sm max-w-sm">{myClan.description}</p>}
                      <div className={`flex items-center gap-1.5 bg-slate-950/80 border px-3 py-1.5 rounded-full mt-2 ${getClanTheme(myClan.shield_id).border} ${getClanTheme(myClan.shield_id).boxGlow}`}>
                         <Image src={`/sprites/ranked/${getRankInfo(myClan.total_clicks).id}.png`} alt="Clan Rank" width={20} height={20} unoptimized className={`drop-shadow-md ${getRankInfo(myClan.total_clicks).scaleClass}`} />
                         <span className={`text-sm font-bold ${getClanTheme(myClan.shield_id).text}`}>{getRankInfo(myClan.total_clicks).name}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white/5 p-4 rounded-xl border border-white/10 text-center">
                        <p className="text-white/50 text-xs font-bold uppercase tracking-wider mb-1">Clics Globales</p>
                        <p className="text-2xl font-black text-orange-400">{myClan.total_clicks.toLocaleString()}</p>
                      </div>
                      <div className="bg-white/5 p-4 rounded-xl border border-white/10 text-center">
                        <p className="text-white/50 text-xs font-bold uppercase tracking-wider mb-1">Miembros</p>
                        <p className="text-2xl font-black text-white">{myClan.member_count}/10</p>
                      </div>
                    </div>

                    <div className="bg-amber-500/10 p-4 rounded-xl border border-amber-500/20 text-center">
                      <p className="text-amber-500/70 text-xs font-bold uppercase tracking-wider mb-1">Tesoro del Clan (Compartido)</p>
                      <p className="text-3xl font-black text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.6)] flex items-center justify-center gap-2">
                        {myClan.egg_coins?.toLocaleString() || 0}
                        <Image src="/sprites/moneda.png" alt="EGGC" width={28} height={28} unoptimized className="drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]" />
                      </p>
                      <p className="text-xs text-amber-500/50 mt-1">Todos los miembros pueden usar estas monedas en la tienda.</p>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-lg font-bold text-white mb-3">Miembros</h4>
                    <div className="space-y-2">
                      {myClan.members?.map(m => (
                        <div key={m.id} className="flex justify-between items-center p-3 bg-white/5 rounded-lg border border-white/5">
                          <div className="flex items-center gap-3">
                            <Image src={`/sprites/ranked/${getRankInfo(m.total_clicks).id}.png`} alt="Rank" width={24} height={24} unoptimized className={`drop-shadow-md ${getRankInfo(m.total_clicks).scaleClass}`} title={getRankInfo(m.total_clicks).name} />
                            <span className="text-white font-medium">
                              {m.username} {m.id === myClan.leader_id && <span className="text-xs bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded ml-2">LÍDER</span>}
                            </span>
                          </div>
                          <span className="text-white/70 font-mono text-sm">{m.total_clicks.toLocaleString()} clics</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {myClan.leader_id === userId && (
                    <div className="mt-8 border-t border-white/10 pt-6">
                      <h4 className="text-lg font-bold text-amber-400 mb-3 flex items-center justify-between">
                        Solicitudes Pendientes
                        <span className="bg-amber-500 text-black text-xs px-2 py-1 rounded-full">{requests.length}</span>
                      </h4>
                      
                      {requests.length === 0 ? (
                        <p className="text-white/50 text-sm">No hay solicitudes pendientes.</p>
                      ) : (
                        <div className="space-y-3">
                          {requests.map(req => (
                            <div key={req.request_id} className="flex justify-between items-center p-3 bg-black/40 rounded-lg border border-amber-500/30">
                              <span className="text-white">{req.username}</span>
                              <div className="flex gap-2">
                                <button onClick={() => handleProcessRequest(req.request_id, 'accept')} className="px-3 py-1.5 bg-green-500 hover:bg-green-400 text-black text-sm font-bold rounded transition-colors">Aceptar</button>
                                <button onClick={() => handleProcessRequest(req.request_id, 'reject')} className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/40 text-red-400 border border-red-500/50 text-sm rounded transition-colors">Rechazar</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          )}

          {!loading && activeTab === 'search' && (
            <div className="space-y-4">
              {sortedClans.length === 0 ? (
                <p className="text-center text-white/50 py-8">No hay clanes disponibles. ¡Sé el primero en crear uno!</p>
              ) : (
                sortedClans.map(clan => (
                  <div key={clan.id} className={`p-4 border rounded-xl flex justify-between items-center transition-colors ${clan.id === pendingClanId ? 'bg-orange-500/10 border-orange-500' : 'bg-white/5 border-white/10 hover:border-orange-500/50'}`}>
                    <div>
                      <div className="flex items-center gap-3">
                        <Image src={`/sprites/clan/${clan.shield_id || 1}.png`} alt="Clan Shield" width={40} height={40} unoptimized className="drop-shadow-md" />
                        <div>
                            <h4 className="text-lg font-bold text-white flex items-center gap-2">
                                {clan.name}
                            </h4>
                            <div className="flex items-center gap-1 text-[10px] text-amber-500/80 font-bold uppercase mt-0.5">
                                <Image src={`/sprites/ranked/${getRankInfo(clan.total_clicks).id}.png`} alt="Rank" width={12} height={12} unoptimized />
                                {getRankInfo(clan.total_clicks).name}
                            </div>
                        </div>
                      </div>
                      <p className="text-white/50 text-sm mt-1">{clan.description || 'Sin descripción'}</p>
                      <div className="flex gap-4 mt-2 text-xs">
                        <span className="text-white/70">👥 {clan.member_count}/10</span>
                        <span className="text-orange-400">💰 {clan.entry_fee > 0 ? `${clan.entry_fee} Coins` : 'Gratis'}</span>
                      </div>
                    </div>
                    {clan.id === pendingClanId ? (
                        <div className="px-4 py-2 bg-orange-500/20 text-orange-400 font-bold rounded-lg border border-orange-500/50">
                          Enviada ✓
                        </div>
                    ) : (
                        <button 
                          onClick={() => handleJoin(clan.id, clan.entry_fee)}
                          disabled={clan.member_count >= 10 || pendingClanId !== null}
                          className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-black font-bold rounded-lg shadow-lg hover:shadow-orange-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {clan.member_count >= 10 ? 'Lleno' : 'Unirse'}
                        </button>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {!loading && activeTab === 'create' && (
            <form onSubmit={handleCreate} className="space-y-5">
              <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl text-amber-200 text-sm flex gap-3 mb-6">
                <span className="text-2xl">⚠️</span>
                <p>Crear un clan cuesta <strong>1000 EggCoins</strong>. Al crearlo serás el Líder y podrás aceptar o rechazar miembros. El límite de miembros es 10.</p>
              </div>

              <div>
                <label className="block text-white/70 text-sm font-bold mb-2">Escudo del Clan</label>
                <div className="flex flex-wrap gap-2 justify-center bg-black/40 p-4 rounded-xl border border-white/10">
                  {[...Array(10)].map((_, i) => (
                    <button
                      key={i+1}
                      type="button"
                      onClick={() => setNewShieldId(i+1)}
                      className={`p-2 rounded-xl transition-all ${newShieldId === i+1 ? 'bg-orange-500/30 border-2 border-orange-500 scale-110 shadow-[0_0_15px_rgba(249,115,22,0.4)]' : 'border border-transparent hover:bg-white/10 hover:scale-105 opacity-60 hover:opacity-100'}`}
                    >
                      <Image src={`/sprites/clan/${i+1}.png`} alt={`Shield ${i+1}`} width={48} height={48} unoptimized className="drop-shadow-md" />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-white/70 text-sm font-bold mb-2">Nombre del Clan</label>
                <input 
                  type="text" 
                  maxLength={20}
                  required
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="w-full bg-black/40 border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-orange-500"
                  placeholder="Ej: Los Rompehuevos"
                />
              </div>

              <div>
                <label className="block text-white/70 text-sm font-bold mb-2">Descripción (Opcional)</label>
                <input 
                  type="text" 
                  maxLength={100}
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  className="w-full bg-black/40 border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-orange-500"
                  placeholder="Únete si eres activo..."
                />
              </div>

              <div>
                <label className="block text-white/70 text-sm font-bold mb-2">Tarifa de Entrada (EggCoins)</label>
                <input 
                  type="number" 
                  min={0}
                  max={5000}
                  value={newFee}
                  onChange={e => setNewFee(Number(e.target.value))}
                  className="w-full bg-black/40 border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-orange-500"
                />
                <p className="text-white/40 text-xs mt-1">Costo que deben pagar los usuarios para unirse (va al pozo personal de cada uno, esto es solo una barrera de entrada opcional).</p>
              </div>

              <button 
                type="submit"
                disabled={userEggCoins < 1000}
                className="w-full py-4 mt-4 bg-gradient-to-r from-orange-500 to-amber-500 text-black font-black rounded-xl text-lg hover:shadow-[0_0_20px_rgba(249,115,22,0.4)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Pagar 1000 💰 y Crear Clan
              </button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
