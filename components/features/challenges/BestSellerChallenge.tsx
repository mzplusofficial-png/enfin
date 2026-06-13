import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, 
  Crown, 
  Clock, 
  Flame, 
  TrendingUp, 
  Share2, 
  Sparkles, 
  AlertCircle, 
  Eye, 
  Calculator, 
  ChevronRight, 
  HelpCircle, 
  PlusCircle, 
  Zap, 
  Users, 
  Coins, 
  ArrowLeft,
  X,
  CheckCircle,
  Copy,
  ShoppingBag
} from 'lucide-react';
import { UserProfile } from '../../../types';
import { supabase } from '../../../services/supabase';
import confetti from 'canvas-confetti';
import { useCurrency } from '../../../hooks/useCurrency.ts';

interface BestSellerChallengeProps {
  profile: UserProfile | null;
  onBackToDashboard?: () => void;
  onLoginClick?: () => void;
}

// Low egress static but realistic contestants for the Best Seller challenge
const LEADERBOARD_CONTESTANTS = [
  {
    rank: 1,
    name: "Sékou Sangaré",
    country: "🇨🇮 Côte d'Ivoire",
    sales: 42,
    visits: 212,
    conversionRate: 19.81,
    isCurrentUser: false,
    avatarColor: "from-yellow-400 to-amber-600",
  },
  {
    rank: 2,
    name: "Aladji Diop",
    country: "🇸🇳 Sénégal",
    sales: 31,
    visits: 195,
    conversionRate: 15.90,
    isCurrentUser: false,
    avatarColor: "from-purple-500 to-indigo-600",
  },
  {
    rank: 3,
    name: "Fabiola K.",
    country: "🇨🇲 Cameroun",
    sales: 22,
    visits: 148,
    conversionRate: 14.86,
    isCurrentUser: false,
    avatarColor: "from-pink-500 to-rose-600",
  },
  {
    rank: 4,
    name: "Dimitri Somé",
    country: "🇧🇫 Burkina Faso",
    sales: 19,
    visits: 151,
    conversionRate: 12.58,
    isCurrentUser: false,
    avatarColor: "from-emerald-500 to-teal-600",
  },
  {
    rank: 5,
    name: "Mariama Touré",
    country: "🇬🇳 Guinée",
    sales: 14,
    visits: 122,
    conversionRate: 11.48,
    isCurrentUser: false,
    avatarColor: "from-blue-500 to-purple-600",
  }
];

// Synth chime function for interactions (low level Web Audio API)
const playChime = (type: 'success' | 'click' | 'power') => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    if (type === 'success') {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);
      
      osc1.type = 'sine';
      osc2.type = 'sine';
      
      osc1.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
      osc2.frequency.setValueAtTime(783.99, ctx.currentTime); // G5
      
      osc1.frequency.setValueAtTime(1046.50, ctx.currentTime + 0.12); // C6
      osc2.frequency.setValueAtTime(1318.51, ctx.currentTime + 0.12); // E6
      
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      
      osc1.start(ctx.currentTime);
      osc2.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 0.5);
      osc2.stop(ctx.currentTime + 0.5);
    } else if (type === 'click') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(500, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.15);
    } else if (type === 'power') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.4);
      
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(300, ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(2000, ctx.currentTime + 0.4);
      
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.4);
    }
  } catch(e) {
    // Audio Context blocked or fails
  }
};

