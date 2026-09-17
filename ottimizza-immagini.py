# -*- coding: utf-8 -*-
"""
Ottimizza le immagini pesanti del sito (garage + home):
- ridimensiona a max 1280px sul lato lungo
- converte in WebP (mantiene la trasparenza dove serve)
- aggiorna automaticamente i riferimenti dentro patenti.html e index.html

Risultato atteso:
- Garage (patenti.html): da ~55 MB a ~1-2 MB
- Home (index.html): le 3 PNG grandi (~8,5 MB) scendono a ~0,4 MB

Gli originali .png NON vengono cancellati: restano come backup. Vengono creati
anche i backup patenti.html.bak e index.html.bak.

USO:
  1. Metti questo file nella cartella "sito definitivo".
  2. Serve Pillow. Se non ce l'hai, da PowerShell:  pip install Pillow
  3. Doppio clic, oppure:  python ottimizza-immagini.py
  4. Controlla il sito in locale, poi fai il push (git add -A ...).
"""

import os
import shutil

MAX_SIDE = 1280
QUALITY  = 80

BASE = os.path.dirname(os.path.abspath(__file__))

try:
    from PIL import Image
except ImportError:
    print("\nManca la libreria Pillow. Installala con:\n    pip install Pillow\n")
    input("Premi Invio per chiudere...")
    raise SystemExit

def kb(n):
    return round(n / 1024)

def enc(name):
    # come viene scritto il nome nel codice HTML (spazi -> %20)
    return name.replace(" ", "%20")

def to_webp(src_path):
    """Converte un PNG in WebP ridimensionato. Ritorna (before, after) in byte, o None."""
    webp_path = os.path.splitext(src_path)[0] + ".webp"
    try:
        before = os.path.getsize(src_path)
        img = Image.open(src_path).convert("RGBA")
        w, h = img.size
        scale = min(1.0, MAX_SIDE / float(max(w, h)))
        if scale < 1.0:
            img = img.resize((max(1, int(w*scale)), max(1, int(h*scale))), Image.LANCZOS)
        img.save(webp_path, "WEBP", quality=QUALITY, method=6)
        after = os.path.getsize(webp_path)
        return before, after
    except Exception as e:
        print("  ERRORE su", os.path.basename(src_path), "->", e)
        return None

def update_html(html_file, replacements):
    """replacements: lista di (vecchio, nuovo) da sostituire nel file HTML."""
    path = os.path.join(BASE, html_file)
    if not os.path.isfile(path):
        print("  (salto:", html_file, "non trovato)")
        return
    shutil.copyfile(path, path + ".bak")
    with open(path, "r", encoding="utf-8") as f:
        html = f.read()
    n = 0
    for old, new in replacements:
        c = html.count(old)
        if c:
            html = html.replace(old, new)
            n += c
    with open(path, "w", encoding="utf-8") as f:
        f.write(html)
    print("  %s aggiornato: %d riferimenti .png -> .webp (backup in %s.bak)" % (html_file, n, html_file))

tot_before = 0
tot_after  = 0

# ---------- 1) GARAGE ----------
print("\n=== GARAGE (cartella 'foto categorie patenti') ===")
GARAGE = os.path.join(BASE, "foto categorie patenti")
garage_repl = []
if os.path.isdir(GARAGE):
    for name in [f for f in os.listdir(GARAGE) if f.lower().endswith(".png")]:
        r = to_webp(os.path.join(GARAGE, name))
        if r:
            tot_before += r[0]; tot_after += r[1]
            base = os.path.splitext(name)[0]
            garage_repl.append(("foto%20categorie%20patenti/" + enc(base) + ".png",
                                "foto%20categorie%20patenti/" + enc(base) + ".webp"))
            print("  OK  %-42s  %5d KB -> %5d KB" % (name, kb(r[0]), kb(r[1])))
    update_html("patenti.html", garage_repl)
else:
    print("  cartella non trovata, salto.")

# ---------- 2) HOME ----------
print("\n=== HOME (cartella 'img') ===")
IMG = os.path.join(BASE, "img")
HOME_FILES = ["auto homepage.png", "polizia.png", "cqc.png"]
home_repl = []
for name in HOME_FILES:
    p = os.path.join(IMG, name)
    if not os.path.isfile(p):
        print("  (salto:", name, "non trovato in img/)")
        continue
    r = to_webp(p)
    if r:
        tot_before += r[0]; tot_after += r[1]
        base = os.path.splitext(name)[0]
        home_repl.append(("img/" + enc(base) + ".png", "img/" + enc(base) + ".webp"))
        print("  OK  %-42s  %5d KB -> %5d KB" % (name, kb(r[0]), kb(r[1])))
update_html("index.html", home_repl)

print("\n----------------------------------------")
print("Totale: %d KB -> %d KB  (%.1f MB -> %.1f MB)" % (
    kb(tot_before), kb(tot_after), tot_before/1048576.0, tot_after/1048576.0))
print("Gli originali .png restano come backup nelle cartelle.")
print("Controlla il sito in locale, poi fai il push.")
input("\nPremi Invio per chiudere...")
