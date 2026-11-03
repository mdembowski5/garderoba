# Wdrożenie na darmowy hosting (działa 24/7)

Aplikacja to czysty statyczny front-end (HTML/JS/CSS) – nie ma serwera ani bazy danych, więc darmowy hosting
statyczny działa bez przerw. Dane ubrań zostają w telefonie (IndexedDB), a pogoda pobierana jest bezpośrednio
z Open-Meteo.

## Opcja A – najszybsza, bez GitHuba (przeciągnij folder)
1. `npm run build` → powstaje folder `dist/`.
2. **Cloudflare Pages:** dash.cloudflare.com → *Workers & Pages* → *Create* → *Pages* → *Upload assets*
   → nazwij projekt → przeciągnij folder `dist` → *Deploy*.
   **albo Netlify:** app.netlify.com/drop → przeciągnij folder `dist` → zaloguj się, aby strona została na stałe.
3. Dostaniesz adres HTTPS, np. `https://garderoba.pages.dev`.

Wada: każda aktualizacja = ponowne zbudowanie i wgranie folderu.

## Opcja B – automatyczne wdrożenia z GitHuba (zalecana)
1. Utwórz puste repozytorium na github.com (np. `garderoba`).
2. W folderze projektu:
   ```bash
   git remote add origin https://github.com/TWOJ_LOGIN/garderoba.git
   git push -u origin main
   ```
3. **Vercel:** vercel.com → *Add New → Project* → wybierz repo → *Deploy* (preset Vite wykryje się sam).
   **albo Cloudflare Pages:** *Create → Pages → Connect to Git* → build command `npm run build`,
   output directory `dist`.
4. Każdy `git push` aktualizuje stronę automatycznie.

## Po wdrożeniu – iPhone
1. Otwórz adres w **Safari** (nie w Chrome).
2. *Udostępnij* → *Do ekranu początkowego* → *Dodaj*.
3. Uruchamiaj z ikony – aplikacja działa w trybie pełnoekranowym i offline.

> **Ważne:** dane są tylko na tym telefonie. Dodaj aplikację do ekranu początkowego – dla zwykłej karty Safari
> iOS może wyczyścić dane witryny po ok. 7 dniach bez użycia, dla aplikacji z ekranu początkowego – nie.
> Zdjęcia ubrań wykonuj już w zainstalowanej aplikacji, nie w karcie Safari.
