// ============================================================
// Netlify Function: corsi-stato
// Gestisce lo stato "pieno / sold out" dei corsi.
//  - action 'list'  -> pubblico: ritorna gli stati salvati (per le pagine)
//  - action 'set'   -> protetto da password: imposta/azzera il sold out
//  - default (con password) -> ritorna tutti gli stati (per il pannello)
// Riusa le stesse env della segreteria.
// ============================================================

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PASSWORD     = process.env.SEGRETERIA_PASSWORD;

function headers() {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };
}

function pwOk(input) {
  if (!PASSWORD || typeof input !== 'string' || input.length !== PASSWORD.length) return false;
  let diff = 0;
  for (let i = 0; i < PASSWORD.length; i++) diff |= (input.charCodeAt(i) ^ PASSWORD.charCodeAt(i));
  return diff === 0;
}

exports.handler = async function (event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: headers(), body: '' };
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: headers(), body: JSON.stringify({ error: 'Metodo non consentito' }) };
  }
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return { statusCode: 500, headers: headers(), body: JSON.stringify({ error: 'Backend non configurato' }) };
  }

  let b;
  try { b = JSON.parse(event.body || '{}'); }
  catch (e) { return { statusCode: 400, headers: headers(), body: JSON.stringify({ error: 'JSON non valido' }) }; }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

  // --- Lettura pubblica: elenco stati (serve alle pagine pubbliche) ---
  if (b.action === 'list') {
    try {
      const { data, error } = await supabase.from('corsi_stato').select('chiave, soldout');
      if (error) throw error;
      const stati = (data || []).filter(function (r) { return r.soldout; });
      return { statusCode: 200, headers: headers(), body: JSON.stringify({ ok: true, stati: stati }) };
    } catch (e) {
      // In caso di errore non blocchiamo la pagina: nessuno stato
      return { statusCode: 200, headers: headers(), body: JSON.stringify({ ok: true, stati: [] }) };
    }
  }

  // --- Da qui in poi serve la password ---
  if (!pwOk(b.password)) {
    return { statusCode: 401, headers: headers(), body: JSON.stringify({ error: 'Password errata' }) };
  }

  // Imposta/azzera il sold out di un corso
  if (b.action === 'set' && typeof b.chiave === 'string' && b.chiave.trim() !== '') {
    try {
      const soldout = b.soldout === true;
      const { error } = await supabase.from('corsi_stato')
        .upsert({ chiave: b.chiave.trim(), soldout: soldout, updated_at: new Date().toISOString() }, { onConflict: 'chiave' });
      if (error) throw error;
      return { statusCode: 200, headers: headers(), body: JSON.stringify({ ok: true }) };
    } catch (e) {
      return { statusCode: 500, headers: headers(), body: JSON.stringify({ error: e.message || String(e) }) };
    }
  }

  // Default (autenticato): tutti gli stati salvati (per il pannello)
  try {
    const { data, error } = await supabase.from('corsi_stato').select('chiave, soldout');
    if (error) throw error;
    return { statusCode: 200, headers: headers(), body: JSON.stringify({ ok: true, stati: data || [] }) };
  } catch (e) {
    return { statusCode: 500, headers: headers(), body: JSON.stringify({ error: e.message || String(e) }) };
  }
};
