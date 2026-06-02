'use client';

import { memo } from 'react';
import { formatCurrency, CountryCode } from '@/lib/currency';
import { Trophy } from 'lucide-react';

interface PrizePoolProps {
  baseUsdAmount: number;
  userCountry: CountryCode;
}

export default memo(function PrizePool({ baseUsdAmount, userCountry }: PrizePoolProps) {
  const localizedPrize = formatCurrency(baseUsdAmount, userCountry);

  return (
    <div className="bg-black/40 backdrop-blur-md border border-cyan-500/50 rounded-2xl p-6 shadow-[0_0_30px_rgba(6,182,212,0.3)] flex flex-col items-center justify-center gap-2">
      <div className="flex items-center gap-2 text-cyan-400">
        <Trophy className="w-6 h-6" />
        <h2 className="text-xl font-bold uppercase tracking-widest">Premio Global</h2>
      </div>
      <div className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 drop-shadow-[0_0_15px_rgba(6,182,212,0.8)]">
        {localizedPrize}
      </div>
      <p className="text-xs text-slate-400 uppercase tracking-widest mt-2">
        {userCountry !== 'US' ? `Convertido a tu moneda local` : 'Premio Base en USD'}
      </p>
    </div>
  );
});
