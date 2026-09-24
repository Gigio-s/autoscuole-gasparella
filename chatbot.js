/* =============================================================
   Assistente Autoscuole Gasparella - chatbot guidato a regole
   -------------------------------------------------------------
   Nessun backend, nessuna AI, nessun dato inviato da nessuna parte.
   Risponde SOLO con i testi qui sotto: non può inventare.

   PER AGGIORNARE I CONTENUTI: modifica solo l'oggetto NODI.
   Ogni nodo = { testo, opzioni: [ { label, vai } | { label, link } | { label, href } ] }
     vai   -> passa a un altro nodo della conversazione
     link  -> apre una pagina del sito
     href  -> apre un link esterno (tel:, wa.me, ...)
   ============================================================= */
(function () {
  'use strict';

  var TEL = '3664303206';
  var WA  = 'https://wa.me/393664303206?text=Ciao%2C%20vorrei%20informazioni%20sulle%20Autoscuole%20Gasparella';
  // Prefisso per far funzionare i link anche dalle pagine in sottocartella (es. legale/)
  var BASE = /\/legale\//.test(location.pathname) ? '../' : '';

  var NODI = {

    start: {
      testo: 'Ciao! Sono l\'assistente delle Autoscuole Gasparella. Su cosa ti serve una mano?',
      opzioni: [
        { label: 'Rinnovare la patente',        vai: 'rinnovo' },
        { label: 'Prendere la patente',         vai: 'patenti' },
        { label: 'Corsi CQC',                   vai: 'cqc' },
        { label: 'Recupero punti',              vai: 'punti' },
        { label: 'Patente smarrita o rovinata', vai: 'duplicati' },
        { label: 'Sedi e contatti',             vai: 'sedi' }
      ]
    },

    /* ---------- RINNOVO ---------- */
    rinnovo: {
      testo: 'Per il rinnovo la visita medica si fa direttamente in una nostra sede. Contattaci per prenotare giorno e orario.',
      opzioni: [
        { label: 'Cosa devo portare?',        vai: 'rinnovo_doc' },
        { label: 'Ogni quanto si rinnova?',   vai: 'rinnovo_scad' },
        { label: 'Torna all\'inizio',         vai: 'start' }
      ]
    },
    rinnovo_doc: {
      testo: 'Servono la patente in scadenza, un documento d\'identità valido, la tessera sanitaria e una fototessera recente e senza occhiali. La visita medica si fa direttamente in sede.',
      opzioni: [
        { label: 'Ho un caso particolare',    vai: 'umano' },
        { label: 'Torna all\'inizio',         vai: 'start' }
      ]
    },
    rinnovo_scad: {
      testo: 'Dipende dalla tua età e dalla categoria della patente. Nella pagina dedicata trovi la tabella completa delle scadenze.',
      opzioni: [
        { label: 'Vedi la tabella scadenze', link: 'rinnovo-patente.html' },
        { label: 'Torna all\'inizio',        vai: 'start' }
      ]
    },

    /* ---------- PATENTI ---------- */
    patenti: {
      testo: 'Quale categoria ti interessa?',
      opzioni: [
        { label: 'AM - ciclomotore',  link: 'patente-am.html' },
        { label: 'A - moto',          link: 'patente-a.html' },
        { label: 'B - auto',          link: 'patente-b.html' },
        { label: 'C - camion',        link: 'patente-c.html' },
        { label: 'D - autobus',       link: 'patente-d.html' },
        { label: 'Non so quale mi serve', vai: 'umano' },
        { label: 'Torna all\'inizio', vai: 'start' }
      ]
    },

    /* ---------- CQC ---------- */
    cqc: {
      testo: 'La CQC è la qualificazione per chi guida per lavoro. Cosa ti serve?',
      opzioni: [
        { label: 'CQC Merci',            link: 'cqc-merci.html' },
        { label: 'CQC Persone',          link: 'cqc-persone.html' },
        { label: 'Rinnovare la CQC',     link: 'rinnovo-cqc.html' },
        { label: 'Quando partono i corsi', link: 'corsi-cqc.html#calendario' },
        { label: 'Torna all\'inizio',    vai: 'start' }
      ]
    },

    /* ---------- PUNTI ---------- */
    punti: {
      testo: 'Organizziamo i corsi per il recupero dei punti patente. Le date dei prossimi corsi sono nel calendario.',
      opzioni: [
        { label: 'Come funziona',        link: 'recupero-punti.html' },
        { label: 'Date dei prossimi corsi', link: 'corsi-cqc.html#calendario' },
        { label: 'Torna all\'inizio',    vai: 'start' }
      ]
    },

    /* ---------- DUPLICATI ---------- */
    duplicati: {
      testo: 'Ci occupiamo noi della pratica. Qual è il tuo caso?',
      opzioni: [
        { label: 'Smarrita o rubata',   link: 'patente-rubata-smarrita.html' },
        { label: 'Rovinata o illeggibile', link: 'patente-deteriorata.html' },
        { label: 'Mi serve per l\'estero', link: 'patente-internazionale.html' },
        { label: 'Torna all\'inizio',   vai: 'start' }
      ]
    },

    /* ---------- SEDI ---------- */
    sedi: {
      testo: 'Siamo in 8 sedi in provincia di Vicenza: Sossano, Barbarano Mossano, Montegalda, Costabissara, Isola Vicentina, Caldogno, Marano Vicentino e Villaverla.',
      opzioni: [
        { label: 'Vedi tutte le sedi',   link: 'le-nostre-autoscuole.html' },
        { label: 'Trova la più vicina',  link: 'index.html#sedi' },
        { label: 'Chiamaci',             href: 'tel:' + TEL },
        { label: 'Torna all\'inizio',    vai: 'start' }
      ]
    },

    /* ---------- PASSAGGIO A PERSONA ---------- */
    umano: {
      testo: 'Su questo ti risponde meglio una persona: scrivici su WhatsApp o chiamaci, ti seguiamo noi.',
      opzioni: [
        { label: 'Scrivici su WhatsApp', href: WA },
        { label: 'Chiama 366 4303206', href: 'tel:' + TEL },
        { label: 'Torna all\'inizio',   vai: 'start' }
      ]
    }
  };

  /* ============================ CSS ============================ */
  var css = ''
    + '.gb-fab{position:fixed;right:22px;bottom:132px;width:56px;height:56px;border-radius:50%;background:#1280c2;'
    + 'border:none;cursor:pointer;box-shadow:0 6px 20px rgba(0,0,0,.28);z-index:998;display:flex;align-items:center;'
    + 'justify-content:center;transition:transform .2s ease}'
    + '.gb-fab:hover{transform:scale(1.08)}'
    + '.gb-fab svg{width:28px;height:28px}'
    + '.gb-badge{position:absolute;top:-2px;right:-2px;width:14px;height:14px;border-radius:50%;background:#fbbf24;border:2px solid #fff}'
    + '.gb-panel{position:fixed;right:22px;bottom:132px;width:340px;max-width:calc(100vw - 32px);height:480px;'
    + 'max-height:calc(100vh - 130px);background:#fff;border-radius:16px;box-shadow:0 20px 50px rgba(0,0,0,.28);'
    + 'z-index:999;display:none;flex-direction:column;overflow:hidden;font-family:Montserrat,system-ui,sans-serif}'
    + '.gb-panel.open{display:flex}'
    + '.gb-head{background:#1280c2;color:#fff;padding:.9rem 1rem;display:flex;align-items:center;gap:.6rem;flex-shrink:0}'
    + '.gb-head b{font-size:.9rem;font-weight:700;display:block;line-height:1.2}'
    + '.gb-head small{font-size:.7rem;opacity:.85}'
    + '.gb-close{margin-left:auto;background:none;border:none;color:#fff;font-size:1.4rem;line-height:1;cursor:pointer;padding:0 .2rem}'
    + '.gb-body{flex:1;overflow-y:auto;padding:1rem;background:#f2f4f7}'
    + '.gb-msg{background:#fff;border-radius:12px 12px 12px 3px;padding:.75rem .9rem;font-size:.85rem;line-height:1.55;'
    + 'color:#2d3236;margin-bottom:.7rem;box-shadow:0 2px 8px rgba(0,0,0,.06)}'
    + '.gb-msg.user{background:#1280c2;color:#fff;border-radius:12px 12px 3px 12px;margin-left:auto;max-width:80%;text-align:right}'
    + '.gb-opts{display:flex;flex-direction:column;gap:.45rem;padding:.2rem 1rem 1rem;background:#f2f4f7;flex-shrink:0;'
    + 'max-height:50%;overflow-y:auto}'
    + '.gb-opt{background:#fff;border:1.5px solid #d8dde3;border-radius:999px;padding:.55rem .95rem;font-family:inherit;'
    + 'font-size:.8rem;font-weight:600;color:#0e6aa3;cursor:pointer;text-align:left;transition:border-color .2s,background .2s}'
    + '.gb-opt:hover{border-color:#1280c2;background:#eaf4fb}'
    + '.gb-opt.go{background:#1280c2;color:#fff;border-color:#1280c2}'
    + '.gb-opt.go:hover{background:#0e6aa3}'
    + '.gb-foot{font-size:.62rem;color:#8b9199;text-align:center;padding:.5rem .8rem;background:#fff;flex-shrink:0;line-height:1.4}'
    + '@media(max-width:600px){.gb-fab{right:14px;bottom:112px;width:50px;height:50px}'
    + '.gb-panel{right:8px;left:8px;width:auto;bottom:112px;height:70vh}'
    + '.wa-float{bottom:52px !important}}'
    + '@media(min-width:601px){.wa-float{bottom:62px !important}}';

  var st = document.createElement('style');
  st.textContent = css;
  document.head.appendChild(st);

  /* ============================ DOM ============================ */
  var fab = document.createElement('button');
  fab.className = 'gb-fab';
  fab.setAttribute('aria-label', 'Apri l\'assistente');
  fab.innerHTML = '<svg viewBox="0 0 24 24" fill="none"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg><span class="gb-badge"></span>';

  var panel = document.createElement('div');
  panel.className = 'gb-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'Assistente Autoscuole Gasparella');
  panel.innerHTML =
      '<div class="gb-head">'
    +   '<div><b>Assistente Gasparella</b><small>Risposte rapide, sempre attivo</small></div>'
    +   '<button class="gb-close" aria-label="Chiudi">&times;</button>'
    + '</div>'
    + '<div class="gb-body" id="gbBody"></div>'
    + '<div class="gb-opts" id="gbOpts"></div>'
    + '<div class="gb-foot">Risposte indicative. Per casi particolari contattaci: le informazioni ufficiali le dà la segreteria.</div>';

  document.body.appendChild(fab);
  document.body.appendChild(panel);

  var body  = panel.querySelector('#gbBody');
  var opts  = panel.querySelector('#gbOpts');
  var close = panel.querySelector('.gb-close');
  var avviato = false;

  function scrollGiu() { body.scrollTop = body.scrollHeight; }

  function bot(testo) {
    var d = document.createElement('div');
    d.className = 'gb-msg';
    d.textContent = testo;
    body.appendChild(d);
    scrollGiu();
  }
  function utente(testo) {
    var d = document.createElement('div');
    d.className = 'gb-msg user';
    d.textContent = testo;
    body.appendChild(d);
    scrollGiu();
  }

  function mostra(id) {
    var nodo = NODI[id];
    if (!nodo) return;
    bot(nodo.testo);
    opts.innerHTML = '';
    nodo.opzioni.forEach(function (o) {
      var b = document.createElement('button');
      b.className = 'gb-opt' + (o.link || o.href ? ' go' : '');
      b.textContent = o.label;
      b.addEventListener('click', function () {
        utente(o.label);
        if (o.link) { window.location.href = BASE + o.link; return; }
        if (o.href) { window.open(o.href, '_blank', 'noopener'); return; }
        opts.innerHTML = '';
        setTimeout(function () { mostra(o.vai); }, 260);
      });
      opts.appendChild(b);
    });
  }

  function apri() {
    panel.classList.add('open');
    fab.style.display = 'none';
    if (!avviato) { avviato = true; mostra('start'); }
  }
  function chiudi() {
    panel.classList.remove('open');
    fab.style.display = 'flex';
  }

  fab.addEventListener('click', apri);
  close.addEventListener('click', chiudi);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && panel.classList.contains('open')) chiudi();
  });
})();

