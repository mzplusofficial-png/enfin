import React, { useState } from 'react';
import { 
  Target, Sparkles, ArrowRight, ShieldCheck, Award, Flame, UserCheck, CheckCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../../../services/supabase.ts';
import { useCurrency } from '../../../hooks/useCurrency.ts';
import { SUPPORTED_CURRENCIES } from '../../../lib/currency/currencyRates.ts';

export const cleanAndParseAmount = (amountStr: string | undefined): number => {
  if (!amountStr) return 1000000;
  const clean = amountStr.replace(/[^0-9]/g, '');
  const parsed = parseInt(clean, 10);
  return isNaN(parsed) ? 1000000 : parsed;
};

function roundToNiceInspirationalNumber(val: number): number {
  if (val <= 0) return 0;
  const magnitude = Math.pow(10, Math.floor(Math.log10(val)));
  const normalized = val / magnitude;
  const anchors = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 7.5, 8, 10];
  let bestAnchor = anchors[0];
  let minDiff = Math.abs(normalized - anchors[0]);
  for (let i = 1; i < anchors.length; i++) {
    const diff = Math.abs(normalized - anchors[i]);
    if (diff < minDiff) {
      minDiff = diff;
      bestAnchor = anchors[i];
    }
  }
  return Math.round(bestAnchor * magnitude);
}

export function getRoundedAmountAndSymbol(amountXAF: number, targetCurrency: string, rates: Record<string, number>): string {
  const rate = rates[targetCurrency] || 1;
  const rawConverted = amountXAF / rate;
  let rounded = rawConverted;

  if (targetCurrency === 'EUR') {
    if (amountXAF === 300000) rounded = 500;
    else if (amountXAF === 1000000) rounded = 1500;
    else if (amountXAF === 3000000) rounded = 4500;
    else if (amountXAF === 5000000) rounded = 7500;
    else {
      rounded = roundToNiceInspirationalNumber(rawConverted);
    }
  } else if (targetCurrency === 'USD') {
    if (amountXAF === 300000) rounded = 500;
    else if (amountXAF === 1000000) rounded = 1500;
    else if (amountXAF === 3000000) rounded = 5000;
    else if (amountXAF === 5000000) rounded = 8000;
    else {
      rounded = roundToNiceInspirationalNumber(rawConverted);
    }
  } else if (targetCurrency === 'XAF' || targetCurrency === 'XOF') {
    rounded = amountXAF;
  } else {
    rounded = roundToNiceInspirationalNumber(rawConverted);
  }

  const info = SUPPORTED_CURRENCIES.find(c => c.code === targetCurrency);
  const symbol = info ? info.symbol : targetCurrency;
  const isPrefix = ['$', '£', '¥'].includes(symbol) || targetCurrency === 'USD';
  let formattedNumber = '';

  if (isPrefix) {
    formattedNumber = rounded.toLocaleString('en-US', { maximumFractionDigits: 0 });
    return `${symbol}${formattedNumber}`;
  } else {
    formattedNumber = rounded.toLocaleString('fr-FR', { maximumFractionDigits: 0 }).replace(/\s/g, '\u00a0');
    return `${formattedNumber}\u00a0${symbol}`;
  }
}

// Premium Amount text formatter to ensure elegant and natural phrasing
export const formatAmountForSentence = (amountStr: string | undefined, targetCurrency: string = 'XAF', rates: Record<string, number> = {}): string => {
  if (!amountStr) {
    return getRoundedAmountAndSymbol(1000000, targetCurrency, rates);
  }

  const isXAFOrXOF = targetCurrency === 'XAF' || targetCurrency === 'XOF';
  const isSavedInEuro = amountStr.includes('€') || amountStr.includes('EUR');
  const isSavedInDollar = amountStr.includes('$') || amountStr.includes('USD');
  const isSavedInFCFA = amountStr.includes('FCFA') || amountStr.includes('CFA') || amountStr.includes('FC');

  if (targetCurrency === 'EUR' && isSavedInEuro) {
    return amountStr.trim().replace(/\s+/g, '\u00a0');
  }
  if (targetCurrency === 'USD' && isSavedInDollar) {
    return amountStr.trim().replace(/\s+/g, '\u00a0');
  }
  if (isXAFOrXOF && isSavedInFCFA) {
    return amountStr.trim().replace(/\s+/g, '\u00a0');
  }

  const parsedNumber = cleanAndParseAmount(amountStr);

  if (parsedNumber >= 10000) {
    return getRoundedAmountAndSymbol(parsedNumber, targetCurrency, rates);
  } else {
    if (isSavedInEuro) {
      const eurRate = rates['EUR'] || 655.957;
      const xafAmount = parsedNumber * eurRate;
      return getRoundedAmountAndSymbol(xafAmount, targetCurrency, rates);
    } else if (isSavedInDollar) {
      const usdRate = rates['USD'] || 610.50;
      const xafAmount = parsedNumber * usdRate;
      return getRoundedAmountAndSymbol(xafAmount, targetCurrency, rates);
    } else {
      return amountStr.trim().replace(/\s+/g, '\u00a0');
    }
  }
};

