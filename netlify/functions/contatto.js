// ============================================================
// Netlify Function: contatto
// Form contatti della home (index.html): solo email, nessun file, nessun DB.
// Invia notifica alla segreteria + conferma di ricezione al richiedente.
// ============================================================

const BREVO_API_KEY   = process.env.BREVO_API_KEY;
const MITTENTE_EMAIL  = process.env.MITTENTE_EMAIL;
const MITTENTE_NOME   = process.env.MITTENTE_NOME || 'Autoscuole Gasparella';
const SEGRETERIA_EMAIL = process.env.SEGRETERIA_EMAIL;

function headers() {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };
}

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

async function inviaMail(payload) {
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': BREVO_API_KEY, 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) { const t = await res.text(); throw new Error('Brevo ' + res.status + ': ' + t); }
  return true;
}

exports.handler = async function (event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: headers(), body: '' };
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: headers(), body: JSON.stringify({ error: 'Metodo non consentito' }) };
  }
  if (!BREVO_API_KEY || !MITTENTE_EMAIL) {
    return { statusCode: 500, headers: headers(), body: JSON.stringify({ error: 'Invio email non configurato' }) };
  }

  let b;
  try { b = JSON.parse(event.body || '{}'); }
  catch (e) { return { statusCode: 400, headers: headers(), body: JSON.stringify({ error: 'JSON non valido' }) }; }

  if (b.consenso_privacy !== true) {
    return { statusCode: 400, headers: headers(), body: JSON.stringify({ error: 'Consenso privacy obbligatorio' }) };
  }
  for (const c of ['nome', 'cognome', 'patente', 'email', 'sede']) {
    if (!b[c] || String(b[c]).trim() === '') {
      return { statusCode: 400, headers: headers(), body: JSON.stringify({ error: 'Campo obbligatorio mancante: ' + c }) };
    }
  }

  const nome = String(b.nome).trim(), cognome = String(b.cognome).trim();
  const email = String(b.email).trim(), tel = b.telefono ? String(b.telefono).trim() : '';
  const patente = String(b.patente).trim(), sede = String(b.sede).trim();

  // 1) Notifica alla segreteria
  if (SEGRETERIA_EMAIL) {
    try {
      await inviaMail({
        sender: { name: MITTENTE_NOME, email: MITTENTE_EMAIL },
        to: [{ email: SEGRETERIA_EMAIL }],
        replyTo: { email: email, name: nome + ' ' + cognome },
        subject: 'Nuova richiesta dal sito: ' + nome + ' ' + cognome + ' (' + patente + ')',
        htmlContent:
          '<div style="font-family:Arial,sans-serif;color:#2d3236;line-height:1.6">' +
          '<h2 style="color:#1280c2">Nuova richiesta di contatto</h2>' +
          '<table cellpadding="6" style="border-collapse:collapse">' +
          '<tr><td><b>Nome</b></td><td>' + esc(nome + ' ' + cognome) + '</td></tr>' +
          '<tr><td><b>Patente/Corso</b></td><td>' + esc(patente) + '</td></tr>' +
          '<tr><td><b>Sede</b></td><td>' + esc(sede) + '</td></tr>' +
          '<tr><td><b>Telefono</b></td><td>' + esc(tel || '-') + '</td></tr>' +
          '<tr><td><b>Email</b></td><td>' + esc(email) + '</td></tr>' +
          '</table></div>'
      });
    } catch (e) {
      return { statusCode: 502, headers: headers(), body: JSON.stringify({ error: 'Invio notifica fallito: ' + (e.message || e) }) };
    }
  }

  // 2) Conferma di ricezione al richiedente (non bloccante)
  try {
    await inviaMail({
      sender: { name: MITTENTE_NOME, email: MITTENTE_EMAIL },
      to: [{ email: email, name: nome + ' ' + cognome }],
      subject: 'Abbiamo ricevuto la tua richiesta - Autoscuole Gasparella',
      htmlContent:
        '<div style="font-family:Arial,sans-serif;color:#2d3236;line-height:1.6">' +
        '<h2 style="color:#1280c2">Grazie ' + esc(nome) + '!</h2>' +
        '<p>Abbiamo ricevuto la tua richiesta di informazioni' +
        (patente ? ' per <b>' + esc(patente) + '</b>' : '') +
        (sede ? ' presso <b>' + esc(sede) + '</b>' : '') + '.</p>' +
        '<p>Ti ricontatteremo il prima possibile.</p>' +
        '<p style="margin-top:24px;color:#888;font-size:13px">Autoscuole Gasparella Vicenza</p>' +
        '</div>'
    });
  } catch (e) { /* la conferma al cliente non blocca la richiesta */ }

  return { statusCode: 200, headers: headers(), body: JSON.stringify({ ok: true }) };
};