/* Pulsante header "Prenota visita": testo lungo a scorrimento dentro la casella (dimensione invariata) */
(function () {
  try {
    var FULL = 'Prenota visita medica rinnovo patente';
    var m = document.querySelector('.mobile-menu a[href*="prenota-visita"]');
    if (m) m.textContent = FULL;
    var a = null, links = document.querySelectorAll('nav a[href*="prenota-visita"]');
    for (var i = 0; i < links.length; i++) { if (links[i].closest('.nav-links')) { a = links[i]; break; } }
    if (!a) return;
    var st = document.createElement('style');
    st.textContent =
      '.pv-marq{width:112px;overflow:hidden;box-sizing:border-box;display:inline-block;vertical-align:middle;text-align:left;}' +
      '.pv-marq .pv-track{display:inline-block;white-space:nowrap;animation:pvsc 11s linear infinite;}' +
      '.pv-marq:hover .pv-track{animation-play-state:paused;}' +
      '.pv-marq .pv-track b{font-weight:800;padding-right:30px;}' +
      '@keyframes pvsc{from{transform:translateX(0)}to{transform:translateX(-50%)}}';
    document.head.appendChild(st);
    a.classList.add('pv-marq');
    a.setAttribute('title', FULL);
    a.innerHTML = '<span class="pv-track"><b>' + FULL + '</b><b>' + FULL + '</b></span>';
  } catch (e) {}
})();