interface MZPlusOnboardingGoalsModalProps {
  profile: any;
  onComplete: (goalsData: OnboardingGoals, action?: 'upgrade' | 'proofs') => void;
  onClose?: () => void;
}

export interface OnboardingGoals {
  goal_selected: string;
  amount_selected: string;
  change_needed: string;
  answered_at: string;
}

export const MZPlusOnboardingGoalsModal: React.FC<MZPlusOnboardingGoalsModalProps> = ({ 
  profile, 
  onComplete, 
  onClose 
}) => {
  const [step, setStep] = useState<number>(0);
  const [answers, setAnswers] = useState<Partial<OnboardingGoals>>({});
  const { currency, rates } = useCurrency();

  const getOptionLabelAndValue = (amountXAF: number, emoji: string, isPlus: boolean = false) => {
    const formatted = getRoundedAmountAndSymbol(amountXAF, currency, rates);
    return {
      label: `${emoji} ${formatted}${isPlus ? '+' : ''} / mois`,
      value: `${formatted}${isPlus ? '+' : ''}`
    };
  };

  const amountOptions = [
    getOptionLabelAndValue(300000, "💵"),
    getOptionLabelAndValue(1000000, "💶"),
    getOptionLabelAndValue(3000000, "💷"),
    getOptionLabelAndValue(5000000, "💎", true)
  ];

  const firstName = profile?.full_name ? profile.full_name.split(' ')[0] : 'Futur Leader';

  const getChangeObjectiveText = () => {
    const choice = answers.change_needed || '';
    if (choice.includes("Quitter") || choice.includes("emploi")) {
      return "quitter ton emploi actuel ou tes contraintes ordinaires";
    }
    if (choice.includes("temps libre") || choice.includes("proches")) {
      return "offrir plus de temps libre à tes proches et pour toi-même";
    }
    if (choice.includes("ne plus") || choice.includes("soucier") || choice.includes("argent")) {
      return "ne plus jamais te soucier de l'argent ni du lendemain";
    }
    if (choice.includes("patron") || choice.includes("règles")) {
      return "devenir ton propre patron et dicter tes propres règles";
    }
    return choice.replace(/^[^\w\s]*/, '').trim();
  };

  // Save selection and move to next
  const handleSelect = (key: keyof OnboardingGoals, value: string) => {
    setAnswers(prev => ({ ...prev, [key]: value }));
    setStep(prev => prev + 1);
  };

  const handleConfirmReady = () => {
    // Go to the final step
    setStep(5);
  };

  const handleFinalUnlock = async (action: 'upgrade' | 'proofs') => {
    const goalsPayload: OnboardingGoals = {
      goal_selected: answers.goal_selected || "Générer des revenus d'affiliation passifs",
      amount_selected: answers.amount_selected || getRoundedAmountAndSymbol(1000000, currency, rates),
      change_needed: answers.change_needed || "Ne plus jamais se soucier du lendemain financièrement",
      answered_at: new Date().toISOString()
    };

    try {
      // Save onboarding goals to store_preferences
      const currentPrefs = profile?.store_preferences || {};
      const newPrefs = {
        ...currentPrefs,
        onboarding_goals: goalsPayload
      };

      if (profile?.id && profile.id !== 'test-admin') {
        await supabase
          .from('users')
          .update({ store_preferences: newPrefs })
          .eq('id', profile.id);
      }
    } catch (e) {
      console.error("Failed to save onboarding goals:", e);
    }

    onComplete(goalsPayload, action);
  };

  // Progress Bar percentage for the 4 questions (steps 1 to 4)
  const progressPercent = step >= 1 && step <= 4 ? (step / 4) * 100 : 0;

  return (
    <div className="fixed inset-0 z-[9500] bg-black/95 backdrop-blur-2xl flex items-center justify-center overflow-y-auto p-3 sm:p-6" id="onboarding_goals_modal">
      
      {/* GLOWING AMBIENCE BACKGROUND */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-[30vw] h-[30vw] bg-purple-600/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-[25vw] h-[25vw] bg-emerald-600/10 rounded-full blur-[100px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px] opacity-20 pointer-events-none" />
      </div>

      <div className="relative w-full max-w-2xl bg-neutral-950 border border-neutral-800 rounded-3xl p-4 sm:p-8 md:p-10 shadow-[0_25px_60px_rgba(0,0,0,0.8),0_0_50px_rgba(168,85,247,0.15)] overflow-hidden my-4">
        {step >= 1 && step <= 4 && (
          <div className="absolute top-0 left-0 w-full h-[3px] bg-neutral-900 overflow-hidden">
            <motion.div 
              className="h-full bg-gradient-to-r from-purple-500 via-indigo-500 to-emerald-500" 
              style={{ width: `${progressPercent}%` }}
              layout
            />
          </div>
        )}

        {/* Dynamic header */}
        {step >= 1 && step <= 4 && (
          <div className="flex justify-between items-center mb-6 sm:mb-8 border-b border-white/5 pb-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="p-1.5 rounded-lg bg-purple-900/40 text-purple-400">
                <Target size={14} className="sm:w-4 sm:h-4" />
              </span>
              <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.15em] sm:tracking-[0.3em] text-neutral-400">
                Mon Projet de Vie • Vers Ma Liberté d'Action
              </span>
            </div>
            <div className="text-[10px] sm:text-xs font-mono font-bold text-neutral-500">
              {step}/4
            </div>
          </div>
        )}

        <AnimatePresence mode="wait">
          
          {/* STEP 0: Intro Screen */}
          {step === 0 && (
            <motion.div
              key="step0"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              className="space-y-6 sm:space-y-8 text-center"
            >
              <div className="flex justify-center mb-2">
                <div className="w-16 h-16 bg-purple-600/10 border border-purple-500/30 rounded-2xl flex items-center justify-center text-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.2)]">
                  <Sparkles size={32} className="animate-pulse" />
                </div>
              </div>
              
              <div className="space-y-4 max-w-xl mx-auto">
                <p className="text-base sm:text-lg text-neutral-100 font-bold leading-relaxed">
                  “Avant de continuer, prends quelques secondes pour définir clairement ce que tu veux réellement accomplir grâce à MZ+.
                </p>
                <p className="text-sm sm:text-base text-purple-400 font-medium leading-relaxed italic">
                  Les personnes qui évoluent le plus vite sont souvent celles qui ont une vision précise de leurs objectifs.”
                </p>
              </div>

              <div className="pt-4">
                <button
                  onClick={() => setStep(1)}
                  className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black uppercase text-xs sm:text-sm tracking-wider rounded-2xl shadow-[0_15px_35px_rgba(168,85,247,0.3)] hover:scale-[1.01] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 select-none"
                >
                  <span>DÉFINIR MES OBJECTIFS 🎯</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 1: Main Goal / Ambition */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-4 sm:space-y-6"
            >
              <div className="space-y-1 sm:space-y-2 text-center md:text-left">
                <span className="text-[9px] sm:text-[10px] font-black uppercase bg-purple-500/10 border border-purple-500/20 text-purple-400 px-2 py-0.5 rounded-md">Étape 1 // Ambition</span>
                <h3 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-white uppercase italic leading-tight">
                  Quel est votre <span className="text-purple-400 font-sans skew-x-3 bg-clip-text">objectif principal</span> sur MZ+ ?
                </h3>
              </div>

              <div className="grid gap-2 pt-1 sm:pt-2">
                {[
                  { label: "🚀 Créer un business en ligne rentable", key: "Créer un business en ligne rentable" },
                  { label: "💰 Générer des revenus d'affiliation passifs", key: "Générer des revenus d'affiliation passifs" },
                  { label: "🧠 Développer mes compétences d'élite", key: "Développer mes compétences d'élite" },
                  { label: "👑 Rejoindre un club d'élite", key: "Rejoindre un club d'élite" }
                ].map((opt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelect('goal_selected', opt.label)}
                    className="w-full text-left p-3.5 sm:p-4.5 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-purple-500/50 hover:bg-purple-950/20 text-neutral-200 hover:text-white font-bold transition-all duration-200 text-xs sm:text-sm group select-none active:scale-[0.99] flex items-center justify-between"
                  >
                    <span>{opt.label}</span>
                    <ArrowRight size={16} className="text-neutral-600 group-hover:text-purple-400 transition-colors group-hover:translate-x-1 shrink-0 ml-2" />
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* STEP 2: Monthly Income Target / Étalonnage */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4 sm:space-y-6"
            >
              <div className="space-y-1 sm:space-y-2 text-center md:text-left">
                <span className="text-[9px] sm:text-[10px] font-black uppercase bg-purple-500/10 border border-purple-500/20 text-purple-400 px-2 py-0.5 rounded-md">Étape 2 // Étalonnage</span>
                <h3 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-white uppercase italic leading-tight">
                  Combien aimeriez-vous <span className="text-purple-400">générer grâce à MZ+ ?</span>
                </h3>
              </div>

              <div className="grid gap-2 pt-1 sm:pt-2">
                {amountOptions.map((opt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelect('amount_selected', opt.value)}
                    className="w-full text-left p-3.5 sm:p-4.5 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-purple-500/50 hover:bg-purple-950/20 text-neutral-200 hover:text-white font-bold transition-all duration-200 text-xs sm:text-sm group select-none active:scale-[0.99] flex items-center justify-between"
                  >
                    <span>{opt.label}</span>
                    <ArrowRight size={16} className="text-neutral-600 group-hover:text-purple-400 transition-colors group-hover:translate-x-1 shrink-0 ml-2" />
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* STEP 3: Life Change Prioritization / Déclencheur */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4 sm:space-y-6"
            >
              <div className="space-y-1 sm:space-y-2 text-center md:text-left">
                <span className="text-[9px] sm:text-[10px] font-black uppercase bg-purple-500/10 border border-purple-500/20 text-purple-400 px-2 py-0.5 rounded-md">Étape 3 // Motivation Profonde</span>
                <h3 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-white uppercase italic leading-tight">
                  Qu’aimeriez-vous <span className="text-purple-400">changer en priorité</span> dans votre vie actuellement ?
                </h3>
              </div>

              <div className="grid gap-2 pt-1 sm:pt-2">
                {[
                  { label: "🚪 Quitter mon emploi actuel ou mes contraintes ordinaires", value: "quitter ton emploi actuel ou tes contraintes ordinaires" },
                  { label: "⏳ Offrir plus de temps libre à mes proches et pour moi-même", value: "offrir plus de temps libre à tes proches et pour toi-même" },
                  { label: "🧘 Ne plus me soucier de l'argent ni du lendemain", value: "ne plus jamais te soucier de l'argent ni du lendemain" },
                  { label: "💼 Devenir mon propre patron et dicter mes propres règles", value: "devenir ton propre patron et dicter tes propres règles" }
                ].map((opt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelect('change_needed', opt.label)}
                    className="w-full text-left p-3.5 sm:p-4.5 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-purple-500/50 hover:bg-purple-950/20 text-neutral-200 hover:text-white font-bold transition-all duration-200 text-xs sm:text-sm group select-none active:scale-[0.99] flex items-center justify-between"
                  >
                    <span>{opt.label}</span>
                    <ArrowRight size={16} className="text-neutral-600 group-hover:text-purple-400 transition-colors group-hover:translate-x-1 shrink-0 ml-2" />
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* STEP 4: Accompagnement Check */}
          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="space-y-2 text-center md:text-left">
                <span className="text-[9px] sm:text-[10px] font-black uppercase bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-md">Étape 4 // Engagement</span>
                <h3 className="text-base sm:text-lg md:text-xl font-bold tracking-tight text-white leading-relaxed">
                  Êtes-vous prêt à obtenir un <span className="text-emerald-400 italic font-black">accompagnement personnalisé</span> pour atteindre votre objectif de <span className="text-purple-400 font-extrabold">"{answers.goal_selected}"</span> et générer <span className="text-emerald-400 font-black">{answers.amount_selected}</span> grâce à MZ+ ?
                </h3>
              </div>

              <button
                onClick={handleConfirmReady}
                className="w-full py-4 sm:py-5 bg-white text-black font-black uppercase text-xs sm:text-sm tracking-wider rounded-2xl shadow-[0_15px_30px_rgba(255,255,255,0.05),0_0_20px_rgba(168,85,247,0.2)] hover:scale-[1.01] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 select-none"
              >
                <span>OUI, JE SUIS PRÊT ! 🚀</span>
                <ArrowRight size={16} />
              </button>
            </motion.div>
          )}

          {/* FINAL SCREEN (Step 5) */}
          {step === 5 && (
            <motion.div
              key="step5"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="space-y-6 text-center py-4 flex flex-col items-center justify-center pointer-events-auto"
            >
              {/* SUCCESS ICON / CELEBRATION */}
              <div className="relative">
                <div className="absolute inset-0 bg-purple-500/25 blur-xl rounded-full scale-125 animate-pulse" />
                <div className="relative w-20 h-20 bg-gradient-to-tr from-purple-500 to-indigo-600 rounded-3xl flex items-center justify-center text-white shadow-[0_0_30px_rgba(168,85,247,0.4)] border border-purple-400/30">
                  <Flame size={40} className="text-yellow-300 animate-bounce" />
                </div>
              </div>

              {/* HEADING / EMOTIONAL HOOK */}
              <div className="space-y-4 max-w-lg mt-2 font-sans">
                <p className="text-base sm:text-lg leading-relaxed text-neutral-200">
                  🔥 Hey <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500 font-extrabold">{firstName}</span>, tu es peut-être à un pas de l’objectif que tu veux atteindre : générer <span className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-300 to-emerald-400 drop-shadow-[0_0_12px_rgba(245,158,11,0.5)] animate-pulse inline-block uppercase tracking-wide px-2 py-0.5 rounded bg-yellow-500/5 border border-yellow-500/20 whitespace-nowrap">{formatAmountForSentence(answers.amount_selected, currency, rates)}</span> par mois 👀💰
                </p>

                <p className="text-xs sm:text-sm text-neutral-400 max-w-sm mx-auto leading-relaxed">
                  Obtiens l'accompagnement personnalisé qui va te permettre d'atteindre ton objectif le plus rapidement possible.
                </p>
              </div>

              {/* ACTION BUTTONS */}
              <div className="w-full space-y-3 pt-4 max-w-sm">
                <button
                  onClick={() => handleFinalUnlock('upgrade')}
                  className="w-full py-4 bg-gradient-to-r from-purple-600 via-indigo-600 to-indigo-700 hover:from-purple-500 hover:to-indigo-500 text-white font-black uppercase text-xs sm:text-sm tracking-[0.1em] rounded-2xl shadow-[0_15px_30px_rgba(147,51,234,0.3),0_0_20px_rgba(147,51,234,0.15)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 select-none cursor-pointer"
                >
                  <span>OBTENIR MON ACCOMPAGNEMENT 🏆</span>
                  <ArrowRight size={16} />
                </button>

                <button
                  onClick={() => handleFinalUnlock('proofs')}
                  className="w-full py-3.5 bg-neutral-900 border border-purple-500/20 hover:border-purple-500/45 text-neutral-200 hover:text-white font-bold uppercase text-[10px] sm:text-xs tracking-wider rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 select-none cursor-pointer"
                >
                  <span>VOIR LE RÉSULTAT DES AUTRES MEMBRES 👀</span>
                </button>
                
                {onClose && (
                  <button
                    onClick={onClose}
                    className="w-full py-2.5 bg-transparent text-neutral-500 hover:text-white transition-colors text-[10px] sm:text-xs font-black uppercase tracking-widest text-center select-none cursor-pointer"
                  >
                    Revenir plus tard
                  </button>
                )}
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
};
