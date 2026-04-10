# 📊 Cedolino Tracker

Web app per la gestione e previsione dello stipendio, basata sui tuoi cedolini Zucchetti.

## Stack

- **Frontend**: React 18 + Vite + Recharts
- **Storage**: IndexedDB via Dexie.js (tutto locale, nessun backend)
- **PDF parsing**: pdf.js (estrazione testo da cedolini Zucchetti)
- **Fiscale**: Engine custom IRPEF 2025/2026, TFR art. 2120, detrazioni lav. dipendente

## Setup rapido

```bash
# Installa dipendenze
npm install

# Avvia in locale
npm run dev

# Build per Vercel
npm run build
```

## Deploy su Vercel

```bash
npm install -g vercel
vercel --prod
```

## Funzionalità

| Pagina | Cosa fa |
|--------|---------|
| Dashboard | KPI netto/lordo, grafici storici, ratei ferie |
| Previsione | Forecast 6/12/24 mesi con aliquote 2026, scatti anzianità |
| Statistiche | Analisi per anno, stagionalità, aliquota effettiva, trend |
| Cedolini | Lista completa con dettaglio espandibile per ogni voce |
| Importa PDF | Drag & drop multi-file, parsing automatico Zucchetti |
| Impostazioni | Regione/comune, aliquote, data assunzione, export/import JSON |

## Logica fiscale implementata

- **IRPEF 2026**: scaglioni 23/33/43% (riforma L.207/24, −2% secondo scaglione)
- **Detrazioni lavoro dipendente**: art. 13 TUIR con formula per fascia
- **Ulteriore detrazione L.207/24**: fino a €1.000 per redditi 8.500–35.000
- **INPS**: 9,19% + 1% oltre €55.448 annui
- **Addizionali**: regionali (per tutte le regioni) + comunale configurabile
- **TFR**: quota mensile = retribuzione utile / 13,5 − 0,5% INPS base (art. 2120 c.c.)
- **Scatti di anzianità**: ogni 36 mesi, CCNL Commercio, fino a 10 scatti
- **Giorni lavorativi**: calcolo automatico per mese incluse festività italiane 2026 (con San Francesco 4 ottobre)

## Parser PDF (Zucchetti)

Supporta: Paghe Web, Paghe Infinity, Paghe Project

Campi estratti automaticamente:
- Paga base, contingenza, scatti, 3° elemento, ENT BIL
- Retribuzione giornaliera, giorni lavorati
- Trasferte, ticket restaurant
- INPS (voce Z00000), FIS (Z00054)
- FONTE base e volontario (fondo pensione)
- Imponibile IRPEF, IRPEF lorda, detrazioni, ulteriore detrazione
- Ritenute IRPEF nette (F03020)
- Addizionale regionale residuo (F09110) + comunale (F09130)
- TFR: retribuzione utile, quota mese, fondo 31/12, rivalutazione, quota anno
- Ferie maturate/godute/residuo, permessi ROL, permessi ex-festività
- Totale competenze, totale trattenute, netto del mese

## Note

- I dati sono salvati **solo nel tuo browser** (IndexedDB). Non vengono inviati a nessun server.
- Puoi esportare/importare in JSON dalle Impostazioni per backup.
- Le previsioni sono stime: non includono straordinari non pianificati, conguagli atipici o modifiche contrattuali future.
- Il parser raggiunge ~85-95% di accuratezza sui cedolini Zucchetti standard. I campi estratti possono essere corretti manualmente prima del salvataggio.