export const BestSellerChallenge: React.FC<BestSellerChallengeProps> = ({ 
  profile, 
  onBackToDashboard,
  onLoginClick
}) => {
  const { currency, rates } = useCurrency();
  
  // Custom captivating currency algorithm: converts 20 000 XAF dynamically, avoids commas or trailing decimals, adds elegant space separator.
  const getCaptivatingAmount = (amountXAF: number) => {
    const rate = rates[currency] || 1;
    const converted = Math.round(amountXAF / rate);
    // Format elegantly (no commas, space separated)
    const spaced = converted.toLocaleString('fr-FR').replace(/,/g, ' ').replace(/\s+/g, ' ');
    // Handle specific display names nicely
    let label = currency;
    if (currency === 'XOF' || currency === 'XAF') {
      label = 'FCFA';
    }
    return `${spaced} ${label}`;
  };

  const formattedReward = getCaptivatingAmount(20000);

  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);
  
  // Real stats if logged in & Leaderboard states with 2-hour caching gate
  const [leaderboard, setLeaderboard] = useState<any[]>(LEADERBOARD_CONTESTANTS);
  const [userStats, setUserStats] = useState<{ visits: number; sales: number; conversion: number } | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [lastUpdatedTime, setLastUpdatedTime] = useState<string>('');
  const [liveLog, setLiveLog] = useState<{ text: string; time: string } | null>(null);

  // Sunday deadline calculation logic (Ends Sunday at 21:00)
  const getNextSundayDeadline = () => {
    const now = new Date();
    const resultDate = new Date(now);
    const day = now.getDay(); // 0 is Sunday, 1 is Monday ... 6 is Saturday
    const diff = day === 0 ? 0 : 7 - day;
    resultDate.setDate(now.getDate() + diff);
    resultDate.setHours(21, 0, 0, 0);
    
    // If it is Sunday and we are past 21:00, target the next Sunday at 21:00
    if (day === 0 && now.getTime() > resultDate.getTime()) {
      resultDate.setDate(now.getDate() + 7);
      resultDate.setHours(21, 0, 0, 0);
    }
    return resultDate.getTime();
  };

  useEffect(() => {
    // Dynamic countdown calculation
    const targetTime = getNextSundayDeadline();
    
    const updateCountdown = () => {
      const now = new Date().getTime();
      const distance = targetTime - now;
      
      if (distance < 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }
      
      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);
      
      setTimeLeft({ days, hours, minutes, seconds });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  // Soft mockup logs that tick occasionally to show intense gamified energy (pure client logic)
  useEffect(() => {
    const logs = [
      "Ibrahim S. vient de générer son lien publicitaire MZ+ 🚀",
      "Mariama T. est passée à 11.48% de conversion ! 🔥",
      "Sékou S. vient d'enregistrer une vente boutique ! 💰",
      "Nouvelle visite détectée sur la boutique d'Aladji D. ⚡",
      "Valérie M. a franchi le cap des 50 visites qualitatives ! 👀",
      "Un utilisateur vient de débloquer la masterclass sur WhatsApp Business 🧠",
      "Mr. YAMIS encourage ses filleuls à augmenter leurs conversions !"
    ];

    const triggerLog = () => {
      const rand = Math.floor(Math.random() * logs.length);
      const now = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setLiveLog({ text: logs[rand], time: now });
    };

    triggerLog();
    const interval = setInterval(triggerLog, 12000); // 12 seconds avoids fast flashing or stress
    return () => clearInterval(interval);
  }, []);

  // Fetch real statistics with defensive caching gating (reads/upserts only allowed once every 10 seconds to protect database while keeping it ultra-fluent)
  const loadData = useCallback(async (forceRefetch = false) => {
    setLoadingStats(true);
    const activeUserId = profile?.id;
    const cacheKey = activeUserId ? `mz_bestseller_challenge_cache_data_${activeUserId}` : 'mz_bestseller_challenge_cache_data_guest';
    const cacheStr = localStorage.getItem(cacheKey);
    
    const nowMs = Date.now();
    let parseCache: any = null;
    if (cacheStr) {
      try {
        parseCache = JSON.parse(cacheStr);
      } catch (e) {
        parseCache = null;
      }
    }
    
    // Cache Gate: 10 seconds to prevent fast hammering while keeping it fresh
    const CACHE_DURATION = 10000;
    if (!forceRefetch && parseCache && parseCache.timestamp && (nowMs - parseCache.timestamp < CACHE_DURATION)) {
      console.log("Loading Best Seller stats & Leaderboard from 10-second cache");
      if (parseCache.leaderboard) {
        setLeaderboard(parseCache.leaderboard);
      }
      if (parseCache.userStats) {
        setUserStats(parseCache.userStats);
      }
      const timeStr = new Date(parseCache.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      setLastUpdatedTime(timeStr);
      setLoadingStats(false);
      return;
    }
    
    // Fetch fresh database records
    let fetchedLeaderboard: any[] = [];
    let finalUserStats = { visits: 0, sales: 0, conversion: 0 };
    
    let dbUsersList: any[] = [];
    let dbAllClicks: any[] = [];
    let dbAllSales: any[] = [];
    
    try {
      // 1. Fetch users profiles
      const { data: uData, error: uErr } = await supabase
        .from('users')
        .select('id, full_name, country_code');
      if (!uErr && uData) dbUsersList = uData;
    } catch (e) {
      console.warn("Could not load users list:", e);
    }

    try {
      // 2. Fetch public clicks
      const { data: cData, error: cErr } = await supabase
        .from('product_stats')
        .select('user_id, clicks');
      if (!cErr && cData) dbAllClicks = cData;
    } catch (e) {
      console.warn("Could not load product clicks:", e);
    }

    try {
      // 3. Fetch public completed or approved commissions (only validated sales, excluding 'pending' which represents initial clicks)
      const { data: sData, error: sErr } = await supabase
        .from('commissions')
        .select('user_id, status')
        .in('status', ['approved', 'finalized']);
      if (!sErr && sData) dbAllSales = sData;
    } catch (e) {
      console.warn("Could not load commissions list:", e);
    }

    // Process and aggregate stats
    const clicksByUser: Record<string, number> = {};
    dbAllClicks.forEach(item => {
      if (item.user_id) {
        clicksByUser[item.user_id] = (clicksByUser[item.user_id] || 0) + (item.clicks || 0);
      }
    });

    const salesByUser: Record<string, number> = {};
    dbAllSales.forEach(item => {
      if (item.user_id) {
        salesByUser[item.user_id] = (salesByUser[item.user_id] || 0) + 1;
      }
    });

    const activeCompetitors: any[] = [];
    dbUsersList.forEach(user => {
      const clicks = clicksByUser[user.id] || 0;
      const sales = salesByUser[user.id] || 0;
      const visits = Math.max(clicks, sales);
      const conversionRate = visits > 0 ? parseFloat(((sales / visits) * 100).toFixed(2)) : 0.0;
      
      if (visits > 0 || sales > 0) {
        activeCompetitors.push({
          rank: 0,
          name: user.full_name || 'Anonyme',
          country: user.country_code ? `${user.country_code}` : '🌍 Afrique',
          sales: sales,
          visits: visits,
          conversionRate: conversionRate,
          isCurrentUser: activeUserId ? user.id === activeUserId : false,
          avatarColor: "from-[#1f1f1d] to-[#121211]"
        });
      }
    });

    // Handle current user stats integration
    if (activeUserId) {
      const userClicks = clicksByUser[activeUserId] || 0;
      const userSales = salesByUser[activeUserId] || 0;
      const userVisits = Math.max(userClicks, userSales);
      const userConv = userVisits > 0 ? parseFloat(((userSales / userVisits) * 100).toFixed(2)) : 0.0;
      
      finalUserStats = {
        visits: userVisits,
        sales: userSales,
        conversion: userConv
      };
      setUserStats(finalUserStats);
      
      // Upsert stats of user to live challenger database
      try {
        await supabase
          .from('mz_best_seller_challenge')
          .upsert({
            user_id: activeUserId,
            full_name: profile?.full_name || 'Anonyme',
            country: profile?.country_code ? `${profile.country_code}` : '🌍 Afrique',
            visits: userVisits,
            sales: userSales,
            conversion_rate: userConv,
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id' });
      } catch (upsertErr) {
        console.warn("Best seller challenge live-db sync fail (safely bypassed):", upsertErr);
      }
    }

    // Ensure the current user is always listed even with 0 visits
    if (activeUserId && profile) {
      const alreadyIn = activeCompetitors.some(c => c.isCurrentUser);
      if (!alreadyIn) {
        activeCompetitors.push({
          rank: 0,
          name: profile.full_name || 'Vous',
          country: profile.country_code ? `${profile.country_code}` : '🌍 Afrique',
          sales: finalUserStats.sales,
          visits: finalUserStats.visits,
          conversionRate: finalUserStats.conversion,
          isCurrentUser: true,
          avatarColor: "from-yellow-400 via-pink-500 to-purple-600"
        });
      }
    }

    // Merge mock contestants to keep leaderboard active.
    // To prevent duplication, exclude any mock contestant with the exact same name as a DB user.
    const activeNames = new Set(activeCompetitors.map((u) => u.name.trim().toLowerCase()));
    const cleanMockContestants = LEADERBOARD_CONTESTANTS.filter(
      (c) => !activeNames.has(c.name.trim().toLowerCase())
    ).map(c => ({
      ...c,
      isCurrentUser: false
    }));

    fetchedLeaderboard = [...activeCompetitors, ...cleanMockContestants];
    
    // Sort logic perfectly adapted:
    // - Positive conversion rates are sorted descending by conversionRate.
    // - If both rates are equal or are 0.00% (or zero), compare by visits descending to determine rank!
    fetchedLeaderboard.sort((a, b) => {
      const aConv = a.conversionRate || 0;
      const bConv = b.conversionRate || 0;
      
      if (aConv > 0 && bConv > 0) {
        if (bConv !== aConv) {
          return bConv - aConv;
        }
        return b.visits - a.visits;
      }
      
      if (aConv > 0 && bConv === 0) return -1;
      if (aConv === 0 && bConv > 0) return 1;
      
      // If both conversion rates are equal to 0, compare based on visits descending
      return b.visits - a.visits;
    });

    // Re-assign sequential rank numbers and appropriate colors after sort
    fetchedLeaderboard.forEach((item, idx) => {
      item.rank = idx + 1;
      if (item.isCurrentUser) {
        item.avatarColor = "from-yellow-400 via-pink-500 to-purple-600";
      } else if (idx === 0) {
        item.avatarColor = "from-yellow-400 to-amber-600";
      } else {
        item.avatarColor = "from-[#1f1f1d] to-[#121211]";
      }
    });
    
    setLeaderboard(fetchedLeaderboard);
    
    // Save results to cache payload
    const cachePayload = {
      timestamp: nowMs,
      leaderboard: fetchedLeaderboard,
      userStats: finalUserStats
    };
    localStorage.setItem(cacheKey, JSON.stringify(cachePayload));
    const timeStr = new Date(nowMs).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    setLastUpdatedTime(timeStr);
    setLoadingStats(false);
  }, [profile?.id, profile?.full_name, profile?.country_code]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCopyChallengeUrl = () => {
    playChime('click');
    const challengeUrl = `${window.location.origin}/challenge/meilleur-vendeur${profile?.referral_code ? `?ref=${profile.referral_code}` : ''}`;
    navigator.clipboard.writeText(challengeUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleCopyStoreUrl = () => {
    playChime('click');
    const storeUrl = `${window.location.origin}/?store=${profile?.referral_code || 'elite'}`;
    navigator.clipboard.writeText(storeUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const triggerVictoryConfetti = () => {
    playChime('power');
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#FFD700', '#FF8C00', '#8A2BE2', '#FFFFFF']
    });
  };



  return (
    <div className="min-h-screen bg-[#030303] text-white selection:bg-purple-600 selection:text-white font-sans overflow-x-hidden relative">
      {/* Absolute high quality noise overlays/grids */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#151515_1px,transparent_1px),linear-gradient(to_bottom,#151515_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-30 pointer-events-none" />
      <div className="absolute top-0 left-1/4 -translate-y-1/2 w-[800px] h-[400px] bg-purple-600/10 blur-[140px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 translate-y-1/2 w-[600px] h-[300px] bg-yellow-500/5 blur-[120px] rounded-full pointer-events-none" />

      {/* STICKY HEADER */}
      <header className="sticky top-0 z-50 bg-[#030303]/80 backdrop-blur-xl border-b border-white/[0.08] px-4 md:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onBackToDashboard ? (
            <button 
              onClick={() => {
                playChime('click');
                onBackToDashboard();
              }}
              className="p-1 px-2 text-neutral-400 hover:text-white hover:bg-white/[0.05] rounded-lg transition-all text-xs flex items-center gap-1.5 border border-white/5"
            >
              <ArrowLeft size={14} />
              <span>Retour</span>
            </button>
          ) : (
            <a 
              href="/"
              className="p-1 px-2 text-neutral-400 hover:text-white hover:bg-white/[0.05] rounded-lg transition-all text-xs flex items-center gap-1.5 border border-white/5"
            >
              <ArrowLeft size={14} />
              <span>Plateforme MZ+</span>
            </a>
          )}
          <span className="h-4 w-px bg-white/10 hidden sm:block" />
          <div className="hidden sm:flex items-center gap-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[10px] uppercase tracking-wider font-mono text-neutral-400">Contest Live Actif</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={triggerVictoryConfetti}
            className="hidden xs:flex items-center gap-1.5 text-xs bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 font-black px-2.5 py-1.5 rounded-lg border border-yellow-500/20 transition-all cursor-default"
          >
            <Crown size={13} className="animate-bounce" />
            <span className="font-mono tracking-wider">{formattedReward} En Jeu</span>
          </motion.button>

          {!profile && onLoginClick && (
            <button 
              onClick={onLoginClick}
              className="bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs px-4 py-1.5 rounded-lg transition-transform focus:ring-2 focus:ring-purple-400"
            >
              Se connecter
            </button>
          )}
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative pt-12 pb-8 px-4 max-w-7xl mx-auto flex flex-col items-center text-center">
        {/* Prestigious badge */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-900/40 to-pink-900/40 border border-purple-500/30 px-3.5 py-1.5 rounded-full text-xs font-semibold text-purple-200 tracking-wide uppercase mb-6 shadow-[0_0_20px_rgba(168,85,247,0.15)]"
        >
          <Zap size={13} className="text-pink-400 animate-pulse" />
          <span>Challenge Exclusif d&apos;Affiliation</span>
        </motion.div>

        {/* Competition Title */}
        <motion.h1 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight leading-none text-white max-w-4xl"
        >
          🏆⚔️ <span className="bg-gradient-to-r from-amber-200 via-yellow-400 to-pink-500 bg-clip-text text-transparent">CHALLENGE DU MEILLEUR VENDEUR MZ+</span> ⚔️🏆
        </motion.h1>

        {/* MAGNIFICENT MARKETING BANNER PROMOTING THE PRIZE */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="mt-8 relative overflow-hidden bg-gradient-to-b from-[#1c120c] via-[#0f0a05] to-[#050402] border border-yellow-500/30 rounded-3xl p-6 md:p-8 max-w-2xl w-full shadow-[0_0_50px_rgba(234,179,8,0.12)] group flex flex-col items-center"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-400/10 blur-3xl rounded-full" />
          <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-amber-500/10 blur-2xl rounded-full" />
          
          <div className="w-16 h-16 bg-gradient-to-br from-yellow-400/20 to-amber-500/20 rounded-full border border-yellow-500/40 flex items-center justify-center text-3xl mb-4 shadow-[0_0_20px_rgba(234,179,8,0.25)]">
            🏆
          </div>
          
          <span className="text-[10px] tracking-wider uppercase font-mono text-yellow-400 font-extrabold block mb-1">
            Le Champion Suprême (Top 1)
          </span>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white leading-none">
            Gagne <span className="bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-500 bg-clip-text text-transparent font-black font-mono tracking-wider">{formattedReward}</span> Cash !
          </h2>
          
          <p className="mt-4 text-sm sm:text-base text-neutral-200 font-bold max-w-md">
            Sois le premier du classement avant dimanche ce soir et obtiens ta récompense !
          </p>

          <span className="text-[11px] text-neutral-400 block mt-3 border-t border-white/5 pt-3 w-full text-center">
            ⚡ Virement instantané par MTN, Orange, Moov ou Wave, payé dimanche dès 21h00 précises.
          </span>
        </motion.div>

        {/* Sunday Countdown display */}
        {timeLeft && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-8 bg-neutral-900/60 border border-white/[0.08] backdrop-blur-md rounded-2xl p-4 sm:p-5 max-w-md w-full flex flex-col items-center"
          >
            <div className="flex items-center gap-1.5 text-xs text-neutral-400 uppercase tracking-widest font-mono mb-3">
              <Clock size={12} className="text-amber-500" />
              <span>Contest se terminant dimanche à 21h00</span>
            </div>
            
            <div className="flex gap-4 sm:gap-6 justify-center">
              <div className="flex flex-col items-center">
                <span className="text-2xl sm:text-3xl font-black text-amber-400 font-mono">{timeLeft.days}</span>
                <span className="text-[10px] uppercase text-neutral-400 font-medium">Jours</span>
              </div>
              <div className="text-2xl font-bold text-neutral-500">:</div>
              <div className="flex flex-col items-center">
                <span className="text-2xl sm:text-3xl font-black text-white font-mono">{String(timeLeft.hours).padStart(2, '0')}</span>
                <span className="text-[10px] uppercase text-neutral-400 font-medium font-mono">H</span>
              </div>
              <div className="text-2xl font-bold text-neutral-500">:</div>
              <div className="flex flex-col items-center">
                <span className="text-2xl sm:text-3xl font-black text-white font-mono">{String(timeLeft.minutes).padStart(2, '0')}</span>
                <span className="text-[10px] uppercase text-neutral-400 font-medium font-mono">Min</span>
              </div>
              <div className="text-2xl font-bold text-neutral-500">:</div>
              <div className="flex flex-col items-center">
                <span className="text-2xl sm:text-3xl font-black text-pink-500 font-mono animate-pulse">{String(timeLeft.seconds).padStart(2, '0')}</span>
                <span className="text-[10px] uppercase text-neutral-400 font-medium font-mono">Sec</span>
              </div>
            </div>
          </motion.div>
        )}
      </section>

      {/* REAL-TIME GAMIFIED FEEDBACK TICKER */}
      {liveLog && (
        <div className="bg-gradient-to-r from-transparent via-purple-950/20 to-transparent border-y border-purple-500/10 py-2 text-center text-xs text-purple-300 font-medium flex items-center justify-center gap-2 overflow-hidden px-4">
          <Flame size={13} className="text-orange-500 animate-pulse shrink-0" />
          <AnimatePresence mode="wait">
            <motion.span 
              key={liveLog.text}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="inline-block"
            >
              {liveLog.text} <span className="text-neutral-500 text-[10px] ml-1 font-mono">[{liveLog.time}]</span>
            </motion.span>
          </AnimatePresence>
        </div>
      )}

      {/* CORE SYSTEM GRID LAYOUT */}
      <main className="max-w-7xl mx-auto px-4 py-12 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: VISUAL STATUS & PERSONAL METRICS (5 COLS) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          
          {/* STATUT DÉTERMINATION & COMPORTEMENT EN DIRECT */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="bg-[#0c0c0c]/80 border border-white/[0.06] rounded-3xl p-6"
          >
            <h3 className="text-sm font-bold flex items-center gap-1.5 text-neutral-300 pb-3 border-b border-white/5 mb-4">
              <TrendingUp size={15} className="text-purple-400" />
              <span>Votre Statut Actuel Réel</span>
            </h3>

            {profile ? (
              <div className="space-y-4">
                {/* Dynamic user rank badge */}
                {(() => {
                  const currentUserEntry = leaderboard.find(c => c.isCurrentUser);
                  const userRank = currentUserEntry?.rank;
                  const isQualified = userRank && userRank === 1;
                  
                  return (
                    <div className={`p-4 rounded-2xl border text-center ${
                      isQualified
                        ? 'bg-yellow-500/10 border-yellow-500/30 shadow-[0_0_15px_rgba(234,179,8,0.05)]'
                        : 'bg-purple-950/10 border-purple-500/20'
                    }`}>
                      <span className="text-[10px] uppercase font-mono text-neutral-400 block tracking-wider">Votre Position Officielle</span>
                      {userRank ? (
                        <div className="mt-1">
                          <span className="text-3xl font-black text-white font-mono">#{userRank}</span>
                          <span className="text-xs block text-neutral-400 mt-1">
                            {isQualified 
                              ? "🏆 Félicitations ! Vous êtes le Champion Suprême #1 !" 
                              : "📈 Classement actif. Boostez votre conversion pour décrocher la 1ère place du Champion !"}
                          </span>
                        </div>
                      ) : (
                        <div className="mt-1 text-xs text-neutral-400 py-1 font-medium">
                          Inscrit(e) au challenge. Synchronisez pour rafraîchir vos scores !
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Instant refresh panel */}
                <div className="pt-2 flex flex-col gap-2">
                  <button 
                    onClick={() => {
                       playChime('click');
                       loadData(true);
                    }}
                    disabled={loadingStats}
                    className="w-full bg-neutral-950 hover:bg-neutral-900 border border-white/10 text-neutral-300 font-mono text-[11px] py-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 hover:border-purple-500/30"
                  >
                    <span>🔄 Synchroniser mes statistiques</span>
                  </button>
                  {lastUpdatedTime && (
                    <div className="text-[10px] text-neutral-500 font-mono text-center">
                      Dernière vérification Supabase : <span className="text-purple-400 font-bold">{lastUpdatedTime}</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center p-6 text-xs text-neutral-500 leading-relaxed">
                Connectez-vous pour voir vos statistiques réelles de boutique en temps réel.
              </div>
            )}
          </motion.div>

          {/* MY PERSONAL COMPETITOR STATISTICS CARD */}
          {profile ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-neutral-900/40 border border-white/[0.08] rounded-3xl p-6 relative overflow-hidden"
            >
              {/* background vector subtle badge */}
              <div className="absolute top-3 right-3 text-white/[0.02] transform rotate-12">
                <Crown size={120} />
              </div>

              <div className="flex items-center gap-3.5">
                <div className={`w-12 h-12 rounded-full bg-gradient-to-tr from-purple-600 via-pink-500 to-amber-500 p-0.5`}>
                  <div className="w-full h-full bg-[#0a0a0a] rounded-full flex items-center justify-center font-bold text-sm text-purple-200">
                    {profile.full_name ? profile.full_name.substring(0, 2).toUpperCase() : "ME"}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] tracking-wider uppercase font-mono text-purple-400 font-bold block">Votre classement personnel</span>
                  <h3 className="text-lg font-black text-white">{profile.full_name || "Ambassadeur d'Élite"}</h3>
                </div>
              </div>

              {loadingStats ? (
                <div className="mt-6 flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-500" />
                </div>
              ) : userStats ? (
                <div className="mt-6 grid grid-cols-3 gap-3">
                  <div className="bg-neutral-950 p-3 rounded-2xl border border-white/5 text-center">
                    <span className="text-[10px] text-neutral-400 block uppercase font-mono tracking-wider">Visiteurs</span>
                    <span className="text-xl font-mono font-black text-white mt-1 block">{userStats.visits}</span>
                  </div>
                  <div className="bg-neutral-950 p-3 rounded-2xl border border-white/5 text-center">
                    <span className="text-[10px] text-neutral-400 block uppercase font-mono tracking-wider">Ventes</span>
                    <span className="text-xl font-mono font-black text-white mt-1 block">{userStats.sales}</span>
                  </div>
                  <div className="bg-[#110515] p-3 rounded-2xl border border-purple-500/20 text-center">
                    <span className="text-[10px] text-purple-400 block uppercase font-mono tracking-wider">Taux Actuel</span>
                    <span className="text-xl font-mono font-black text-purple-400 mt-1 block">{userStats.conversion}%</span>
                  </div>
                </div>
              ) : null}

              <div className="mt-6 space-y-3">
                <div className="p-3 bg-[#0c0a0f] rounded-xl border border-purple-500/10 flex items-start gap-2 text-xs">
                  <AlertCircle size={15} className="text-purple-400 shrink-0 mt-0.5" />
                  <p className="text-neutral-300 leading-relaxed">
                    Pour optimiser vos scores, diffusez votre lien d&apos;affiliation dans des communautés ultra-ciblées (Groupes Facebook spécifiques, statuts WhatsApp engageants, etc.). Évitez le spam massif inutile.
                  </p>
                </div>

                {/* Quick actions for ambassador */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                  <button 
                    onClick={handleCopyStoreUrl}
                    className="relative group bg-[#111111] hover:bg-neutral-800 border border-white/10 py-2.5 px-4 rounded-xl text-xs font-semibold text-neutral-200 transition-all flex items-center justify-center gap-2"
                  >
                    {copied ? (
                      <>
                        <CheckCircle size={14} className="text-emerald-400 animate-bounce" />
                        <span className="text-emerald-400">Lien copié !</span>
                      </>
                    ) : (
                      <>
                        <Copy size={13} className="text-neutral-500" />
                        <span>Copier mon lien de boutique</span>
                      </>
                    )}
                  </button>

                  <button 
                    onClick={handleCopyChallengeUrl}
                    className="relative group bg-gradient-to-r from-purple-800 to-purple-600 hover:from-purple-700 hover:to-purple-500 py-2.5 px-4 rounded-xl text-xs font-bold text-white transition-all flex items-center justify-center gap-2 shadow-[0_4px_15px_rgba(147,51,234,0.3)]"
                  >
                    {copiedUrl ? (
                      <>
                        <CheckCircle size={14} className="text-white animate-bounce" />
                        <span>Lien du challenge copié !</span>
                      </>
                    ) : (
                      <>
                        <Share2 size={13} className="text-white" />
                        <span>Partager ce challenge</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-gradient-to-r from-purple-950/10 to-neutral-900 border border-purple-500/20 rounded-3xl p-6 text-center"
            >
              <Users className="mx-auto text-purple-400 mb-3" size={24} />
              <h4 className="text-base font-bold text-white">Vous souhaitez participer et obtenir vos propres statistiques ?</h4>
              <p className="text-xs text-neutral-400 mt-2 max-w-md mx-auto">
                Connectez-vous à votre compte MZ+ pour activer votre boutique ambassadeur, enregistrer vos propres indicateurs et suivre votre progression.
              </p>
              {onLoginClick && (
                <button 
                  onClick={() => {
                    playChime('click');
                    onLoginClick();
                  }}
                  className="mt-4 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all"
                >
                  Accéder à mon espace
                </button>
              )}
            </motion.div>
          )}
        </div>


        {/* RIGHT COLUMN: CURRENT LIVE STANDINGS (7 COLS) */}
        <div className="lg:col-span-7 flex flex-col gap-6">

          {/* STANDINGS LIVE BOARD CARD */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-[#0a0a0a]/90 border border-white/[0.08] rounded-3xl p-6"
          >
            <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
              <h3 className="text-base font-extrabold flex items-center gap-2">
                <Crown className="text-yellow-400" size={16} />
                <span>Leaderboard Officiel de Détermination</span>
              </h3>
              <span className="text-[9px] font-mono uppercase bg-neutral-900 text-neutral-400 px-2 py-0.5 rounded border border-white/5">Mis à jour en continu</span>
            </div>

            {/* Headers titles */}
            <div className="grid grid-cols-12 text-[9px] font-mono uppercase text-neutral-500 tracking-wider font-bold mb-3 px-3">
              <span className="col-span-1 text-center">R</span>
              <span className="col-span-5 pl-1">Vendeur</span>
              <span className="col-span-2 text-center">Visites</span>
              <span className="col-span-2 text-center">Ventes</span>
              <span className="col-span-2 text-right">Taux (%)</span>
            </div>

            {/* Competitors List */}
            <div className="space-y-2.5">
              {leaderboard.map((contestant) => {
                const isGold = contestant.rank === 1;
                const isSilver = contestant.rank === 2;
                const isBronze = contestant.rank === 3;
                
                return (
                  <motion.div 
                    key={contestant.name + contestant.rank}
                    whileHover={{ scale: 1.01, backgroundColor: 'rgba(255,255,255,0.02)' }}
                    className={`grid grid-cols-12 items-center p-3 rounded-2xl border transition-all ${
                      contestant.isCurrentUser 
                        ? 'border-purple-500/40 bg-purple-500/[0.02] shadow-[0_0_15px_rgba(168,85,247,0.05)]' 
                        : isGold 
                          ? 'border-yellow-500/20 bg-yellow-500/[0.01]' 
                          : 'border-white/[0.04] bg-[#0c0c0c]/40'
                    }`}
                  >
                    {/* Rank Indicator */}
                    <div className="col-span-1 flex justify-center">
                      {isGold ? (
                        <div className="w-6 h-6 bg-yellow-400/20 text-yellow-400 border border-yellow-500/30 rounded-full flex items-center justify-center font-bold text-xs">
                          👑
                        </div>
                      ) : isSilver ? (
                        <div className="w-5 h-5 bg-neutral-400/20 text-neutral-300 border border-neutral-400/20 rounded-full flex items-center justify-center font-bold text-xs">
                          2
                        </div>
                      ) : isBronze ? (
                        <div className="w-5 h-5 bg-amber-700/20 text-amber-500 border border-amber-800/20 rounded-full flex items-center justify-center font-bold text-xs">
                          3
                        </div>
                      ) : (
                        <span className="font-mono text-xs text-neutral-500 font-bold">{contestant.rank}</span>
                      )}
                    </div>

                    {/* Left details avatar + Name */}
                    <div className="col-span-5 pl-2 flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-full bg-gradient-to-tr ${contestant.avatarColor || 'from-neutral-700 to-neutral-800'} p-0.5 shrink-0`}>
                        <div className="w-full h-full bg-[#0d0d0c] rounded-full flex items-center justify-center font-bold text-[10px] text-white">
                          {contestant.name.substring(0, 2).toUpperCase()}
                        </div>
                      </div>
                      <div className="min-w-0 pr-1">
                        <span className="text-xs font-bold text-neutral-200 block truncate leading-tight">
                          {contestant.name}
                          {contestant.isCurrentUser && (
                            <span className="ml-1 bg-purple-500/20 border border-purple-500/30 text-[8px] text-purple-300 font-bold px-1.5 py-0.2 rounded-full uppercase">Vous</span>
                          )}
                        </span>
                        <span className="text-[9px] text-neutral-500 block truncate mt-0.5">{contestant.country}</span>
                      </div>
                    </div>

                    {/* Visits */}
                    <div className="col-span-2 text-center text-xs font-mono text-neutral-400 font-medium">
                      {contestant.visits}
                    </div>

                    {/* Sales */}
                    <div className="col-span-2 text-center text-xs font-mono text-neutral-300 font-bold flex items-center justify-center gap-0.5">
                      <span>{contestant.sales}</span>
                      <ShoppingBag size={9} className="text-neutral-500 hidden sm:inline" />
                    </div>

                    {/* Conversion Rate */}
                    <div className="col-span-2 text-right font-mono text-xs font-extrabold pr-1">
                      <span className={
                        isGold 
                          ? 'text-yellow-400' 
                          : isSilver 
                            ? 'text-neutral-200' 
                            : isBronze 
                              ? 'text-amber-500' 
                              : contestant.isCurrentUser 
                                ? 'text-purple-400' 
                                : 'text-neutral-400'
                      }>
                        {contestant.conversionRate}%
                      </span>
                    </div>

                  </motion.div>
                );
              })}
            </div>

            {/* Quick motivation note */}
            <p className="text-[10px] text-neutral-500 text-center leading-relaxed mt-5">
              * Taux calculés sur la base des flux récents sur l&apos;ensemble du réseau d&apos;affiliation. Le calcul est géré de façon à éviter toute surcharge ou interrogation superflue de la base centrale.
            </p>
          </motion.div>
        </div>

      </main>

      {/* STRATEGIC CONVERSION TIPS */}
      <section className="bg-neutral-950 py-12 px-4 border-t border-white/[0.06] mt-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-xl sm:text-2xl font-black text-white">🎓 3 Clés Pour Exploser Votre Taux De Conversion</h2>
            <p className="text-xs text-neutral-400 mt-2">N&apos;envoyez pas de simples visiteurs, envoyez des personnes à la recherche d&apos;opportunités réelles.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-neutral-900/40 border border-white/[0.04] p-5 rounded-2xl">
              <div className="w-9 h-9 bg-purple-500/10 rounded-xl flex items-center justify-center border border-purple-500/20 text-purple-400 mb-4 font-bold font-mono">01</div>
              <h4 className="text-sm font-bold text-white">Le Ciblage Hyper-Qualifié</h4>
              <p className="text-xs text-neutral-400 leading-relaxed mt-2">
                Plutôt que de publier sur des groupes génériques de spam, ciblez les statuts d&apos;utilisateurs qui débattent déjà de stratégies en ligne ou recherchent activement un complément.
              </p>
            </div>

            <div className="bg-neutral-900/40 border border-white/[0.04] p-5 rounded-2xl">
              <div className="w-9 h-9 bg-pink-500/10 rounded-xl flex items-center justify-center border border-pink-500/20 text-pink-400 mb-4 font-bold font-mono">02</div>
              <h4 className="text-sm font-bold text-white">Le Storytelling Émotionnel</h4>
              <p className="text-xs text-neutral-400 leading-relaxed mt-2">
                Utilisez les faits authentiques des membres de la communauté (comme les 350K gagnés par soufa bakari). Expliquez comment la méthode les a sortis d&apos;impasse.
              </p>
            </div>

            <div className="bg-neutral-900/40 border border-white/[0.04] p-5 rounded-2xl">
              <div className="w-9 h-9 bg-amber-500/10 rounded-xl flex items-center justify-center border border-amber-500/20 text-amber-500 mb-4 font-bold font-mono">03</div>
              <h4 className="text-sm font-bold text-white">Le Suivi Individualisé</h4>
              <p className="text-xs text-neutral-400 leading-relaxed mt-2">
                Discutez avec vos contacts intéressés avant d&apos;envoyer le lien de votre boutique. Un visiteur pré-convaincu a 81% de chances de passer à l&apos;achat !
              </p>
            </div>
          </div>
        </div>
      </section>



      {/* FOOTER */}
      <footer className="border-t border-white/[0.05] py-8 text-center text-xs text-neutral-500 max-w-7xl mx-auto px-4">
        <p>© 2026 MZ+ Premium. Système de Challenge décentralisé avec gouvernance technique stricte.</p>
      </footer>
    </div>
  );
};
