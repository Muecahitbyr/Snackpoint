# SEO-, GEO- und KI-Auffindbarkeit: Bericht

> **Hinweis:** Dies ist der Bericht der ersten Runde. Der aktuelle Stand (Live-Rendering im Worker,
> erweiterte strukturierte Daten, Prüfskript) steht in [`seo-geo-final-audit.md`](seo-geo-final-audit.md).
> Einzelne Angaben hier sind überholt, z. B. heißt die Testvariable jetzt `VITE_SITE_URL` statt `SITE_URL`.

Stand: 29.10.2026 · Projekt: SnackPoint Kaufbeuren (Kiosk, DHL Paketshop, Lotto-Annahmestelle)
Live-Adresse zum Zeitpunkt der Analyse: `https://snackpoint.mucahitbayar.workers.dev`

Alle Änderungen sind lokal umgesetzt und getestet. Es gibt noch **keinen Commit, keinen Push und kein Deployment**.

---

## A. Ausgangszustand

| Bereich | Befund |
| --- | --- |
| Framework | Vite 8 + React 18, Multi-Page-Build (`index`, `produkte`, `impressum`, `datenschutz`, `admin`), keine SSR/SSG |
| Hosting | Cloudflare Worker mit Static Assets (`dist/`), `/api/*` wird an Railway (Hono + Postgres) weitergereicht. Build-Befehl in Cloudflare: `npm run build` |
| Rendering | **Reines Client-Side-Rendering.** Jede Seite wurde als leeres `<div id="root"></div>` ausgeliefert, und React lädt die Inhalte erst nach `GET /api/public/site`. Crawler ohne JavaScript (OAI-SearchBot, Claude-SearchBot, PerplexityBot usw.) sahen nur Titel und Description. |
| Titel / Description | Pro Seite vorhanden und individuell, `lang="de"` gesetzt. |
| Canonical, Open Graph, Twitter Card | **fehlten** |
| Strukturierte Daten (JSON-LD) | **fehlten** |
| robots.txt | Nicht im Projekt. Live lieferte Cloudflare einen eigenen Text: nur der Kommentar-Vorspann der „Content Signals“, **ohne Regeln und ohne Sitemap-Verweis**. Ohne Regeln heißt: alles erlaubt. |
| sitemap.xml | **fehlte** (404) |
| URLs | Cloudflare beantwortet `/produkte.html` mit **307** auf `/produkte`. Interne Links zeigten auf die `.html`-Variante, jeder Klick lief also über eine Weiterleitung. |
| Interne Verlinkung | `/produkte` war nur über „Frisch im Regal“ und den Chat erreichbar, nicht über Navigation oder Footer. |
| Admin-Bereich | Korrekt geschützt: `X-Robots-Tag: noindex, nofollow` (Header) und `<meta name="robots" content="noindex, nofollow">` |
| Sprachversionen | Nur Deutsch, keine Mehrsprachigkeit nötig |
| Bots | Test mit den User-Agents von GPTBot und ClaudeBot: Startseite 200, keine Challenge |
| Vercel (alte Adresse) | `snackpoint-kappa.vercel.app` liefert inzwischen 404. Die Weiterleitung in `vercel.json` greift nicht mehr, weil das Projekt dort offenbar deaktiviert ist. |

Was schon gut funktionierte und unverändert bleibt: Seitentitel und Descriptions, `lang`, genau eine H1 pro Seite, saubere H2/H3-Struktur, noindex für den Admin-Bereich, HTTPS mit HSTS, Cache-Header für Assets, Google-Maps-Karte erst nach Zustimmung.

## B. Implementierte Verbesserungen

