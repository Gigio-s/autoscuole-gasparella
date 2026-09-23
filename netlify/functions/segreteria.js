// ============================================================
// Netlify Function: segreteria
// Area riservata: elenca le prenotazioni e genera link di download firmati
// (a scadenza) per i documenti. Protetta da password (env SEGRETERIA_PASSWORD).
// NOTA: password unica = MVP. Per produzione valutare Netlify Identity /
// Supabase Auth e/o restrizione per IP.
// ============================================================

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET       = process.env.SUPABASE_BUCKET || 'documenti-corsi';
const PASSWORD     = process.env.SEGRETERIA_PASSWORD;

const LABELS = {
  cf_fronte: 'Cod. fiscale (fronte)', cf_retro: 'Cod. fiscale (retro)',
  ci_fronte: "Carta id. (fronte)",   ci_retro: "Carta id. (retro)",
  pat_fronte: 'Patente (fronte)',    pat_retro: 'Patente (retro)',
  pds_fronte: 'Permesso sogg. (fronte)', pds_retro: 'Permesso sogg. (retro)'
};

function headers() {
  return { 'Content-Type': 'application/json', 'X-Robots-Tag': 'noindex' };
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
  if (!SUPABASE_URL || !SERVICE_KEY || !PASSWORD) {
    return { statusCode: 500, headers: headers(), body: JSON.stringify({ error: 'Backend non configurato' }) };
  }

  let b;
  try { b = JSON.parse(event.body || '{}'); }
  catch (e) { return { statusCode: 400, headers: headers(), body: JSON.stringify({ error: 'JSON non valido' }) }; }

  if (!pwOk(b.password)) {
    return { statusCode: 401, headers: headers(), body: JSON.stringify({ error: 'Password errata' }) };
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

  // Aggiorna stato prenotazione (gestita / annullata / nuova)
  if (b.action === 'setStato' && b.id && b.stato) {
    try {
      const { error } = await supabase.from('prenotazioni')
        .update({ stato: String(b.stato) }).eq('id', b.id);
      if (error) throw error;
      return { statusCode: 200, headers: headers(), body: JSON.stringify({ ok: true }) };
    } catch (e) {
      return { statusCode: 500, headers: headers(), body: JSON.stringify({ error: e.message || String(e) }) };
    }
  }

  // Default: elenco prenotazioni + link firmati ai documenti (validi 7 giorni)
  try {
    const { data: righe, error } = await supabase
      .from('prenotazioni')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);
    if (error) throw error;

    const out = [];
    for (const r of (righe || [])) {
      const docs = [];
      const mappa = r.documenti || {};
      for (const campo of Object.keys(mappa)) {
        try {
          const { data: sd, error: se } = await supabase.storage.from(BUCKET).createSignedUrl(mappa[campo], 1209600);
          if (!se && sd && sd.signedUrl) {
            const url = sd.signedUrl.startsWith('http') ? sd.signedUrl : SUPABASE_URL + sd.signedUrl;
            docs.push({ label: LABELS[campo] || campo, url: url });
          }
        } catch (e) { /* salta singolo file non trovato */ }
      }
      out.push({
        id: r.id, created_at: r.created_at, stato: r.stato, corso: r.corso, sede: r.sede,
        residenza: r.residenza,
        nome: r.nome, cognome: r.cognome, telefono: r.telefono, email: r.email,
        codice_fiscale: r.codice_fiscale, n_carta_identita: r.n_carta_identita,
        n_patente: r.n_patente, extra_ue: r.extra_ue, n_permesso: r.n_permesso,
        documenti: docs
      });
    }
    return { statusCode: 200, headers: headers(), body: JSON.stringify({ ok: true, prenotazioni: out }) };
  } catch (e) {
    return { statusCode: 500, headers: headers(), body: JSON.stringify({ error: e.message || String(e) }) };
  }
};
