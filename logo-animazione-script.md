# Script animazione logo — Autoscuole Gasparella (3 secondi)

**Formato consigliato:** 1080×1080 (quadrato, social) o 1920×1080 (16:9, sito/YouTube) — stesso script, cambia solo l'inquadratura.
**Frame rate:** 30fps (90 frame totali su 3s) o 60fps (180 frame).
**Sfondo:** blu pieno `#1280C2` (identico al blu del sito/logo, nessun gradiente).
**Colore elementi:** bianco `#FFFFFF` puro.
**Font:** Montserrat — "AUTOSCUOLE" in ExtraBold Italic maiuscolo, spaziato; "Gasparella" in ExtraBold, title case (stessa famiglia già usata su tutto il sito).

---

## Timeline

| Tempo | Durata | Scena |
|---|---|---|
| 0.00s – 0.10s | 0.10s | Frame vuoto, solo sfondo blu. Beat di silenzio prima dell'ingresso. |
| 0.10s – 0.65s | 0.55s | Le due metà del rombo (alto-sinistra / basso-destra) entrano da fuori campo in diagonale opposta, con leggero overshoot elastico, e si incontrano al centro dell'inquadratura. |
| 0.30s – 0.80s | 0.50s | Lo "swoosh" (il tratto curvo che attraversa il rombo) entra da destra con leggero ritardo rispetto alle due metà, e si aggancia sopra il rombo completando il simbolo. |
| 0.82s – 1.07s | 0.25s | Flash bianco morbido (piccolo lampo radiale) nell'istante esatto in cui il simbolo si "chiude" — dà il senso fisico dello scatto/composizione. |
| 1.05s – 1.10s | 0.05s | Micro-pausa: il simbolo è completo e fermo al centro. |
| 1.05s – 1.75s | 0.70s | Il simbolo (ormai un blocco unico) trasla verso sinistra fino alla posizione finale del logo statico, con leggero rimpicciolimento (scale 1.15 → 1.00) per dare profondità. |
| 1.40s – 1.75s | 0.35s | "AUTOSCUOLE" appare in dissolvenza con un piccolo slide dal basso (8px → 0), sopra la posizione dove comparirà "Gasparella". |
| 1.55s – 2.00s | 0.45s | "Gasparella" appare in dissolvenza con slide da destra (20px → 0), leggermente sfalsato rispetto ad "AUTOSCUOLE" per dare gerarchia (prima l'eyebrow, poi il nome). |
| 2.00s – 3.00s | 1.00s | Hold finale: logo completo e fermo, identico al lock-up statico. Punto di taglio per loop o per stacco al video/sito successivo. |

## Note tecniche (easing)

- Ingresso pezzi del simbolo: `cubic-bezier(.16, 1, .3, 1)` — decelerazione con leggero overshoot, sensazione di "incastro".
- Slide laterale del simbolo: `cubic-bezier(.22, 1, .36, 1)` — decelerazione morbida, nessun rimbalzo (deve sembrare stabile, non giocoso).
- Comparsa testo: stesso easing dell'ingresso pezzi, ma senza overshoot (solo fade + piccolo slide).
- Nessun elemento supera mai i bordi di sicurezza (10% di margine su tutti i lati) per restare tagliabile in formati diversi (story, feed, banner sito).

## Suggerimento

Ho preparato anche un'anteprima funzionante (HTML/CSS) di questa sequenza, così puoi vederla girare prima di passarla a un motion designer o rigenerarla in After Effects/Lottie. Il simbolo nell'anteprima è una **ricostruzione approssimata** (rombo + swoosh) perché non ho il file vettoriale originale del marchio — se mi fornisci l'SVG o l'AI/EPS del logo, aggiorno l'anteprima per farla combaciare esattamente col marchio reale.
