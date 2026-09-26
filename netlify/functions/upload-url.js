// ============================================================
// Netlify Function: upload-url
// Riceve l'elenco dei file che il browser vuole caricare e restituisce,
// per ognuno, un URL firmato per l'upload DIRETTO su Supabase Storage.
// I file NON passano da questa funzione (si evitano i limiti di dimensione).
// ============================================================

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET       = process.env.SUPABASE_BUCKET || 'documenti-corsi';
const SITE_URL     = process.env.SITE_URL || '*';

// Campi documento ammessi. I primi 6 sono sempre obbligatori;
// pds_* solo se cittadino extra-UE.
const CAMPI_BASE  = ['cf_fronte', 'cf_retro', 'ci_fronte', 'ci_retro', 'pat_fronte', 'pat_retro'];
const CAMPI_PDS   = ['pds_fronte', 'pds_retro'];
const CAMPI_FOTO  = ['foto', 'firma']; // fototessera + firma: solo form visita medica / rinnovo patente
const CAMPI_TUTTI = CAMPI_BASE.concat(CAMPI_PDS).concat(CAMPI_FOTO);

const TIPI_OK = {
  'application/pdf': 'pdf',
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg'
};

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB per file

function headers() {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': SITE_URL,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
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

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch (e) { return { statusCode: 400, headers: headers(), body: JSON.stringify({ error: 'JSON non valido' }) }; }

  const extraUe = body.extra_ue === true;
  const conFoto = body.foto === true; // richiesta fototessera (form visita/rinnovo)
  const files = Array.isArray(body.files) ? body.files : [];

  let richiesti = extraUe ? CAMPI_BASE.concat(CAMPI_PDS) : CAMPI_BASE.slice();
  if (conFoto) richiesti = richiesti.concat(CAMPI_FOTO);
  const presenti = files.map(function (f) { return f && f.field; });

  // Verifica che ci siano tutti i documenti richiesti e nessun campo estraneo
  for (const c of richiesti) {
    if (presenti.indexOf(c) === -1) {
      return { statusCode: 400, headers: headers(), body: JSON.stringify({ error: 'Manca il documento: ' + c }) };
    }
  }
  for (const f of files) {
    if (CAMPI_TUTTI.indexOf(f.field) === -1) {
      return { statusCode: 400, headers: headers(), body: JSON.stringify({ error: 'Campo non ammesso: ' + f.field }) };
    }
    if (!TIPI_OK[f.contentType]) {
      return { statusCode: 400, headers: headers(), body: JSON.stringify({ error: 'Formato non ammesso per ' + f.field + ' (solo PDF, PNG, JPG)' }) };
    }
    if (typeof f.size === 'number' && f.size > MAX_BYTES) {
      return { statusCode: 400, headers: headers(), body: JSON.stringify({ error: 'File troppo grande per ' + f.field + ' (max 8 MB)' }) };
    }
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

  // Id prenotazione: cartella dedicata nello storage
  const bookingId = (globalThis.crypto && globalThis.crypto.randomUUID)
    ? globalThis.crypto.randomUUID()
    : require('crypto').randomUUID();

  const uploads = {};
  try {
    for (const f of files) {
      const ext = TIPI_OK[f.contentType];
      const path = bookingId + '/' + f.field + '.' + ext;
      const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(path);
      if (error) throw error;
      // data.signedUrl e' relativo: lo rendo assoluto per il PUT dal browser
      const signedUrl = data.signedUrl.startsWith('http')
        ? data.signedUrl
        : SUPABASE_URL + data.signedUrl;
      uploads[f.field] = { path: path, signedUrl: signedUrl };
    }
  } catch (e) {
    return { statusCode: 500, headers: headers(), body: JSON.stringify({ error: 'Errore creazione URL upload: ' + (e.message || e) }) };
  }

  return { statusCode: 200, headers: headers(), body: JSON.stringify({ bookingId: bookingId, uploads: uploads }) };
};
