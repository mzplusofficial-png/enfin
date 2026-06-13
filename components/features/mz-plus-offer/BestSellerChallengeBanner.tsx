import React from 'react';
import { motion } from 'motion/react';
import { Trophy, Crown, Flame, ArrowRight, TrendingUp } from 'lucide-react';
import { UserProfile } from '../../../types.ts';
import { useCurrency } from '../../../hooks/useCurrency.ts';

interface BestSellerChallengeBannerProps {
  profile: UserProfile | null;
  onParticipate: () => void;
  onSeeLeaderboard: () => void;
}

export const BestSellerChallengeBanner: React.FC<BestSellerChallengeBannerProps> = ({
  profile,
  onParticipate,
  onSeeLeaderboard,
}) => {
  const { currency, rates } = useCurrency();

  // 1. Inscribe duration gating check:
  // récupérer le temps total déjà connu de l’utilisateur depuis son inscription ;
  // si ce temps total est ≥ 3 minutes, afficher la campagne ; sinon ne rien afficher.
  if (!profile || !profile.created_at) {
    return null;
  }

  const registrationTime = new Date(profile.created_at).getTime();
  const elapsedMs = Date.now() - registrationTime;
  const isEligible = elapsedMs >= 3 * 60 * 1000; // 3 minutes

  if (!isEligible) {
    return null; // Return nothing if registration was less than 3 minutes ago
  }

  // Formatting algorithm with zero commas, dots, or unappealing decimals
  const getCaptivatingAmount = (amountXAF: number) => {
    const rate = rates[currency] || 1;
    const converted = Math.round(amountXAF / rate);
    const spaced = converted.toLocaleString('fr-FR').replace(/,/g, ' ').replace(/\s+/g, ' ');
    
    let label = currency;
    if (currency === 'XOF' || currency === 'XAF') {
      label = 'FCFA';
    }
    return `${spaced} ${label}`;
  };

  const formattedReward = getCaptivatingAmount(20000);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, type: 'spring' }}
      className="relative group overflow-hidden rounded-[2.5rem] p-[1.5px] bg-gradient-to-r from-yellow-500 via-amber-500 via-purple-600 to-pink-500 shadow-[0_23px_60px_-15px_rgba(234,179,8,0.25)] hover:shadow-[0_25px_65px_-10px_rgba(168,85,247,0.35)] transition-all duration-500"
    >
      {/* Dynamic atmospheric background glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 via-purple-900/40 to-black pointer-events-none opacity-80 group-hover:opacity-100 transition-opacity duration-500" />
      
      {/* Inner glass box */}
      <div className="relative bg-[#09070F]/90 backdrop-blur-2xl rounded-[2.4rem] p-6 sm:p-8 flex flex-col md:flex-row items-center gap-6 justify-between overflow-hidden">
        
        {/* Absolute glowing shapes */}
        <div className="absolute -top-16 -left-16 w-32 h-32 bg-yellow-500/20 blur-[50px] rounded-full pointer-events-none group-hover:bg-yellow-500/30 transition-all duration-500" />
        <div className="absolute -bottom-16 -right-16 w-32 h-32 bg-purple-500/20 blur-[50px] rounded-full pointer-events-none group-hover:bg-purple-500/30 transition-all duration-500" />

        <div className="flex-1 space-y-4">
          {/* Badge Animé : ÉVÉNEMENT EN COURS */}
          <div className="flex items-center gap-2">
            <span className="relative flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-80"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-red-500 flex items-center justify-center text-[7px] text-white font-bold">
                🔥
              </span>
            </span>
            <div className="px-3 py-1 bg-red-500/15 border border-red-500/30 rounded-full text-[10px] font-black uppercase tracking-[0.2em] text-red-400 animate-pulse">
              ÉVÉNEMENT EN COURS
            </div>
            
            <div className="px-2.5 py-1 bg-yellow-500/10 border border-yellow-500/20 rounded-full text-[10px] font-bold uppercase tracking-wider text-yellow-400 flex items-center gap-1">
              <Trophy size={10} />
              <span>Conversion</span>
            </div>
          </div>

          {/* Grand Texte: Reward */}
          <div className="space-y-1">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tighter text-white uppercase italic flex flex-wrap items-center gap-x-2">
              <span className="font-sans">🏆 Gagne</span>
              <span className="bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-500 bg-clip-text text-transparent font-mono font-black drop-shadow-[0_0_15px_rgba(234,179,8,0.2)]">
                {formattedReward}
              </span>
            </h2>
            {/* Sous-texte */}
            <p className="text-neutral-200 text-sm sm:text-base font-bold tracking-tight">
              Transforme tes visites en ventes et monte dans le classement.
            </p>
          </div>

          {/* Petit texte */}
          <div className="flex items-center gap-1.5 text-xs font-semibold text-purple-300/90 font-sans">
            <Crown size={12} className="text-purple-400 animate-bounce" />
            <span>Une récompense mystère attend aussi le Top 5 👀</span>
          </div>
        </div>

        {/* Buttons Action Container */}
        <div className="flex flex-col sm:flex-row md:flex-col gap-3 w-full md:w-auto shrink-0 z-10">
          {/* CTA Principal : Participer maintenant */}
          <button
            onClick={onParticipate}
            className="px-6 py-4 rounded-xl bg-gradient-to-r from-yellow-500 via-amber-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 text-black font-black text-xs uppercase tracking-[0.15em] transition-all duration-300 transform active:scale-95 shadow-[0_4px_25px_rgba(234,179,8,0.4)] flex items-center justify-center gap-2 cursor-pointer group/btn"
          >
            <span>⚔️ Participer maintenant</span>
            <ArrowRight size={13} className="group-hover/btn:translate-x-1 transition-transform" />
          </button>

          {/* CTA Secondaire : Voir les meilleurs vendeurs */}
          <button
            onClick={onSeeLeaderboard}
            className="px-6 py-3.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-white border border-white/10 font-black text-[10px] uppercase tracking-[0.15em] transition-all duration-300 transform active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Crown size={12} className="text-yellow-500" />
            <span>👑 Voir les meilleurs vendeurs</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
};