1. **Prerendering zur Build-Zeit** (wichtigste Maßnahme)
   - `src/prerender.jsx` (neu) rendert die vier öffentlichen Seiten mit denselben React-Komponenten zu HTML.
   - `scripts/prerender.mjs` (neu) läuft nach `vite build` (`npm run build`) und schreibt das HTML in `dist/*.html`.
   - Crawler lesen jetzt ohne JavaScript im HTML: Überschriften, „Über uns“, alle Leistungen, Öffnungszeiten, Adresse, Google-Bewertung, Kundenbewertungen, die vier Produkte der Startseite und das komplette Sortiment auf `/produkte`, dazu Impressum, Datenschutz und alle internen Links.
   - **Für Besucher ändert sich nichts:** Ein Inline-Script setzt `html.js`, eine CSS-Regel blendet das vorgerenderte HTML dann aus, und React rendert die Seite wie bisher. Im Browser geprüft: Auch bei blockiertem JS-Bundle ist der vorgerenderte Inhalt bei aktivem JavaScript unsichtbar, es gibt also kein Aufblitzen. Ohne JavaScript ist der Inhalt sichtbar.
   - Es gibt keine Inhalte nur für Bots: Das HTML ist dieselbe React-Ausgabe, die Besucher sehen.
   - Zeitabhängige Teile werden neutral vorgerendert, damit der Build-Zeitpunkt nicht im HTML steht:
     - „Geöffnet · bis 20:00“ wird zu „Öffnungszeiten“.
     - Statuszeile und Tagesbalken entfallen.
     - Die Zähler (48 Bewertungen, 4.9) erscheinen mit dem echten Wert statt mit „0“.
     - Gesteuert wird das über `src/site/env.js` (`IS_PRERENDER`).
   - Daten aus der Datenbank (Produkte, Öffnungszeiten, Events) liest das Skript beim Build per `GET /api/public/site` von der Live-Seite, nur lesend. Ist die API nicht erreichbar, baut es trotzdem, nur ohne diese Daten (getestet mit `PRERENDER_API=off`).
2. **Canonical, Open Graph, Twitter Card** auf allen öffentlichen Seiten. Sie werden beim Build aus `<title>` und `<meta name="description">` der jeweiligen Seite erzeugt, so dass die Texte nicht doppelt gepflegt werden müssen.
3. **JSON-LD (schema.org)** auf der Startseite:
   - `WebSite` und `ConvenienceStore` (Kiosk) mit Name, Beschreibung, Logo, Adresse, Google-Maps-Link, Öffnungszeiten aus der Datenbank und den drei aktuell angebotenen Leistungen (Kiosk, DHL Paketshop, Lotto).
   - Ihle ist noch „bald verfügbar“ und fehlt deshalb.
   - Telefon, E-Mail und `sameAs` erscheinen automatisch, sobald sie in `SETTINGS` eingetragen sind. Im Moment sind sie leer und werden deshalb weggelassen.
4. **sitemap.xml** wird beim Build erzeugt. Sie enthält nur die vier öffentlichen Seiten mit absoluten HTTPS-URLs, ohne `lastmod`, weil es keine verlässlichen Änderungsdaten gibt.
5. **robots.txt** wird beim Build erzeugt:
   - `User-agent: *` mit `Allow: /`.
   - `Disallow: /api/`, aber `Allow: /api/public/` und `/api/media/`. Googlebot braucht beide, um die Seite mit JavaScript zu rendern und Bilder zu laden.
   - Verweis auf die Sitemap.
6. **Eine Stelle für die Domain:** `SETTINGS.siteUrl` in `src/data/siteContent.js`. Ein Testbuild kann sie mit `SITE_URL=…` überschreiben. Der Hinweis steht auch in `ADMIN.md` beim Thema eigene Domain.
7. **Titel und Descriptions geschärft**: konkreter, mit Adresse bzw. Sortiment, ohne Gedankenstriche, unter 160 Zeichen.
   - Startseite: „SnackPoint Kaufbeuren | Kiosk, DHL Paketshop & Lotto“
   - Produkte: „Sortiment: Snacks, Getränke & mehr | SnackPoint Kaufbeuren“
8. **Saubere URLs ohne `.html`** in allen internen Links (Footer, Cookie-Hinweis, „Alle Produkte“, Chat-Assistent), damit keine 307-Weiterleitungen mehr entstehen. Vite-Dev-Server und `server/node.js` liefern `/produkte`, `/impressum` und `/datenschutz` jetzt genauso aus wie Cloudflare.
9. **Interne Verlinkung:** Im Footer steht neben Impressum und Datenschutz jetzt „Sortiment“ mit Link auf `/produkte`.

Geänderte Dateien:

