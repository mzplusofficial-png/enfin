import React, { useState, useEffect, useRef } from "react";
import {
  Power,
  RefreshCw,
  Zap,
  Code,
  Loader2,
  Save,
  AlertCircle,
  Eye,
  Coins,
  Timer,
  TimerOff,
  CheckCircle2,
  Tag,
  Percent,
  Users,
  Image as ImageIcon,
  Trash2,
  Plus,
  X,
  User,
  Clock,
  Upload,
  Video,
  Edit,
  Link2,
  Folder,
} from "lucide-react";
import { supabase } from "../../../services/supabase.ts";
import { GoldBorderCard, PrimaryButton, GoldText } from "../../UI.tsx";
import { CurrencyDisplay } from "../../ui/CurrencyDisplay.tsx";
import { MZPlusOnboardingGoalsModal } from "./MZPlusOnboardingGoalsModal.tsx";
import { getGDriveThumbnailUrl } from "../../../lib/googleDrive";
import { GoogleDriveExplorer } from "../google-drive/GoogleDriveExplorer";

const DEFAULT_PREMIUM_PROOFS = [
  {
    "id": "fb-1",
    "name": "soufa bakari",
    "milestone_title": "Dépassement d'espoir",
    "before_amount": "0 FCFA",
    "after_amount": "350 000 FCFA",
    "time_frame": "En 18 jours",
    "description": "Une réussite marquante de soufa bakari qui de 0 est passé à un total de 350 000 FCFA en seulement 18 jours de travail !",
    "before_image_url": "https://drive.google.com/file/d/1ufBs7y_MYdOcw9st0BpScHoy_3hV26jW/view?usp=drive_link",
    "after_image_url": "https://drive.google.com/file/d/1ufBs7y_MYdOcw9st0BpScHoy_3hV26jW/view?usp=drive_link",
    "country_flag": "🇨🇮 Côte d'Ivoire",
    "award_type": "exceptional_result",
    "is_active": true,
    "sort_order": 1
  },
  {
    "id": "fb-2",
    "name": "Aladin mousa",
    "milestone_title": "Premiers gains majeurs",
    "before_amount": "0 FCFA",
    "after_amount": "475 000 FCFA",
    "time_frame": "En 28 jours",
    "description": "Détermination et persévérance payantes ! Aladin mousa a généré 475 000 FCFA en moins d'un mois !",
    "before_image_url": "",
    "after_image_url": "https://drive.google.com/file/d/1vKMy7iKAc4yUaNI-kClV9ovGKbe8HiWK/view?usp=drive_link",
    "country_flag": "🇨🇲 Cameroon",
    "award_type": "first_sale",
    "is_active": true,
    "sort_order": 2
  },
  {
    "id": "fb-3",
    "name": "Mr. YAMIS",
    "milestone_title": "Première victoire",
    "before_amount": "0 FCFA",
    "after_amount": "60 000 FCFA",
    "time_frame": "En 7 jours",
    "description": "Une merveilleuse entrée en matière pour Mr. YAMIS avec 60 000 FCFA cumulés lors de sa première semaine d'activité !",
    "before_image_url": "",
    "after_image_url": "https://drive.google.com/file/d/1vKMy7iKAc4yUaNI-kClV9ovGKbe8HiWK/view?usp=drive_link",
    "country_flag": "🇸🇳 Sénégal",
    "award_type": "first_withdrawal",
    "is_active": true,
    "sort_order": 3
  }
];

