import React, { useState, useEffect, useRef } from 'react';
import { 
  Crown, Zap, X, Rocket, 
  ShieldAlert, BadgeCheck,
  TrendingUp, ArrowUpRight, Clock, AlertCircle,
  Maximize2, Target, Loader2, ChevronRight,
  Flame, ArrowRight, Sparkles, Coins
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../../../services/supabase.ts';
import { MZPlusOnboardingGoalsModal, formatAmountForSentence } from './MZPlusOnboardingGoalsModal.tsx';
import { useCurrency } from '../../../hooks/useCurrency.ts';
import { countriesSorted, getFlagEmoji, detectDefaultCountryCode } from '../../countries.ts';
import { getGDriveThumbnailUrl } from '../../../lib/googleDrive';

interface MZPlusFlashOfferOverlayProps {
  profile: any;
  onUpgrade: () => void;
  onClose?: () => void;
  isFullPage?: boolean;
}

const CHECKOUT_LINK = "https://mzplus.mychariow.shop/prd_iwhpro/checkout";

const LiveActivityPulse = () => {
  const [activities, setActivities] = useState([
    { id: 1, text: "Gains en cours : +45,000 FCFA (RPA Protocol)", user: "Moussa.K", type: 'earn' },
    { id: 2, text: "LICENCE ÉLITE ACTIVÉE", user: "Sarah_Elite", type: 'upgrade' },
    { id: 3, text: "Extraction de commissions terminée", user: "Membre_#482", type: 'success' },
    { id: 4, text: "Nouveau membre Premium : Amadou", user: "Amadou-CI", type: 'upgrade' },
  ]);

  useEffect(() => {
    const names = ["Koffi", "Yasmine", "Omar", "Binta", "Fatou", "Dimitri", "Ibrahim", "Malick", "Assane"];
    const actions = [
      "vient d'activer le protocole RPA",
      "génère sa 3ème commission",
      "débloque l'accès Luna Expert",
      "encaisse +12,500 FCFA",
      "vient de rejoindre le cercle Élite"
    ];

    const interval = setInterval(() => {
      const newActivity = {
        id: Date.now(),
        text: `${actions[Math.floor(Math.random() * actions.length)]}`,
        user: names[Math.floor(Math.random() * names.length)],
        type: Math.random() > 0.6 ? 'upgrade' : 'earn'
      };
      setActivities(prev => [newActivity, ...prev.slice(0, 4)]);
    }, 65000); // reduced frequency to 65 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed top-24 left-6 z-[100] pointer-events-none hidden xl:block w-80">
      <div className="text-[8px] font-black tracking-[0.3em] text-purple-500 mb-4 animate-pulse">LIVE ACCESS STREAM // MZ+ NETWORK</div>
      <AnimatePresence mode="popLayout">
        {activities.map((act) => (
          <motion.div
            key={act.id}
            initial={{ opacity: 0, x: -100, filter: 'blur(10px)' }}
            animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, x: -20, filter: 'blur(5px)' }}
            className="mb-3 p-4 bg-black/80 backdrop-blur-3xl border-l-2 border-purple-600 rounded-r-xl flex items-center gap-4 shadow-[0_10px_30px_rgba(0,0,0,0.5)]"
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${act.type === 'upgrade' ? 'bg-purple-600 text-white' : 'bg-emerald-600/20 text-emerald-500'}`}>
              {act.type === 'upgrade' ? <Crown size={14} /> : <Zap size={14} />}
            </div>
            <div className="overflow-hidden">
              <p className="text-[9px] text-neutral-500 font-black uppercase tracking-widest truncate">{act.user}</p>
              <p className="text-[11px] text-white/90 font-bold leading-tight truncate">{act.text}</p>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

const GlitchText = ({ text }: { text: string }) => (
  <span className="relative inline-block">
    <span className="relative z-10">{text}</span>
    <motion.span 
      animate={{ opacity: [0, 0.5, 0], x: [-2, 2, -2] }}
      transition={{ repeat: Infinity, duration: 0.2 }}
      className="absolute top-0 left-0 -z-10 text-purple-600 blur-[2px]"
    >
      {text}
    </motion.span>
  </span>
);

export const MZPlusFlashOfferOverlay: React.FC<MZPlusFlashOfferOverlayProps> = ({ profile, onUpgrade, onClose, isFullPage = false }) => {
  const { currency, rates } = useCurrency();
  const [config, setConfig] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number } | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [proofs, setProofs] = useState<any[]>([]);
  const [fullscreenProof, setFullscreenProof] = useState<any | null>(null);
  const [selectedProofIndex, setSelectedProofIndex] = useState<number>(0);
  const [recentPremiumJoin, setRecentPremiumJoin] = useState<{ name: string; city: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [showGoalsQuiz, setShowGoalsQuiz] = useState<boolean>(false);
  const [showReturningPopup, setShowReturningPopup] = useState<boolean>(true);
  
  const heroRef = useRef<HTMLDivElement>(null);
  const outerContainerRef = useRef<HTMLDivElement>(null);

  const [isShowingChariowForm, setIsShowingChariowForm] = useState(false);
  const [customerData, setCustomerData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    countryCode: 'CI'
  });
  const [isSubmittingChariow, setIsSubmittingChariow] = useState(false);
  const [errorMessageChariow, setErrorMessageChariow] = useState<string | null>(null);

  // Behavioral Analytics Tracking Setup
  const sessionTrackingIdRef = useRef<string | null>(null);
  const trackingStartRef = useRef<number>(Date.now());
  const metadataRef = useRef<any>({
    scrolled_sections: ['hero'],
    clicks: {
      checkout_opened: 0,
      scroll_to_proofs: 0,
      closed: 0,
      whatsapp_share: 0,
      copy_link: 0,
      payment_initiated: 0
    },
    fields_filled: {
      firstName: false,
      lastName: false,
      email: false,
      phone: false
    },
    max_scroll_percent: 0,
    payment_started: false,
    payment_completed: false,
    errors_encountered: [],
    device: {
      width: typeof window !== 'undefined' ? window.innerWidth : 1200,
      height: typeof window !== 'undefined' ? window.innerHeight : 800,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown'
    }
  });

  const trackClick = (elementId: string) => {
    if (!metadataRef.current.clicks) metadataRef.current.clicks = {};
    metadataRef.current.clicks[elementId] = (metadataRef.current.clicks[elementId] || 0) + 1;
  };

  const trackFieldFilled = (fieldName: string, isFilled: boolean) => {
    if (!metadataRef.current.fields_filled) metadataRef.current.fields_filled = {};
    metadataRef.current.fields_filled[fieldName] = isFilled;
  };

  const trackError = (errorMessage: string) => {
    if (!metadataRef.current.errors_encountered) metadataRef.current.errors_encountered = [];
    if (!metadataRef.current.errors_encountered.includes(errorMessage)) {
      metadataRef.current.errors_encountered.push(errorMessage);
    }
  };

  // Main Tracking Lifecycle Effect
  useEffect(() => {
    if (!profile?.id) return;

    const initTracking = async () => {
      try {
        const { data, error } = await supabase
          .from('mz_offer_page_tracking')
          .insert([{
            user_id: profile.id,
            duration_seconds: 0,
            metadata: metadataRef.current
          }])
          .select('id')
          .single();

        if (!error && data) {
          sessionTrackingIdRef.current = data.id;
          console.log("[Analytical Tracker] Session successfully started with ID :", data.id);
        } else {
          console.warn("[Analytical Tracker] Could not initialize database record:", error);
        }
      } catch (err) {
        console.error("[Analytical Tracker] Setup failure:", err);
      }
    };

    initTracking();

    // Heartbeat reporting every 120 seconds (2 minutes) to reduce database workload and egress bandwidth
    const pingInterval = setInterval(async () => {
      if (!sessionTrackingIdRef.current) return;
      const elapsedSecs = Math.round((Date.now() - trackingStartRef.current) / 1000);

      try {
        await supabase
          .from('mz_offer_page_tracking')
          .update({
            last_ping: new Date().toISOString(),
            duration_seconds: elapsedSecs,
            metadata: metadataRef.current
          })
          .eq('id', sessionTrackingIdRef.current);
      } catch (pingErr) {
        console.error("[Analytical Tracker] Update ping failed:", pingErr);
      }
    }, 120000);

    return () => {
      clearInterval(pingInterval);
      if (sessionTrackingIdRef.current) {
        const elapsedSecs = Math.round((Date.now() - trackingStartRef.current) / 1000);
        supabase
          .from('mz_offer_page_tracking')
          .update({
            last_ping: new Date().toISOString(),
            duration_seconds: elapsedSecs,
            metadata: metadataRef.current
          })
          .eq('id', sessionTrackingIdRef.current)
          .then();
      }
    };
  }, [profile?.id]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const scrollPercent = Math.round((target.scrollTop / (target.scrollHeight - target.clientHeight)) * 100);
    metadataRef.current.max_scroll_percent = Math.max(metadataRef.current.max_scroll_percent || 0, scrollPercent);

    const scrolledList = metadataRef.current.scrolled_sections || [];
    
    if (scrollPercent >= 10 && !scrolledList.includes('onboarding_trajectory')) {
      scrolledList.push('onboarding_trajectory');
    }
    if (scrollPercent >= 35 && !scrolledList.includes('proofs_results')) {
      scrolledList.push('proofs_results');
    }
    if (scrollPercent >= 60 && !scrolledList.includes('gagnants_features')) {
      scrolledList.push('gagnants_features');
    }
    if (scrollPercent >= 85 && !scrolledList.includes('scarcity_bottom')) {
      scrolledList.push('scarcity_bottom');
    }
    
    metadataRef.current.scrolled_sections = scrolledList;
  };

  // Auto pre-fill from user profile
  useEffect(() => {
    if (profile) {
      const parts = (profile.full_name || '').split(' ');
      const firstName = parts[0] || '';
      const lastName = parts.slice(1).join(' ') || '';
      const detectedCode = detectDefaultCountryCode(currency, profile);
      setCustomerData(prev => ({
        ...prev,
        firstName: prev.firstName || firstName,
        lastName: prev.lastName || lastName,
        email: prev.email || profile.email || '',
        phone: prev.phone || profile.phone || '',
        countryCode: detectedCode
      }));
    } else if (currency) {
      const detectedCode = detectDefaultCountryCode(currency, null);
      setCustomerData(prev => ({
        ...prev,
        countryCode: detectedCode
      }));
    }
  }, [profile, currency]);

  const [qualifiesForQuiz, setQualifiesForQuiz] = useState<boolean>(false);
  const [isReturning, setIsReturning] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hasVisited = localStorage.getItem('mz_flash_offer_completed_first_view');
      if (hasVisited === 'true') {
        setIsReturning(true);
      } else {
        localStorage.setItem('mz_flash_offer_completed_first_view', 'true');
      }
    }
  }, []);

  const scrollToProofs = () => {
    const el = document.getElementById('proofs-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  useEffect(() => {
    const checkQualifications = async () => {
      if (!profile) return;

      // 1. First Visit ever on flash offer page
      const visited = localStorage.getItem('mz_flash_offer_visited_ever');
      const isFirst = !visited;

      // 2. Active session passed 6 mins (since loading in this device)
      const startTimeStr = localStorage.getItem('mz_active_session_start');
      let sessionPassed = false;
      if (startTimeStr) {
        const startTime = parseInt(startTimeStr, 10);
        if (!isNaN(startTime)) {
          sessionPassed = (Date.now() - startTime) >= 6 * 60 * 1000; // >= 6 minutes
        }
      }

      // 3. User cumulative active seconds since the beginning (across all sessions in this browser)
      const keySecs = `mz_cumulative_active_seconds_${profile.id}`;
      const cumulativeSecs = parseInt(localStorage.getItem(keySecs) || '0', 10);
      const isCumulativeSecsPassed = cumulativeSecs >= 360; // 6 minutes

      // 4. DB historically tracked total active minutes >= 6 minutes
      let dbMinsPassed = false;
      try {
        const { data: trackingData } = await supabase
          .from('mz_rewards_time_tracking')
          .select('total_minutes')
          .eq('user_id', profile.id);
        
        const sumDbMins = trackingData?.reduce((acc: number, item: any) => acc + (item.total_minutes || 0), 0) || 0;
        if (sumDbMins >= 6) {
          dbMinsPassed = true;
        }
      } catch (err) {
        console.error("Error fetching db tracking minutes:", err);
      }

      // Qualifie si premier clic OU temps total réel passé en ligne (DB ou local) >= 6 minutes
      const isQualified = isFirst || sessionPassed || isCumulativeSecsPassed || dbMinsPassed;
      setQualifiesForQuiz(isQualified);
    };

    checkQualifications();
    localStorage.setItem('mz_flash_offer_visited_ever', 'true');
  }, [profile?.id]);

  useEffect(() => {
    if (profile && !profile.store_preferences?.onboarding_goals) {
      if (qualifiesForQuiz) {
        setShowGoalsQuiz(true);
      } else {
        setShowGoalsQuiz(false);
      }
    } else {
      setShowGoalsQuiz(false);
    }
  }, [profile?.id, profile?.store_preferences?.onboarding_goals, qualifiesForQuiz]);

  useEffect(() => {
    const NAMES = [
      "Marc", "Sophie", "Thomas", "Fatou", "Lucas", "Elena", "Ibrahim", "Julie", "Kevin", "Sarah", "Yann", "Mélanie", "Oumar", "Awa", "Koffi",
      "Abdoulaye", "Adama", "Aïcha", "Alain", "Alexandre", "Alice", "Amadou", "Aminata", "Antoine", "Arthur", "Assane", "Audrey", "Aurélien", "Bakary", "Béatrice",
      "Benoît", "Bertrand", "Bineta", "Boubacar", "Camille", "Cédric", "Chantal", "Charles", "Cheikh", "Christian", "Claire", "Claude", "Côme", "Corinne", "Damien",
      "Daniel", "David", "Denis", "Désiré", "Diakalya", "Dieudonné", "Djibril", "Dominique", "Édith", "Édouard", "Élisabeth", "Élodie", "Émile", "Emmanuel", "Éric",
      "Étienne", "Eugène", "Fabien", "Fabrice", "Fanta", "Félix", "Fernand", "Florent", "François", "Franck", "Frédéric", "Gabriel", "Gaston", "Georges", "Gérard",
      "Gilbert", "Gilles", "Grégoire", "Guillaume", "Guy", "Habib", "Hélène", "Henri", "Hervé", "Hubert", "Hugues", "Idrissa", "Irène", "Isabelle", "Issa", "Jacques",
      "Jean", "Jeanne", "Jérôme", "Joachim", "Joël", "Joseph", "Josiane", "Jules", "Julien", "Justine", "Karim", "Lamine", "Laurent", "Léopold", "Louis", "Luc", "Lucien",
      "Mamadou", "Marcel", "Marie", "Martine", "Mathieu", "Maurice", "Michel", "Modibo", "Monique", "Moussa", "Nathalie", "Nicolas", "Noël", "Odette", "Olivier", "Ousmane",
      "Pascal", "Patrice", "Patrick", "Paul", "Philippe", "Pierre", "Raymond", "René", "Richard", "Robert", "Roger", "Roland", "Samba", "Samuel", "Sébastien", "Serge",
      "Seydou", "Simon", "Stéphane", "Sylvain", "Thérèse", "Thierry", "Tidiane", "Victor", "Vincent", "Xavier", "Yacouba", "Yves", "Zacharie", "Zoé", "Abiba", "Bakari",
      "Bourema", "Clarisse", "Diarra", "Evelyne", "Fadel", "Gisèle", "Hamadou", "Inès", "Jocelyn", "Kamal", "Léonard", "Mariam", "Nafi", "Obi", "Pascaline", "Quentin",
      "Ramatou", "Salif", "Tidjani", "Ulrich", "Valentin", "Waly", "Yasmine", "Zadi", "Abel", "Bamba", "Célestine", "Drissa", "Enzo", "Félicité", "Gervais", "Honoré",
      "Ismaël", "Justin", "Kader", "Lila", "Mady", "Noémie", "Ondine", "Prudence", "Rémi", "Saliou", "Tania", "Urbain", "Viviane", "William", "Yohan", "Zénab",
      "Cyrille", "Loïc", "Maëlys", "Nathan", "Hugo", "Inès", "Jade", "Léa", "Léo", "Manon", "Maxime", "Nina", "Pauline", "Raphaël", "Sacha", "Théo", "Tom", "Yaniss",
      "Moussa", "Tidiane", "Kadiatou", "Abdou", "Sira", "Bakary", "Assa", "Madou", "Djeneba", "Sékou", "Lamine", "Aïssata", "Souleymane", "Aminata", "Boubacar",
      "Youssouf", "Mariame", "Adama", "Oumou", "Ibrahim", "Fanta", "Moussa", "Fatoumata", "Amadou", "Saliou", "Kadidia", "Abdoulaye", "Hawa", "Demba", "Rokia",
      "Mohamed", "Djénéibou", "Aliou", "Nanténin", "Sidi", "Sounkalo", "Oumar", "Batoma", "Drissa", "Assétou", "Mamadou", "Haby", "Ousmane", "Penda", "Boureima",
      "Cheick", "Awa", "Lassana", "Safiatou", "Gaston", "Bernadette", "Florentin", "Odile", "Hervé", "Chantal", "Didier", "Mireille", "Guy", "Colette", "Patrice",
      "Solange", "Thierry", "Geneviève", "André", "Marthe", "René", "Josiane", "Marcel", "Georgette", "Émile", "Raymonde", "Roland", "Lucienne", "Georges", "Yvonne",
      "Cyril", "Nadege", "Fabien", "Severine", "Loic", "Magali", "Samuel", "Aurore", "Xavier", "Vanessa", "Arnaud", "Estelle", "Sébastien", "Aurelie", "Guillaume",
      "Céline", "Ludovic", "Emilie", "Nicolas", "Sandrine", "Benoit", "Elodie", "Julien", "Julie", "Mathieu", "Audrey", "Romain", "Marine", "Adrien", "Laureen",
      "Koffi", "Ama", "Kwame", "Adjoa", "Kojo", "Akua", "Kwaku", "Yaa", "Yaw", "Afua", "Kofi", "Amma", "Kwasi", "Akosua", "Kwabena", "Abena", "Ekow", "Baaba",
      "Baako", "Bonsu", "Mensah", "Tetteh", "Annan", "Sarpong", "Boateng", "Mensah", "Owusu", "Appiah", "Asante", "Oppong", "Gyamfi", "Adu", "Sarfo", "Agyemang",
      "Dapaah", "Frimpong", "Osei", "Kusi", "Danso", "Acheampong", "Kyere", "Amponsah", "Badu", "Darko", "Asare", "Kyei", "Prempeh", "Fosu", "Boakye", "Kwarteng",
      "Zadi", "Gahé", "Kouassi", "Lou", "Yao", "Aman", "Tanoh", "N'Guessan", "Koné", "Coulibaly", "Traoré", "Fofana", "Bakayoko", "Bamba", "Ouattara", "Cissé",
      "Touré", "Keita", "Diallo", "Sow", "Bah", "Barry", "Cherif", "Camara", "Diaby", "Doumbia", "Sidibé", "Sangare", "Diakite", "Sanogo", "Diarra", "Sissoko",
      "Kamissoko", "Kanté", "Bagayoko", "Dembélé", "Sogoba", "Togola", "Tangara", "Mallé", "Samaké", "Coulibaly", "Sanogo", "Sangaré", "Maïga", "Dicko", "Dia",
      "Niang", "Wade", "Gueye", "Ndiaye", "Diop", "Fall", "Sarr", "Thiam", "Sall", "Ba", "Ly", "Kane", "Seck", "Mbow", "Ka", "Diaw", "Ngom", "Faye", "Diouf", "Samb",
      "Cisse", "Daffé", "Sakho", "Sow", "Tandia", "Gakou", "Fofana", "Sissoko", "Sidibe", "Traore", "Koita", "Dra", "Camara", "Keita", "Kante", "Dukureh", "Jatta"
    ];
    const CITIES = [
      "Paris", "Lyon", "Abidjan", "Dakar", "Bruxelles", "Genève", "Montréal", "Bordeaux", "Casablanca", "Douala", "Lomé", "Bamako",
      "Marseille", "Toulouse", "Nice", "Nantes", "Strasbourg", "Montpellier", "Lille", "Rennes", "Reims", "Saint-Étienne", "Le Havre", "Toulon", "Grenoble", "Dijon", "Angers", "Nîmes", "Villeurbanne",
      "Yamoussoukro", "Bouaké", "San Pedro", "Korhogo", "Daloa", "Saint-Louis", "Thiès", "Kaolack", "Ziguinchor", "Mbour", "Rabat", "Marrakech", "Fès", "Agadir", "Tanger", "Yaoundé",
      "Libreville", "Port-Gentil", "Brazzaville", "Pointe-Noire", "Kinshasa", "Lubumbashi", "Mbuji-Mayi", "Kisangani", "Kananga", "Ouagadougou", "Bobo-Dioulasso", "Niamey", "Zinder",
      "Nouakchott", "Conakry", "Cotonou", "Porto-Novo", "Libreville", "Antananarivo", "Tunis", "Sfax", "Sousse", "Bizerte", "Gabès", "Kairouan", "Gafsa", "Monastir"
    ];

    let simulationTimeout: NodeJS.Timeout;

    const showJoin = () => {
      const name = NAMES[Math.floor(Math.random() * NAMES.length)];
      const city = CITIES[Math.floor(Math.random() * CITIES.length)];
      setRecentPremiumJoin({ name, city });
      
      // Clear after 5 seconds
      setTimeout(() => setRecentPremiumJoin(null), 5000);

      // Schedule next one between 120 and 300 seconds (reduced frequency)
      const nextDelay = Math.floor(Math.random() * (300000 - 120000 + 1)) + 120000;
      simulationTimeout = setTimeout(showJoin, nextDelay);
    };

    // Initial delay of 120 seconds instead of 15 seconds to be extremely quiet
    const initialTimeout = setTimeout(showJoin, 120000);

    return () => {
      clearTimeout(initialTimeout);
      clearTimeout(simulationTimeout);
    };
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        let offerResData: any = null;
        let proofsResData: any = null;
        let psChariowData: any = null;
        let fallbackConfigData: any = null;

        try {
          const { data } = await supabase.from('mz_flash_offer_v2').select('is_active, show_timer, price_normal, price_promo, youtube_iframe, video_url, chariow_product_id, ends_at, content').eq('id', 'flash-offer-global').maybeSingle();
          if (data) offerResData = data;
        } catch (err) {
          console.warn("mz_flash_offer_v2 select failed:", err);
        }

        try {
          const res = await fetch('/api/premium-proofs');
          if (res.ok) {
            const result = await res.json();
            if (result.success && result.data) {
              proofsResData = result.data;
              console.log("[DEBUG Client] Preuves chargées depuis le serveur local :", proofsResData.length);
            }
          }
        } catch (err) {
          console.warn("[DEBUG Client] Impossible de récupérer les preuves premium depuis l'API locale:", err);
        }

        try {
          const res = await fetch('/api/platform-settings/flash_offer_chariow_product_id');
          const json = await res.json();
          if (json.success && json.value) psChariowData = json.value;
        } catch (err) {
          console.warn("platform_settings product_id select failed:", err);
        }

        try {
          const res = await fetch('/api/platform-settings/flash_offer_config_v2');
          const json = await res.json();
          if (json.success && json.value) fallbackConfigData = json.value;
        } catch (err) {
          console.warn("platform_settings config_v2 select failed:", err);
        }

        if (proofsResData) {
          setProofs(proofsResData);
        }
        
        let fetchedConfig = fallbackConfigData || offerResData ? {
          ...(offerResData || {}),
          ...(fallbackConfigData || {})
        } : null;
        
        if (fetchedConfig && Object.keys(fetchedConfig).length > 0) {
          const loadedChariowId = psChariowData?.product_id || fetchedConfig.chariow_product_id || '';
          fetchedConfig = {
            ...fetchedConfig,
            chariow_product_id: loadedChariowId
          };
          setConfig(fetchedConfig);
          setIsVisible(true);
        } else if (isFullPage) {
          const loadedChariowId = psChariowData?.product_id || 'prd_iwhpro';
          setConfig({ 
            is_active: true, 
            price_promo: '15000', 
            price_normal: '20000', 
            show_timer: true, 
            ends_at: new Date(Date.now() + 86400000).toISOString(),
            chariow_product_id: loadedChariowId
          });
          setIsVisible(true);
        }
      } catch (err) {
        console.error("Critical error in flash offer overlay fetch:", err);
      }
    };
    fetchData();
  }, [profile?.id, isFullPage]);

  useEffect(() => {
    if (!config?.ends_at || !config?.show_timer) return;
    const interval = setInterval(() => {
      const dist = new Date(config.ends_at).getTime() - Date.now();
      if (dist < 0) { setTimeLeft(null); return; }
      setTimeLeft({
        hours: Math.floor((dist % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((dist % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((dist % (1000 * 60)) / 1000)
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [config]);

  if (isDismissed || !isVisible || !config) return null;

  if (showGoalsQuiz) {
    return (
      <MZPlusOnboardingGoalsModal 
        profile={profile}
        onComplete={(goalsData, action) => {
          setShowGoalsQuiz(false);
          if (profile) {
            if (!profile.store_preferences) profile.store_preferences = {};
            profile.store_preferences.onboarding_goals = goalsData;
          }
          if (action === 'proofs') {
            setTimeout(() => {
              scrollToProofs();
            }, 300);
          } else {
            setIsShowingChariowForm(true); // Proceed directly to Chariow billing/payment form
          }
        }}
        onClose={onClose || (() => setIsDismissed(true))}
      />
    );
  }

  const handleUpgrade = () => {
    trackClick('checkout_opened');
    setIsShowingChariowForm(true);
  };

  const handleChariowCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    trackClick('payment_initiated');
    metadataRef.current.payment_started = true;
    setIsSubmittingChariow(true);
    setErrorMessageChariow(null);

    const urlParams = new URLSearchParams(window.location.search);
    const referrerCode = urlParams.get('ref') || '';
    
    // Récupérer dynamiquement le produit Chariow configuré (ou utiliser la valeur de secours 'prd_iwhpro')
    const targetChariowId = config?.chariow_product_id || 'prd_iwhpro';

    // Assurer l'existence du produit en base pour l'association
    let dbProductId = 'mz-plus-premium';
    let commissionAmt = 5000;
    try {
      const { data: existingProd } = await supabase
        .from('products')
        .select('*')
        .eq('chariow_product_id', targetChariowId)
        .maybeSingle();

      if (existingProd) {
        dbProductId = existingProd.id;
        commissionAmt = existingProd.commission_amount;
      } else {
        const fallbackProd = {
          id: 'mz-plus-premium',
          name: 'MZ+ Premium',
          description: 'Accès illimité aux fonctionnalités MZ+ Premium (Offre Flash)',
          price: config?.price_promo ? parseInt(String(config.price_promo)) : 15000,
          commission_amount: 5000,
          image_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=200&auto=format&fit=crop',
          final_link: '#',
          chariow_product_id: targetChariowId,
          theme: 'dark'
        };
        const { error: insErr } = await supabase.from('products').insert([fallbackProd]);
        if (!insErr) {
          console.log("[Checkout Form] Produit créé à la volée dans Supabase.");
        }
      }
    } catch (err) {
      console.error("[Checkout Form] Erreur traitement association produit :", err);
    }

    const redirectUrl = `${window.location.origin}/?merci=true&sale={sale_id}&prod=${dbProductId}${referrerCode ? `&ref=${referrerCode}` : ''}`;

    let cleanPhone = customerData.phone.replace(/\D/g, '');
    const dialCodes: { [key: string]: string } = {};
    countriesSorted.forEach(c => {
      dialCodes[c.code] = c.dial;
    });
    
    const dialCode = dialCodes[customerData.countryCode];
    if (dialCode && cleanPhone.startsWith(dialCode) && cleanPhone.length > dialCode.length) {
      cleanPhone = cleanPhone.substring(dialCode.length);
    }

    try {
      const response = await fetch('/api/chariow/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          product_id: targetChariowId,
          email: customerData.email,
          first_name: customerData.firstName,
          last_name: customerData.lastName,
          phone: {
            number: cleanPhone,
            country_code: customerData.countryCode
          },
          redirect_url: redirectUrl
        })
      });

      const json = await response.json();
      if (json.success) {
        const checkoutUrl = 
          json.data?.payment?.checkout_url || 
          json.data?.data?.payment?.checkout_url || 
          json.data?.checkout_url || 
          json.checkout_url;

        // Commission de recommandation en attente
        if (referrerCode) {
          try {
            const { data: referrer } = await supabase
              .from('users')
              .select('id')
              .eq('referral_code', referrerCode)
              .maybeSingle();

            if (referrer) {
              await supabase.from('commissions').insert([{
                user_id: referrer.id,
                product_id: dbProductId,
                amount: commissionAmt,
                status: 'pending'
              }]);
            }
          } catch (err) {
            console.error("[Checkout Form] Échec de création d'une commission pending:", err);
          }
        }

        if (checkoutUrl) {
          metadataRef.current.payment_completed = true;
          if (onUpgrade) onUpgrade();
          window.location.href = checkoutUrl;
        } else {
          const errStr = "Impossible de récupérer le lien de paiement de Chariow.";
          setErrorMessageChariow(errStr);
          trackError(errStr);
        }
      } else {
        const errStr = json.message || "Erreur de l'API lors de l'initialisation du paiement.";
        setErrorMessageChariow(errStr);
        trackError(errStr);
      }
    } catch (err) {
      const errStr = "Une erreur réseau ou serveur s'est produite lors du paiement.";
      setErrorMessageChariow(errStr);
      trackError(errStr);
    } finally {
      setIsSubmittingChariow(false);
    }
  };

  return (
    <div 
      ref={outerContainerRef}
      onScroll={handleScroll}
      className={`fixed inset-0 z-[9000] bg-black selection:bg-purple-600 font-sans text-white ${isShowingChariowForm ? 'overflow-hidden' : 'overflow-y-auto'}`}
    >
      {/* IMMERSIVE BG: NOISE AND DEPTH */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden bg-black">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,#2e1065_0%,#000000_80%)]" />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
        {/* SCANLINES FOR TECH FEEL */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] bg-[length:100%_2px,3px_100%] pointer-events-none" />
        {/* FLOATING PARTICLES (CSS) */}
        <div className="particles-container absolute inset-0 opacity-20" />
      </div>

      {/* Wrapper to blur/dim the background page and disable its pointer events when the payment pop-up is open */}
      <div className={`transition-all duration-700 w-full min-h-screen ${isShowingChariowForm ? 'blur-2xl brightness-[0.25] saturate-50 scale-[0.98] pointer-events-none select-none' : ''}`}>
        <LiveActivityPulse />

      {/* Floating Premium Join Notification (Bottom Left) */}
      <AnimatePresence>
        {recentPremiumJoin && (
          <motion.div
            initial={{ opacity: 0, x: -50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -20, scale: 0.8 }}
            className="fixed bottom-6 left-6 z-[10000] flex items-center gap-4 bg-black/90 backdrop-blur-2xl border border-purple-500/30 p-4 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5),0_0_20px_rgba(168,85,247,0.1)_inset]"
          >
            <div className="relative">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-indigo-700 rounded-xl flex items-center justify-center text-white shadow-[0_0_15px_rgba(147,51,234,0.5)]">
                <Crown size={20} className="animate-pulse" />
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-black" />
            </div>
            
            <div className="flex flex-col">
              <p className="text-[10px] font-black uppercase text-purple-400 tracking-widest leading-none mb-1">Passage à l'Élite</p>
              <p className="text-sm font-bold text-white/90">
                <span className="text-white">{recentPremiumJoin.name}</span>
                <span className="text-neutral-500 text-xs font-medium ml-1">({recentPremiumJoin.city})</span>
              </p>
              <p className="text-[10px] text-neutral-400 font-medium italic">Vient de rejoindre MZ+ Premium</p>
            </div>

            <button 
              onClick={() => setRecentPremiumJoin(null)}
              className="ml-2 p-1 text-neutral-600 hover:text-white transition-colors"
            >
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TOP NAV: MINIMAL & PRO */}
      <nav className="fixed top-0 left-0 right-0 z-[100] p-6 flex justify-between items-center max-w-7xl mx-auto">
        <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="flex items-center gap-3">
          <div className="bg-purple-600 p-2 rounded-xl shadow-[0_0_30px_rgba(147,51,234,0.6)]"><Crown size={24} /></div>
          <span className="text-[10px] font-black uppercase tracking-[0.5em] hidden md:block">MZ+ ELITE INTERFACE // V2.4</span>
        </motion.div>
        
        <div className="flex items-center gap-3">
          {/* Top-right menu actions simplified as requested */}
        </div>
      </nav>

      {/* MAIN CONTENT RAILS */}
      <div className="relative z-10 max-w-6xl mx-auto px-6 pt-40 pb-64 space-y-48">
        {/* PERSONALIZED ACCELERATION POPUP FOR RETURNING USERS */}
        {showReturningPopup && profile?.store_preferences?.onboarding_goals && (
          <div 
            className="fixed inset-0 z-[25000] bg-black/75 backdrop-blur-3xl flex items-center justify-center p-4" 
            id="personalized_returning_popup"
            style={{ backdropFilter: 'blur(32px)', WebkitBackdropFilter: 'blur(32px)' }}
          >
            
            {/* GLOWING AMBIENCE BACKGROUND */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <div className="absolute top-1/4 left-1/4 w-[30vh] h-[30vh] bg-purple-600/10 rounded-full blur-[120px] animate-pulse" />
              <div className="absolute bottom-1/4 right-1/4 w-[25vw] h-[25vw] bg-emerald-600/10 rounded-full blur-[100px]" />
            </div>

            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-neutral-950 border border-purple-500/35 rounded-3xl p-5 sm:p-6 space-y-4 shadow-[0_0_50px_rgba(168,85,247,0.25)] overflow-hidden text-center"
            >
              {/* CLOSE ICON */}
              <button 
                onClick={() => setShowReturningPopup(false)}
                className="absolute top-4 right-4 text-neutral-500 hover:text-white transition-colors cursor-pointer"
                aria-label="Fermer"
              >
                <X size={20} />
              </button>

              {/* Background glowing blur */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
              
              <div className="space-y-4 flex flex-col items-center justify-center text-center">
                <div className="space-y-3 font-sans">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-500/10 border border-purple-500/20 rounded-full text-purple-400 text-[10px] font-black uppercase tracking-wider">
                    ✨ OBJECTIF ATTEIGNABLE
                  </div>

                  <p className="text-base sm:text-lg leading-relaxed text-neutral-200">
                    🔥 Hey <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500 font-extrabold">{profile?.full_name ? profile.full_name.split(' ')[0] : 'Leader'}</span>, tu es peut-être à un pas de l’objectif que tu veux atteindre : générer <span className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-300 to-emerald-400 drop-shadow-[0_0_12px_rgba(245,158,11,0.5)] animate-pulse inline-block uppercase tracking-wide px-2 py-0.5 rounded bg-yellow-500/5 border border-yellow-500/20 whitespace-nowrap">{formatAmountForSentence(profile?.store_preferences?.onboarding_goals?.amount_selected, currency, rates)}</span> par mois 👀💰
                  </p>

                  <p className="text-xs sm:text-sm text-neutral-400 max-w-xs mx-auto leading-relaxed">
                    Obtiens l'accompagnement personnalisé qui va te permettre d'atteindre ton objectif le plus rapidement possible.
                  </p>
                </div>

                {/* ACTION BUTTONS */}
                <div className="w-full space-y-2.5 pt-1 max-w-xs mx-auto">
                  <button
                    onClick={() => {
                      setShowReturningPopup(false);
                      handleUpgrade();
                    }}
                    className="w-full py-3.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-indigo-700 hover:from-purple-500 hover:to-indigo-500 text-white font-black uppercase text-xs tracking-[0.1em] rounded-2xl shadow-[0_15px_30px_rgba(147,51,234,0.3),0_0_20px_rgba(147,51,234,0.15)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 select-none cursor-pointer"
                  >
                    <span>OBTENIR MON ACCOMPAGNEMENT 🏆</span>
                    <ArrowRight size={14} />
                  </button>

                  <button
                    onClick={() => {
                      setShowReturningPopup(false);
                      setTimeout(() => {
                        scrollToProofs();
                      }, 100);
                    }}
                    className="w-full py-3 bg-neutral-900 border border-purple-500/20 hover:border-purple-500/40 text-neutral-400 hover:text-white font-bold uppercase text-[10px] tracking-wider rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 select-none cursor-pointer"
                  >
                    <span>VOIR LES RÉSULTATS DES MEMBRES 👀</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
        
        {/* 1. HERO: DESTRUCTIVE HEADLINE */}
        <section ref={heroRef} className="text-center space-y-12 md:space-y-16">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: 'circOut' }}
            className="space-y-6 md:space-y-10"
          >
            <div className="inline-block px-4 md:px-8 py-2 md:py-3 bg-white/5 border border-white/10 rounded-full text-purple-400 text-[9px] md:text-[11px] font-black uppercase tracking-[0.3em] md:tracking-[0.6em] mb-2 md:mb-6 animate-pulse shadow-[0_0_20px_rgba(168,85,247,0.1)]">
               EST-CE QUE TU VALIDES TON POTENTIEL ?
            </div>
            
            <h1 className="text-3xl sm:text-6xl md:text-8xl lg:text-[9.5rem] font-black italic tracking-tighter leading-[1.1] md:leading-[0.85] uppercase select-none break-words px-2">
              <span className="text-white">COMMENT GÉNÉRER</span> <br /> 
              <span className="text-purple-500 drop-shadow-[0_0_40px_rgba(168,85,247,0.8)] inline-block transform -skew-x-6">
                <GlitchText text="+1.000.000" />
              </span> <br /> 
              <span className="text-white">FCFA / MOIS AVEC MZ+</span>
            </h1>

            <div className="space-y-4 md:space-y-6">
              <p className="text-lg sm:text-xl md:text-4xl lg:text-5xl text-neutral-200 font-black max-w-5xl mx-auto leading-tight italic tracking-tighter px-4">
                "Tu es motivé, tu veux réussir en ligne… <br className="hidden md:block" /> 
                <span className="text-purple-500">mais tu sais pas comment ?</span>"
              </p>
            </div>
          </motion.div>

          {/* CTA: MASSIVE IMPACT */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.8 }}
            className="relative flex flex-col items-center gap-8 md:gap-12 px-4"
          >
             <div className="flex flex-col md:flex-row gap-4 items-center justify-center w-full max-w-4xl mx-auto">
               <button 
                 onClick={handleUpgrade}
                 className="group relative w-full md:w-auto px-8 md:px-12 py-5 md:py-6 bg-white text-black rounded-2xl md:rounded-[2rem] font-black uppercase text-[10px] md:text-sm tracking-[0.15em] overflow-hidden transition-all hover:scale-105 active:scale-95 shadow-[0_0_40px_rgba(168,85,247,0.35)] cursor-pointer border border-white/40"
               >
                  <div className="absolute inset-0 bg-purple-600 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                  <span className="relative z-10 group-hover:text-white transition-colors flex items-center justify-center gap-3">
                    OBTENIR MON ACCOMPAGNEMENT & MA RÉUSSITE <ArrowUpRight size={18} />
                  </span>
               </button>

               <button
                 type="button"
                 onClick={scrollToProofs}
                 className="w-full md:w-auto px-6 md:px-8 py-3.5 md:py-4.5 bg-neutral-950/40 border border-neutral-800/80 hover:border-purple-500/20 text-neutral-500 hover:text-neutral-300 rounded-xl md:rounded-2xl font-black uppercase text-[9px] md:text-[11px] tracking-widest transition-all duration-300 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
               >
                 <span>Voir les résultats 👀</span>
               </button>
             </div>
             
             <div className="flex flex-col items-center gap-4">
                <div className="flex gap-6 md:gap-10 items-center justify-center grayscale opacity-40">
                   <img src="https://upload.wikimedia.org/wikipedia/commons/b/ba/Stripe_Logo%2C_revised_2016.svg" alt="Stripe" className="h-4 md:h-6" />
                   <img src="https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg" alt="PayPal" className="h-4 md:h-6" />
                   <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" alt="Visa" className="h-3 md:h-4" />
                </div>
                <div className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] md:tracking-[0.3em] text-neutral-600 text-center">Paiement ultra-sécurisé par cryptage AES-256</div>
             </div>

             {/* INDICATEUR DE DEFILEMENT POUR REVELER LA SUITE DE LA PAGE */}
             <div className="pt-16 flex flex-col items-center gap-3 select-none">
                <span className="text-[10px] sm:text-xs font-black tracking-[0.3em] text-purple-400 uppercase animate-pulse">
                   ⚡ Défiler pour découvrir la suite du programme
                </span>
                <motion.div 
                  animate={{ y: [0, 8, 0] }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                  className="w-6 h-10 border-2 border-purple-500/30 rounded-full flex justify-center p-1"
                >
                   <div className="w-1.5 h-2 bg-purple-500 rounded-full" />
                </motion.div>
             </div>
          </motion.div>
        </section>

        {/* 2. THE FRUSTRATION: WHY STAGNATE? */}
        <section className="max-w-4xl mx-auto">
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="space-y-8 md:space-y-12 text-center md:text-left"
            >
               <h2 className="text-3xl sm:text-4xl md:text-6xl font-black uppercase italic leading-none tracking-tighter text-center">
                 L'ERREUR FATALE <br /> <span className="text-neutral-600">DU NIVEAU STANDARD.</span>
               </h2>
               <div className="grid md:grid-cols-3 gap-6 md:gap-10">
                  {[
                    { t: "L'invisibilité algorithmique", d: "Sans Premium, tes chances de voir les opportunités à 6 chiffres sont divisées par 10." },
                    { t: "Le plafond de verre", d: "Tu es limité à des miettes pendant que les membres Élite dévorent le marché." },
                    { t: "L'isolement total", d: "Avancer seul est le chemin le plus court vers l'abandon." }
                  ].map((item, i) => (
                    <div key={i} className="flex flex-col items-center md:items-start gap-4 md:gap-6 group text-center md:text-left">
                       <div className="w-12 h-12 md:w-16 md:h-16 bg-white/5 border border-white/10 rounded-xl md:rounded-[1.5rem] flex items-center justify-center shrink-0 group-hover:bg-red-600/10 group-hover:border-red-500/50 transition-all shadow-xl">
                          <AlertCircle size={24} className="text-red-500 md:w-7 md:h-7" />
                       </div>
                       <div className="space-y-0.5 md:space-y-1">
                          <h4 className="text-lg md:text-xl font-black uppercase italic text-white/90">{item.t}</h4>
                          <p className="text-xs md:text-base text-neutral-500 font-medium leading-relaxed">{item.d}</p>
                       </div>

                     </div>
                  ))}
               </div>
            </motion.div>
         </section>

         <section id="proofs-section" className="space-y-8 md:space-y-12 scroll-mt-20">
             {/* Simple, intuitive and deeply human header */}
             <div className="text-center space-y-3 max-w-2xl mx-auto px-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-500/10 border border-purple-500/20 rounded-full">
                   <Sparkles size={12} className="text-purple-400 animate-pulse" />
                   <span className="text-[10px] font-bold tracking-widest text-purple-300 uppercase">CECI VA CHANGER VOTRE VISION DES CHOSES</span>
                </div>
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-black uppercase text-white tracking-tight leading-tight flex-wrap justify-center flex gap-x-2">
                   Leur déclic <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-yellow-400">à portée de main</span>
                </h2>
                <p className="text-neutral-400 text-xs sm:text-sm leading-relaxed">
                   Ils étaient exactement là où vous êtes aujourd'hui : bloqués, impatients et pleins de doutes. Découvrez en un coup d'œil comment leur situation s'est débloquée.
                </p>
             </div>

             {/* Interactive Member Selector (Tabs) */}
             {(() => {
               const fallbackProofs = [
                 {
                   id: "fb-1",
                   name: "Valdes",
                   milestone_title: "Ma première victoire",
                   before_amount: "0 FCFA",
                   after_amount: "40 000 FCFA",
                   time_frame: "En seulement 2 jours",
                   short_tag: "Déblocage Express",
                   description: "J’ai passé 10 jours en mode standard à attendre sans rien recevoir. J'ai franchi le pas pour activer Premium un vendredi soir. Le dimanche matin, premier virement de 40 000 FCFA sur mon compte !",
                   after_image_url: "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&q=80&w=400",
                   country_flag: "🇨🇮 Côte d'Ivoire"
                 },
                 {
                   id: "fb-2",
                   name: "Ibrahim",
                   before_amount: "5 000 FCFA",
                   after_amount: "150 000 FCFA",
                   milestone_title: "La délivrance totale",
                   time_frame: "En 5 jours",
                   short_tag: "Retrait direct",
                   description: "Tout le monde me disait que ça n'allait jamais marcher pour moi. J'ai quand même activé Premium en me disant que je n'avais rien à perdre. En 5 jours, j'ai cumulé et retiré 150 000 FCFA. Une immense fierté devant mes amis !",
                   after_image_url: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&q=80&w=400",
                   country_flag: "🇨🇲 Cameroun"
                 },
                 {
                   id: "fb-3",
                   name: "Yasmine",
                   before_amount: "15 000 FCFA",
                   after_amount: "500 000 FCFA",
                   milestone_title: "Le soulagement familial",
                   time_frame: "En 2 semaines",
                   short_tag: "Sécurité financière",
                   description: "Je voulais juste gagner un peu de quoi soulager mes fins de mois difficiles. Quand j'ai activé Premium, tout s'est accéléré tellement vite. J'ai fait 500 000 FCFA en deux semaines. Cela a changé la vie de toute ma maison.",
                   after_image_url: "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&q=80&w=400",
                   country_flag: "🇸🇳 Sénégal"
                 }
               ];

               const activeProofs = proofs.filter(p => p.is_active !== false);
               let displayedProofs = activeProofs.length > 0 ? activeProofs : fallbackProofs;

               // Normalizing data fields to avoid rendering issues
               displayedProofs = displayedProofs.map((p, idx) => ({
                 ...p,
                 before_amount: p.before_amount || "0 FCFA",
                 after_amount: p.after_amount || "40 000 FCFA",
                 time_frame: p.time_frame || "2 jours",
                 short_tag: p.short_tag || (idx === 0 ? "Déblocage Express" : idx === 1 ? "Retrait direct" : "Changement de vie"),
                 milestone_title: p.milestone_title || (idx === 0 ? "Ma première victoire" : idx === 1 ? "La délivrance totale" : "Le soulagement familial"),
                 country_flag: p.country_flag || (idx % 3 === 0 ? "🇨🇮 Côte d'Ivoire" : idx % 3 === 1 ? "🇨🇲 Cameroun" : "🇸🇳 Sénégal")
               }));

               // Safety fallback index to prevent out of bounds
               // Sort proofs: Respect sort_order if specifically set (non-zero),
               // otherwise sub-sort descending from the largest sum to the smallest (de la plus grosse somme à la plus petite)
               displayedProofs.sort((a, b) => {
                 const parseAmountValue = (amountStr: string | null | undefined): number => {
                   if (!amountStr) return 0;
                   const cleaned = amountStr.replace(/\D/g, '');
                   const parsed = parseInt(cleaned, 10);
                   return isNaN(parsed) ? 0 : parsed;
                 };

                 const orderA = a.sort_order !== undefined && a.sort_order !== null ? Number(a.sort_order) : 0;
                 const orderB = b.sort_order !== undefined && b.sort_order !== null ? Number(b.sort_order) : 0;

                 if (orderA !== 0 || orderB !== 0) {
                   const normalizedA = orderA === 0 ? 999999 : orderA;
                   const normalizedB = orderB === 0 ? 999999 : orderB;
                   if (normalizedA !== normalizedB) {
                     return normalizedA - normalizedB;
                   }
                 }

                 const amtA = parseAmountValue(a.after_amount);
                 const amtB = parseAmountValue(b.after_amount);
                 return amtB - amtA;
               });

               const safeIndex = selectedProofIndex < displayedProofs.length ? selectedProofIndex : 0;
               const selectedProof = displayedProofs[safeIndex];

               return (
                  <div className="space-y-6 md:space-y-8 px-4 max-w-4xl mx-auto">
                     {/* Horizontal Navigation Grid */}
                     <div className="flex flex-row overflow-x-auto gap-3 pb-2 scrollbar-none justify-start md:justify-center">
                        {displayedProofs.map((proof, idx) => {
                          const isSelected = idx === safeIndex;
                          return (
                             <button
                               key={proof.id || idx}
                               type="button"
                               onClick={() => setSelectedProofIndex(idx)}
                               className={`flex items-center gap-3 px-4 py-3 rounded-2xl border text-left shrink-0 transition-all duration-300 cursor-pointer ${
                                 isSelected 
                                   ? "bg-purple-600/20 border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.15)] text-white" 
                                   : "bg-neutral-900/40 border-white/5 text-neutral-400 hover:border-white/10 hover:text-white"
                               }`}
                             >
                                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                                  isSelected ? "bg-purple-500 text-white" : "bg-white/5 text-neutral-400"
                                }`}>
                                   {proof.name ? proof.name[0].toUpperCase() : "M"}
                                </span>
                                <div>
                                   <p className="text-xs font-black leading-none">{proof.name}</p>
                                   <p className="text-[10px] text-neutral-500 font-medium mt-1">{proof.country_flag}</p>
                                </div>
                             </button>
                          );
                        })}
                     </div>

                     {/* Main Display Transformation Card */}
                     <AnimatePresence mode="wait">
                        <motion.div
                          key={selectedProof.id || safeIndex}
                                           className="bg-neutral-900/30 border border-white/5 rounded-3xl p-5 sm:p-8 flex flex-col md:grid md:grid-cols-12 gap-6 md:gap-8 shadow-2xl relative overflow-hidden"
                        >
                           {/* Glow background accent */}
                           <div className="absolute top-0 right-0 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl -z-10" />

                           {/* Left part: Direct View of the AFTER image of success with Clickable Cue */}
                           <div className="md:col-span-5 flex flex-col justify-center space-y-4">
                              <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest leading-none">📸 PREUVE DE REUSSITE</p>
                              
                              <div className="relative aspect-[4/3] rounded-2xl overflow-hidden border border-purple-500/20 bg-neutral-950 shadow-2xl group/img">
                                 {selectedProof.after_image_url ? (
                                    <img 
                                       src={getGDriveThumbnailUrl(selectedProof.after_image_url)} 
                                       alt={`Preuve de gain de ${selectedProof.name}`} 
                                       className="w-full h-full object-cover transition-transform duration-500 group-hover/img:scale-105 cursor-pointer"
                                       referrerPolicy="no-referrer"
                                       onClick={() => setFullscreenProof(selectedProof)}
                                    />
                                 ) : (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
                                       <Sparkles size={28} className="text-purple-400 animate-pulse mb-2" />
                                       <span className="text-[10px] font-bold text-neutral-500 uppercase">Preuve activée</span>
                                    </div>
                                 )}
                                 
                                 {/* Elegant Overlay Badge */}
                                 <div className="absolute top-3 left-3 bg-purple-600/90 backdrop-blur-md px-3 py-1 rounded-full border border-purple-400/30 shadow-lg">
                                    <span className="text-[10px] font-black tracking-wider text-white uppercase font-sans">
                                       ✨ REÇU VERIFIÉ
                                    </span>
                                 </div>

                                 {/* Persistent Intuitive Click Indicator (Non-verbal, non-hover-dependent) */}
                                 <div 
                                    className="absolute bottom-3 right-3 bg-black/80 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-white/10 flex items-center gap-2 shadow-2xl pointer-events-none"
                                 >
                                    {/* Pulsing signal beacon */}
                                    <span className="relative flex h-2 w-2">
                                       <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                                       <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
                                    </span>
                                    {/* Action symbol */}
                                    <Maximize2 size={11} className="text-purple-400 animate-pulse" />
                                 </div>
                              </div>
                           </div>

                           {/* Right part: Testimony, Personalized Progression, Gamified Tracker & Immediate Action */}
                           <div className="md:col-span-7 flex flex-col justify-between space-y-4">
                              <div className="space-y-4">
                                 <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-purple-400 uppercase tracking-widest leading-none flex items-center gap-1.5">
                                       <Sparkles size={12} className="animate-pulse text-purple-400" />
                                       Progression Personnalisée de {selectedProof.name}
                                    </p>
                                    <h3 className="text-lg sm:text-2xl font-black text-white uppercase tracking-tight font-sans">
                                       De <span className="text-neutral-500 line-through">0 FCFA</span> à <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-pink-400 to-yellow-400">+{selectedProof.after_amount}</span> obtenu {selectedProof.time_frame.toLowerCase()} !
                                    </h3>
                                    <div className="flex flex-wrap gap-2">
                                       <span className="text-[9px] text-neutral-400 bg-white/5 border border-white/10 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">
                                          {selectedProof.country_flag}
                                       </span>
                                       <span className="text-[9px] text-purple-400 bg-purple-500/10 border border-purple-500/10 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">
                                          ⭐ {selectedProof.short_tag}
                                       </span>
                                    </div>
                                 </div>

                                 {/* Gamified Non-Verbal Journey Timeline */}
                                 <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-4 space-y-4">
                                    <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-neutral-500">
                                       <span>Conversion Elite</span>
                                       <span className="text-purple-400">Succès Déverrouillé 🏆</span>
                                    </div>
                                    
                                    <div className="relative flex items-center justify-between pt-1 px-1">
                                       {/* Connector Lines */}
                                        <div className="absolute left-6 right-6 top-[14px] h-[2px] bg-neutral-800 -z-10" />
                                        <div className="absolute left-6 right-6 top-[14px] h-[2px] bg-gradient-to-r from-neutral-600 via-purple-500 to-yellow-500 -z-10 animate-pulse" />
                                       
                                       {/* Dot 1: Locked Mode */}
                                       <div className="flex flex-col items-center space-y-1.5">
                                          <div className="w-8 h-8 rounded-full bg-neutral-950 border border-neutral-800 flex items-center justify-center text-[10px] text-neutral-600 shadow-md">
                                             🔒
                                          </div>
                                          <span className="text-[7.5px] font-black text-neutral-600 uppercase tracking-wider">Compte Bloqué</span>
                                       </div>

                                       {/* Dot 2: Elite Boost */}
                                       <div className="flex flex-col items-center space-y-1.5">
                                          <div className="w-8 h-8 rounded-full bg-purple-950/80 border border-purple-500/40 flex items-center justify-center text-[10px] text-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.3)] animate-pulse">
                                             ⚡
                                          </div>
                                          <span className="text-[7.5px] font-black text-purple-400 uppercase tracking-wider">Accompagnement</span>
                                       </div>

                                       {/* Dot 3: Claimed payout */}
                                       <div className="flex flex-col items-center space-y-1.5">
                                          <div className="w-8 h-8 rounded-full bg-amber-950/80 border border-amber-500/40 flex items-center justify-center text-[10px] text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.4)]">
                                             🏆
                                          </div>
                                          <span className="text-[7.5px] font-black text-amber-400 uppercase tracking-wider">+{selectedProof.after_amount}</span>
                                       </div>
                                    </div>
                                 </div>

                                 {/* Genuine human quote */}
                                 <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed italic bg-white/[0.02] border border-white/5 p-4 rounded-2xl">
                                    "{selectedProof.description}"
                                 </p>
                              </div>

                              {/* Actionable buttons */}
                              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                                 <button
                                   type="button"
                                   onClick={handleUpgrade}
                                   className="flex-1 py-3.5 px-5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-[0_4px_15px_rgba(168,85,247,0.2)] hover:scale-[1.01] flex items-center justify-center gap-2 cursor-pointer"
                                 >
                                    <span>Faire comme {selectedProof.name}</span>
                                    <Rocket size={13} />
                                 </button>
                              </div>
                           </div>
                        </motion.div>
                     </AnimatePresence>
                  </div>
               );
             })()}
         </section>

         
{/* 4. FINAL CLOSURE: ZERO-DARK-30 */}
        <section className="relative overflow-hidden group py-16 md:py-32 rounded-3xl md:rounded-[5rem] border-2 border-purple-500/50 bg-black text-center space-y-12 md:space-y-16 shadow-[0_0_150px_rgba(139,92,246,0.2)]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,#1e1b4b_0%,#000000_100%)] opacity-50" />
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-30 px-4 md:px-0" />
            
            <div className="max-w-4xl mx-auto space-y-8 md:space-y-10 px-4 md:px-8 relative z-10">
                <div className="flex justify-center">
                  <motion.div 
                    animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
                    transition={{ repeat: Infinity, duration: 4 }}
                    className="w-16 h-16 md:w-24 md:h-24 bg-purple-600 rounded-2xl md:rounded-[2.5rem] flex items-center justify-center shadow-[0_0_60px_rgba(168,85,247,0.5)]"
                  >
                    <Crown size={32} className="text-white md:w-[50px] md:h-[50px]" />
                  </motion.div>
                </div>

                <h3 className="text-4xl sm:text-5xl md:text-9xl font-black uppercase tracking-tighter italic leading-none break-words">
                  DERNIER <br /><span className="text-purple-500 italic drop-shadow-[0_0_30px_rgba(168,85,247,0.5)]">APPEL.</span>
                </h3>
                
                <p className="text-lg md:text-3xl font-bold text-neutral-300 leading-tight italic px-2">
                  "Beaucoup regardent cette page. Très peu osent vraiment évoluer. <br className="hidden md:block" />
                  <span className="text-white underline decoration-purple-600 underline-offset-4 md:underline-offset-8">Lequel des deux es-tu aujourd'hui ?</span>"
                </p>

                <div className="pt-6 md:pt-10 space-y-8 md:space-y-12">
                    <div className="flex flex-col items-center gap-4 md:gap-6">
                        <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6">
                           <span className="text-neutral-700 line-through text-2xl md:text-4xl font-mono italic">{config.price_normal} FCFA</span>
                           <span className="text-5xl sm:text-6xl md:text-[9rem] font-mono font-black italic text-white tracking-tighter drop-shadow-[0_0_40px_rgba(255,255,255,0.1)] leading-none">
                             {config.price_promo} <span className="text-xl md:text-2xl text-purple-600 italic uppercase">FCFA</span>
                           </span>
                        </div>
                        {timeLeft && (
                          <div className="flex gap-4 md:gap-6 font-mono text-xl md:text-5xl text-red-600 font-black tracking-widest bg-white/5 px-6 md:px-10 py-3 md:py-6 rounded-2xl md:rounded-3xl border border-red-900/50 animate-pulse">
                            <span>{timeLeft.hours.toString().padStart(2, '0')}</span> :
                            <span>{timeLeft.minutes.toString().padStart(2, '0')}</span> :
                            <span>{timeLeft.seconds.toString().padStart(2, '0')}</span>
                          </div>
                        )}
                    </div>

                    <button 
                      onClick={handleUpgrade}
                      className="group w-full max-w-2xl mx-auto py-8 md:py-12 bg-white text-black rounded-[2rem] md:rounded-[3rem] font-black uppercase text-base md:text-3xl tracking-[0.2em] md:tracking-[0.4em] shadow-[0_20px_100px_rgba(255,255,255,0.15)] hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-4 md:gap-8 relative overflow-hidden"
                    >
                       <div className="absolute inset-0 bg-gradient-to-r from-transparent via-black/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                       PASSER AU NIVEAU ÉLITE 
                       <Rocket size={32} className="md:w-[40px] md:h-[40px] group-hover:translate-x-2 group-hover:-translate-y-2 transition-transform" />
                    </button>
                    
                    <div className="flex flex-wrap items-center justify-center gap-4 md:gap-8 opacity-40 text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] md:tracking-[0.4em] text-neutral-500">
                       <span className="flex items-center gap-2 md:gap-3"><BadgeCheck size={12} className="md:w-[14px] md:h-[14px]" /> Paiement unique</span>
                       <span className="flex items-center gap-2 md:gap-3"><Clock size={12} className="md:w-[14px] md:h-[14px]" /> Accès immédiat</span>
                       <span className="flex items-center gap-2 md:gap-3"><ShieldAlert size={12} className="md:w-[14px] md:h-[14px]" /> 100% sécurisé</span>
                    </div>
                </div>
            </div>
        </section>

       </div>

       </div> {/* End background blur wrapper */}

      <AnimatePresence>
        {fullscreenProof && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[20000] flex flex-col items-center justify-center p-4 sm:p-6 bg-black/75 backdrop-blur-3xl overflow-y-auto" 
            style={{ backdropFilter: 'blur(32px)', WebkitBackdropFilter: 'blur(32px)' }}
            onClick={() => setFullscreenProof(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 30, filter: 'blur(10px)' }}
              animate={{ scale: 1, y: 0, filter: 'blur(0px)' }}
              className="relative w-full max-w-4xl bg-[#080808] border border-purple-500/30 rounded-[2.5rem] p-6 sm:p-8 shadow-[0_0_80px_rgba(168,85,247,0.25)] flex flex-col gap-6 text-left my-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button 
                onClick={() => setFullscreenProof(null)}
                className="absolute top-4 sm:top-6 right-4 sm:right-6 p-2 bg-white/5 hover:bg-white/10 rounded-full text-neutral-400 hover:text-white transition-all cursor-pointer z-50"
              >
                <X size={18} />
              </button>

              {/* Title Header with Badge */}
              <div className="space-y-2">
                 <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-500/10 border border-purple-500/20 rounded-full text-[9px] text-purple-400 font-black uppercase tracking-widest leading-none">
                    ⭐ PARCOURS DE REUSSITE VERIFIE
                 </div>
                 <h3 className="text-xl sm:text-3xl font-black text-white uppercase tracking-tight font-sans text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-white leading-tight">
                    L'Évolution de {fullscreenProof.name} dans le Club Élite
                 </h3>
                 <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest font-mono">
                    ⏱️ Atteint en seulement {fullscreenProof.time_frame || "2 jours"}
                 </p>
              </div>

              {/* Centered Focus of the Successful After aspect */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8 max-h-[60vh] md:max-h-none overflow-y-auto pr-1">
                 {/* Left column: Full-view Success Proof Image */}
                 <div className="md:col-span-6 space-y-3">
                    <p className="text-[10px] font-black tracking-widest text-purple-400 uppercase leading-none">📸 DOCUMENT DE REUSSITE VERIFIE</p>
                    <div className="relative aspect-[3/4] max-h-[420px] rounded-2xl overflow-hidden border border-purple-500/30 bg-neutral-950 shadow-[0_0_40px_rgba(168,85,247,0.15)] flex items-center justify-center">
                       {fullscreenProof.after_image_url ? (
                          <img 
                             src={getGDriveThumbnailUrl(fullscreenProof.after_image_url)} 
                             alt={`Preuve de gain de ${fullscreenProof.name}`} 
                             className="w-full h-full object-cover" 
                             referrerPolicy="no-referrer"
                          />
                       ) : (
                          <div className="text-center p-6">
                             <Crown size={48} className="text-purple-500/40 mx-auto mb-3 animate-pulse" />
                             <span className="text-xs font-bold text-purple-400 uppercase tracking-widest">Reçu validé et crypté</span>
                          </div>
                       )}
                       
                       {/* Overlay Amount Badge */}
                       <div className="absolute top-4 left-4 bg-purple-600 px-3 py-1.5 rounded-full text-[10px] font-black font-sans text-white uppercase tracking-wider shadow-lg flex items-center gap-1">
                          <span>✨ REÇU VERIFIÉ</span>
                       </div>

                       <div className="absolute bottom-4 right-4 bg-black/90 backdrop-blur-md border border-purple-500/30 px-3.5 py-2 rounded-xl text-xs font-mono text-white font-black shadow-2xl flex items-center gap-1.5 leading-none">
                          <BadgeCheck size={13} className="text-green-400" />
                          <span>+{fullscreenProof.after_amount}</span>
                       </div>
                    </div>
                 </div>

                 {/* Right column: Interactive Gamified Stats, Success Story & Context */}
                 <div className="md:col-span-6 flex flex-col justify-between space-y-5">
                    <div className="space-y-4">
                       {/* Gamified Non-Verbal Journey Timeline */}
                       <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 sm:p-5 space-y-4">
                          <div className="flex items-center justify-between">
                             <p className="text-[9px] font-black uppercase tracking-widest text-neutral-500">CONVERSION DE COMPTE</p>
                             <span className="text-[9.5px] font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-yellow-400">STATUS: RECHARGÉ 🏆</span>
                          </div>
                          
                          <div className="relative flex items-center justify-between pt-1">
                             {/* Connector Lines */}
                             <div className="absolute left-6 right-6 top-[14px] h-[2px] bg-neutral-800 -z-10" />
                             <div className="absolute left-6 right-6 top-[14px] h-[2px] bg-gradient-to-r from-neutral-600 via-purple-500 to-yellow-500 -z-10 animate-pulse" />
                             
                             {/* Dot 1: Locked Mode */}
                             <div className="flex flex-col items-center space-y-1.5">
                                <div className="w-8 h-8 rounded-full bg-neutral-950 border border-neutral-800 flex items-center justify-center text-[10px] text-neutral-600 shadow-md">
                                   🔒
                                </div>
                                <span className="text-[7.5px] font-black text-neutral-600 uppercase tracking-wider">0 FCFA</span>
                             </div>

                             {/* Dot 2: Booster */}
                             <div className="flex flex-col items-center space-y-1.5">
                                <div className="w-8 h-8 rounded-full bg-purple-950/80 border border-purple-500/40 flex items-center justify-center text-[10px] text-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.3)] animate-pulse">
                                   ⚡
                                </div>
                                <span className="text-[7.5px] font-black text-purple-400 uppercase tracking-wider">Accompagnement</span>
                             </div>

                             {/* Dot 3: Claimed payout */}
                             <div className="flex flex-col items-center space-y-1.5">
                                <div className="w-8 h-8 rounded-full bg-amber-950/80 border border-amber-500/40 flex items-center justify-center text-[10px] text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.4)]">
                                   🏆
                                </div>
                                <span className="text-[7.5px] font-black text-amber-400 uppercase tracking-wider">+{fullscreenProof.after_amount}</span>
                             </div>
                          </div>
                       </div>

                       {/* Bio Info of the Member */}
                       <div className="bg-neutral-900/40 border border-white/5 rounded-2xl p-4 space-y-2">
                          <p className="text-[8.5px] font-black tracking-widest text-neutral-500 uppercase">IDENTITE EXPLOITANT</p>
                          <div className="flex items-center gap-3">
                             <span className="w-10 h-10 rounded-full bg-purple-500/20 text-purple-300 font-extrabold flex items-center justify-center border border-purple-500/10 text-sm">
                                {fullscreenProof.name ? fullscreenProof.name[0].toUpperCase() : "M"}
                             </span>
                             <div>
                                <p className="text-sm font-black text-white">{fullscreenProof.name}</p>
                                <p className="text-[10px] text-neutral-400 font-bold">{fullscreenProof.country_flag} • {fullscreenProof.short_tag}</p>
                             </div>
                          </div>
                      </div>

                       {/* Testimony */}
                       <div className="p-4 bg-purple-950/10 border border-purple-500/10 rounded-2xl space-y-1">
                          <p className="text-[8.5px] font-black uppercase tracking-widest text-purple-400">📝 ANALYSE DE LA REUSSITE</p>
                          <p className="text-xs sm:text-sm text-neutral-300 italic leading-relaxed">
                             "{fullscreenProof.description || "Après des semaines bloqué sans résultats en mode standard, la mise à niveau Elite Premium a permis de libérer tout le potentiel. L'accélération automatique s'est montrée d'une efficacité redoutable."}"
                          </p>
                       </div>
                    </div>

                    {/* Premium action in details screen */}
                    <div className="pt-4 border-t border-white/5 flex flex-col sm:flex-row gap-4 items-center justify-between">
                       <div className="text-center sm:text-left">
                          <p className="text-[8px] font-black uppercase text-neutral-500 tracking-wider font-mono">Rejoignez l'élite</p>
                          <p className="text-lg font-black font-mono text-white">Tarif Promotionnel : <span className="text-purple-400">{config.price_promo} FCFA</span></p>
                       </div>
                       <button 
                         onClick={() => { setFullscreenProof(null); handleUpgrade(); }}
                         className="w-full sm:w-auto px-6 py-4 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-[11px] font-black uppercase tracking-[0.1em] shadow-[0_4px_20px_rgba(168,85,247,0.3)] hover:scale-102 transition-all flex items-center justify-center gap-2 cursor-pointer"
                       >
                          <span>ACTIVER COMME ELITE</span>
                          <Rocket size={14} />
                       </button>
                    </div>
                 </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CHARIOW COUPLAGE BILLING MODAL */}
      <AnimatePresence>
        {isShowingChariowForm && (
          <div 
            className="fixed inset-0 z-[25000] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-3xl overflow-y-auto"
            style={{ backdropFilter: 'blur(32px)', WebkitBackdropFilter: 'blur(32px)' }}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.96, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 15 }}
              className="relative w-full max-w-md bg-neutral-950 border border-purple-500/35 rounded-3xl p-4 sm:p-5 md:p-6 shadow-[0_20px_50px_rgba(0,0,0,0.95),0_0_40px_rgba(168,85,247,0.2)] overflow-y-auto max-h-[95vh] sm:max-h-none scrollbar-none my-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Decorative radial glows */}
              <div className="absolute top-0 left-12 w-32 h-32 bg-purple-600/10 rounded-full blur-[60px] pointer-events-none" />
              <div className="absolute bottom-0 right-12 w-32 h-32 bg-indigo-600/10 rounded-full blur-[60px] pointer-events-none" />
              
              <button 
                onClick={() => setIsShowingChariowForm(false)}
                className="absolute top-3.5 right-3.5 p-1.5 bg-white/5 hover:bg-white/10 rounded-full text-neutral-400 hover:text-white transition-all cursor-pointer z-50 focus:outline-none"
                type="button"
              >
                <X size={14} />
              </button>

              <div className="space-y-4 relative z-10 text-left">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-gradient-to-br from-purple-600 to-indigo-700 rounded-lg text-white shadow-lg shadow-purple-500/15"><Crown size={18} className="animate-pulse" /></div>
                  <div>
                    <h3 className="text-sm sm:text-base font-black uppercase tracking-tight text-white font-sans text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-white leading-tight">Dernier pas vers ta réussite</h3>
                    <p className="text-[8px] uppercase font-bold tracking-wider text-yellow-500 font-sans leading-none">Cercle Élite MZ+ Premium</p>
                  </div>
                </div>

                <div className="p-3 sm:p-4 bg-gradient-to-r from-purple-950/40 to-neutral-900 border border-purple-500/25 rounded-xl flex justify-between items-center font-mono relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-12 h-12 bg-purple-600/10 rounded-full blur-lg" />
                  <div>
                    <span className="text-[8px] text-purple-400 font-black uppercase tracking-widest block font-sans">TARIF EXCLUSIF UNIQUE</span>
                    <span className="text-[9px] text-neutral-500 font-sans">Aucun abonnement récurrent</span>
                  </div>
                  <span className="text-lg sm:text-xl font-black text-white drop-shadow-[0_0_10px_rgba(168,85,247,0.3)]">{config.price_promo} FCFA</span>
                </div>

                <form className="space-y-3" onSubmit={handleChariowCheckoutSubmit}>
                  {/* Slim lists */}
                  <div className="grid grid-cols-3 gap-1.5 text-[8px] sm:text-[9px] font-sans text-neutral-400 text-center">
                    <div className="p-2 bg-white/5 rounded-lg border border-white/5">
                      <span className="text-emerald-500 font-black block text-xs">✓</span>
                      <span>Accompagnement personnalisé</span>
                    </div>
                    <div className="p-2 bg-white/5 rounded-lg border border-white/5">
                      <span className="text-emerald-500 font-black block text-xs">✓</span>
                      <span>Commissions de parrainage</span>
                    </div>
                    <div className="p-2 bg-white/5 rounded-lg border border-white/5">
                      <span className="text-emerald-500 font-black block text-xs">✓</span>
                      <span>IA Luna Expert</span>
                    </div>
                  </div>
                  
                  {/* First Name & Last Name (Side by Side everywhere) */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-0.5">
                      <label className="text-[8px] text-neutral-500 font-bold uppercase tracking-wider block font-sans">Prénom</label>
                      <input 
                        required
                        type="text" 
                        className="w-full bg-black border border-white/10 rounded-lg p-2.5 text-xs text-white placeholder-neutral-600 focus:border-purple-500 outline-none transition-colors"
                        placeholder="Ex: Jean"
                        value={customerData.firstName}
                        onChange={e => {
                          setCustomerData({...customerData, firstName: e.target.value});
                          trackFieldFilled('firstName', e.target.value.trim().length > 0);
                        }}
                      />
                    </div>
                    <div className="space-y-0.5">
                      <label className="text-[8px] text-neutral-500 font-bold uppercase tracking-wider block font-sans">Nom</label>
                      <input 
                        required
                        type="text" 
                        className="w-full bg-black border border-white/10 rounded-lg p-2.5 text-xs text-white placeholder-neutral-600 focus:border-purple-500 outline-none transition-colors"
                        placeholder="Ex: Kouassi"
                        value={customerData.lastName}
                        onChange={e => {
                          setCustomerData({...customerData, lastName: e.target.value});
                          trackFieldFilled('lastName', e.target.value.trim().length > 0);
                        }}
                      />
                    </div>
                  </div>

                  {/* Email & Phone side-by-side on desktop, stacked on mobile to save vertical height */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="space-y-0.5">
                      <label className="text-[8px] text-neutral-500 font-bold uppercase tracking-wider block font-sans">Email</label>
                      <input 
                        required
                        type="email" 
                        className="w-full bg-black border border-white/10 rounded-lg p-2.5 text-xs text-white placeholder-neutral-600 focus:border-purple-500 outline-none transition-colors"
                        placeholder="client@domaine.com"
                        value={customerData.email}
                        onChange={e => {
                          setCustomerData({...customerData, email: e.target.value});
                          trackFieldFilled('email', e.target.value.trim().length > 0);
                        }}
                      />
                    </div>

                    <div className="space-y-0.5">
                      <label className="text-[8px] text-neutral-500 font-bold uppercase tracking-wider block font-sans">Téléphone</label>
                      <div className="flex gap-1.5">
                        <select 
                          className="bg-black border border-white/10 rounded-lg p-2.5 text-[10px] text-white focus:border-purple-500 outline-none transition-colors shrink-0 max-w-[120px]"
                          value={customerData.countryCode}
                          onChange={e => setCustomerData({...customerData, countryCode: e.target.value})}
                        >
                          {countriesSorted.map(c => (
                            <option key={c.code} value={c.code} className="bg-neutral-900 text-white">
                              {getFlagEmoji(c.code)} {c.name} (+{c.dial}) ({c.code})
                            </option>
                          ))}
                        </select>
                        <input 
                          required
                          type="tel" 
                          className="flex-1 min-w-0 bg-black border border-white/10 rounded-lg p-2.5 text-xs text-white placeholder-neutral-650 focus:border-purple-500 outline-none transition-colors"
                          placeholder="Numéro mobile"
                          value={customerData.phone}
                          onChange={e => {
                            setCustomerData({...customerData, phone: e.target.value});
                            trackFieldFilled('phone', e.target.value.trim().length > 0);
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {errorMessageChariow && (
                    <div className="p-2.5 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-[9px] uppercase font-bold text-center font-sans leading-tight">
                      {errorMessageChariow}
                    </div>
                  )}

                  <div className="pt-1.5 flex flex-col gap-1.5">
                    <button 
                      type="submit"
                      disabled={isSubmittingChariow}
                      className="w-full bg-gradient-to-r from-purple-600 via-purple-700 to-indigo-700 hover:from-purple-500 hover:to-indigo-600 text-white hover:shadow-[0_0_30px_rgba(168,85,247,0.5)] py-4 rounded-xl font-black uppercase tracking-wider text-[10px] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-allowed flex items-center justify-center gap-1.5 cursor-pointer font-sans shadow-lg shadow-purple-900/40 border border-purple-500/20"
                    >
                      {isSubmittingChariow ? (
                        <><Loader2 size={12} className="animate-spin" /> Liaison sécurisée...</>
                      ) : (
                        <>OUI, JE COMMENCE À ENCAISSER MES COMMISSIONS PREMIUM DÈS CE SOIR ! 💸🚀 <ChevronRight size={14} /></>
                      )}
                    </button>
                    
                    <button 
                      type="button"
                      onClick={() => setIsShowingChariowForm(false)}
                      className="w-full bg-white/5 hover:bg-white/10 text-neutral-400 py-2 rounded-xl font-bold uppercase tracking-wider text-[9px] transition-colors font-sans focus:outline-none"
                    >
                      Retourner à l'offre flash
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style dangerouslySetInnerHTML={{ __html: `
        ::-webkit-scrollbar { width: 0px; }
        @keyframes particles {
          0% { transform: translateY(0) translateX(0); opacity: 0; }
          50% { opacity: 1; }
          100% { transform: translateY(-100vh) translateX(50px); opacity: 0; }
        }
        .particles-container::before {
          content: ""; position: absolute; top: 0; left: 0; width: 100%; height: 100%;
          background-image: radial-gradient(circle, #fff 1px, transparent 1px);
          background-size: 50px 50px; animation: particles 20s linear infinite;
        }
      `}} />
    </div>
  );
};
