// ============================================================
// Netlify Function: sedi
// Dati delle sedi (indirizzo, telefono, orari) gestiti dal gestionale.
//  - action 'list'  -> pubblico: ritorna tutte le sedi (per le pagine)
//  - action 'set'   -> protetto da password: salva i dati di una sede
//  - default (con password) -> ritorna tutte le sedi (per il pannello)
// Riusa le stesse env della segreteria.
// ============================================================

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PASSWORD     = process.env.SEGRETERIA_PASSWORD;

const GIORNI = ['lun', 'mar', 'mer', 'gio', 'ven', 'sab', 'dom'];

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

function pulisciOrari(o) {
  const out = {};
  o = (o && typeof o === 'object') ? o : {};
  GIORNI.forEach(function (g) {
    out[g] = (typeof o[g] === 'string') ? o[g].trim() : '';
  });
  return out;
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

  // Lettura pubblica
  if (b.action === 'list') {
    try {
      const { data, error } = await supabase.from('sedi').select('*').order('ordine', { ascending: true });
      if (error) throw error;
      return { statusCode: 200, headers: headers(), body: JSON.stringify({ ok: true, sedi: data || [] }) };
    } catch (e) {
      return { statusCode: 200, headers: headers(), body: JSON.stringify({ ok: true, sedi: [] }) };
    }
  }

  // Da qui serve la password
  if (!pwOk(b.password)) {
    return { statusCode: 401, headers: headers(), body: JSON.stringify({ error: 'Password errata' }) };
  }

  // Salva i dati di una sede
  if (b.action === 'set' && typeof b.id === 'string' && b.id.trim() !== '') {
    try {
      const rec = {
        id: b.id.trim(),
        nome: b.nome != null ? String(b.nome).trim() : null,
        via: b.via != null ? String(b.via).trim() : null,
        cap: b.cap != null ? String(b.cap).trim() : null,
        comune: b.comune != null ? String(b.comune).trim() : null,
        telefono: b.telefono != null ? String(b.telefono).trim() : null,
        orari: pulisciOrari(b.orari),
        avviso: b.avviso === true,
        avviso_testo: b.avviso_testo != null ? String(b.avviso_testo).trim() : null,
        updated_at: new Date().toISOString()
      };
      if (typeof b.ordine === 'number') rec.ordine = b.ordine;
      const { error } = await supabase.from('sedi').upsert(rec, { onConflict: 'id' });
      if (error) throw error;
      return { statusCode: 200, headers: headers(), body: JSON.stringify({ ok: true }) };
    } catch (e) {
      return { statusCode: 500, headers: headers(), body: JSON.stringify({ error: e.message || String(e) }) };
    }
  }

  // Default (autenticato): tutte le sedi (per il pannello)
  try {
    const { data, error } = await supabase.from('sedi').select('*').order('ordine', { ascending: true });
    if (error) throw error;
    return { statusCode: 200, headers: headers(), body: JSON.stringify({ ok: true, sedi: data || [] }) };
  } catch (e) {
    return { statusCode: 500, headers: headers(), body: JSON.stringify({ error: e.message || String(e) }) };
  }
};