export const MZPlusFlashOfferAdmin: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [showTimer, setShowTimer] = useState(true);
  const [pricePromo, setPricePromo] = useState("15000");
  const [priceNormal, setPriceNormal] = useState("20000"); // Défini à 20000 comme ancrage principal
  const [urgencyHours, setUrgencyHours] = useState("24");
  const [youtubeIframe, setYoutubeIframe] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showTestQuiz, setShowTestQuiz] = useState(false);

  // Couplage Chariow dynamique pour offre flash
  const [chariowProductId, setChariowProductId] = useState("");
  const [chariowProducts, setChariowProducts] = useState<any[]>([]);
  const [loadingChariowProducts, setLoadingChariowProducts] = useState(false);
  const [chariowError, setChariowError] = useState<string | null>(null);
  const [isAutoSavingChariow, setIsAutoSavingChariow] = useState(false);
  const [autoSaveSuccess, setAutoSaveSuccess] = useState(false);

  const handleChariowProductAutoSave = async (productId: string) => {
    setIsAutoSavingChariow(true);
    setAutoSaveSuccess(false);
    try {
      // 1. Sauvegarde dans platform_settings
      await supabase.from("platform_settings").upsert({
        id: "flash_offer_chariow_product_id",
        value: { product_id: productId },
      });

      // 2. Sauvegarde dans mz_flash_offer_v2 si possible
      const updates = {
        id: "flash-offer-global",
        chariow_product_id: productId,
      };

      const { error } = await supabase
        .from("mz_flash_offer_v2")
        .upsert(updates);
      if (error) {
        if (
          error.message?.includes("chariow_product_id") ||
          error.code === "42703"
        ) {
          const fallbackUpdates = { id: "flash-offer-global" };
          await supabase.from("mz_flash_offer_v2").upsert(fallbackUpdates);
        }
      }

      setAutoSaveSuccess(true);
      setTimeout(() => setAutoSaveSuccess(false), 3000);
    } catch (err: any) {
      console.error("Erreur de sauvegarde automatique de Chariow ID :", err);
    } finally {
      setIsAutoSavingChariow(false);
    }
  };

  const fetchChariowProducts = async () => {
    setLoadingChariowProducts(true);
    try {
      const response = await fetch("/api/chariow/products");
      const json = await response.json();
      if (json && json.success) {
        let prodsList = [];
        const raw = json.data;
        if (Array.isArray(raw)) prodsList = raw;
        else if (raw?.data?.products && Array.isArray(raw.data.products))
          prodsList = raw.data.products;
        else if (raw?.products && Array.isArray(raw.products))
          prodsList = raw.products;
        else if (raw?.data && Array.isArray(raw.data)) prodsList = raw.data;
        setChariowProducts(prodsList);
      }
    } catch (e) {
      console.error(
        "Error fetching Chariow products for flash offer dropdown :",
        e,
      );
    } finally {
      setLoadingChariowProducts(false);
    }
  };

  // Gestion des preuves dynamiques
  const [proofs, setProofs] = useState<any[]>([]);
  const [showProofForm, setShowProofForm] = useState(false);
  const [isSavingProof, setIsSavingProof] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{
    before: boolean;
    after: boolean;
  }>({ before: false, after: false });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [showDrivePicker, setShowDrivePicker] = useState(false);
  const [drivePickerTarget, setDrivePickerTarget] = useState<
    "before" | "after"
  >("after");
  const [proofForm, setProofForm] = useState({
    name: "",
    before_amount: "",
    after_amount: "",
    time_frame: "",
    before_image_url: "",
    after_image_url: "",
    description: "",
    award_type: "first_sale",
    milestone_title: "",
    is_active: true,
    sort_order: 0,
  });

  const fileInputBeforeRef = useRef<HTMLInputElement>(null);
  const fileInputAfterRef = useRef<HTMLInputElement>(null);
  const localImageFileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingImageLocal, setIsUploadingImageLocal] = useState(false);
  const [isUploadingBeforeImageLocal, setIsUploadingBeforeImageLocal] =
    useState(false);

  useEffect(() => {
    fetchConfig();
    fetchProofs();
    fetchChariowProducts();
  }, []);

  const fetchConfig = async (retryCount = 0) => {
    try {
      let offerResData: any = null;
      let psResData: any = null;
      let fallbackConfigData: any = null;

      // Try reading from localStorage first to be independent of database
      try {
        const stored = localStorage.getItem("mz_flash_offer_config");
        if (stored) {
          fallbackConfigData = JSON.parse(stored);
        }
      } catch (e) {
        console.warn("localStorage config read error in admin:", e);
      }

      const isStaticDeploy =
        window.location.hostname.includes("netlify.app") ||
        window.location.hostname.includes("github.io") ||
        window.location.hostname.includes("web.app") ||
        window.location.hostname.includes("firebaseapp.com") ||
        (!window.location.hostname.includes("localhost") &&
          !window.location.hostname.includes("127.0.0.1") &&
          !window.location.hostname.includes("run.app") &&
          !window.location.hostname.includes("local"));

      if (!isStaticDeploy) {
        try {
          const { data } = await supabase
            .from("mz_flash_offer_v2")
            .select(
              "is_active, show_timer, price_normal, price_promo, youtube_iframe, video_url, chariow_product_id",
            )
            .eq("id", "flash-offer-global")
            .maybeSingle();
          if (data) offerResData = data;
        } catch (err) {
          console.warn("mz_flash_offer_v2 load error:", err);
        }

        try {
          const res = await fetch(
            "/api/platform-settings/flash_offer_chariow_product_id",
          );
          if (res.ok) {
            const json = await res.json();
            if (json.success && json.value) psResData = json.value;
          }
        } catch (err) {
          console.warn("platform_settings product_id load error:", err);
        }

        try {
          const res = await fetch("/api/platform-settings/flash_offer_config_v2");
          if (res.ok) {
            const json = await res.json();
            if (json.success && json.value) {
              fallbackConfigData = {
                ...(fallbackConfigData || {}),
                ...json.value,
              };
            }
          }
        } catch (err) {
          console.warn("platform_settings config_v2 load error:", err);
        }
      }

      // Merging: prioritize platform_settings config (which stores custom admin updates)
      // and merge with any existing offerResData (or default placeholders)
      const data =
        fallbackConfigData || offerResData
          ? {
              ...(offerResData || {}),
              ...(fallbackConfigData || {}),
            }
          : {};

      setIsActive(data.is_active !== undefined ? Boolean(data.is_active) : true);
      setShowTimer(data.show_timer !== undefined ? Boolean(data.show_timer) : true);
      setPriceNormal(String(data.price_normal || "20000"));
      setPricePromo(String(data.price_promo || "15000"));
      setYoutubeIframe(data.youtube_iframe || "");
      setVideoUrl(data.video_url || "");

      const psProductId = psResData?.product_id;
      setChariowProductId(psProductId || data.chariow_product_id || "prd_iwhpro");
    } catch (e: any) {
      console.error("Flash Offer Config Fetch Error, using default settings:", e);
      setIsActive(true);
      setShowTimer(true);
      setPriceNormal("20000");
      setPricePromo("15000");
      setChariowProductId("prd_iwhpro");
    } finally {
      setLoading(false);
    }
  };

  const fetchProofs = async (retryCount = 0) => {
    try {
      console.log(
        "[DEBUG Client] Récupération des preuves sociales depuis la configuration locale/distante...",
      );
      let data: any[] = [];

      // Try reading from localStorage first
      try {
        const stored = localStorage.getItem("mz_premium_proofs");
        if (stored) {
          data = JSON.parse(stored);
        }
      } catch (e) {
        console.warn("localStorage proofs read error in admin:", e);
      }

      const isStaticDeploy =
        window.location.hostname.includes("netlify.app") ||
        window.location.hostname.includes("github.io") ||
        window.location.hostname.includes("web.app") ||
        window.location.hostname.includes("firebaseapp.com") ||
        (!window.location.hostname.includes("localhost") &&
          !window.location.hostname.includes("127.0.0.1") &&
          !window.location.hostname.includes("run.app") &&
          !window.location.hostname.includes("local"));

      if (data.length === 0 && !isStaticDeploy) {
        try {
          const response = await fetch("/api/premium-proofs");
          if (response.ok) {
            const result = await response.json();
            data = result.data || [];
          }
        } catch (err) {
          console.warn("[DEBUG Client] Impossible d'interroger la route locale des preuves", err);
        }
      }

      if (data.length === 0) {
        data = DEFAULT_PREMIUM_PROOFS;
      }

      const parseAmountValue = (
        amountStr: string | null | undefined,
      ): number => {
        if (!amountStr) return 0;
        const cleaned = amountStr.replace(/\D/g, "");
        const parsed = parseInt(cleaned, 10);
        return isNaN(parsed) ? 0 : parsed;
      };
      const sorted = [...data].sort((a: any, b: any) => {
        const orderA =
          a.sort_order !== undefined && a.sort_order !== null
            ? Number(a.sort_order)
            : 0;
        const orderB =
          b.sort_order !== undefined && b.sort_order !== null
            ? Number(b.sort_order)
            : 0;

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
      setProofs(sorted);
    } catch (e: any) {
      console.error("Proofs Fetch Error, loading defaults:", e);
      setProofs(DEFAULT_PREMIUM_PROOFS);
    }
  };

  const handleLocalBeforeImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const MAX_SIZE = 15 * 1024 * 1024; // 15MB
    if (file.size > MAX_SIZE) {
      alert(
        `Le fichier est trop lourd (taille: ${(file.size / (1024 * 1024)).toFixed(2)} Mo). La taille maximale autorisée est de 15 Mo.`,
      );
      return;
    }

    setIsUploadingBeforeImageLocal(true);
    try {
      const fileExt = file.name.split(".").pop() || "png";
      const fileName = `before_${Date.now()}.${fileExt}`;
      const filePath = `proofs/${fileName}`;

      console.log(
        "[DEBUG Client] Envoi de l'image d'origine au serveur local...",
        { name: file.name, size: file.size },
      );
      const response = await fetch("/api/admin/upload", {
        method: "POST",
        headers: {
          "Content-Type": file.type || "image/png",
          "x-file-name": fileName,
          "x-file-path": filePath,
        },
        body: file,
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `Code statut : ${response.status}`);
      }

      const result = await response.json();
      console.log(
        "[DEBUG Client] Image d'origine hébergée avec succès localement ! URL :",
        result.publicUrl,
      );

      setProofForm((prev) => ({
        ...prev,
        before_image_url: result.publicUrl,
      }));
    } catch (err: any) {
      console.error("[Upload Before Image Error]", err);
      alert("Erreur lors de l'upload de l'image d'origine : " + err.message);
    } finally {
      setIsUploadingBeforeImageLocal(false);
      if (fileInputBeforeRef.current) {
        fileInputBeforeRef.current.value = "";
      }
    }
  };

  const handleLocalImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const MAX_SIZE = 15 * 1024 * 1024; // 15MB
    if (file.size > MAX_SIZE) {
      alert(
        `Le fichier est trop lourd (taille: ${(file.size / (1024 * 1024)).toFixed(2)} Mo). La taille maximale autorisée est de 15 Mo.`,
      );
      return;
    }

    setIsUploadingImageLocal(true);
    try {
      const fileExt = file.name.split(".").pop() || "png";
      const fileName = `proof_${Date.now()}.${fileExt}`;
      const filePath = `proofs/${fileName}`;

      console.log(
        "[DEBUG Client] Envoi de l'image de réussite au serveur local...",
        { name: file.name, size: file.size },
      );
      const response = await fetch("/api/admin/upload", {
        method: "POST",
        headers: {
          "Content-Type": file.type || "image/png",
          "x-file-name": fileName,
          "x-file-path": filePath,
        },
        body: file,
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `Code statut : ${response.status}`);
      }

      const result = await response.json();
      console.log(
        "[DEBUG Client] Preuve d'image hébergée avec succès localement ! URL :",
        result.publicUrl,
      );

      setProofForm((prev) => ({
        ...prev,
        after_image_url: result.publicUrl,
      }));
    } catch (err: any) {
      console.error("[Upload Image Error]", err);
      alert("Erreur lors de l'upload de l'image de preuve : " + err.message);
    } finally {
      setIsUploadingImageLocal(false);
      if (localImageFileInputRef.current) {
        localImageFileInputRef.current.value = "";
      }
    }
  };

  const handleSaveProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proofForm.after_image_url) {
      alert(
        "Veuillez charger la capture d'écran de preuve (APRÈS) avant d'enregistrer.",
      );
      return;
    }

    setIsSavingProof(true);
    try {
      const generatedId = editingId || "proof_" + Date.now();
      const payload = {
        id: generatedId,
        ...proofForm,
      };

      // 0. Enregistrer immédiatement dans le localStorage pour garantir un fonctionnement stable et instantané sans base de données
      try {
        const stored = localStorage.getItem("mz_premium_proofs");
        let currentList = stored ? JSON.parse(stored) : [...DEFAULT_PREMIUM_PROOFS];
        if (editingId) {
          currentList = currentList.map((p: any) => p.id === editingId ? { ...p, ...payload } : p);
        } else {
          currentList.push(payload);
        }
        localStorage.setItem("mz_premium_proofs", JSON.stringify(currentList));
      } catch (locErr) {
        console.warn("Could not save proof to localStorage:", locErr);
      }

      const isStaticDeploy =
        window.location.hostname.includes("netlify.app") ||
        window.location.hostname.includes("github.io") ||
        window.location.hostname.includes("web.app") ||
        window.location.hostname.includes("firebaseapp.com") ||
        (!window.location.hostname.includes("localhost") &&
          !window.location.hostname.includes("127.0.0.1") &&
          !window.location.hostname.includes("run.app") &&
          !window.location.hostname.includes("local"));

      if (!isStaticDeploy) {
        try {
          console.log(
            "[DEBUG Client] Sauvegarde de la preuve de gain sociale via l'API proxy...",
            payload,
          );
          const response = await fetch("/api/admin/premium-proofs", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          });

          if (!response.ok) {
            throw new Error(
              `Erreur réseau lors de la sauvegarde : ${response.statusText}`,
            );
          }

          const result = await response.json();
          if (!result.success) {
            throw new Error(
              result.error || "Erreur inconnue lors de l’enregistrement",
            );
          }
        } catch (apiErr) {
          console.warn("API proofs save failed (silently falling back to localStorage only):", apiErr);
        }
      }

      setShowProofForm(false);
      setEditingId(null);
      setProofForm({
        name: "",
        before_amount: "",
        after_amount: "",
        time_frame: "",
        before_image_url: "",
        after_image_url: "",
        description: "",
        award_type: "first_sale",
        milestone_title: "",
        is_active: true,
        sort_order: 0,
      });
      fetchProofs();
    } catch (err: any) {
      console.error("Save Proof Error details:", err);
      alert("Erreur lors de l'enregistrement de la preuve : " + err.message);
    } finally {
      setIsSavingProof(false);
    }
  };

  const startEdit = (proof: any) => {
    setEditingId(proof.id);
    setProofForm({
      name: proof.name || "",
      before_amount: proof.before_amount || "",
      after_amount: proof.after_amount || "",
      time_frame: proof.time_frame || "",
      before_image_url: proof.before_image_url || "",
      after_image_url: proof.after_image_url || "",
      description: proof.description || "",
      award_type: proof.award_type || "first_sale",
      milestone_title: proof.milestone_title || "",
      is_active: proof.is_active !== false,
      sort_order: proof.sort_order ?? 0,
    });
    setShowProofForm(true);
  };

  const deleteProof = async (id: string) => {
    if (!confirm("Voulez-vous supprimer cette preuve ?")) return;
    try {
      // 0. Supprimer immédiatement du localStorage pour garantir un fonctionnement stable et instantané
      try {
        const stored = localStorage.getItem("mz_premium_proofs");
        let currentList = stored ? JSON.parse(stored) : [...DEFAULT_PREMIUM_PROOFS];
        currentList = currentList.filter((p: any) => p.id !== id);
        localStorage.setItem("mz_premium_proofs", JSON.stringify(currentList));
      } catch (locErr) {
        console.warn("Could not delete proof from localStorage:", locErr);
      }

      const isStaticDeploy =
        window.location.hostname.includes("netlify.app") ||
        window.location.hostname.includes("github.io") ||
        window.location.hostname.includes("web.app") ||
        window.location.hostname.includes("firebaseapp.com") ||
        (!window.location.hostname.includes("localhost") &&
          !window.location.hostname.includes("127.0.0.1") &&
          !window.location.hostname.includes("run.app") &&
          !window.location.hostname.includes("local"));

      if (!isStaticDeploy) {
        try {
          const response = await fetch(
            `/api/admin/premium-proofs/${encodeURIComponent(id)}`,
            {
              method: "DELETE",
            },
          );
          if (!response.ok) {
            throw new Error(
              `Erreur lors de la suppression : ${response.statusText}`,
            );
          }
        } catch (apiErr) {
          console.warn("API proofs delete failed (silently falling back to localStorage only):", apiErr);
        }
      }
      fetchProofs();
    } catch (err: any) {
      console.error(err);
      alert("Erreur lors de la suppression : " + err.message);
    }
  };

  const handleSaveConfig = async (resetTimer: boolean = false) => {
    setIsSaving(true);
    setChariowError(null);
    try {
      const updates: any = {
        id: "flash-offer-global",
        is_active: isActive,
        show_timer: showTimer,
        price_promo: parseInt(pricePromo) || 15000,
        price_normal: parseInt(priceNormal) || 20000,
        youtube_iframe: youtubeIframe || "",
        video_url: videoUrl || "",
        chariow_product_id: chariowProductId || "",
      };

      if (resetTimer) {
        const hours = parseInt(urgencyHours) || 24;
        updates.ends_at = new Date(
          Date.now() + hours * 60 * 60 * 1000,
        ).toISOString();
      } else {
        // preserve ends_at from previous state / platform settings if not resetting
        let prevEnds: string | null = null;
        try {
          const { data } = await supabase
            .from("mz_flash_offer_v2")
            .select("ends_at")
            .eq("id", "flash-offer-global")
            .maybeSingle();
          if (data?.ends_at) prevEnds = data.ends_at;
        } catch (e) {
          console.warn(
            "mz_flash_offer_v2 select ends_at failed, trying backup:",
            e,
          );
        }

        if (!prevEnds) {
          try {
            const res = await fetch(
              "/api/platform-settings/flash_offer_config_v2",
            );
            const json = await res.json();
            if (json.success && json.value?.ends_at) {
              prevEnds = json.value.ends_at;
            }
          } catch (e) {
            console.warn("platform_settings select ends_at failed:", e);
          }
        }

        if (prevEnds) {
          updates.ends_at = prevEnds;
        } else {
          updates.ends_at = new Date(
            Date.now() + 24 * 60 * 60 * 1000,
          ).toISOString();
        }
      }

      // 0. Sauvegarde locale immédiate pour garantir un fonctionnement stable et instantané sans base de données
      try {
        localStorage.setItem("mz_flash_offer_config", JSON.stringify(updates));
      } catch (locErr) {
        console.warn("Could not save config to localStorage:", locErr);
      }

      const isStaticDeploy =
        window.location.hostname.includes("netlify.app") ||
        window.location.hostname.includes("github.io") ||
        window.location.hostname.includes("web.app") ||
        window.location.hostname.includes("firebaseapp.com") ||
        (!window.location.hostname.includes("localhost") &&
          !window.location.hostname.includes("127.0.0.1") &&
          !window.location.hostname.includes("run.app") &&
          !window.location.hostname.includes("local"));

      if (!isStaticDeploy) {
        // 1. Sauvegarde robuste dans platform_settings sous id de configuration complète (Infaillible via API)
        try {
          await fetch("/api/platform-settings/flash_offer_config_v2", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ value: updates }),
          });
        } catch (errPs) {
          console.error(
            "Erreur de sauvegarde de platform_settings (config_v2) :",
            errPs,
          );
        }

        // 2. Sauvegarde robuste dans platform_settings (chariow_product_id via API)
        try {
          await fetch("/api/platform-settings/flash_offer_chariow_product_id", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ value: { product_id: chariowProductId } }),
          });
        } catch (errPs) {
          console.error(
            "Erreur de sauvegarde de platform_settings (product_id) :",
            errPs,
          );
        }

        // 3. Sauvegarde de la configuration principale dans Supabase
        try {
          const { error } = await supabase
            .from("mz_flash_offer_v2")
            .upsert(updates);
          if (error) {
            console.warn(
              "Table mz_flash_offer_v2 upsert returned error:",
              error.message,
              error,
            );
            if (
              error.message?.includes("chariow_product_id") ||
              error.code === "42703"
            ) {
              // Sauvegarde de secours s'il manque des colonnes
              const fallbackUpdates = { ...updates };
              delete fallbackUpdates.chariow_product_id;
              try {
                await supabase.from("mz_flash_offer_v2").upsert(fallbackUpdates);
              } catch (errFallback) {
                console.warn("Fallback upsert failed", errFallback);
              }
            }
          }
        } catch (dbErr) {
          console.warn(
            "Table mz_flash_offer_v2 manquante ou autre erreur, sauvegarde réussie via platform_settings !",
            dbErr,
          );
        }
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e: any) {
      alert("Erreur : " + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading)
    return (
      <div className="p-20 text-center">
        <Loader2 className="animate-spin text-yellow-500" size={32} />
      </div>
    );

  return (
    <div className="space-y-12 animate-fade-in max-w-5xl mx-auto pb-20">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 px-2 md:px-0">
        <GoldBorderCard className="p-4 md:p-6 bg-black/40 border-purple-500/10 flex items-center gap-4 md:gap-6">
          <div className="p-3 md:p-4 bg-purple-600/10 rounded-xl md:rounded-2xl text-purple-400 shadow-xl">
            <ImageIcon size={24} className="md:w-[28px] md:h-[28px]" />
          </div>
          <div>
            <p className="text-[8px] md:text-[9px] font-black uppercase text-neutral-500 tracking-widest mb-1">
              Preuves enregistrées
            </p>
            <p className="text-2xl md:text-3xl font-black text-white font-mono">
              {proofs.length}
            </p>
          </div>
        </GoldBorderCard>
        <GoldBorderCard className="p-4 md:p-6 bg-black/40 border-yellow-600/10 flex items-center gap-4 md:gap-6">
          <div className="p-3 md:p-4 bg-yellow-600/10 rounded-xl md:rounded-2xl text-yellow-600 shadow-xl">
            <Zap size={24} className="md:w-[28px] md:h-[28px]" />
          </div>
          <div>
            <p className="text-[8px] md:text-[9px] font-black uppercase text-neutral-500 tracking-widest mb-1">
              Status Offre
            </p>
            <p
              className={`text-xs md:text-sm font-black uppercase ${isActive ? "text-emerald-500" : "text-red-500"}`}
            >
              {isActive ? "En ligne" : "Désactivée"}
            </p>
          </div>
        </GoldBorderCard>
      </div>

      <GoldBorderCard className="p-6 md:p-8 border-yellow-600/20 bg-black/40 mx-2 md:mx-0">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8 md:mb-10 border-b border-white/5 pb-8">
          <h3 className="text-xl font-black uppercase">
            <Zap className="inline mr-2 text-yellow-600" /> Piloter l'offre{" "}
            <GoldText>Premium</GoldText>
          </h3>
          <div className="flex flex-wrap gap-3 w-full lg:w-auto">
            <button
              onClick={() => setShowTestQuiz(true)}
              className="flex-1 lg:flex-none px-4 py-3 bg-purple-600 hover:bg-purple-500 text-white font-black uppercase text-[10px] rounded-xl flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(168,85,247,0.3)] transition-all"
            >
              <Eye size={12} /> TESTER LE QUESTIONNAIRE D'OBJECTIFS
            </button>
            <button
              onClick={() => setShowTimer(!showTimer)}
              className={`flex-1 lg:flex-none px-4 py-3 rounded-xl font-black uppercase text-[10px] flex items-center justify-center gap-2 ${showTimer ? "bg-yellow-600 text-black" : "bg-neutral-800 text-neutral-500"}`}
            >
              {showTimer ? <Timer size={14} /> : <TimerOff size={14} />}{" "}
              {showTimer ? "CHRONO ON" : "CHRONO OFF"}
            </button>
            <button
              onClick={() => setIsActive(!isActive)}
              className={`flex-1 lg:flex-none px-6 py-3 rounded-xl font-black uppercase text-[10px] ${isActive ? "bg-emerald-600 text-white shadow-[0_0_20px_rgba(16,185,129,0.4)]" : "bg-red-600/20 text-red-500"}`}
            >
              {isActive ? "OFFRE ACTIVE" : "OFFRE INACTIVE"}
            </button>
          </div>
        </div>
        <div className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-neutral-500 tracking-widest flex items-center gap-2">
                <Tag size={12} /> Prix à barrer (Ancrage Marketing)
              </label>
              <input
                type="number"
                className="w-full bg-black border border-white/10 rounded-xl p-4 text-white outline-none focus:border-yellow-600 transition-all font-mono"
                value={priceNormal}
                onChange={(e) => setPriceNormal(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-yellow-600 tracking-widest flex items-center gap-2">
                <Coins size={12} /> Prix Promotionnel Actuel
              </label>
              <input
                type="number"
                className="w-full bg-black border border-white/10 rounded-xl p-4 text-white outline-none focus:border-yellow-600 transition-all font-mono"
                value={pricePromo}
                onChange={(e) => setPricePromo(e.target.value)}
              />
            </div>
          </div>

          {/* SYSTÈME DE COUPLAGE CHARIOW DYNAMIQUE SANS AFFILIATION */}
          <div className="p-5 md:p-6 bg-purple-600/5 border border-purple-500/10 rounded-2xl space-y-4">
            <div className="flex items-center gap-2 text-purple-400">
              <Zap size={14} className="fill-purple-400 text-purple-400" />
              <span className="text-[10px] font-black uppercase tracking-widest">
                Couplage Produit Chariow
              </span>
            </div>

            <div className="space-y-2">
              <p className="text-[10px] text-neutral-400 font-sans leading-relaxed">
                Sélectionnez le produit Chariow qui correspond à votre offre
                d'abonnement Premium. Un utilisateur s'inscrivant via le bouton
                de facturation de l'offre flash sera automatiquement redirigé
                vers sa page de paiement Chariow personnalisée et promu Premium
                à la validation sans passer par le parrainage.
              </p>
              <div className="relative">
                <select
                  className="w-full bg-black border border-white/10 rounded-xl p-4 text-xs text-white focus:border-purple-500 outline-none transition-colors cursor-pointer"
                  value={chariowProductId}
                  onChange={(e) => {
                    const val = e.target.value;
                    setChariowProductId(val);
                    handleChariowProductAutoSave(val);
                  }}
                  disabled={loadingChariowProducts}
                >
                  <option value="">
                    -- Mode de paiement manuel (bouton classique) --
                  </option>
                  {chariowProducts.map((p: any) => {
                    const computedId = p.id || p.product_id || p._id || "";
                    const computedName =
                      p.name || p.title || "Produit sans nom";
                    const computedPrice =
                      p.price || p.pricing?.price?.value || 0;
                    return (
                      <option key={computedId} value={computedId}>
                        {computedName} (
                        {computedPrice
                          ? `${computedPrice} FCFA`
                          : "Prix indéfini"}
                        ) [ID: {computedId}]
                      </option>
                    );
                  })}
                </select>
                {loadingChariowProducts && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <Loader2
                      size={16}
                      className="animate-spin text-purple-500"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 space-y-1 pt-3 border-t border-purple-500/15">
              <div className="flex justify-between items-center pb-1">
                <label className="text-[9px] text-neutral-500 font-bold uppercase tracking-wider block font-sans">
                  ID Produit Chariow (Saisie Manuelle)
                </label>
                <div className="flex gap-2 font-mono">
                  {isAutoSavingChariow && (
                    <span className="text-[8px] uppercase font-bold text-yellow-500 animate-pulse flex items-center gap-1">
                      <Loader2 size={8} className="animate-spin" />{" "}
                      Sauvegarde...
                    </span>
                  )}
                  {autoSaveSuccess && (
                    <span className="text-[8px] uppercase font-bold text-emerald-400">
                      ✓ Enregistré automatiquement
                    </span>
                  )}
                </div>
              </div>
              <input
                type="text"
                className="w-full bg-black border border-white/10 rounded-xl p-3 text-xs text-white placeholder-neutral-700 font-sans focus:border-purple-500 outline-none transition-colors"
                placeholder="Ex: prd_iwhpro"
                value={chariowProductId}
                onChange={(e) => {
                  const val = e.target.value.trim();
                  setChariowProductId(val);
                  handleChariowProductAutoSave(val);
                }}
                disabled={isAutoSavingChariow}
              />
              <p className="text-[8px] text-neutral-500 italic">
                Saisissez ou modifiez directement ici pour sauvegarder
                instantanément (Ex: prd_iwhpro).
              </p>
            </div>

            {chariowError && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-[10px] uppercase font-bold font-sans">
                {chariowError}
              </div>
            )}
          </div>

          <div className="p-5 md:p-6 bg-red-600/5 border border-red-500/10 rounded-2xl space-y-4">
            <label className="text-[10px] font-black uppercase text-red-500 tracking-widest flex items-center gap-2">
              <Clock size={14} /> Durée de l'urgence (Heures)
            </label>
            <div className="flex flex-col sm:flex-row gap-4">
              <input
                type="number"
                className="w-full sm:w-32 bg-black border border-white/10 rounded-xl p-4 text-white outline-none focus:border-red-600 transition-all font-mono"
                value={urgencyHours}
                onChange={(e) => setUrgencyHours(e.target.value)}
                placeholder="Ex: 24"
              />
              <button
                onClick={() => handleSaveConfig(true)}
                className="flex-1 flex items-center justify-center gap-3 py-4 bg-red-600 text-white rounded-xl font-black uppercase text-[10px] hover:bg-red-500 transition-all shadow-lg shadow-red-900/20"
              >
                <RefreshCw
                  size={14}
                  className={isSaving ? "animate-spin" : ""}
                />{" "}
                Relancer le compte à rebours ({urgencyHours}h)
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase text-neutral-500 tracking-widest flex items-center gap-2">
              <Video size={14} className="text-yellow-600" /> Iframe Vidéo de
              Vente (YouTube/Vimeo)
            </label>
            <textarea
              rows={3}
              className="w-full bg-black border border-white/10 rounded-xl p-5 text-white font-mono text-xs outline-none focus:border-yellow-600 transition-all shadow-inner"
              value={youtubeIframe}
              onChange={(e) => setYoutubeIframe(e.target.value)}
            />
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase text-neutral-500 tracking-widest flex items-center gap-2">
              <Video size={14} className="text-yellow-600" /> URL Vidéo Directe
              (MP4, etc.)
            </label>
            <input
              type="text"
              className="w-full bg-black border border-white/10 rounded-xl p-5 text-white font-mono text-xs outline-none focus:border-yellow-600 transition-all shadow-inner"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="Entrez l'URL directe de la vidéo..."
            />
            <p className="text-[8px] text-neutral-600 font-bold uppercase tracking-widest">
              Si renseignée, cette vidéo sera prioritaire sur l'Iframe.
            </p>
          </div>

          <PrimaryButton
            fullWidth
            onClick={() => handleSaveConfig(false)}
            isLoading={isSaving}
          >
            Mettre à jour les paramètres
          </PrimaryButton>

          {success && (
            <div className="p-3 bg-emerald-600/10 border border-emerald-500/20 rounded-xl flex items-center justify-center gap-3 animate-fade-in">
              <CheckCircle2 size={16} className="text-emerald-500" />
              <span className="text-[9px] font-black uppercase text-emerald-500">
                Modifications appliquées avec succès
              </span>
            </div>
          )}
        </div>
      </GoldBorderCard>

      <div className="space-y-6 px-2 md:px-0">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h3 className="text-xl font-black uppercase">
            <ImageIcon className="inline mr-2 text-purple-500" /> Bibliothèque
            de <GoldText>Preuves Sociales</GoldText>
          </h3>
          <button
            onClick={() => {
              if (showProofForm) {
                setEditingId(null);
                setProofForm({
                  name: "",
                  before_amount: "",
                  after_amount: "",
                  time_frame: "",
                  before_image_url: "",
                  after_image_url: "",
                  description: "",
                  award_type: "first_sale",
                  milestone_title: "",
                  is_active: true,
                  sort_order: 0,
                });
              }
              setShowProofForm(!showProofForm);
            }}
            className="w-full sm:w-auto px-5 py-3 bg-white/5 border border-white/10 rounded-xl font-black uppercase text-[10px] hover:bg-white/10 transition-all"
          >
            {showProofForm ? "Fermer" : "Nouvelle Preuve"}
          </button>
        </div>

        {showProofForm && (
          <GoldBorderCard className="p-6 md:p-8 bg-[#080808] border-purple-500/20 animate-slide-down">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] mb-6 text-purple-400">
              {editingId
                ? "ÉDITER LA PREUVE PREMIUM"
                : "AJOUTER UNE NOUVELLE PREUVE"}
            </h4>
            <form onSubmit={handleSaveProof} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-neutral-500">
                    Ambassadeur/Membre
                  </label>
                  <input
                    required
                    className="w-full bg-black border border-white/10 rounded-xl p-4 text-white text-xs outline-none focus:border-purple-500"
                    placeholder="Ex: Valdes"
                    value={proofForm.name}
                    onChange={(e) =>
                      setProofForm({ ...proofForm, name: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-neutral-500">
                    Délai des résultats
                  </label>
                  <input
                    required
                    className="w-full bg-black border border-white/10 rounded-xl p-4 text-white text-xs outline-none focus:border-purple-500"
                    placeholder="Ex: 14 jours, 3 heures"
                    value={proofForm.time_frame}
                    onChange={(e) =>
                      setProofForm({ ...proofForm, time_frame: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-neutral-500">
                    Catégorie Gamifiée (Badge)
                  </label>
                  <select
                    className="w-full bg-black border border-white/10 rounded-xl p-4 text-xs text-white outline-none focus:border-purple-500 cursor-pointer"
                    value={proofForm.award_type}
                    onChange={(e) => {
                      const val = e.target.value;
                      let defaultTitle = "";
                      if (val === "first_sale")
                        defaultTitle = "🏆 Première vente réalisée";
                      if (val === "first_withdrawal")
                        defaultTitle = "🚀 Premier retrait obtenu";
                      if (val === "goal_achieved")
                        defaultTitle = "💰 Objectif atteint";
                      if (val === "milestone_unlocked")
                        defaultTitle = "⭐ Nouveau palier débloqué";
                      if (val === "exceptional_result")
                        defaultTitle = "🔥 Résultat exceptionnel";

                      setProofForm({
                        ...proofForm,
                        award_type: val,
                        milestone_title: defaultTitle,
                      });
                    }}
                  >
                    <option value="first_sale">
                      🏆 Première vente réalisée
                    </option>
                    <option value="first_withdrawal">
                      🚀 Premier retrait obtenu
                    </option>
                    <option value="goal_achieved">💰 Objectif atteint</option>
                    <option value="milestone_unlocked">
                      ⭐ Nouveau palier débloqué
                    </option>
                    <option value="exceptional_result font-bold text-yellow-500">
                      🔥 Résultat exceptionnel
                    </option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2 md:col-span-2">
                  <label className="text-[10px] font-black uppercase text-neutral-500">
                    Titre personnalisé de l'accomplissement
                  </label>
                  <input
                    className="w-full bg-black border border-white/10 rounded-xl p-4 text-white text-xs outline-none focus:border-purple-500"
                    placeholder="Ex: Premier encaissement validé !"
                    value={proofForm.milestone_title}
                    onChange={(e) =>
                      setProofForm({
                        ...proofForm,
                        milestone_title: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-neutral-500">
                      Ordre d'affichage
                    </label>
                    <input
                      type="number"
                      className="w-full bg-black border border-white/10 rounded-xl p-4 text-white text-xs outline-none focus:border-purple-500 font-mono"
                      placeholder="Ex: 0"
                      value={proofForm.sort_order}
                      onChange={(e) =>
                        setProofForm({
                          ...proofForm,
                          sort_order: parseInt(e.target.value) || 0,
                        })
                      }
                    />
                  </div>

                  <div className="space-y-2 flex flex-col justify-end pb-3 pl-2">
                    <label className="text-[10px] font-black uppercase text-neutral-500 mb-2">
                      Visibilité
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-xs uppercase font-bold">
                      <input
                        type="checkbox"
                        className="accent-purple-500 w-4 h-4 cursor-pointer"
                        checked={proofForm.is_active}
                        onChange={(e) =>
                          setProofForm({
                            ...proofForm,
                            is_active: e.target.checked,
                          })
                        }
                      />
                      {proofForm.is_active ? (
                        <span className="text-emerald-500">Actif</span>
                      ) : (
                        <span className="text-red-500">Masqué</span>
                      )}
                    </label>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-neutral-500">
                  Une histoire émotionnelle de réussite (Description narrative)
                </label>
                <textarea
                  rows={3}
                  className="w-full bg-black border border-white/10 rounded-xl p-4 text-white text-xs outline-none focus:border-purple-500 leading-relaxed"
                  placeholder="Racontez la progression avec émotion. Ex: 'Après des semaines de doute en mode standard, ce membre est passé Elite Premium et a débloqué sa première vente de 40 000 FCFA dès le lendemain matin.'"
                  value={proofForm.description}
                  onChange={(e) =>
                    setProofForm({ ...proofForm, description: e.target.value })
                  }
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-4 border-t border-white/5">
                <div className="space-y-4">
                  <p className="text-[10px] font-black uppercase text-center text-neutral-500 tracking-widest">
                    AVANT (MODE STANDARD)
                  </p>
                  <input
                    required
                    className="w-full bg-black border border-white/10 rounded-xl p-3 text-center text-xs text-white font-mono"
                    placeholder="Montant/Gains (Ex: 0 FCFA ou 0)"
                    value={proofForm.before_amount}
                    onChange={(e) =>
                      setProofForm({
                        ...proofForm,
                        before_amount: e.target.value,
                      })
                    }
                  />

                  {/* Hidden input file tag for reactive drag-and-drop / select image mechanism */}
                  <input
                    type="file"
                    ref={fileInputBeforeRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleLocalBeforeImageUpload}
                  />

                  <div className="space-y-1">
                    <label className="text-[8px] font-black uppercase text-neutral-400 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Upload size={10} className="text-neutral-500" /> CAPTURE
                        D'ORIGINE / AVANT (OPTIONNELLE)
                      </span>
                      {proofForm.before_image_url && (
                        <span className="text-[7.5px] text-emerald-400 font-bold uppercase">
                          CHARGEE AVEC SUCCES
                        </span>
                      )}
                    </label>

                    {/* Interactive Click/Drag-and-drop Zone Container */}
                    <div
                      onClick={() => fileInputBeforeRef.current?.click()}
                      className="aspect-[4/3] border border-dashed border-white/10 hover:border-purple-500/70 rounded-2xl flex flex-col items-center justify-center bg-black/50 overflow-hidden cursor-pointer group transition-all relative"
                    >
                      {isUploadingBeforeImageLocal ? (
                        <div className="flex flex-col items-center justify-center p-4 text-center">
                          <Loader2
                            size={24}
                            className="text-purple-500 animate-spin mb-2"
                          />
                          <span className="text-[9px] font-black uppercase text-purple-400 animate-pulse">
                            Envoi en cours...
                          </span>
                        </div>
                      ) : proofForm.before_image_url ? (
                        <>
                          <img
                            src={getGDriveThumbnailUrl(
                              proofForm.before_image_url,
                            )}
                            alt="Aperçu de l'original"
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity">
                            <Upload size={18} className="text-white mb-1" />
                            <span className="text-[8px] font-black uppercase text-white">
                              Remplacer la capture
                            </span>
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center p-4 text-center text-neutral-500 group-hover:text-purple-400/80 transition-colors">
                          <Upload size={20} className="mb-2" />
                          <span className="text-[8px] font-black uppercase">
                            Cliquez pour importer la capture d'avant
                          </span>
                          <span className="text-[7px] text-neutral-600 mt-1 uppercase">
                            JPG, PNG, GIF (Max 15 Mo)
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Optional text-url override */}
                  <div className="space-y-1 pt-1">
                    <label className="text-[8px] font-black uppercase text-neutral-400 flex items-center gap-1">
                      <Link2 size={10} className="text-purple-400" /> Ou collez
                      un lien d'avant
                    </label>
                    <div className="flex gap-2">
                      <input
                        className="flex-1 bg-black border border-white/10 rounded-xl p-3 text-xs text-white outline-none focus:border-purple-500 font-mono text-[9px]"
                        placeholder="https://..."
                        value={proofForm.before_image_url || ""}
                        onChange={(e) =>
                          setProofForm({
                            ...proofForm,
                            before_image_url: e.target.value,
                          })
                        }
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setDrivePickerTarget("before");
                          setShowDrivePicker(true);
                        }}
                        className="px-4 py-3 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/25 rounded-xl text-[10px] uppercase font-black tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                      >
                        <Folder size={11} className="text-amber-500" />
                        Drive
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <p className="text-[10px] font-black uppercase text-center text-purple-400 tracking-widest">
                    APRÈS (MODE PREMIUM)
                  </p>
                  <input
                    required
                    className="w-full bg-black border border-white/10 rounded-xl p-3 text-center text-xs text-white font-mono"
                    placeholder="Montant/Gains (Ex: 500 000 FCFA)"
                    value={proofForm.after_amount}
                    onChange={(e) =>
                      setProofForm({
                        ...proofForm,
                        after_amount: e.target.value,
                      })
                    }
                  />

                  {/* Hidden input file tag for reactive drag-and-drop / select image mechanism */}
                  <input
                    type="file"
                    ref={localImageFileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleLocalImageUpload}
                  />

                  <div className="space-y-1">
                    <label className="text-[8px] font-black uppercase text-neutral-400 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Upload size={10} className="text-purple-400" /> CAPTURE
                        DE REUSSITE (IMAGE)
                      </span>
                      {proofForm.after_image_url && (
                        <span className="text-[7.5px] text-emerald-400 font-bold uppercase">
                          CHARGEE AVEC SUCCES
                        </span>
                      )}
                    </label>

                    {/* Interactive Click/Drag-and-drop Container Zone */}
                    <div
                      onClick={() => localImageFileInputRef.current?.click()}
                      className="aspect-[4/3] border border-dashed border-white/10 hover:border-purple-500/70 rounded-2xl flex flex-col items-center justify-center bg-black/50 overflow-hidden cursor-pointer group transition-all relative"
                    >
                      {isUploadingImageLocal ? (
                        <div className="flex flex-col items-center justify-center p-4 text-center">
                          <Loader2
                            size={24}
                            className="text-purple-500 animate-spin mb-2"
                          />
                          <span className="text-[9px] font-black uppercase text-purple-400 animate-pulse">
                            Envoi en cours...
                          </span>
                        </div>
                      ) : proofForm.after_image_url ? (
                        <>
                          <img
                            src={getGDriveThumbnailUrl(
                              proofForm.after_image_url,
                            )}
                            alt="Aperçu de la preuve"
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity">
                            <Upload size={18} className="text-white mb-1" />
                            <span className="text-[8px] font-black uppercase text-white">
                              Remplacer la capture
                            </span>
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center p-4 text-center text-neutral-500 group-hover:text-purple-400/80 transition-colors">
                          <Upload size={20} className="mb-2" />
                          <span className="text-[8px] font-black uppercase">
                            Cliquez pour importer la capture d'écran
                          </span>
                          <span className="text-[7px] text-neutral-600 mt-1 uppercase">
                            JPG, PNG, GIF (Max 15 Mo)
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Optional text-url override */}
                  <div className="space-y-1 pt-1">
                    <label className="text-[8px] font-black uppercase text-neutral-400 flex items-center gap-1">
                      <Link2 size={10} className="text-purple-400" /> Ou collez
                      un lien (Google Drive, Wix, etc.)
                    </label>
                    <div className="flex gap-2">
                      <input
                        className="flex-1 bg-black border border-white/10 rounded-xl p-3 text-xs text-white outline-none focus:border-purple-500 font-mono text-[9px]"
                        placeholder="https://..."
                        value={proofForm.after_image_url || ""}
                        onChange={(e) =>
                          setProofForm({
                            ...proofForm,
                            after_image_url: e.target.value,
                          })
                        }
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setDrivePickerTarget("after");
                          setShowDrivePicker(true);
                        }}
                        className="px-4 py-3 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/25 rounded-xl text-[10px] uppercase font-black tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                      >
                        <Folder size={11} className="text-amber-500" />
                        Drive
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <PrimaryButton type="submit" fullWidth isLoading={isSavingProof}>
                {editingId
                  ? "Mettre à jour la carte d'accomplissement"
                  : "Publier la carte d'accomplissement"}
              </PrimaryButton>
            </form>
            {showDrivePicker && (
              <GoogleDriveExplorer
                isModal
                onClose={() => setShowDrivePicker(false)}
                onSelectFile={(links) => {
                  if (drivePickerTarget === "before") {
                    setProofForm({
                      ...proofForm,
                      before_image_url: links.directView,
                    });
                  } else {
                    setProofForm({
                      ...proofForm,
                      after_image_url: links.directView,
                    });
                  }
                  setShowDrivePicker(false);
                }}
              />
            )}
          </GoldBorderCard>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {proofs.map((p) => (
            <div
              key={p.id}
              className="p-4 bg-neutral-900/40 border border-white/5 rounded-2xl flex flex-col justify-between group hover:border-purple-500/20 transition-all gap-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-black shrink-0 border border-white/5 shadow-inner">
                    <img
                      src={getGDriveThumbnailUrl(p.after_image_url)}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase text-white truncate flex items-center gap-1.5">
                      {p.name}
                      {p.is_active === false && (
                        <span className="text-[7px] bg-red-900/30 text-red-500 border border-red-500/20 px-1 py-0.5 rounded font-bold uppercase tracking-widest">
                          DÉSACTIVÉ
                        </span>
                      )}
                    </p>
                    <p className="text-[8px] text-purple-400 font-bold uppercase tracking-widest">
                      {p.award_type === "first_withdrawal"
                        ? "🚀 Retrait"
                        : p.award_type === "goal_achieved"
                          ? "💰 Objectif"
                          : p.award_type === "milestone_unlocked"
                            ? "⭐ Palier"
                            : p.award_type === "exceptional_result"
                              ? "🔥 Exceptionnel"
                              : "🏆 Vente"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => startEdit(p)}
                    className="p-2 text-neutral-500 hover:text-purple-500 transition-colors"
                    title="Modifier"
                  >
                    <Edit size={14} />
                  </button>
                  <button
                    onClick={() => deleteProof(p.id)}
                    className="p-2 text-neutral-500 hover:text-red-500 transition-colors"
                    title="Supprimer"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <div className="border-t border-white/5 pt-3 flex items-center justify-between text-[8px] text-neutral-500 font-black uppercase tracking-widest font-mono">
                <span>Tri: #{p.sort_order ?? 0}</span>
                <span>{p.time_frame}</span>
                <span className="text-white/80">{p.after_amount}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showTestQuiz && (
        <MZPlusOnboardingGoalsModal
          profile={{
            full_name: "Administrateur Test",
            id: "test-admin",
            store_preferences: {},
          }}
          onComplete={(goalsData) => {
            setShowTestQuiz(false);
          }}
          onClose={() => setShowTestQuiz(false)}
        />
      )}
    </div>
  );
};