| Art | Dateien |
| --- | --- |
| HTML-Einstiege | `index.html`, `produkte.html`, `impressum.html`, `datenschutz.html` |
| Build und Server | `package.json`, `vite.config.js`, `server/node.js` |
| Neue Dateien | `scripts/prerender.mjs`, `src/prerender.jsx`, `src/site/env.js` |
| Seitenzustand und Styles | `src/site/SiteProvider.jsx`, `src/index.css` |
| Komponenten (Links, neutrales Prerendering, `window`-Absicherung) | `Footer.jsx`, `Header.jsx`, `Location.jsx`, `Wishes.jsx`, `NewProducts.jsx`, `CookieConsent.jsx`, `ProduktePage.jsx`, `useCountUp.js` |
| Linkziele | `responseBuilder.ts`, `chatbotKnowledge.ts` |
| Kommentare und Hinweistexte | `App.jsx`, `BannersPromotions.jsx`, `adminEntities.js` |
| Inhalte und Doku | `siteContent.js` (`siteUrl`), `ADMIN.md` |

## C. Technische Architektur

```
npm run build
 ├─ vite build                 → dist/*.html (leere #root) + Assets
 └─ node scripts/prerender.mjs
     ├─ Vite im SSR-Modus lädt src/prerender.jsx (gleiche Komponenten wie im Browser)
     ├─ GET {siteUrl}/api/public/site  (Produkte, Öffnungszeiten, Events; optional)
     ├─ pro Seite: <head> + canonical/og/twitter (+ JSON-LD auf /), #root mit <div data-prerendered>
     └─ dist/sitemap.xml, dist/robots.txt
```

- **Metadaten:** Titel und Description stehen von Hand in den HTML-Einstiegen. Alles, was eine absolute URL braucht, ergänzt das Build-Skript.
- **Strukturierte Daten** entstehen aus `CONTENT`, `SETTINGS` und `SERVICES` (`src/data/siteContent.js`) plus den Öffnungszeiten aus der Datenbank. Sie stimmen also immer mit dem sichtbaren Inhalt überein.
- **Aktualität:**
  - Code-Inhalte (Texte, Leistungen, Adresse) sind nach jedem Deploy aktuell.
  - Daten aus dem Adminpanel (Produkte, Öffnungszeiten, Events) sind im vorgerenderten HTML so aktuell wie der letzte Build.
  - Besucher und Googlebot (rendert JavaScript) sehen immer den Live-Stand.
  - Siehe Empfehlung G2.
- **Cloudflare:** Lokal mit `wrangler dev` geprüft:
  - `/robots.txt` liefert `text/plain`.
  - `/sitemap.xml` liefert `application/xml`.
  - `/produkte` liefert 200 mit vorgerendertem Inhalt.
  - `/produkte.html` antwortet mit 307 auf `/produkte`. Das ist Cloudflare-Standard, der Canonical zeigt auf die saubere URL.

## D. KI-Auffindbarkeit

| System | Crawler (laut Anbieter-Doku) | Status nach Deployment |
| --- | --- | --- |
| Google Search, AI Overviews und AI Mode | Googlebot (rendert JavaScript) | Erlaubt; Inhalt jetzt auch ohne JavaScript, Sitemap, JSON-LD |
| Bing, Copilot | bingbot | Erlaubt, Inhalt im HTML |
| ChatGPT Search | OAI-SearchBot (Suche), ChatGPT-User (Abruf auf Nutzeranfrage) | Erlaubt über `User-agent: *`, Inhalt im HTML |
| Claude | Claude-SearchBot (Suche), Claude-User (Abruf auf Nutzeranfrage) | Erlaubt über `User-agent: *`, Inhalt im HTML |
| Perplexity | PerplexityBot (Suche), Perplexity-User (Abruf auf Nutzeranfrage) | Erlaubt über `User-agent: *`, Inhalt im HTML |

**Trainings-Crawler** (GPTBot, ClaudeBot, Google-Extended usw.):
- Es gab keine Regel. Daran ändert sich nichts, sie werden **weder ausdrücklich freigegeben noch neu gesperrt**. Das bleibt deine Entscheidung (siehe F).
- Möchtest du Training ausschließen, ohne die Suche zu verlieren, brauchst du nur eigene Gruppen `User-agent: GPTBot` / `ClaudeBot` / `Google-Extended` mit `Disallow: /` in `scripts/prerender.mjs`.

Erst nach dem Deployment prüfbar:
- Live-`robots.txt`, insbesondere ob Cloudflares verwaltete robots.txt unsere Datei ergänzt oder ersetzt.
- Search-Console-Abdeckung und Rich-Results-Test.
- Tatsächliche Crawler-Zugriffe in den Cloudflare-Analytics bzw. unter AI Crawl Control.

## E. Tests

