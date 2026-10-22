// ============================================================
// Netlify Function: corsi
// Gestione corsi (edizioni) dal gestionale.
//  - action 'list'     -> pubblico: edizioni NON archiviate (per corsi-cqc)
//  - action 'all'      -> protetto: tutte le edizioni (attive + archiviate)
//  - action 'save'     -> protetto: crea o aggiorna una edizione
//  - action 'archivia' -> protetto: archivia/ripristina una edizione
//  - action 'elimina'  -> protetto: elimina definitivamente una edizione
//  - action 'seed'     -> protetto: importa le edizioni attuali (solo se vuoto)
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

// Normalizza il campo date: array di coppie ["YYYY-MM-DD","orario"]
function pulisciDate(d) {
  if (!Array.isArray(d)) return [];
  const out = [];
  d.forEach(function (x) {
    if (Array.isArray(x) && x.length >= 2 && typeof x[0] === 'string' && x[0].trim()) {
      out.push([x[0].trim(), String(x[1] || '').trim()]);
    }
  });
  out.sort(function (a, b) { return a[0] < b[0] ? -1 : (a[0] > b[0] ? 1 : 0); });
  return out;
}

function campiEdizione(b) {
  return {
    nome: b.nome != null ? String(b.nome).trim() : '',
    sede: b.sede != null ? String(b.sede).trim() : null,
    formato: b.formato != null ? String(b.formato).trim() : null,
    costo: b.costo != null && String(b.costo).trim() !== '' ? String(b.costo).trim() : null,
    pagamento: b.pagamento != null && String(b.pagamento).trim() !== '' ? String(b.pagamento).trim() : null,
    date: pulisciDate(b.date),
    ordine: typeof b.ordine === 'number' ? b.ordine : 0
  };
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

  // Lettura pubblica: edizioni attive
  if (b.action === 'list') {
    try {
      const { data, error } = await supabase.from('corsi').select('*')
        .eq('archiviato', false).order('ordine', { ascending: true }).order('created_at', { ascending: true });
      if (error) throw error;
      return { statusCode: 200, headers: headers(), body: JSON.stringify({ ok: true, corsi: data || [] }) };
    } catch (e) {
      return { statusCode: 200, headers: headers(), body: JSON.stringify({ ok: true, corsi: [] }) };
    }
  }

  // Da qui serve la password
  if (!pwOk(b.password)) {
    return { statusCode: 401, headers: headers(), body: JSON.stringify({ error: 'Password errata' }) };
  }

  // Tutte le edizioni (attive + archiviate) per il pannello
  if (b.action === 'all') {
    try {
      const { data, error } = await supabase.from('corsi').select('*')
        .order('archiviato', { ascending: true }).order('ordine', { ascending: true }).order('created_at', { ascending: true });
      if (error) throw error;
      return { statusCode: 200, headers: headers(), body: JSON.stringify({ ok: true, corsi: data || [] }) };
    } catch (e) {
      return { statusCode: 500, headers: headers(), body: JSON.stringify({ error: e.message || String(e) }) };
    }
  }

  // Crea o aggiorna una edizione
  if (b.action === 'save') {
    const rec = campiEdizione(b);
    if (!rec.nome) return { statusCode: 400, headers: headers(), body: JSON.stringify({ error: 'Il nome del corso è obbligatorio' }) };
    if (!rec.sede) return { statusCode: 400, headers: headers(), body: JSON.stringify({ error: 'La sede è obbligatoria' }) };
    if (!rec.date.length) return { statusCode: 400, headers: headers(), body: JSON.stringify({ error: 'Inserisci almeno una data' }) };
    try {
      rec.updated_at = new Date().toISOString();
      let res;
      if (b.id) {
        res = await supabase.from('corsi').update(rec).eq('id', b.id).select().single();
      } else {
        res = await supabase.from('corsi').insert(rec).select().single();
      }
      if (res.error) throw res.error;
      return { statusCode: 200, headers: headers(), body: JSON.stringify({ ok: true, corso: res.data }) };
    } catch (e) {
      return { statusCode: 500, headers: headers(), body: JSON.stringify({ error: e.message || String(e) }) };
    }
  }

  // Archivia / ripristina
  if (b.action === 'archivia' && b.id) {
    try {
      const { error } = await supabase.from('corsi')
        .update({ archiviato: b.archiviato === true, updated_at: new Date().toISOString() }).eq('id', b.id);
      if (error) throw error;
      return { statusCode: 200, headers: headers(), body: JSON.stringify({ ok: true }) };
    } catch (e) {
      return { statusCode: 500, headers: headers(), body: JSON.stringify({ error: e.message || String(e) }) };
    }
  }

  // Elimina definitivamente
  if (b.action === 'elimina' && b.id) {
    try {
      const { error } = await supabase.from('corsi').delete().eq('id', b.id);
      if (error) throw error;
      return { statusCode: 200, headers: headers(), body: JSON.stringify({ ok: true }) };
    } catch (e) {
      return { statusCode: 500, headers: headers(), body: JSON.stringify({ error: e.message || String(e) }) };
    }
  }

  // Importa i corsi attuali (una tantum, solo se la tabella è vuota)
  if (b.action === 'seed' && Array.isArray(b.corsi)) {
    try {
      const { count, error: ce } = await supabase.from('corsi').select('id', { count: 'exact', head: true });
      if (ce) throw ce;
      if (count && count > 0) {
        return { statusCode: 200, headers: headers(), body: JSON.stringify({ ok: true, skipped: true, count: count }) };
      }
      const righe = b.corsi.map(function (x, i) {
        const r = campiEdizione(x);
        r.ordine = typeof x.ordine === 'number' ? x.ordine : i;
        return r;
      }).filter(function (r) { return r.nome && r.sede && r.date.length; });
      if (!righe.length) return { statusCode: 400, headers: headers(), body: JSON.stringify({ error: 'Nessuna edizione valida da importare' }) };
      const { error } = await supabase.from('corsi').insert(righe);
      if (error) throw error;
      return { statusCode: 200, headers: headers(), body: JSON.stringify({ ok: true, inserted: righe.length }) };
    } catch (e) {
      return { statusCode: 500, headers: headers(), body: JSON.stringify({ error: e.message || String(e) }) };
    }
  }

  return { statusCode: 400, headers: headers(), body: JSON.stringify({ error: 'Azione non valida' }) };
};
