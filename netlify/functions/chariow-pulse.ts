import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Client
const RAW_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_URL = RAW_URL.replace(/\/+$/, '').replace(/\/rest\/v1$/, '');
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(SUPABASE_URL || 'https://placeholder-fill-env-vars.supabase.co', SUPABASE_ANON_KEY || 'placeholder');

async function logChariowPulseToSupabase(payload: any) {
  try {
    const { data, error } = await supabase
      .from('platform_settings')
      .select('value')
      .eq('id', 'chariow_webhook_logs')
      .maybeSingle();

    let dbPulses: any[] = [];
    if (!error && data && Array.isArray(data.value)) {
      dbPulses = data.value;
    }

    const newLog = {
      id: Math.random().toString(36).substring(2, 9),
      received_at: new Date().toISOString(),
      payload: payload
    };

    dbPulses.unshift(newLog);
    if (dbPulses.length > 100) {
      dbPulses = dbPulses.slice(0, 100);
    }

    const { error: upsertErr } = await supabase
      .from('platform_settings')
      .upsert({ id: 'chariow_webhook_logs', value: dbPulses });

    if (upsertErr) {
      console.error('[Pulse Log Error] Upsert error:', upsertErr);
    }
  } catch (err) {
    console.error('[Pulse Log Error] Critical exception logging to Supabase settings:', err);
  }
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify({ success: false, message: 'Method Not Allowed' })
    };
  }

  const respond = (statusCode: number, data: any) => {
    return {
      statusCode,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify(data)
    };
  };

  let body: any = {};
  try {
    if (event.body) {
      body = JSON.parse(event.body);
    }
  } catch (err) {
    return respond(400, { success: false, error: 'invalid_json', message: 'Le corps de la requête doit être du JSON valide.' });
  }

  console.log('[Chariow Netlify Handled Pulse] Pulse received:', JSON.stringify(body, null, 2));

  const eventType = body?.event || 'successful.sale';

  const logEntry: any = {
    event: eventType,
    body: body || {},
    status: 'received',
    details: ''
  };

  try {
    const dataPayload = body.data || {};
    
    // Extraction robuste de l'identifiant du produit Chariow
    const chariow_product_id = 
      body.product_id || 
      dataPayload.product_id || 
      (dataPayload.product && dataPayload.product.id) || 
      (body.product && body.product.id) ||
      (dataPayload.checkout && dataPayload.checkout.product_id) ||
      body.chariow_product_id;

    const customerEmail = 
      body.email || 
      dataPayload.email || 
      (dataPayload.customer && dataPayload.customer.email) || 
      (body.customer && body.customer.email);

    logEntry.product_id = chariow_product_id;
    logEntry.email = customerEmail;

    if (!chariow_product_id) {
      logEntry.status = 'ignored';
      logEntry.details = `Événement ${eventType} reçu mais ignoré car aucun product_id n'a été trouvé dans le payload.`;
      await logChariowPulseToSupabase(logEntry);
      return respond(200, {
        success: false,
        message: "Aucun product_id trouvé dans le payload du webhook. Webhook acquitté."
      });
    }

    // Récupération dynamique de la clé de correspondance Chariow de l'offre Premium
    let premiumChariowId = 'prd_iwhpro';
    try {
      const { data: psConf } = await supabase
        .from('platform_settings')
        .select('value')
        .eq('id', 'flash_offer_chariow_product_id')
        .maybeSingle();
      if (psConf?.value?.product_id) {
        premiumChariowId = psConf.value.product_id;
      } else {
        const { data: flashConf } = await supabase
          .from('mz_flash_offer_v2')
          .select('chariow_product_id')
          .eq('id', 'flash-offer-global')
          .maybeSingle();
        if (flashConf?.chariow_product_id) {
          premiumChariowId = flashConf.chariow_product_id;
        }
      }
    } catch (errConf) {
      console.error('[Netlify Webhook] Erreur lecture config flash offer, fallback prd_iwhpro:', errConf);
    }

    // Trouver le produit correspondant dans notre base de données Supabase
    let product = null;
    let prodErr = null;

    const { data: dbProduct, error: dbProdErr } = await supabase
      .from('products')
      .select('id, name, commission_amount')
      .eq('chariow_product_id', chariow_product_id)
      .maybeSingle();

    product = dbProduct;
    prodErr = dbProdErr;

    // Un produit de secours virtuel pour l'offre MZ+ Premium s'il n'est pas encore enregistré dans la table
    if ((!product || prodErr) && chariow_product_id === premiumChariowId) {
      product = {
        id: 'mz-plus-premium-virtual',
        name: 'MZ+ Premium',
        commission_amount: 5000,
        chariow_product_id: premiumChariowId
      };
      prodErr = null;
    }

    if (prodErr || !product) {
      logEntry.status = 'product_not_found';
      logEntry.details = `Événement ${eventType} reçu mais impossible de trouver un produit correspondant dans Supabase pour l'identifiant Chariow : ${chariow_product_id}`;
      await logChariowPulseToSupabase(logEntry);
      return respond(200, {
        success: false,
        message: `Produit introuvable pour l'ID Chariow ${chariow_product_id}`
      });
    }

    logEntry.matched_product_name = product.name;

    const eventStr = String(eventType || '').toLowerCase();
    const isRejectedEvent = eventStr === 'failed.sale' || 
                            eventStr === 'abandoned.sale' || 
                            eventStr.includes('abandon') || 
                            eventStr.includes('reject') || 
                            eventStr.includes('fail') || 
                            eventStr.includes('cancel');

    // Si c'est l'offre flash premium (produit chariow configuré)
    if (chariow_product_id === premiumChariowId && customerEmail && !isRejectedEvent) {
      const { data: updatedUser, error: updateLevelErr } = await supabase
        .from('users')
        .update({ user_level: 'niveau_mz_plus' })
        .ilike('email', customerEmail.trim())
        .select();
        
      if (updateLevelErr) {
        console.error("[Netlify Webhook] Erreur de promotion Premium:", updateLevelErr);
        logEntry.details += ` [Erreur promotion: ${updateLevelErr.message}]`;
      } else if (updatedUser && updatedUser.length > 0) {
        console.log(`[Netlify Webhook] Utilisateur ${customerEmail} promu 'niveau_mz_plus'.`);
        logEntry.details += ` [Promu avec succès]`;
      } else {
        console.warn("[Netlify Webhook] Aucun utilisateur trouvé avec l'e-mail:", customerEmail);
        logEntry.details += ` [Utilisateur non trouvé par e-mail: ${customerEmail}]`;
      }
    }

    // Trouver la commission en attente ('pending') la plus récente pour ce produit physique
    const { data: pendingComms, error: commsErr } = await supabase
      .from('commissions')
      .select('id, user_id, status')
      .eq('product_id', product.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (commsErr) {
      logEntry.status = 'error';
      logEntry.details = `Erreur de base de données lors de la recherche des commissions : ${commsErr.message}`;
      await logChariowPulseToSupabase(logEntry);
      return respond(500, {
        success: false,
        error: 'db_error',
        message: "Erreur de base de données."
      });
    }

    if (!pendingComms || pendingComms.length === 0) {
      if (chariow_product_id === 'prd_iwhpro') {
        logEntry.status = 'success';
        logEntry.details += ` Événement Chariow ${eventType} traité pour l'offre Premium (sans commission parrainage).`;
        await logChariowPulseToSupabase(logEntry);
        return respond(200, {
          success: true,
          message: "Utilisateur promu membre Premium MZ+ avec succès."
        });
      }

      logEntry.status = 'no_pending_commission';
      logEntry.details = `Événement Chariow ${eventType} reçu pour le produit '${product.name}', mais aucune commission 'pending' n'était en attente. Aucun changement n'a été appliqué.`;
      await logChariowPulseToSupabase(logEntry);
      return respond(200, {
        success: true,
        message: "Aucune commission 'pending' trouvée à traiter pour ce produit, acquittement du pulse."
      });
    }

    const mostRecentPending = pendingComms[0];

    if (isRejectedEvent) {
      // La vente a échoué ou a été abandonnée, on rejette ('rejected') la commission associée
      const { error: updateErr } = await supabase
        .from('commissions')
        .update({ status: 'rejected' })
        .eq('id', mostRecentPending.id);

      if (updateErr) {
        logEntry.status = 'error';
        logEntry.details = `Erreur lors de la mise à jour (statut: rejected) de la commission ${mostRecentPending.id} : ${updateErr.message}`;
        await logChariowPulseToSupabase(logEntry);
        return respond(500, {
          success: false,
          error: 'update_error',
          message: "Erreur lors du rejet de la commission."
        });
      }

      logEntry.status = 'rejected';
      logEntry.details = `La vente Chariow a échoué ou a été abandonnée (Événement: ${eventType}). La commission associée ${mostRecentPending.id} pour l'utilisateur ${mostRecentPending.user_id} a été marquée en 'rejected'.`;
      await logChariowPulseToSupabase(logEntry);

      console.log(`[Chariow Netlify Pulse] Vente non finalisée (${eventType}). Commission ${mostRecentPending.id} passée en 'rejected'.`);
      return respond(200, {
        success: true,
        message: `Événement ${eventType} traité. Commission ${mostRecentPending.id} passée en 'rejected' (rejetée).`,
        commissionId: mostRecentPending.id,
        status: 'rejected'
      });

    } else {
      // Événement par défaut: Vente finalisée / successful.sale -> on marque la commission en 'finalized'
      const { error: updateErr } = await supabase
        .from('commissions')
        .update({ status: 'finalized' })
        .eq('id', mostRecentPending.id);

      if (updateErr) {
        logEntry.status = 'error';
        logEntry.details = `Erreur lors de la mise à jour (statut: finalized) pour la commission ${mostRecentPending.id} : ${updateErr.message}`;
        await logChariowPulseToSupabase(logEntry);
        return respond(500, {
          success: false,
          error: 'update_error',
          message: "Erreur lors de la mise à jour de la commission en finalized"
        });
      }

      logEntry.status = 'success';
      logEntry.details = `Vente réussie (Événement: ${eventType}). Commission ${mostRecentPending.id} de ${product.commission_amount} FCFA finalisée avec succès pour l'utilisateur ${mostRecentPending.user_id}.`;
      await logChariowPulseToSupabase(logEntry);

      console.log(`[Chariow Netlify Pulse] Vente finalisée (${eventType}). Commission ${mostRecentPending.id} passée en 'finalized'.`);
      return respond(200, {
        success: true,
        message: `Commission ${mostRecentPending.id} finalisée avec succès.`,
        commissionId: mostRecentPending.id,
        userId: mostRecentPending.user_id,
        status: 'finalized'
      });
    }

  } catch (err: any) {
    console.error('[Chariow Netlify Pulse] Erreur critique système dans le traitement du pulse:', err);
    logEntry.status = 'failure';
    logEntry.details = `Erreur système critique : ${err.message}`;
    await logChariowPulseToSupabase(logEntry);
    return respond(200, {
      success: false,
      error: 'webhook_internal_error',
      message: err.message
    });
  }
};