| Prüfung | Ergebnis |
| --- | --- |
| `npm run build` (inkl. Prerendering) | ✓ 4 Seiten vorgerendert, sitemap.xml und robots.txt erzeugt |
| Build ohne API (`PRERENDER_API=off`) | ✓ baut, Seiten ohne Datenbankinhalte |
| `npm test` (Chat-Assistent) | ✓ 85/85 |
| `npm run test:server` (API, lokale Testdatenbank) | ✓ 46/46 |
| H1/H2/H3 je Seite | ✓ jeweils genau eine H1, sinnvolle Hierarchie |
| Title, Description, Canonical, JSON-LD | ✓ je genau einmal; JSON-LD ist gültiges JSON und nur auf `/` vorhanden |
| sitemap.xml | ✓ gültiges XML (`xmllint`) |
| Interne Links im vorgerenderten HTML | ✓ alle Ziele 200 (lokaler Produktions-Preview) |
| noindex | ✓ nur `admin.html` |
| Browser mit JavaScript (Desktop und Handy) | ✓ Darstellung unverändert, vorgerendertes HTML wird ersetzt, keine Konsolenfehler |
| Browser bei blockiertem JS-Bundle | ✓ vorgerendertes HTML ist ausgeblendet (`display: none`), kein Aufblitzen |
| Browser ohne JavaScript | ✓ Text, Leistungen, Öffnungszeiten und Sortiment sichtbar |
| `wrangler dev` (Cloudflare-Runtime lokal) | ✓ Routen, Content-Types und Weiterleitungen wie erwartet |
| Git | ✓ `dist/` ist ignoriert, keine Secrets im Diff |

Es gibt keinen eigenen Linter im Projekt (kein `lint`-Skript). Produktive Daten wurden nur lesend abgefragt (`GET /api/public/site`).

## F. Offene Aufgaben außerhalb des Codes

1. **Freigabe und Deployment.** Danach live prüfen:
   - `/robots.txt` und `/sitemap.xml` abrufen.
   - Startseite mit `curl` laden und den Text im HTML prüfen.
2. **Cloudflare, verwaltete robots.txt:** Unter *AI Crawl Control* bzw. *Security → Bots* prüfen, ob „Managed robots.txt“ oder „Block AI bots“ aktiv ist. Das lässt sich aus dem Code nicht einsehen, und ich habe dort nichts verändert. Bei aktivem Managed robots.txt stellt Cloudflare seinen Vorspann vor unsere Datei. Falls „Block AI bots“ an ist, werden auch Such-Crawler wie OAI-SearchBot oder PerplexityBot blockiert. Das sollte bewusst entschieden werden.
3. **Trainings-Crawler:** Entscheiden, ob GPTBot, ClaudeBot und Google-Extended gesperrt werden sollen (siehe D).
4. **Eigene Domain:**
   - Danach `SETTINGS.siteUrl` umstellen und neu deployen.
   - `workers.dev` per 301 auf die Domain weiterleiten, z. B. per Redirect Rule oder ein paar Zeilen im Worker.
   - Ohne eigene Domain werden die Seiten unter `workers.dev` indexiert. Das funktioniert, ist aber für ein lokales Geschäft weniger vertrauenswürdig.
5. **Google Search Console und Bing Webmaster Tools:**
   - Domain bestätigen, sinnvollerweise erst mit der eigenen Domain.
   - Sitemap einreichen.
   - Bing kann Daten aus der Search Console importieren.
6. **Google-Unternehmensprofil** (das wichtigste Signal für lokale Suche und Maps):
   - Name, Adresse und Öffnungszeiten müssen exakt mit der Webseite übereinstimmen.
   - Die Webseiten-URL im Profil eintragen.
   - Die vorhandenen 48 Bewertungen gehören dorthin.
7. **Fehlende Angaben** (bewusst nicht erfunden):
   - Telefonnummer und E-Mail, wichtig für Kunden, KI-Antworten und das Impressum.
   - Zahlungsarten und Parkmöglichkeiten. Der Chat-Assistent beantwortet das, sobald es in `SETTINGS.info` steht.
   - Betreibername und Rechtsform im Impressum.
   - Offizielle Social-Media-Profile, falls vorhanden. Sie erscheinen dann im Footer und als `sameAs` im JSON-LD.
