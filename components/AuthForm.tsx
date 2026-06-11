
import React, { useState, useEffect } from 'react';
import { User, Mail, Key, Hash, AlertTriangle, Loader2, WifiOff, RefreshCw, LogIn, CheckCircle, HelpCircle, Globe } from 'lucide-react';
import { supabase } from '../services/supabase.ts';
import { GoldBorderCard, InputField, PrimaryButton, SelectField } from './UI.tsx';
import { useCurrency } from '../hooks/useCurrency.ts';

const COUNTRY_CURRENCY_MAP: Record<string, string> = {
  'Afrique du Sud': 'ZAR',
  'Algérie': 'DZD',
  'Angola': 'AOA',
  'Bénin': 'XOF',
  'Botswana': 'BWP',
  'Burkina Faso': 'XOF',
  'Burundi': 'BIF',
  'Cabo Verde': 'CVE',
  'Cameroun': 'XAF',
  'Centrafrique': 'XAF',
  'Comores': 'KMF',
  'Congo-Brazzaville': 'XAF',
  'Côte d\'Ivoire': 'XOF',
  'Djibouti': 'DJF',
  'Égypte': 'EGP',
  'Érythrée': 'ERN',
  'Eswatini': 'SZL',
  'Éthiopie': 'ETB',
  'Gabon': 'XAF',
  'Gambie': 'GMD',
  'Ghana': 'GHS',
  'Guinée (Conakry)': 'GNF',
  'Guinée Équatoriale': 'XAF',
  'Guinée-Bissau': 'XOF',
  'Kenya': 'KES',
  'Lesotho': 'LSL',
  'Libéria': 'LRD',
  'Libye': 'LYD',
  'Madagascar': 'MGA',
  'Malawi': 'MWK',
  'Mali': 'XOF',
  'Maroc': 'MAD',
  'Maurice': 'MUR',
  'Mauritanie': 'MRU',
  'Mozambique': 'MZN',
  'Namibie': 'NAD',
  'Niger': 'XOF',
  'Nigéria': 'NGN',
  'Ouganda': 'UGX',
  'RD Congo': 'CDF',
  'Rwanda': 'RWF',
  'Sénégal': 'XOF',
  'Seychelles': 'SCR',
  'Sierra Leone': 'SLE',
  'Somalie': 'SOS',
  'Soudan': 'SDG',
  'Soudan du Sud': 'SSP',
  'Tanzanie': 'TZS',
  'Tchad': 'XAF',
  'Togo': 'XOF',
  'Tunisie': 'TND',
  'Zambie': 'ZMW',
  'Zimbabwe': 'ZWL',
  // Europe / Autres
  'France': 'EUR',
  'Belgique': 'EUR',
  'Suisse': 'EUR',
  'Canada': 'USD',
  'États-Unis': 'USD',
  'Autre': 'XAF'
};

const COUNTRY_OPTIONS = Object.keys(COUNTRY_CURRENCY_MAP).map(country => ({
  value: country,
  label: country
}));

interface AuthFormProps {
  defaultMode?: 'login' | 'signup';
}

