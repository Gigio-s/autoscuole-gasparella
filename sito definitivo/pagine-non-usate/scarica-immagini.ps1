# ============================================================
#  Scarica in locale tutte le immagini remote del sito
#  Salva tutto nella sottocartella \img (mantiene i nomi originali,
#  gli stessi a cui puntano ora le pagine HTML).
#
#  USO: click destro sul file -> "Esegui con PowerShell"
#       oppure da terminale:  powershell -ExecutionPolicy Bypass -File .\scarica-immagini.ps1
# ============================================================

$ErrorActionPreference = "Continue"
$img = Join-Path $PSScriptRoot "img"
New-Item -ItemType Directory -Force -Path $img | Out-Null

$cf = "https://d8j0ntlcm91z4.cloudfront.net/user_3Fp93g3AABsPKODQxzIxBVAjWHa/"
$wp = "https://www.autoscuolegasparellavicenza.it/wp-content/uploads/2024/08/"

# Immagini generate (Higgsfield / CloudFront): veicoli + sfondo garage
$cfFiles = @(
  "hf_20260702_003015_ff7d3f77-929e-4f30-89de-5576fe58d0b2.png",  # sfondo garage
  "hf_20260702_003212_43592e26-254e-4758-8175-0b7828399d45.png",  # AM
  "hf_20260702_003215_e3bce2cd-f638-47a7-9cc1-caf64dc90814.png",  # A
  "hf_20260702_003502_82008206-97d4-4980-ab4c-181a7ae59b38.png",  # A1
  "hf_20260702_003629_066061ec-8d01-4f1f-97eb-1fd77a3e5783.png",  # A2
  "hf_20260723_141506_205cd4ff-0933-4220-86b6-75cceedd4b2f.png",  # B (auto)
  "hf_20260729_075549_8e690672-ce4c-4a15-8376-609a4fc0b4e1.png",  # C
  "hf_20260729_075551_d62d2dca-5332-4e79-9e36-d0d47fb0204f.png",  # C1
  "hf_20260729_075553_40189ef2-6e04-43c2-90c5-58f07cd4531c.png",  # C1E
  "hf_20260729_075554_79f247db-a676-4a60-be3e-5b8de0f6af08.png",  # CE
  "hf_20260907_152829_3b4ed76c-02d0-4d68-9233-bd0c36c54486.png",  # D1
  "hf_20260907_152831_96e1612f-de06-4bf3-be59-80c0da9d5e44.png",  # D1E
  "hf_20260907_152834_c21f52d5-e451-42be-98e3-95d456b5d584.png",  # DE
  "hf_20260908_205805_76424971-590c-4f30-93ca-1a5925be4cc0.png",  # D
  "hf_20260908_211401_851e54b9-6752-4b1b-9679-abf638d88a73.png",  # BE
  "hf_20260908_211403_6f8692a1-6140-43d0-8767-b7d5ae479447.png"   # B96
)

# Loghi e icone dal sito ufficiale (WordPress)
$wpFiles = @(
  "Icona.png",
  "LogoGaspaW-1024x257.png",
  "LogoGaspaB-300x75.png",
  "LogoGaspaB-1024x257.png",
  "Patente-A.png",
  "Patente-B.png",
  "Patente-C.png",
  "Patente-D.png",
  "Recupero-Punti-1024x1024.png"
)

$ok = 0; $ko = 0
function Scarica($base, $name) {
  $dest = Join-Path $img $name
  try {
    Invoke-WebRequest -Uri ($base + $name) -OutFile $dest -UseBasicParsing
    Write-Host ("  OK   " + $name) -ForegroundColor Green
    $script:ok++
  } catch {
    Write-Host ("  ERR  " + $name + "  ->  " + $_.Exception.Message) -ForegroundColor Red
    $script:ko++
  }
}

Write-Host "`nScarico le immagini generate (CloudFront)..." -ForegroundColor Cyan
foreach ($f in $cfFiles) { Scarica $cf $f }

Write-Host "`nScarico loghi e icone (sito ufficiale)..." -ForegroundColor Cyan
foreach ($f in $wpFiles) { Scarica $wp $f }

Write-Host ("`nFatto. Scaricate: " + $ok + "  |  Errori: " + $ko) -ForegroundColor Yellow
Write-Host ("Cartella: " + $img)
if ($ko -gt 0) { Write-Host "Alcune immagini non sono state scaricate: controlla la connessione o riprova." -ForegroundColor Red }
Read-Host "`nPremi INVIO per chiudere"