8. **Bild für Link-Vorschauen:**
   - `logo.jpg` hat nur 150 × 150 px. Facebook verlangt mindestens 200 × 200, ideal ist ein Bild mit 1200 × 630 px (z. B. Ladenfront oder Logo auf Markenhintergrund).
   - Ein solches Bild muss gestaltet bzw. fotografiert werden. Es danach unter `public/` ablegen und in `scripts/prerender.mjs` eintragen (`og:image`, dann `twitter:card` auf `summary_large_image`).
   - Für ein Apple Touch Icon (180 × 180 PNG) fehlt aus demselben Grund eine größere Logodatei.
9. **Alte Vercel-Adresse:** Liefert 404. Falls sie irgendwo verlinkt ist, die Weiterleitung reaktivieren, sonst das Vercel-Projekt löschen.
10. **Monitoring:** In den ersten Wochen die Search Console (Abdeckung, Core Web Vitals) und Cloudflare AI Crawl Control (welche Bots kommen, welche Statuscodes) beobachten.

## G. Priorisierte Empfehlungen

**Bestätigte technische Punkte (behoben):** Client-only-Rendering, fehlende Sitemap, fehlende Canonicals, fehlende Social-Tags, fehlendes JSON-LD, Links über 307-Weiterleitungen, `/produkte` schwach verlinkt.

**Optional, nach Nutzen sortiert:**

1. **Kontakt und Unternehmensprofil vervollständigen** (F6, F7). Das bringt am meisten für lokale Suche und KI-Antworten wie „Hat SnackPoint in Kaufbeuren heute offen?“ oder „Kann ich dort Pakete abgeben?“.
2. **Vorgerendertes HTML aktuell halten:**
   - Die Webseite selbst ist immer aktuell. Nur das HTML für Crawler ohne JavaScript entspricht dem Stand des letzten Builds. Nach Änderungen an Öffnungszeiten oder größeren Sortimentsänderungen hilft ein erneutes Deployment.
   - Automatisieren lässt sich das mit einem Cloudflare-Deploy-Hook (falls im Konto verfügbar), den das Adminpanel nach solchen Änderungen auslöst. Das wäre eine kleine Erweiterung.
3. **Kurzer FAQ-Abschnitt** mit echten Kundenfragen, sobald die Fakten vorliegen (Zahlungsarten, Parken, DHL-Abholung mit Ausweis/Abholcode usw.). Bewusst nicht ohne gesicherte Antworten umgesetzt, und kein `FAQPage`-Schema als „Ranking-Trick“.
4. **Vorgerendertes HTML als Startansicht nutzen (Performance):**
   - Im Moment zeigt die Seite bis zum Laden der API-Daten wie bisher den Logo-Ladebildschirm.
   - Würde React stattdessen das vorgerenderte HTML übernehmen (Hydration), wäre der Inhalt sofort sichtbar. Das verbessert LCP und den gefühlten Seitenaufbau.
   - Dafür müssten Komponenten mit Animationen und Zeitbezug angepasst werden. Das ist eine größere Änderung und wurde deshalb nicht eigenmächtig umgesetzt.
5. **Bewertungen:** Die Google-Bewertung (4.9, 48) steht sichtbar auf der Seite. Als `AggregateRating` im JSON-LD gehört sie bewusst **nicht** hinein, weil Google selbst eingebundene Bewertungen eines lokalen Geschäfts nicht als Rich Result erlaubt. Echte neue Bewertungen bitte im Google-Profil sammeln.
6. **Externe Erwähnungen:** Ein Eintrag bei der Stadt oder dem Stadtteil Neugablonz, bei der DHL-Filialsuche und bei LOTTO Bayern (Annahmestellen-Suche), sofern dort ein Link auf die Webseite möglich ist. Solche seriösen Erwähnungen stärken die lokale Relevanz.
7. **Performance (nicht gemessen, nur Hinweise):**
   - Google Fonts werden extern geladen (drei Familien). Selbst gehostete Fonts würden eine Verbindung sparen und Datenschutzfragen vermeiden.
   - Ein Lighthouse-Lauf nach dem Deployment sollte das beziffern, bevor etwas geändert wird.
8. **llms.txt:** Für die Auffindbarkeit nicht erforderlich und von den genannten Anbietern nicht als Signal dokumentiert. Bewusst nicht angelegt.

Quellen zu den Crawlern:
- [OpenAI: Overview of OpenAI Crawlers](https://developers.openai.com/api/docs/bots)
- [Anthropic: Crawler-Hilfeartikel](https://support.claude.com/en/articles/8896518)
- [Perplexity: Perplexity Crawlers](https://docs.perplexity.ai/docs/resources/perplexity-crawlers.md)
