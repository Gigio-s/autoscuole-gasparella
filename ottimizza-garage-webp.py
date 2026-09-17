# -*- coding: utf-8 -*-
"""
Ottimizza le immagini del garage (pagina patenti.html):
- ridimensiona a max 1280px sul lato lungo
- converte in WebP (mantiene la trasparenza)
- aggiorna automaticamente i riferimenti dentro patenti.html (.png -> .webp)

Risultato tipico: dai ~55 MB attuali a ~1-2 MB totali, garage molto piu' veloce.
Gli originali .png NON vengono cancellati: restano nella cartella come backup.

USO:
  1. Metti questo file nella cartella "sito definitivo" (accanto a patenti.html).
  2. Serve la libreria Pillow. Se non ce l'hai, da PowerShell:
        pip install Pillow
  3. Doppio clic sul file, oppure:  python ottimizza-garage-webp.py
  4. Controlla il garage in locale, poi fai il push (git add -A ...).
"""

import os
import re
import shutil

MAX_SIDE = 1280        # lato lungo massimo in pixel
QUALITY  = 80          # qualita' WebP (0-100)
FOLDER   = "foto categorie patenti"
HTML     = "patenti.html"
HTML_ENC_FOLDER = "foto%20categorie%20patenti"   # come e' scritto dentro l'HTML

BASE = os.path.dirname(os.path.abspath(__file__))
SRC  = os.path.join(BASE, FOLDER)

try:
    from PIL import Image
except ImportError:
    print("\nManca la libreria Pillow. Installala con:\n    pip install Pillow\n")
    input("Premi Invio per chiudere...")
    raise SystemExit

def kb(n):
    return round(n / 1024)

if not os.path.isdir(SRC):
    print("Cartella non trovata:", SRC)
    input("Premi Invio per chiudere...")
    raise SystemExit

pngs = [f for f in os.listdir(SRC) if f.lower().endswith(".png")]
print("Trovate %d immagini PNG in '%s'\n" % (len(pngs), FOLDER))

converted = []      # nomi (senza estensione) convertiti con successo
tot_before = 0
tot_after  = 0

for name in pngs:
    src_path = os.path.join(SRC, name)
    base_no_ext = os.path.splitext(name)[0]
    webp_path = os.path.join(SRC, base_no_ext + ".webp")
    try:
        before = os.path.getsize(src_path)
        img = Image.open(src_path).convert("RGBA")
        w, h = img.size
        scale = min(1.0, MAX_SIDE / float(max(w, h)))
        if scale < 1.0:
            img = img.resize((max(1, int(w * scale)), max(1, int(h * scale))), Image.LANCZOS)
        img.save(webp_path, "WEBP", quality=QUALITY, method=6)
        after = os.path.getsize(webp_path)
        tot_before += before
        tot_after  += after
        converted.append(base_no_ext)
        print("  OK  %-42s  %5d KB -> %5d KB" % (name, kb(before), kb(after)))
    except Exception as e:
        print("  ERRORE su", name, "->", e)

# --- aggiorna i riferimenti in patenti.html ---
html_path = os.path.join(BASE, HTML)
if converted and os.path.isfile(html_path):
    shutil.copyfile(html_path, html_path + ".bak")   # backup di sicurezza
    with open(html_path, "r", encoding="utf-8") as f:
        html = f.read()
    n_repl = 0
    for base_no_ext in converted:
        old = "%s/%s.png" % (HTML_ENC_FOLDER, base_no_ext)
        new = "%s/%s.webp" % (HTML_ENC_FOLDER, base_no_ext)
        cnt = html.count(old)
        if cnt:
            html = html.replace(old, new)
            n_repl += cnt
    with open(html_path, "w", encoding="utf-8") as f:
        f.write(html)
    print("\npatenti.html aggiornato: %d riferimenti .png -> .webp (backup in patenti.html.bak)" % n_repl)
else:
    print("\nNessun aggiornamento a patenti.html.")

print("\n----------------------------------------")
print("Totale immagini: %d KB  ->  %d KB  (%.1f MB -> %.1f MB)" % (
    kb(tot_before), kb(tot_after), tot_before/1048576.0, tot_after/1048576.0))
print("Gli originali .png restano come backup nella cartella.")
print("Ora controlla il garage in locale, poi fai il push.")
input("\nPremi Invio per chiudere...")
