# Garderoba – PWA do doboru stroju

React 18 + Vite + TypeScript + Tailwind + Dexie (IndexedDB). Wszystkie dane zostają na urządzeniu.

## Uruchomienie
```bash
npm install
npm run dev        # podgląd (kamera/GPS wymagają HTTPS lub localhost)
npm run build      # tsc + vite build → dist/
npm run preview
```

## Wdrożenie
- **Vercel:** zaimportuj repo (preset Vite, `vercel.json` jest gotowy).
- **Cloudflare Pages:** build `npm run build`, katalog `dist` (`public/_headers` jest gotowy).

## iPhone
Safari → Udostępnij → *Do ekranu początkowego*. Aplikacja uruchomi się w trybie standalone i działa offline.

## Struktura
| Plik | Rola |
|---|---|
| `src/lib/image.ts` | kompresja zdjęć na `<canvas>` (600 px, WebP/JPEG, ≤ 80 KB) |
| `src/lib/colorAnalysis.ts` | analiza koloru 50×50 px, luminancja, najbliższy kolor palety |
| `src/lib/palette.ts` | paleta, Lab, harmonia barw |
| `src/lib/db.ts` | Dexie / IndexedDB |
| `src/lib/weather.ts` | Open-Meteo, mapowanie pogody |
| `src/lib/outfit.ts` | silnik `recommendOutfit` |
| `public/sw.js` | Service Worker (offline) |
| `scripts/generate-icons.ps1` | generuje ikony PNG |
