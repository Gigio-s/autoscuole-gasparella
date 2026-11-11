/* ============================================================
   Date delle visite mediche (rinnovo patente)
   Usato da prenota-visita.html (sito) e da gestionale-sito.html.

   - VISITE_SEDI: calendario fisso settimanale di ogni sede
   - Dal gestionale si possono togliere date, aggiungerne di nuove
     o spostarle (cambio giorno/orario). Le modifiche sono salvate
     nella tabella corsi_stato (funzione corsi-stato) con chiavi:
        VISITA_NO|<sede>|<AAAA-MM-GG>|<HH:MM>  -> data fissa tolta
        VISITA_SI|<sede>|<AAAA-MM-GG>|<HH:MM>  -> data aggiunta
   ============================================================ */
(function (w) {
  'use strict';

  // dow: 0=Dom ... 6=Sab
  var VISITE_SEDI = [
    { nome:'Sossano',          giorni:[{dow:3, ora:'18:00'},{dow:5, ora:'18:00'}] },
    { nome:'Costabissara',     giorni:[{dow:3, ora:'17:00'}] },
    { nome:'Caldogno',         giorni:[{dow:3, ora:'16:30'}] },
    { nome:'Isola Vicentina',  giorni:[{dow:4, ora:'18:00'}] },
    { nome:'Barbarano Mossano',giorni:[{dow:5, ora:'15:30'}] },
    { nome:'Montegalda',       giorni:[{dow:5, ora:'15:00'},{dow:6, ora:'08:30'}] },
    { nome:'Marano Vicentino', giorni:[{dow:4, ora:'15:00', quindicinale:true, anchor:'2026-10-01'}] }
  ];

  var PRE_NO = 'VISITA_NO|', PRE_SI = 'VISITA_SI|';

  function pad(n){ return (n < 10 ? '0' : '') + n; }
  function iso(d){ return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function fromIso(s){ var p = s.split('-'); return new Date(parseInt(p[0],10), parseInt(p[1],10)-1, parseInt(p[2],10)); }
  function chiave(pre, sede, isoData, ora){ return pre + sede + '|' + isoData + '|' + ora; }

  // Periodo visibile: mese in corso + i 2 successivi (es. a novembre: nov, dic, gen;
  // dal 1 dicembre: dic, gen, feb). Si aggiorna da solo ogni mese.
  var MESI_VISIBILI = 3;
  function fineFinestra(){
    var oggi = new Date();
    return new Date(oggi.getFullYear(), oggi.getMonth() + MESI_VISIBILI, 0); // ultimo giorno del 3o mese
  }

  // Date fisse del calendario settimanale, da domani in avanti, fino a "fine"
  function dateFisse(sede, fine){
    var oggi = new Date(); oggi.setHours(0,0,0,0);
    var out = [];
    sede.giorni.forEach(function (g) {
      var step = g.quindicinale ? 14 : 7;
      var d;
      if (g.anchor) {
        d = fromIso(g.anchor);
        while (d < oggi) { d.setDate(d.getDate() + step); }
      } else {
        d = new Date(oggi);
        var diff = (g.dow - d.getDay() + 7) % 7;
        if (diff === 0) diff = 7; // sempre a partire dalla prossima occorrenza
        d.setDate(d.getDate() + diff);
      }
      for (var dd = new Date(d); dd <= fine; dd.setDate(dd.getDate() + step)) {
        out.push({ when: new Date(dd), iso: iso(dd), ora: g.ora, tipo: 'fissa' });
      }
    });
    return out;
  }

  // Date aggiunte dal gestionale per una sede (da domani in avanti, fino a "fine")
  function dateAggiunte(sede, stati, fine){
    var oggi = new Date(); oggi.setHours(0,0,0,0);
    var pre = PRE_SI + sede.nome + '|';
    var out = [];
    Object.keys(stati || {}).forEach(function (k) {
      if (stati[k] !== true || k.indexOf(pre) !== 0) return;
      var parti = k.slice(pre.length).split('|'); // [iso, ora]
      if (parti.length !== 2 || !/^\d{4}-\d{2}-\d{2}$/.test(parti[0])) return;
      var d = fromIso(parti[0]);
      if (d <= oggi || d > fine) return;
      out.push({ when: d, iso: parti[0], ora: parti[1], tipo: 'aggiunta' });
    });
    return out;
  }

  // Elenco completo per una sede nel periodo visibile, ordinato. Ogni voce ha "tolta" true/false.
  function elencoDate(sede, stati){
    stati = stati || {};
    var fine = fineFinestra();
    var fisse = dateFisse(sede, fine).map(function (x) {
      x.tolta = stati[chiave(PRE_NO, sede.nome, x.iso, x.ora)] === true;
      return x;
    });
    var tutte = fisse.concat(dateAggiunte(sede, stati, fine).map(function (x) { x.tolta = false; return x; }));
    tutte.sort(function (a, b) { return (a.iso + a.ora) < (b.iso + b.ora) ? -1 : 1; });
    return tutte;
  }

  w.VISITE = {
    SEDI: VISITE_SEDI,
    PRE_NO: PRE_NO,
    PRE_SI: PRE_SI,
    chiave: chiave,
    iso: iso,
    fromIso: fromIso,
    fineFinestra: fineFinestra,
    elencoDate: elencoDate
  };
})(window);
