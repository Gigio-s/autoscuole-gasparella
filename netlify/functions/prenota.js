// ============================================================
// Netlify Function: prenota
// Riceve i dati della prenotazione (dopo che i file sono gia' stati caricati
// su Supabase Storage), verifica l'integrita', salva la prenotazione e invia:
//  - mail di conferma al cliente (senza allegati)
//  - notifica alla segreteria con link all'area riservata
// ============================================================

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET       = process.env.SUPABASE_BUCKET || 'documenti-corsi';

const BREVO_API_KEY   = process.env.BREVO_API_KEY;
const MITTENTE_EMAIL  = process.env.MITTENTE_EMAIL;
const MITTENTE_NOME   = process.env.MITTENTE_NOME || 'Autoscuole Gasparella';
const SEGRETERIA_EMAIL = process.env.SEGRETERIA_EMAIL;
const SITE_URL        = process.env.SITE_URL || '';

const CAMPI_BASE = ['cf_fronte', 'cf_retro', 'ci_fronte', 'ci_retro', 'pat_fronte', 'pat_retro'];
const CAMPI_PDS  = ['pds_fronte', 'pds_retro'];

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function headers() {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': SITE_URL || '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };
}

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function inviaMail(payload) {
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': BREVO_API_KEY, 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error('Brevo ' + res.status + ': ' + t);
  }
  return true;
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

  // ---- Validazioni ----
  if (b.consenso_privacy !== true) {
    return { statusCode: 400, headers: headers(), body: JSON.stringify({ error: 'Consenso privacy obbligatorio' }) };
  }
  if (!UUID_RE.test(b.bookingId || '')) {
    return { statusCode: 400, headers: headers(), body: JSON.stringify({ error: 'bookingId non valido' }) };
  }
  const richiestiTesto = ['corso', 'nome', 'cognome', 'telefono', 'email', 'codice_fiscale', 'n_carta_identita', 'n_patente'];
  for (const c of richiestiTesto) {
    if (!b[c] || String(b[c]).trim() === '') {
      return { statusCode: 400, headers: headers(), body: JSON.stringify({ error: 'Campo obbligatorio mancante: ' + c }) };
    }
  }
  const extraUe = b.extra_ue === true;
  const isVisita = b.tipo === 'visita';
  if (extraUe && (!b.n_permesso || String(b.n_permesso).trim() === '')) {
    return { statusCode: 400, headers: headers(), body: JSON.stringify({ error: 'Numero permesso di soggiorno obbligatorio' }) };
  }

  const documenti = (b.documenti && typeof b.documenti === 'object') ? b.documenti : {};
  let campiRichiesti = extraUe ? CAMPI_BASE.concat(CAMPI_PDS) : CAMPI_BASE.slice();
  if (isVisita) campiRichiesti = campiRichiesti.concat(['foto', 'firma']); // fototessera + firma obbligatorie per il rinnovo

  // Ogni path deve appartenere alla cartella del bookingId (anti-manomissione)
  for (const campo of campiRichiesti) {
    const p = documenti[campo];
    if (!p || typeof p !== 'string' || p.indexOf(b.bookingId + '/') !== 0) {
      return { statusCode: 400, headers: headers(), body: JSON.stringify({ error: 'Documento mancante o non valido: ' + campo }) };
    }
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

  // Verifica che i file siano stati caricati davvero
  try {
    const { data: lista, error } = await supabase.storage.from(BUCKET).list(b.bookingId);
    if (error) throw error;
    const nomiPresenti = (lista || []).map(function (f) { return f.name; });
    for (const campo of campiRichiesti) {
      const nomeFile = documenti[campo].split('/').pop();
      if (nomiPresenti.indexOf(nomeFile) === -1) {
        return { statusCode: 400, headers: headers(), body: JSON.stringify({ error: 'File non caricato: ' + campo }) };
      }
    }
  } catch (e) {
    return { statusCode: 500, headers: headers(), body: JSON.stringify({ error: 'Verifica documenti fallita: ' + (e.message || e) }) };
  }

  // ---- Salvataggio prenotazione ----
  const record = {
    id: b.bookingId,
    corso: String(b.corso).trim(),
    nome: String(b.nome).trim(),
    cognome: String(b.cognome).trim(),
    telefono: String(b.telefono).trim(),
    email: String(b.email).trim(),
    codice_fiscale: String(b.codice_fiscale).trim().toUpperCase(),
    n_carta_identita: String(b.n_carta_identita).trim(),
    n_patente: String(b.n_patente).trim(),
    extra_ue: extraUe,
    n_permesso: extraUe ? String(b.n_permesso).trim() : null,
    sede: b.sede ? String(b.sede).trim() : null,
    residenza: b.residenza ? String(b.residenza).trim() : null,
    documenti: documenti
  };

  try {
    const { error } = await supabase.from('prenotazioni').insert(record);
    if (error) throw error;
  } catch (e) {
    return { statusCode: 500, headers: headers(), body: JSON.stringify({ error: 'Salvataggio fallito: ' + (e.message || e) }) };
  }

  // ---- Email ----
  let emailWarning = null;
  if (BREVO_API_KEY && MITTENTE_EMAIL) {
    // 1) Conferma al cliente (senza documenti)
    try {
      await inviaMail({
        sender: { name: MITTENTE_NOME, email: MITTENTE_EMAIL },
        to: [{ email: record.email, name: record.nome + ' ' + record.cognome }],
        subject: isVisita
          ? 'Conferma prenotazione visita medica - Autoscuole Gasparella'
          : 'Conferma prenotazione corso - Autoscuole Gasparella',
        htmlContent:
          '<div style="font-family:Arial,sans-serif;color:#2d3236;line-height:1.6">' +
          '<h2 style="color:#1280c2">Prenotazione ricevuta</h2>' +
          '<p>Ciao ' + esc(record.nome) + ',</p>' +
          (isVisita
            ? '<p>sei stato prenotato per la <b>visita medica di rinnovo</b>:</p>' +
              '<p style="background:#f2f4f7;padding:12px 16px;border-radius:8px"><b>' + esc(record.corso) + '</b></p>' +
              '<p>Ti chiediamo di <b>presentarti almeno 5 minuti prima</b> dell’orario indicato.</p>' +
              '<p>Il <b>pagamento si effettua in ufficio</b> il giorno della visita. Sono inoltre previsti <b>7,50 &euro; in contanti</b> per la spedizione della patente.</p>' +
              '<p>I documenti che hai allegato sono stati ricevuti correttamente. La segreteria ti contattera’ se necessario. Per modifiche puoi rispondere a questa email o chiamarci.</p>'
            : '<p>abbiamo ricevuto la tua richiesta di iscrizione al corso:</p>' +
              '<p style="background:#f2f4f7;padding:12px 16px;border-radius:8px"><b>' + esc(record.corso) + '</b>' +
              (record.sede ? '<br>Sede preferita: ' + esc(record.sede) : '') + '</p>' +
              '<p>I documenti che hai allegato sono stati ricevuti correttamente. ' +
              'La segreteria ti contattera’ a breve per confermare il posto e gli ultimi dettagli.</p>' +
              '<p>Per qualsiasi necessita’ puoi rispondere a questa email o chiamarci.</p>') +
          '<p style="margin-top:24px;color:#888;font-size:13px">Autoscuole Gasparella Vicenza</p>' +
          '</div>'
      });
    } catch (e) {
      emailWarning = 'Prenotazione salvata, ma la mail di conferma non e’ partita: ' + (e.message || e);
    }

    // 2) Notifica alla segreteria (link all'area riservata, niente allegati)
    if (SEGRETERIA_EMAIL) {
      try {
        await inviaMail({
          sender: { name: MITTENTE_NOME, email: MITTENTE_EMAIL },
          to: [{ email: SEGRETERIA_EMAIL }],
          subject: (isVisita ? 'NUOVA prenotazione VISITA MEDICA: ' : 'NUOVA prenotazione corso: ') + record.nome + ' ' + record.cognome,
          htmlContent:
            '<div style="font-family:Arial,sans-serif;color:#2d3236;line-height:1.6">' +
            '<h2 style="color:#1280c2">' + (isVisita ? 'Nuova prenotazione visita medica' : 'Nuova prenotazione corso') + '</h2>' +
            '<table cellpadding="6" style="border-collapse:collapse">' +
            '<tr><td><b>' + (isVisita ? 'Visita' : 'Corso') + '</b></td><td>' + esc(record.corso) + '</td></tr>' +
            '<tr><td><b>Sede</b></td><td>' + esc(record.sede || '-') + '</td></tr>' +
            '<tr><td><b>Nome</b></td><td>' + esc(record.nome + ' ' + record.cognome) + '</td></tr>' +
            '<tr><td><b>Telefono</b></td><td>' + esc(record.telefono) + '</td></tr>' +
            '<tr><td><b>Email</b></td><td>' + esc(record.email) + '</td></tr>' +
            '<tr><td><b>Cod. fiscale</b></td><td>' + esc(record.codice_fiscale) + '</td></tr>' +
            '<tr><td><b>N. carta id.</b></td><td>' + esc(record.n_carta_identita) + '</td></tr>' +
            '<tr><td><b>N. patente</b></td><td>' + esc(record.n_patente) + '</td></tr>' +
            '<tr><td><b>Residenza attuale</b></td><td>' + esc(record.residenza || '-') + '</td></tr>' +
            (record.extra_ue ? '<tr><td><b>Permesso soggiorno</b></td><td>' + esc(record.n_permesso) + '</td></tr>' : '') +
            '</table>' +
            '<p style="margin-top:16px">I documenti allegati sono nell’area riservata:</p>' +
            '<p><a href="' + esc(SITE_URL) + '/segreteria.html" ' +
            'style="background:#1280c2;color:#fff;padding:10px 18px;border-radius:999px;text-decoration:none">Apri area segreteria</a></p>' +
            '<p style="color:#888;font-size:12px">Rif. prenotazione: ' + esc(record.id) + '</p>' +
            '</div>'
        });
      } catch (e) {
        // Notifica interna non bloccante
      }
    }
  } else {
    emailWarning = 'Prenotazione salvata. Invio email non configurato (manca Brevo).';
  }

  return { statusCode: 200, headers: headers(), body: JSON.stringify({ ok: true, id: record.id, warning: emailWarning }) };
};
