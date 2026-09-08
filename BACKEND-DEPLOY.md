# Backend prenotazioni corsi - Guida al deploy

Backend serverless per il form "Richiesta di iscrizione" di `corsi-cqc.html`.
Quando un utente prenota: i documenti (scan fronte/retro) vengono caricati in uno
storage privato, la prenotazione viene salvata su database e partono due email
(conferma al cliente + notifica alla segreteria). La segreteria vede tutto da
un'area riservata protetta da password.

## Come funziona (in breve)

1. Il browser chiede alla funzione `upload-url` degli URL firmati.
2. Il browser carica i file **direttamente** su Supabase Storage (privato).
3. La funzione `prenota` salva la prenotazione e invia le email via Brevo.
4. La segreteria apre `segreteria.html`, inserisce la password e scarica i
   documenti tramite link firmati a scadenza (1 ora).

Tutto gratuito (piani free) e con dati in **UE**.

## Componenti

| Pezzo | Servizio | Piano | Ruolo |
|------|----------|-------|-------|
| Hosting sito + funzioni | **Netlify** | Free | Sito statico + Netlify Functions |
| Storage documenti + database | **Supabase** (regione Frankfurt) | Free | File privati + tabella prenotazioni |
| Invio email | **Brevo** | Free (~300 mail/giorno) | Conferma cliente + notifica segreteria |

---

## Passo 1 - Repository su GitHub

Carica l'intera cartella `sito definitivo` su un repo GitHub. I file backend
(`netlify.toml`, `package.json`, cartella `netlify/`) sono gia' inclusi.
Il file `.env` NON va mai committato (e' gia' in `.gitignore`).

## Passo 2 - Supabase (storage + database)

1. Crea un account su supabase.com e un nuovo progetto.
   **Region: Central EU (Frankfurt)** - importante per il GDPR.
2. Vai su **SQL Editor > New query**, incolla il contenuto di
   `supabase-schema.sql` e premi **Run**. Crea la tabella `prenotazioni` e il
   bucket privato `documenti-corsi`.
3. Vai su **Project Settings > API** e copia:
   - **Project URL** -> variabile `SUPABASE_URL`
   - chiave **service_role** (sezione "Project API keys") -> `SUPABASE_SERVICE_ROLE_KEY`
     (E' SEGRETA: non va mai nel sito ne' nel repo, solo nelle env di Netlify.)

## Passo 3 - Brevo (email)

1. Crea un account su brevo.com.
2. **Senders, Domains & Dedicated IPs**: verifica un mittente
   (es. `noreply@autoscuolegasparellavicenza.it`). Per una consegna migliore,
   quando il dominio sara' operativo, autentica il dominio (SPF/DKIM).
3. **SMTP & API > API Keys**: crea una API key -> `BREVO_API_KEY`.

## Passo 4 - Netlify (deploy)

1. Su netlify.com: **Add new site > Import an existing project** e collega il
   repo GitHub. Netlify legge `netlify.toml` da solo (publish = root,
   functions = `netlify/functions`).
2. **Site settings > Environment variables**: inserisci tutte le variabili
   elencate qui sotto (vedi `.env.example`).
3. Fai **Deploy**. Ad ogni push su GitHub, Netlify ripubblica in automatico.

### Variabili d'ambiente da impostare su Netlify

| Variabile | Valore |
|-----------|--------|
| `SUPABASE_URL` | Project URL di Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | chiave service_role (segreta) |
| `SUPABASE_BUCKET` | `documenti-corsi` |
| `BREVO_API_KEY` | API key Brevo |
| `MITTENTE_EMAIL` | email mittente verificata su Brevo |
| `MITTENTE_NOME` | `Autoscuole Gasparella` |
| `SEGRETERIA_EMAIL` | casella che riceve le notifiche |
| `SEGRETERIA_PASSWORD` | password lunga per l'area segreteria |
| `SITE_URL` | URL pubblico del sito |

## Passo 5 - Dominio

Il dominio `autoscuolegasparellavicenza.it` (gestito su SiteGround) va puntato a
Netlify: in Netlify **Domain settings > Add a domain**, poi imposta i record DNS
indicati da Netlify nel pannello SiteGround (di solito un record `CNAME`/`A`).
Netlify fornisce HTTPS gratis (Let's Encrypt).

## Passo 6 - Test

1. Apri `corsi-cqc.html`, scegli un corso, compila il form con file di prova
   (PDF/JPG/PNG) e invia.
2. Controlla: arrivo mail al cliente, mail alla segreteria, riga su Supabase
   (Table editor > prenotazioni), file nel bucket `documenti-corsi`.
3. Apri `/segreteria.html`, inserisci la password, verifica lista e download.

> Nota: su GitHub Pages o in anteprima locale le funzioni non esistono, quindi
> il form mostra solo la conferma "demo" senza salvare nulla. Il flusso reale
> gira solo su Netlify.

---

## GDPR - checklist (documenti d'identita' = dati personali)

- [ ] **Regione UE**: progetto Supabase su Frankfurt. Brevo e Netlify: verificare
      opzioni/residenza dati UE.
- [ ] **DPA (accordo sul trattamento)** firmato/accettato con Supabase, Brevo,
      Netlify (sono responsabili esterni del trattamento).
- [ ] **Informativa privacy** aggiornata: indica che si raccolgono scansioni di
      documenti, perche', per quanto tempo, e con quali fornitori. (Pagina gia'
      presente in `legale/privacy-policy.html` - integrare i fornitori.)
- [ ] **Consenso esplicito**: la checkbox privacy nel form e' obbligatoria. OK.
- [ ] **Minimizzazione**: raccogli solo i documenti realmente necessari.
- [ ] **Retention**: definisci per quanto conservi i documenti (es. 12 mesi) e
      cancella periodicamente (vedi query in `supabase-schema.sql` + rimozione
      file dal bucket).
- [ ] **Cifratura**: in transito (HTTPS, gia' attivo) e a riposo (Supabase cifra
      lo storage).
- [ ] **Diritti dell'interessato**: predisponi una procedura per accesso/cancellazione
      su richiesta.

## Sicurezza - note e limiti (MVP)

- L'area segreteria usa **una sola password condivisa**. E' un MVP. Per
  produzione con dati sensibili conviene passare a **Netlify Identity** o
  **Supabase Auth** (login per utente) ed eventualmente restringere per IP.
- La chiave `service_role` sta solo nelle env di Netlify (server), mai nel
  browser.
- I file non sono mai pubblici: si accede solo con link firmati a scadenza.
- Limite upload: 8 MB per file, formati PDF/PNG/JPG.

## Form contatti (home)

Il **form contatti** della home (`index.html`, `contactForm`) e' gia' agganciato
alla funzione `contatto.js`: invia una notifica alla segreteria (con reply-to al
richiedente) e una conferma di ricezione al cliente. Solo email, nessun file,
nessun dato salvato su database. Usa le stesse variabili Brevo/segreteria gia'
impostate. Fallback: su GitHub/anteprima mostra la conferma demo.

## Estensione futura (facoltativa)

- Aggancio al gestionale prenotazioni quando definito.