export const AuthForm: React.FC<AuthFormProps> = ({ defaultMode = 'signup' }) => {
  const [isLogin, setIsLogin] = useState(defaultMode === 'login');
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [country, setCountry] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [isUserRegistered, setIsUserRegistered] = useState(false);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  
  const { updateCurrency } = useCurrency();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref && !isLogin) {
      setReferralCode(ref);
    }
  }, [isLogin]);

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedCountry = e.target.value;
    setCountry(selectedCountry);
    
    const currency = COUNTRY_CURRENCY_MAP[selectedCountry];
    if (currency) {
      updateCurrency(currency);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setIsUserRegistered(false);
    setNeedsConfirmation(false);
    
    // Normalisation rigoureuse
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanEmail || !cleanPassword) {
      setError("Veuillez remplir tous les champs.");
      return;
    }

    if (!isLogin && cleanPassword.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }

    if (!isLogin && !country) {
      setError("Veuillez sélectionner votre pays.");
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        console.log(`[AuthForm CLIENT] ======================= LOGIN FLOW =======================`);
        console.log(`[AuthForm CLIENT] [STEP 1/3] Calling server-side precheck and migration for: ${cleanEmail}`);
        
        const precheckResponse = await fetch('/api/auth/login-precheck-and-migrate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: cleanEmail,
            password: cleanPassword
          })
        });

        const precheckResult = await precheckResponse.json();
        console.log(`[AuthForm CLIENT] [STEP 2/3] Precheck response:`, precheckResult);

        if (!precheckResponse.ok) {
          throw new Error(precheckResult.error || "Email ou mot de passe incorrect.");
        }

        console.log(`[AuthForm CLIENT] [STEP 3/3] Precheck/migration succeeded. Executing client-side GoTrue sign-in...`);
        
        const signInResult = await supabase.auth.signInWithPassword({ 
          email: cleanEmail, 
          password: cleanPassword
        });
        
        console.log(`[AuthForm CLIENT] Raw Supabase Auth sign-in response received:`, signInResult);
        
        const { data: signInData, error: signInError } = signInResult;

        if (signInError) {
          console.error(`[AuthForm CLIENT] Supabase Auth sign-in error details:`, {
            message: signInError.message,
            status: signInError.status,
            name: signInError.name,
            code: (signInError as any).code || 'N/A'
          });

          const msg = signInError.message.toLowerCase();
          
          if (msg.includes('egress_quota') || msg.includes('restricted') || msg.includes('payment_required')) {
            throw new Error("Le service de base de données Supabase a restreint l'accès à ce projet en raison d'un dépassement de quota (exceed_egress_quota). Le propriétaire du projet (millionaireobject@gmail.com) doit se connecter sur supabase.com pour ajuster ses limites de dépenses (spend caps) ou mettre à jour son abonnement.");
          }
          
          // Gérer spécifiquement les erreurs de credentials vs confirmation
          if (msg.includes('email not confirmed')) {
            setNeedsConfirmation(true);
            throw new Error(`Votre email n'est pas encore confirmé. Détails erreur Supabase: ${signInError.message}`);
          }
          if (msg.includes('invalid login credentials') || msg.includes('double check')) {
            throw new Error("Email ou mot de passe incorrect.");
          }
          throw new Error(signInError.message);
        }

        console.log(`[AuthForm CLIENT] Login SUCCESS. Session active for user:`, signInData.user?.email);
        console.log(`[AuthForm CLIENT] ==========================================================`);
      } else {
        if (!name.trim()) {
          setError("Le nom complet est requis.");
          setLoading(false);
          return;
        }

        console.log(`[AuthForm CLIENT] ======================= REGISTRATION FLOW =======================`);
        console.log(`[AuthForm CLIENT] [STEP 1/3] Triggering server-side CSV link and registration for: ${cleanEmail}`, {
          name: name.trim(),
          country,
          referralCode: referralCode.trim() || 'N/A'
        });

        // Call server-side registry proxy to bypass email rate-limits and link imported users seamlessly
        const registryResponse = await fetch('/api/auth/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: cleanEmail,
            password: cleanPassword,
            name: name.trim(),
            country: country,
            referralCode: referralCode.trim() || null
          })
        });

        const registryResult = await registryResponse.json();
        console.log(`[AuthForm CLIENT] [STEP 2/3] Proxy API response status: ${registryResponse.status}`, registryResult);

        if (!registryResponse.ok) {
          throw new Error(registryResult.error || "Une erreur est survenue lors de l'inscription.");
        }

        console.log(`[AuthForm CLIENT] [STEP 3/3] Registration succeeded. Executing immediate auto-login...`);
        // Successfully registered! Let's sign them in immediately now that credentials exist & are confirmed
        const signInResult = await supabase.auth.signInWithPassword({ 
          email: cleanEmail, 
          password: cleanPassword
        });

        console.log(`[AuthForm CLIENT] Auto-login result:`, signInResult);
        const { error: signInError } = signInResult;

        if (signInError) {
          console.error("[AuthForm CLIENT] Auto sign-in failed after proxy registration. Raw error details:", signInError);
          setMessage("Votre compte a été créé avec succès ! Veuillez vous connecter avec vos accès.");
          setIsLogin(true);
        } else {
          console.log("[AuthForm CLIENT] Auto sign-in was fully successful!");
          setMessage("Félicitations ! Votre compte a été créé et vous êtes maintenant connecté.");
        }
        console.log(`[AuthForm CLIENT] =================================================================`);
      }
    } catch (err: any) {
      console.error("Auth System Error:", err);
      setError(err.message || "Une erreur inattendue est survenue.");
    } finally {
      setLoading(false);
    }
  };

  const switchToLogin = () => {
    setIsLogin(true);
    setIsForgotPassword(false);
    setError('');
    setMessage('');
    setIsUserRegistered(false);
    setNeedsConfirmation(false);
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setError("Veuillez saisir votre adresse email.");
      return;
    }

    setLoading(true);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: window.location.origin + window.location.pathname,
      });

      if (resetError) {
        throw resetError;
      }

      setMessage("Un email de récupération a été envoyé ! Vérifiez votre boîte de réception et vos spams (onglet Promotions/Courriers indésirables) pour réinitialiser votre mot de passe.");
    } catch (err: any) {
      console.error("Password reset error:", err);
      setError(err.message || "Une erreur est survenue lors de la demande de réinitialisation.");
    } finally {
      setLoading(false);
    }
  };

  if (isForgotPassword) {
    return (
      <GoldBorderCard className="bg-[#0a0a0a] w-full max-w-md mx-auto shadow-2xl shadow-yellow-900/20">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-black mb-1 tracking-tighter text-white">
            RÉINITIALISER <span className="text-yellow-500">MOT DE PASSE</span>
          </h2>
          <p className="text-neutral-500 text-[10px] font-black uppercase tracking-widest leading-relaxed">
            Entrez votre adresse email pour recevoir un lien de réinitialisation sécurisé
          </p>
        </div>

        {error && (
          <div className="bg-red-900/20 border border-red-500/30 text-red-400 p-4 rounded-xl mb-6 text-xs font-bold leading-relaxed flex items-start gap-3 animate-fade-in animate-duration-300">
              <AlertTriangle size={16} className="shrink-0 text-red-500" />
              <span>{error}</span>
          </div>
        )}

        {message && (
          <div className="bg-green-900/20 border border-green-500/30 text-green-400 p-4 rounded-xl mb-6 text-xs font-bold leading-relaxed flex items-start gap-3 animate-fade-in animate-duration-300">
              <CheckCircle size={16} className="shrink-0 text-green-400" />
              <span>{message}</span>
          </div>
        )}

        <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
          <InputField 
            icon={Mail} 
            type="email" 
            placeholder="Adresse Email" 
            value={email} 
            onChange={(e: any) => setEmail(e.target.value)} 
          />

          <div className="pt-2">
            <PrimaryButton fullWidth isLoading={loading} type="submit">
              {loading ? <Loader2 className="animate-spin mx-auto text-black" /> : 'ENVOYER LE LIEN'}
            </PrimaryButton>
          </div>
        </form>

        <div className="mt-6 text-center border-t border-white/5 pt-6">
          <button 
            type="button"
            onClick={() => { 
              setIsForgotPassword(false); 
              setError(''); 
              setMessage(''); 
            }}
            className="text-neutral-500 font-black hover:text-yellow-500 transition-colors uppercase text-[10px] tracking-widest"
          >
            ← Retour à la connexion
          </button>
        </div>
      </GoldBorderCard>
    );
  }

  return (
    <GoldBorderCard className="bg-[#0a0a0a] w-full max-w-md mx-auto shadow-2xl shadow-yellow-900/20">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-black mb-1 tracking-tighter text-white">
          <span className="text-yellow-500">
            {isLogin ? 'CONNEXION' : 'INSCRIPTION'}
          </span> MZ+
        </h2>
        <p className="text-neutral-500 text-[10px] font-black uppercase tracking-widest">
          {isLogin ? 'Accédez à votre dashboard Élite' : 'Rejoignez le cercle des Ambassadeurs'}
        </p>
      </div>

      {error && (
        <div className={`p-4 rounded-xl mb-6 text-xs font-bold leading-relaxed flex items-start gap-3 animate-fade-in border ${
          isUserRegistered || needsConfirmation ? 'bg-blue-900/20 border-blue-500/30 text-blue-300' : 'bg-red-900/20 border-red-500/30 text-red-400'
        }`}>
            {isUserRegistered || needsConfirmation ? <CheckCircle size={16} className="shrink-0" /> : <AlertTriangle size={16} className="shrink-0" />} 
            <div className="flex-1">
              <span>{error}</span>
              {(isUserRegistered || needsConfirmation) && (
                <button 
                  onClick={switchToLogin}
                  className="mt-2 flex items-center gap-2 text-white hover:text-yellow-500 transition-colors uppercase text-[9px] font-black tracking-widest"
                >
                  <LogIn size={10} /> Se connecter maintenant
                </button>
              )}
              {!isLogin && (error.toLowerCase().includes('déjà lié') || error.toLowerCase().includes('existe') || error.toLowerCase().includes('connecter')) && (
                <button 
                  type="button"
                  onClick={switchToLogin}
                  className="mt-2 flex items-center gap-2 text-yellow-500 hover:text-yellow-400 transition-colors uppercase text-[9px] font-black tracking-widest"
                >
                  <LogIn size={10} /> Cliquer ici pour vous connecter
                </button>
              )}
              {isLogin && !needsConfirmation && (
                <div className="mt-2 flex flex-col gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotPassword(true);
                      setError('');
                      setMessage('');
                    }}
                    className="flex items-center gap-2 text-yellow-500 hover:text-yellow-400 transition-colors uppercase text-[8px] font-black tracking-widest text-left"
                  >
                    <HelpCircle size={10} /> Réinitialiser par email (Supabase) ⚡
                  </button>
                  <a 
                    href="https://wa.me/237640608183?text=Besoin d'aide pour me connecter à mon compte MZ+"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors uppercase text-[8px] font-black tracking-widest"
                  >
                    <HelpCircle size={10} /> Mot de passe oublié ? Contacter le support WhatsApp
                  </a>
                </div>
              )}
            </div>
        </div>
      )}

      {message && (
        <div className="bg-green-900/20 border border-green-500/30 text-green-400 p-4 rounded-xl mb-6 text-xs font-bold leading-relaxed animate-fade-in flex items-center gap-3">
            <CheckCircle size={16} className="shrink-0" />
            <span>{message}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-1">
        {!isLogin && (
          <>
            <InputField icon={User} type="text" placeholder="Nom complet" value={name} onChange={(e: any) => setName(e.target.value)} />
            <SelectField 
              icon={Globe} 
              placeholder="Sélectionnez votre pays" 
              options={COUNTRY_OPTIONS} 
              value={country} 
              onChange={handleCountryChange} 
            />
            <div className="relative">
              <InputField 
                icon={Hash} 
                type="text" 
                placeholder="Code Parrain (Optionnel)" 
                value={referralCode} 
                onChange={(e: any) => setReferralCode(e.target.value)} 
                required={false}
              />
              {referralCode && !isLogin && (
                <div className="absolute right-3 top-3 px-2 py-0.5 bg-yellow-500 text-black text-[8px] font-black rounded uppercase">
                  Parrainage Actif
                </div>
              )}
            </div>
          </>
        )}
        <InputField icon={Mail} type="email" placeholder="Adresse Email" value={email} onChange={(e: any) => setEmail(e.target.value)} />
        <InputField icon={Key} type="password" placeholder="Mot de passe" value={password} onChange={(e: any) => setPassword(e.target.value)} />

        {isLogin && (
          <div className="flex justify-end pt-1 pb-3 px-1">
            <button
              type="button"
              onClick={() => {
                setIsForgotPassword(true);
                setError('');
                setMessage('');
              }}
              className="text-neutral-400 hover:text-yellow-500 transition-colors uppercase text-[9px] font-black tracking-widest flex items-center gap-1.5 focus:outline-none"
            >
              <HelpCircle size={10} className="text-yellow-500" /> Mot de passe oublié ?
            </button>
          </div>
        )}

        <div className="mt-8">
          <PrimaryButton fullWidth isLoading={loading} type="submit">
            {loading ? <Loader2 className="animate-spin mx-auto" /> : (isLogin ? 'SE CONNECTER' : 'CRÉER MON COMPTE')}
          </PrimaryButton>
        </div>
      </form>

      <div className="mt-6 text-center border-t border-white/5 pt-6">
        <p className="text-neutral-600 text-[10px] font-black uppercase tracking-widest">
          {isLogin ? 'Nouveau ici ?' : 'Déjà membre ?'}
          <button 
            type="button"
            onClick={() => { 
              setIsLogin(!isLogin); 
              setError(''); 
              setMessage(''); 
              setIsUserRegistered(false);
              setNeedsConfirmation(false);
            }}
            className="ml-2 text-yellow-500 font-black hover:text-yellow-400 transition-colors"
          >
            {isLogin ? 'S\'INSCRIRE MAINTENANT' : 'SE CONNECTER'}
          </button>
        </p>
      </div>
    </GoldBorderCard>
  );
};
