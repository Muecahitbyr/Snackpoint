# SEO-, GEO- und KI-Auffindbarkeit: Abschlussaudit

Stand: 29.10.2026 · Projekt: SnackPoint Kaufbeuren · Live-Adresse: `https://snackpoint.mucahitbayar.workers.dev`

**Status:** Alles ist lokal umgesetzt und getestet. Es gibt **keinen Commit, keinen Push und kein Deployment**.
An Cloudflare, Railway, Google Search Console und anderen externen Diensten wurde nichts verändert.
Gegen die Live-API liefen nur lesende Abrufe (`GET /api/public/site`). Alle schreibenden Tests liefen gegen
die lokale Docker-Datenbank, und die Testdaten sind wieder entfernt.

---

## Kurzfassung

- **Das wichtigste Problem ist gelöst:** Bisher sahen Crawler ohne JavaScript (die meisten KI-Suchcrawler)
  Produkte, Events und Öffnungszeiten im Stand des **letzten Deployments**. Jetzt rendert der vorhandene
  Cloudflare Worker die vier öffentlichen Seiten bei **jedem Aufruf mit den aktuellen Daten** aus dem
  Adminpanel. Lokal nachgewiesen: Eine Änderung im Adminpanel steht ohne Neubau sofort im HTML.
- **Sicherer Rückfall:** Antwortet die API nicht innerhalb von 1,5 Sekunden oder mit einem Fehler, liefert der
  Worker die Seite im Stand des letzten Builds aus. Es entstehen weder Fehlerseiten noch leere Seiten.
- **Strukturierte Daten** gibt es jetzt auf allen Seiten: Unternehmen, Website, Seite, Brotkrumen,
  Sortiment als Liste und echte Events. Es gibt keine selbst ausgezeichneten Bewertungen und keine
  erfundenen Angaben.
- **Seiten ohne JavaScript** zeigen jetzt alle Inhalte. Vorher fehlten der große Schriftzug und die
  Öffnungszeiten-Kacheln (unsichtbar wegen ihrer Einblend-Animation).
- **Weiterleitungen:** Doppelte URLs (`/produkte.html`, `/produkte/`) leiten jetzt dauerhaft (301) statt
  vorübergehend (307) weiter. Preview-URLs werden nicht indexiert, und der Domainwechsel ist vorbereitet.
- **Prüfskript:** Neu ist ein wiederverwendbares Prüfskript `npm run test:seo` mit 80 Prüfungen. Alle
  bestehenden Tests sind grün.

---

## 1. Was bereits vorhanden war (erste Runde, ebenfalls noch nicht committet)

| Bereich | Stand vor diesem Audit |
| --- | --- |
| HTML ohne JavaScript | Vorrendern beim Build (`scripts/prerender.mjs`), Daten aus der Live-API zum Build-Zeitpunkt |
| Meta-Daten | Eigener `<title>` und eigene Meta-Description pro Seite, Canonical, Open Graph, Twitter Card |
| JSON-LD | `WebSite` und `ConvenienceStore`, nur auf der Startseite |
| Crawling | `sitemap.xml` (4 URLs), `robots.txt` (alles erlaubt außer internen `/api/`-Bereichen) |
| URLs | Interne Links auf saubere URLs (`/produkte` statt `/produkte.html`) |
| Ausschluss | `/admin`: `noindex` per Meta-Tag und Header. Die API sendet auf allen Antworten `X-Robots-Tag: noindex`. |
| Zeitabhängiges | „Jetzt geöffnet“ und die Zählanimation sind im vorgerenderten HTML neutralisiert |

## 2. Festgestellte Probleme

### Behoben

| # | Problem | Auswirkung |
| --- | --- | --- |
| 1 | Produkte, Events, Öffnungszeiten und JSON-LD im HTML stammten aus dem **Build** | Neue Produkte oder Events aus dem Adminpanel erreichten Crawler ohne JavaScript erst nach dem nächsten Deployment. Abgelaufene Events blieben stehen. |
| 2 | Großer Schriftzug „SnackPoint Kaufbeuren“ (`<h1>`) und Öffnungszeiten-Kacheln im HTML unsichtbar (`opacity: 0`) | Ohne JavaScript fehlte die wichtigste Überschrift. Manche Systeme gewichten unsichtbaren Text geringer. |
| 3 | Event-Countdown („In 3 Tagen“, „Morgen“) wäre fest ins HTML geschrieben worden | Veraltete Angaben in Suchergebnissen und KI-Antworten |
| 4 | Cookie-Banner im statischen HTML (Buttons ohne JavaScript funktionslos) | Rauschen im Text für Crawler |
| 5 | JSON-LD nur auf der Startseite, ohne Brotkrumen, Sortiment und Events | Weniger maschinenlesbarer Kontext |
| 6 | `/produkte.html` und `/produkte/` antworteten mit **307** (vorübergehend, Cloudflare-Standard) | Doppelte URLs werden nicht eindeutig zusammengeführt |
| 7 | Preview-URLs von Cloudflare (`<version>-snackpoint.….workers.dev`) wären indexierbar | Doppelte Inhalte auf fremden Hostnamen |
| 8 | Kein Mechanismus für den späteren Domainwechsel (alte Adresse → neue Domain) | Ranking-Signale der alten Adresse gingen verloren |
| 9 | Basis-URL für Testbuilds nur im Build-Skript überschreibbar, nicht im Browser-Code und Worker | Gefahr uneinheitlicher URLs |
| 10 | Zwei Sätze nach dem Entfernen der Gedankenstriche zusammengelaufen („… Lottoschein abgeben hier bist du …“) | Schlechter zitierbar für KI-Antworten |
| 11 | Der Browser lud `/api/public/site` separat, obwohl der Worker die Daten schon hat | Doppelte API-Last (siehe 3.1) |

### Gefunden, aber bewusst nicht im Code geändert (Inhalt oder Entscheidung des Betreibers)

| Befund | Empfehlung |
| --- | --- |
| Produkt „Fruchtgummi-Mix“ hat in der Datenbank den Preis **46,45 €**. Er wird auf `/produkte` angezeigt. Alle anderen Einträge haben keinen Preis. | Im Adminpanel prüfen, vermutlich ein Tippfehler. Ich habe keine Daten verändert. |
| Leistung „Ihle“ steht als **„BALD VERFÜGBAR“**, im Sortiment stehen aber „Belegte Sandwiches“, „Wraps“, „Baguettes“, „Salat to go“ als verfügbar | Klären und eine Stelle anpassen. Widersprüche schwächen KI-Antworten. |
| `/admin` sendet zwei `X-Frame-Options`-Header (`DENY` und `SAMEORIGIN`, aus `public/_headers`) | Kein akutes Risiko: Die CSP `frame-ancestors 'none'` schützt bereits. Optional bereinigen. |
| `og:image` ist das Logo mit 150 × 150 px | Für große Link-Vorschauen ein echtes Foto oder eine Grafik mit 1200 × 630 px bereitstellen. Ich habe kein Bild erfunden. |
| Restliche Gedankenstriche in zwei Texten (`events.text`, DHL-Leistung) | Nur zur Info: Diese Texte hat die frühere Strich-Bereinigung nicht erfasst. |
| `public/models/*.glb` (8,6 MB) werden mit deployt, aber nicht mehr geladen | Kein Einfluss auf Ladezeit oder SEO. Kann bei Gelegenheit gelöscht werden. |
| Bilder unter `/api/media/` tragen `X-Robots-Tag: noindex` (API-weit) | Produktbilder erscheinen dadurch nicht in der Google-Bildersuche. Bewusst so belassen, das ist eine Entscheidung des Betreibers. |

## 3. Was geändert wurde

### 3.1 Aktuelle Produkte und Events für Crawler (Live-Rendering im Worker)

**Ablauf bei jedem Aufruf von `/`, `/produkte`, `/impressum`, `/datenschutz`:**

```
Crawler / Browser ──► Cloudflare Worker (worker/index.js)
                        1. holt die gebaute Seite aus dist/ (Static Assets)
                        2. sendet <head> sofort (Browser lädt schon Skripte, Styles, Fonts)
                        3. GET /api/public/site bei Railway (mit PROXY_SECRET, max. 1,5 s)
                        4. rendert die Seite mit denselben React-Komponenten (src/prerender.jsx)
                        5. sendet den Rest: fertiges HTML + JSON-LD + die Daten für den Browser
                      Fehler oder Timeout in 3.–4. → Schritt 5 mit dem Stand des Builds
```

- **Gleicher Code wie der Build:** `vite build --ssr src/prerender.jsx` erzeugt einen Renderer
  (`build/ssr/`). Das Build-Skript (`scripts/prerender.mjs`) und der Worker nutzen denselben. Vorgerendertes
  HTML und Browser-Darstellung kommen aus denselben Komponenten. Im Browser-Test sind die Überschriften
  mit und ohne JavaScript identisch.
- **Für Besucher keine sichtbare Änderung:** React rendert die Seite wie bisher selbst. Das vorgerenderte
  HTML ist bei aktivem JavaScript ausgeblendet (`.js [data-prerendered]`), so entsteht kein Hydration-Fehler
  und kein doppelter Inhalt. Neu ist nur, dass der Browser die Daten direkt aus der Seite liest
  (`<script id="site-data">`). Der kurze Lade-Bildschirm mit dem Logo entfällt dadurch meistens.
- **Last und Kontingent unverändert:** Bisher waren es pro Seitenaufruf ein Worker-Aufruf und ein
  Railway-Aufruf (Browser → `/api/public/site`). Jetzt sind es ebenfalls ein Worker-Aufruf und ein
  Railway-Aufruf (Worker → API), denn der separate Browser-Abruf entfällt.
- **Rechenzeit:** Das Rendern dauert in Node gemessen im Mittel 0,5 ms (erster Aufruf 5 ms) für die
  Startseite und 0,3 ms für `/produkte`. Der kostenlose Workers-Tarif erlaubt 10 ms CPU pro Anfrage, und
  Wartezeit auf das Netzwerk zählt nicht dazu. Das Worker-Bundle hat 351 KiB, gzip 82 KiB.
- **Robustheit:**
  - Timeout von 1,5 s und `try/catch` um Abruf und Rendering.
  - Fehlende Marker oder fehlende Konfiguration führen zur gebauten Seite.
  - Schlägt das Rendering fehl, lädt der Browser die Daten wie früher selbst.
  - Lokal getestet: API aus führt sofort zu Antwort 200 mit dem Build-Stand, falsches Secret ebenso,
    Timeout nach 1,5 s ebenso.
- **Einschränkung, ausdrücklich:** Fällt die API aus, sehen Crawler den Stand des letzten Builds. Der
  kann veraltet sein. Der Build holt sich den Stand selbst aus der Live-API. Ist die API beim Build nicht
  erreichbar, enthält der Rückfall keine Produkte, Events und Öffnungszeiten (die übrigen Texte schon).
  Wann Google oder ein KI-System eine Seite neu abruft, lässt sich nicht steuern. Aktuell ist das HTML
  zum Zeitpunkt des Abrufs.
- Der eigenständige Node-Server (`npm start`, nicht in Produktion genutzt) liefert weiterhin den Build-Stand.

### 3.2 Strukturierte Daten (`src/seo/structuredData.js`)

Pro Seite gibt es genau einen JSON-LD-Block mit `@graph`. Alle Verweise (`@id`) lösen sich innerhalb des
Blocks auf.

| Seite | Typen |
| --- | --- |
| `/` | `WebSite`, `ConvenienceStore`, `WebPage` (`about` → Geschäft), `Event` je kommendem Event |
| `/produkte` | `WebSite`, `ConvenienceStore`, `CollectionPage`, `BreadcrumbList`, `ItemList` (49 Einträge, Reihenfolge wie auf der Seite) |
| `/impressum`, `/datenschutz` | `WebSite`, `ConvenienceStore`, `WebPage`, `BreadcrumbList` |

- **Geschäft (`ConvenienceStore`):**
  - Name, Kurzname, Beschreibung (der „Über uns“-Text der Seite), Logo, Adresse als `PostalAddress`, Kartenlink.
  - Öffnungszeiten aus der Datenbank, gleiche Tage zusammengefasst.
  - Leistungen ohne „BALD VERFÜGBAR“.
  - Telefon, E-Mail, Zahlungsarten und Social-Profile nur, wenn sie in `siteContent.js` gepflegt sind
    (derzeit leer, also weggelassen).
- **Event:**
  - Name, Beschreibung, Start und Ende, Status, Präsenz-Event.
  - Ort als `Place` mit der Ladenadresse, wie die Seite den Ort darstellt („Vor dem Laden“ als Name).
  - Bild, Veranstalter.
  - Bei Eintritt 0 € steht `isAccessibleForFree`, bei Preis ein `Offer` in EUR.
  - Die Events erscheinen nur, solange sie auf der Startseite stehen. Durch das Live-Rendering
    verschwinden vergangene Events sofort.
- **Bewusst weggelassen:**
  - `AggregateRating` und `Review`: Google ignoriert selbst ausgezeichnete Bewertungen für lokale Unternehmen.
  - `Product` mit Preisen: Die Einträge sind Warengruppen, keine Einzelartikel, und der einzige Preis ist
    vermutlich falsch.
  - `FAQPage`.
  - Geokoordinaten, Preisspanne, Einzugsgebiet: nicht belegt.

### 3.3 Vorrendern abgesichert

- `useReveal` startet beim Vorrendern als „sichtbar“. So sind Überschriften, Hero-Schriftzug und
  Öffnungszeiten ohne JavaScript lesbar. Im Browser ist das Verhalten unverändert.
- Der Event-Countdown und der Cookie-Banner werden nicht vorgerendert. Bereits aus Runde 1 neutralisiert:
  „Jetzt geöffnet“, Zähler, „Lädt…“.
- Die Inhalts-Region steht zwischen `<!--ssr-->`-Markern. Der Worker ersetzt nur diesen Teil.
- Das Build-Skript bricht ab, wenn `siteUrl` keine gültige Adresse ist, und warnt bei Nicht-HTTPS-Testbuilds.

### 3.4 Weiterleitungen, Preview-Umgebungen, Domainwechsel

| Anfrage | Antwort |
| --- | --- |
| `/index.html`, `/produkte.html`, `/impressum.html`, `/datenschutz.html` | **301** auf die saubere URL (Query bleibt erhalten) |
| `/produkte/`, `/impressum/`, `/datenschutz/` | **301** auf die URL ohne Schrägstrich |
| `/events` | 301 auf `/#events` (wie bisher) |
| unbekannte Pfade | 404 |
| Preview-Host `<version>-snackpoint.<konto>.workers.dev` | Seiten mit `X-Robots-Tag: noindex`, `robots.txt` mit `Disallow: /` |
| Hosts in `REDIRECT_HOSTS` (optional, nach dem Domainwechsel) | Seiten, `robots.txt`, `sitemap.xml`: **301** auf `SETTINGS.siteUrl` (die API bleibt erreichbar) |

- **Eine Stelle für die Domain:** `SETTINGS.siteUrl` in `src/data/siteContent.js`. Daraus entstehen
  Canonical, `og:url`, Sitemap, `robots.txt`, JSON-LD und der Preview-Abgleich im Worker.
- **Testbuilds:** `VITE_SITE_URL=http://localhost:8787 npm run build` überschreibt die Domain.
- **Keine localhost-Adressen:** Der Produktions-Build wurde darauf geprüft, und das Prüfskript kontrolliert es.
- **Seitenliste:** Die öffentlichen Seiten stehen zentral in `PUBLIC_PAGES`. `run_worker_first` in
  `wrangler.jsonc` muss dazu passen (Kommentar dort).

### 3.5 robots.txt und KI-Crawler

Die `robots.txt` enthält genau eine Gruppe `User-agent: *` mit diesen Regeln:
- `Allow: /`
- `Disallow: /api/`
- `Allow: /api/public/`
- `Allow: /api/media/`
- dazu die `Sitemap`-Zeile.

Es gibt **keine Sonderregeln für einzelne Bots**, das entspricht dem bisherigen Stand.

| Crawler | Zweck laut Anbieter | Status |
| --- | --- | --- |
| Googlebot | Google-Suche | erlaubt |
| Bingbot | Bing-Suche | erlaubt |
| OAI-SearchBot | Suche in ChatGPT | erlaubt |
| ChatGPT-User | Abruf auf Nutzeranfrage in ChatGPT | erlaubt |
| Claude-SearchBot | Suche in Claude | erlaubt |
| Claude-User | Abruf auf Nutzeranfrage in Claude | erlaubt |
| PerplexityBot | Suche in Perplexity | erlaubt |
| Perplexity-User | Abruf auf Nutzeranfrage in Perplexity | erlaubt |
| GPTBot (OpenAI), ClaudeBot (Anthropic) | **Training** | unverändert erlaubt (keine Regel), **nicht** geändert |
| Google-Extended (Steuer-Token, kein eigener Crawler) | Gemini-Training **und** Grounding in Gemini-Apps, laut Google ohne Einfluss auf die Google-Suche | unverändert erlaubt. Eine Sperre würde auch die Sichtbarkeit in Gemini verringern. |

- **Geprüft:** Das Prüfskript wertet die `robots.txt` nach RFC 9309 für alle Such-Crawler oben aus,
  zusätzlich für Applebot und DuckDuckBot. Alle dürfen die Seiten lesen und keiner `/api/admin`.
- **Training ausschließen?** Das ist deine Entscheidung und wurde nicht umgesetzt. Möglich wären eigene
  Gruppen für `GPTBot` und `ClaudeBot` mit `Disallow: /`. Such-Crawler bleiben davon unberührt.
- **Achtung:** Cloudflare kann eine eigene, verwaltete `robots.txt` voranstellen oder KI-Bots per Einstellung
  blockieren. Das ist im Code nicht sichtbar und muss im Dashboard geprüft werden (Teil C).
- **llms.txt nicht angelegt:** Keiner der genannten Such-Crawler dokumentiert, dass er `llms.txt` auswertet.
  Sie ist kein Rankingfaktor und keine Voraussetzung für KI-Sichtbarkeit. Außerdem würde sie Angaben wie
  Öffnungszeiten doppelt führen, die dann veralten können. Die gleichen Informationen stehen jetzt aktuell
  im HTML und im JSON-LD. Bei Bedarf lässt sich eine `llms.txt` später aus denselben Daten erzeugen.

### 3.6 Lokale Suche

Die Seiten nennen bereits:
- Ort und Adresse in Titel und Meta-Description der Startseite, im „Über uns“-Text, im Standort-Bereich und im Footer.
- Den Ort auch im Sortiment-Text und im JSON-LD (`PostalAddress`).

Inhaltlich gedeckt und genutzt sind diese Suchbegriffe:
- Kiosk Kaufbeuren
- DHL Paketshop Kaufbeuren
- Lotto-Annahmestelle Kaufbeuren
- Snacks, Süßigkeiten und Getränke aus aller Welt
- Energy Drinks
- Tabakwaren
- Kaffee to go
- Zeitschriften
- Neugablonzer Straße

**„Streetfood Kaufbeuren“, „Imbiss Kaufbeuren“, „Essen Kaufbeuren“ habe ich nicht eingebaut.** Die Website
beschreibt keinen Imbiss und kein warmes Essen. Das Essensangebot (Ihle) steht als „BALD VERFÜGBAR“. Diese
Begriffe ohne passendes Angebot zu verwenden, wäre eine erfundene Angabe. Sobald das Ihle-Angebot startet,
passen „Sandwiches“, „Snacks to go“ und „Frühstück to go Kaufbeuren“. Sie sollten dann im Text der Leistung
stehen und in den Meta-Daten der Startseite.

### 3.7 Performance und technische Qualität

| Prüfpunkt | Ergebnis |
| --- | --- |
| CLS | 0,001 (lokal, Handy-Emulation), Bilder haben feste CSS-Größen |
| Bilder | Klein (Logo 150 px, Logos ≤ 240 px), Produkt- und Eventbilder mit `loading="lazy"`, Medien-URLs mit Prüfsumme und `immutable` |
| JavaScript | Startseite ca. 78 KB gzip (React 46 KB + App 32 KB), keine Bibliotheken für 3D mehr im Bundle |
| Caching | `/assets/*` ein Jahr `immutable`, HTML `max-age=0, must-revalidate` (damit immer aktuell) |
| Fonts | Google Fonts mit `preconnect` und `display=swap` (unverändert, Design bleibt) |
| Barrierefreiheit | Eine `<h1>` pro Seite, saubere Hierarchie h1 → h2 → h3, Landmarks (`header`, `nav`, `main`, `footer`), `lang="de"`, Alt-Texte, `aria-label` am Schriftzug |

**Ladezeit-Messung** (lokal, Handy-Emulation: 4-fache CPU-Drosselung, 150 ms Latenz, ca. 1,6 Mbit/s, gzip, je 5 bis 7 Läufe, Median):

| Variante | React-Inhalt sichtbar | LCP |
| --- | --- | --- |
| bisher (statisches HTML, Browser lädt Daten) | 1294 / 1323 ms | 832–872 ms (Messreihe A), 1892–1904 ms (Messreihe B) |
| neu (Worker rendert, Daten in der Seite) | 1279 / 1298 ms | 948–960 ms (A), 1928–1940 ms (B) |

- React zeigt die Seite neu gleich schnell oder minimal früher. Der LCP lag lokal 35–120 ms höher.
- Das LCP-Element ist in beiden Varianten der **Cookie-Banner-Text**. Der Hero-Schriftzug fliegt mit einer
  Opacity-Animation ein und zählt deshalb nicht.
- Lokal hat die API praktisch keine Latenz. In Produktion spart die neue Variante den zusätzlichen Weg
  Browser → Cloudflare → Railway. Erwartet wird deshalb kein messbarer Nachteil.
- **Bitte nach dem Deployment mit PageSpeed Insights gegenprüfen.**

### 3.8 Texte

Zwei Sätze wurden mit Satzzeichen getrennt, ohne inhaltliche Änderung:
- „Über uns“: „… Lottoschein abgeben: Hier bist du in besten Händen.“
- „Neu eingetroffen“: „… aus aller Welt, von internationalen Klassikern …“

## 4. Betroffene Dateien

Diese Liste umfasst Runde 1 und dieses Audit. Alles ist unkommittet.

| Datei | Änderung |
| --- | --- |
| `worker/index.js` | Live-Rendering der öffentlichen Seiten, 301-Weiterleitungen, Preview-Schutz, `REDIRECT_HOSTS`. API-Proxy unverändert. |
| `wrangler.jsonc` | `run_worker_first`: zusätzlich die 4 Seiten, ihre `.html`- und Schrägstrich-Varianten, `robots.txt`, `sitemap.xml` |
| `src/prerender.jsx` (neu) | Server-Renderer: `renderRegion()` für Build und Worker |
| `src/seo/structuredData.js` (neu) | JSON-LD je Seite, Liste der öffentlichen Seiten |
| `scripts/prerender.mjs` (neu) | Build-Schritt: Head-Tags, vorgerenderte Seiten, `sitemap.xml`, `robots.txt` |
| `scripts/check-seo.mjs` (neu) | Prüfskript `npm run test:seo` |
| `src/site/env.js` (neu) | `IS_PRERENDER` |
| `src/site/SiteProvider.jsx` | Daten aus der Seite übernehmen, sonst wie bisher laden, `StaticSiteProvider` |
| `src/hooks/useReveal.js`, `src/hooks/useCountUp.js` | Beim Vorrendern sofort sichtbar und Endwert |
| `src/components/events/Events.jsx`, `Header.jsx`, `Location.jsx`, `Wishes.jsx`, `CookieConsent.jsx` | Keine zeitabhängigen oder funktionslosen Teile im vorgerenderten HTML |
| `src/components/products/ProduktePage.jsx` | Rendern ohne `window` |
| `src/index.css` | `.js [data-prerendered] { display: none }` |
| `src/data/siteContent.js` | `siteUrl` (überschreibbar per `VITE_SITE_URL`), zwei Textkorrekturen |
| `index.html`, `produkte.html`, `impressum.html`, `datenschutz.html` | Titel und Beschreibungen, `js`-Klasse |
| `Footer.jsx`, `NewProducts.jsx`, `CookieConsent.jsx`, `responseBuilder.ts`, `chatbotKnowledge.ts`, `App.jsx`, `BannersPromotions.jsx`, `adminEntities.js` | Saubere URLs (`/produkte` statt `/produkte.html`), Footer-Link „Sortiment“ |
| `vite.config.js` | Saubere URLs im Dev-Server, Einstellungen für den Server-Renderer-Build |
| `server/node.js` | Saubere URLs im eigenständigen Server |
| `package.json` | `build` (3 Schritte), `test:seo` |
| `.gitignore` | `build/` |
| `ADMIN.md` | Architektur, Worker-Variable `REDIRECT_HOSTS`, Domainwechsel, Tests |
| `docs/seo-geo-report.md`, `docs/seo-geo-final-audit.md` | Berichte |

## 5. Tests

| Test | Ergebnis |
| --- | --- |
| `npm run build` (Produktion, Live-API nur lesend) | erfolgreich. 4 Seiten vorgerendert, keine localhost-Adressen in `dist/` und `build/`. |
| `npx wrangler deploy --dry-run` (nichts veröffentlicht) | Bundle 351 KiB / gzip 82 KiB, React in Produktionsversion |
| `npm test` (Chat-Assistent) | 85 von 85 bestanden |
| `npm run test:server` (API, lokale Testdatenbank) | 46 von 46 bestanden |
| `npx tsc --noEmit` | keine Fehler |
| `npm run test:seo` gegen `wrangler dev` (Test- und Produktions-Build) | 80 von 80 bestanden: robots.txt je Crawler, Sitemap, Statuscodes, 301/404, Meta-Tags, eindeutige Titel, `<h1>`, `noindex` nur im Admin, keine zeitabhängigen Zustände, JSON-LD inkl. Event, Breadcrumb und ItemList, interne Links |
| Browser-Test (Playwright): 4 Seiten × Desktop/Handy × mit/ohne JavaScript | 16 von 16 ohne Konsolenfehler. Überschriften mit und ohne JavaScript identisch, kein Rest des vorgerenderten HTML im Browser, kein zusätzlicher API-Abruf. |
| Sichtprüfung ohne JavaScript | alle Texte sichtbar, inklusive Schriftzug und Öffnungszeiten |
| Aktualität | Lokales Test-Event angelegt: sofort im HTML und JSON-LD, ohne Neubau |
| Adminpanel (lokal, Test-Konto) | Anmeldung, Produkte, Events, Startseite fehlerfrei. Eine Startseiten-Änderung erschien sofort im HTML für Crawler und wurde danach zurückgesetzt. |
| Ausfall | API aus oder falsches Secret: Seite kommt mit Status 200 im Build-Stand. Timeout greift nach 1,5 s (ursprünglich 3 s, siehe Nachtrag Ladeverhalten). |
| Preview und alte Domain | Preview-Host liefert `noindex` und `Disallow: /`. `REDIRECT_HOSTS` leitet Seiten per 301 um, die API nicht. |
| Aufräumen | Test-Event, Test-Admin, Sitzungen und Audit-Einträge in der lokalen DB gelöscht. Startseiten-Etikett wiederhergestellt. Alle Testserver beendet. |

## 6. Einschränkungen

1. **Aktualität hängt an der API:** Ist Railway nicht erreichbar, sehen Crawler den Build-Stand
   (siehe 3.1). Ohne zusätzliche Infrastruktur (etwa Workers KV als Zwischenspeicher) geht es nicht
   besser. KV wäre eine Cloudflare-Änderung und ist deshalb nicht umgesetzt.
2. **Kein Cache für das gerenderte HTML:** Jeder Seitenaufruf fragt die API, genau wie vorher der Browser.
   Für einen Kiosk ist das unkritisch. Cloudflare dokumentiert die Cache-API für eigene Domains, auf
   `*.workers.dev` ist sie möglicherweise wirkungslos. Das gilt auch für den bestehenden Bilder-Cache.
3. **Ladezeit:** Die lokale Messung ist nur ein Richtwert (siehe 3.7). Belastbar sind erst Felddaten nach
   dem Deployment.
4. **Kein echtes Server-Rendering für Besucher:** React baut die Seite im Browser neu auf und übernimmt das
   HTML nicht („Hydration“). Damit bleiben Design und Animationen garantiert unverändert. Hydration könnte
   den LCP deutlich verbessern, bräuchte aber Umbauten an den Animationen. Das wäre ein eigenes Projekt.
5. **Indexierung, Rich Results und KI-Antworten** entscheiden Google, Bing, OpenAI, Anthropic, Perplexity
   und Google Gemini selbst. Der Code schafft die Voraussetzungen, garantiert aber keine Platzierung.
6. **Unvollständige Daten:**
   - Telefon, E-Mail, Zahlungsarten, Parken und Social-Profile sind leer.
   - Im Impressum fehlen Betreiber und Rechtsform.
   - Für die lokale Suche und KI-Antworten sind genau diese Angaben besonders wertvoll.

## 7. Maßnahmen außerhalb des Codes

1. **Freigabe und Deployment** (durch dich): Commit, Push, Cloudflare baut automatisch.
   - Wichtig: `wrangler.jsonc` ändert das Routing, die vier Seiten laufen danach durch den Worker.
   - Rückweg: den Commit zurücknehmen und erneut deployen.
2. **Direkt nach dem Deployment prüfen:**
   - `node scripts/check-seo.mjs https://snackpoint.mucahitbayar.workers.dev` (nur lesend).
   - Seite mit und ohne JavaScript ansehen.
   - Cloudflare → Worker → Logs auf „Stand vom Build ausgeliefert“ prüfen.
3. **Cloudflare → AI Crawl Control / Bots:**
   - Prüfen, ob „Block AI bots“ oder eine verwaltete `robots.txt` aktiv ist.
   - Das kann OAI-SearchBot, Claude-SearchBot und PerplexityBot sperren.
   - Danach `/robots.txt` live ansehen.
4. **Google Search Console und Bing Webmaster Tools:** Domain bestätigen, `sitemap.xml` einreichen,
   „URL-Prüfung“ für `/` und `/produkte`.
5. **Google-Unternehmensprofil:** Gleiche Adresse, gleiche Öffnungszeiten, Website-Link, Kategorie(n),
   Fotos. Es ist für „Kiosk Kaufbeuren“ wichtiger als jede Code-Maßnahme.
6. **Daten im Adminpanel:** Preis von „Fruchtgummi-Mix“ prüfen, Widerspruch Ihle/Sandwiches klären.
7. **Daten in `siteContent.js`:** Telefon, E-Mail, Zahlungsarten, Social-Profile und Betreiber eintragen,
   soweit vorhanden. Sie erscheinen dann automatisch im JSON-LD.
8. **Vorschaubild:** Ein Foto oder eine Grafik mit 1200 × 630 px liefern. Danach `og:image` umstellen und
   `twitter:card` auf `summary_large_image` setzen.
9. **Eigene Domain (später):**
   - Custom Domain im Worker einrichten.
   - `SETTINGS.siteUrl` umstellen und deployen.
   - `REDIRECT_HOSTS` = alte `workers.dev`-Adresse setzen.
   - In der Search Console die neue Property anlegen, die Sitemap einreichen und ggf. die Adressänderung melden.
10. **Training-Crawler:** Entscheiden, ob GPTBot und ClaudeBot gesperrt werden sollen (siehe 3.5).

## Produktionsprüfung (Nachtrag)

Gezielte Prüfung der Umsetzung vor der Veröffentlichung. Zwei Probleme wurden nachgewiesen und behoben,
alles andere ist unverändert.

**Behoben**

1. **CPU-Grenze bei großem Sortiment:**
   - Messung mit dem Worker-Build von React: 65 Produkte unter 1 ms, beim ersten Aufruf 5 ms.
     `/produkte` mit 1.000 Produkten rund 5 ms Rendern plus JSON-Verarbeitung. Mit 3.000 Produkten 17 ms.
   - Über 10 ms (Free-Tarif) würde Cloudflare die Anfrage abbrechen. Weil der Kopf der Seite schon
     gesendet ist, käme eine abgeschnittene Seite an.
   - Neu: Ist die API-Antwort größer als 200.000 Zeichen (heute 23.000, entspricht rund 550 Produkten),
     geht die Seite im Build-Stand raus (`MAX_LIVE_BYTES` in `worker/index.js`).
2. **Umleitung bei `REDIRECT_HOSTS`:** Ein Pfad wie `//andere-domain` hätte auf eine fremde Domain geführt.
   Über das aktuelle Routing war das nicht erreichbar, der Code ist trotzdem korrigiert.

**Bestätigt ohne Änderung**

| Prüfpunkt | Ergebnis |
| --- | --- |
| Routing | Nur die 4 Seiten, ihre `.html`- und Schrägstrich-Varianten, `robots.txt`, `sitemap.xml` und `/api/*` laufen durch den Worker. Assets und `/admin` kommen direkt aus `dist/` (Assets `immutable`, Admin `no-store` + `noindex`). HEAD liefert 200, POST auf Seiten 405, unbekannte Pfade 404 (leere Cloudflare-Standardseite), Weiterleitungen 301. |
| Worker-Aufrufe | Pro Seitenaufruf wie bisher einer. Der Abruf der Seitendaten lief vorher auch durch den Worker. |
| API-Ausfall (9 Fälle) | API aus, Antwort hängt vor oder während der Daten, HTTP 500, kaputtes JSON, falsche Struktur, zu groß: immer HTTP 200 und vollständiges HTML. Der Seitenkopf kommt nach ca. 5 ms, der Rest spätestens nach 3,0 s, inzwischen 1,5 s (Timeout greift auch bei hängender Antwort). |
| Verzögerung bei API-Ausfall | (Stand dieser Prüfung, inzwischen verbessert, siehe Nachtrag Ladeverhalten) Hängt die API, bleibt die Seite für Besucher bis zu 3 s leer, danach erscheint der Ladebildschirm. Vorher erschien er sofort und wartete auf die API. Bei einer abgelehnten Verbindung oder einem Fehler gibt es keine Verzögerung. |
| Caching | HTML: `max-age=0, must-revalidate` ohne ETag. Browser laden es also jedes Mal neu, und Cloudflare speichert Worker-Antworten nicht. Die API-Daten haben höchstens 5 s CDN-Cache (`CDN-Cache-Control`). Nur bei Fehlern des Ursprungs darf ein älterer Stand ausgeliefert werden (`stale-if-error`). Assets sind über Hash-Namen versioniert. |
| XSS | Präparierte Produkt- und Eventdaten mit `</script>`, `<script>`, `onerror`, `<!--`, U+2028 in der lokalen DB. Ergebnis: nur als Text angezeigt, kein Skript ausgeführt (mit und ohne JavaScript), JSON-LD und Inline-Daten bleiben gültiges JSON, keine zusätzlichen `<script>`-Tags. Banner-Links lässt der Server nur mit `https://`, `/`, `#`, `mailto:`, `tel:` zu. |
| Datenschutz | Die Seite enthält nur die Daten von `/api/public/site`, die ohnehin öffentlich sind. Keine Secrets, keine Admin- oder internen Daten. Fehlerdetails stehen nur im Worker-Log. |
| React | `createRoot` ersetzt das vorgerenderte HTML, es gibt keine Hydration und damit keine Hydration-Fehler. Vor dem Laden des JavaScript ist der vorgerenderte Inhalt im DOM, aber unsichtbar (0 sichtbare Zeichen), danach vollständig entfernt. Es gibt keinen API-Abruf für die Seitendaten und keinen Ladebildschirm, wenn die Daten in der Seite stehen. Die Überschriften sind mit und ohne JavaScript identisch. |
| SEO | Canonical, Open Graph und JSON-LD nur auf den 4 öffentlichen Seiten. `admin.html` hat nichts davon, steht nicht in der Sitemap und ist `noindex`. API und Preview-Hosts sind `noindex`. |

**Tests erneut:**
- `npm test` 85 von 85, `npm run test:server` 46 von 46, `tsc` ohne Fehler, `npm run test:seo` alle bestanden.
- Browser-Test 16 von 16, Admin-Ablauf fehlerfrei.
- Produktions-Build ohne localhost, Worker-Bundle 82 KiB gzip.
- Die lokalen Testdaten sind wieder entfernt.

## Ladeverhalten bei langsamer oder ausgefallener API (Nachtrag)

**Warum die Seite zunächst leer bleibt:**
- Der Worker sendet `<head>` sofort, den `<body>` erst, wenn die Daten da sind oder der Timeout greift.
- Bis dahin kann der Browser nichts zeichnen. Die Seiten-Skripte sind Module, und Module laufen erst,
  wenn das ganze HTML angekommen ist. Deshalb kann React auch den Ladebildschirm nicht früher zeigen.
- Hängt danach auch der Datenabruf des Browsers, blieb der Ladebildschirm bisher **unbegrenzt** stehen.
  Das gab es schon vor der SEO-Arbeit, lokal nachgewiesen.

**Live gemessen** (25 Abrufe, über den Worker): Antwortzeit der API Median 148 ms, p90 186 ms, Maximum 318 ms.

**Geändert:**
1. Worker-Timeout von 3 s auf **1,5 s** (`API_TIMEOUT_MS`). Das ist das Fünffache des gemessenen
   Maximums. Crawler bekommen weiterhin Live-Daten, nur bei echten Störungen den Build-Stand.
2. Der Datenabruf im Browser bricht nach **10 s** ab (`FETCH_TIMEOUT_MS` in `src/site/SiteProvider.jsx`).
   Danach erscheint die vorhandene Fehlerseite mit „Erneut versuchen“. Browser ohne
   `AbortSignal.timeout` verhalten sich wie bisher.

**Ergebnis bei hängender API** (lokal mit Mock-Server, Handy-Ansicht):

| | vorher | jetzt |
| --- | --- | --- |
| leere Seite | bis 3,3 s | bis ca. 1,7 s |
| Ladebildschirm | ab 3,3 s, unbegrenzt | ab ca. 1,7 s |
| Fehlerseite mit „Erneut versuchen“ | nie | nach ca. 11,8 s |
| API wieder da, „Erneut versuchen“ | n/a | Seite lädt normal |

Bei abgelehnter Verbindung, HTTP-Fehler oder kaputten Daten greift der Rückfall weiterhin sofort,
ohne Wartezeit. Im Normalfall ändert sich nichts.

**Bewusst nicht geändert:**
- **Vorgerendertes HTML für Besucher sofort sichtbar machen** (auch bei langsamem JavaScript):
  - React ersetzt das vorgerenderte HTML, statt es zu übernehmen.
  - Wäre es sichtbar, stünde der Inhalt erst statisch da, verschwände beim Start von React und flöge dann
    animiert neu ein. Das wäre ein deutliches Aufblitzen.
  - Ohne das bräuchte es Hydration. Dafür müssten die Einblend-Animationen umgebaut werden, weil Inhalte
    oben auf der Seite dann schon sichtbar wären. Das wäre eine optische Änderung und ein größerer Umbau.
  - Per Screencast geprüft: Kein gezeichneter Frame zeigt vorgerendertes HTML, auch nicht im Fehlerfall.
- **Ladebildschirm schon während der Wartezeit:** Er bräuchte eigenes HTML außerhalb von React. Im
  Normalfall würde er kurz aufblitzen, beim Rückfall zweimal erscheinen.
- **Funktionsfähige Seite mit Build-Daten bei API-Ausfall:** Möglich wäre, die Daten des Builds in die
  Seite zu legen. Dann zeigte die Seite bei einem Ausfall statt der Fehlerseite den Stand des letzten
  Deployments. Der kann aber veraltet sein (Öffnungszeiten, abgelaufene Events). Das ist eine inhaltliche
  Entscheidung und deshalb nicht umgesetzt.
- **Langsames JavaScript:** Crawler und Browser ohne JavaScript bekommen die Inhalte sofort. Besucher mit
  JavaScript sehen sie nach dem Laden der Skripte, wie vor der SEO-Arbeit. Gegenüber damals entfällt der
  separate Datenabruf.

## Übersicht A / B / C

### A: Technisch im Code vollständig umgesetzt

- Aktuelle Produkte, Events und Öffnungszeiten im HTML für Crawler (Live-Rendering, sicherer Rückfall)
- Vollständiges HTML ohne JavaScript auf allen öffentlichen Seiten, ohne zeitabhängige Zustände
- Titel, Description, Canonical, Open Graph, Twitter Card je Seite, eindeutig
- JSON-LD: WebSite, ConvenienceStore, WebPage/CollectionPage, BreadcrumbList, ItemList, Event
- `sitemap.xml`, `robots.txt` (Such- und KI-Suchcrawler erlaubt, interne API ausgeschlossen, Training unverändert)
- 301 für doppelte URLs, 404 für Unbekanntes, `noindex` für Admin, API und Preview-URLs
- Zentrale Basis-URL, Schutz vor localhost-Adressen, vorbereiteter Domainwechsel (`REDIRECT_HOSTS`)
- Prüfskript `npm run test:seo`, Doku in `ADMIN.md`

### B: Technisch offen oder eingeschränkt

- Rückfall auf den Build-Stand bei API-Ausfall (ohne zusätzliche Infrastruktur nicht vermeidbar) oder bei mehr als ca. 550 Produkten (CPU-Grenze des Free-Tarifs)
- Kein HTML-Cache, Cache-API auf `workers.dev` eventuell wirkungslos
- Ladezeit-Effekt nur lokal gemessen, Felddaten stehen aus
- Hydration als möglicher späterer LCP-Gewinn (würde Animationen berühren)
- Großes Vorschaubild fehlt (Bildmaterial nötig)
- Fehlende Kontakt- und Betreiberdaten (Inhalt nötig)

### C: Spätere externe Maßnahmen

- Freigabe, Deployment, Live-Prüfung
- Cloudflare AI Crawl Control / verwaltete robots.txt prüfen
- Google Search Console, Bing Webmaster Tools, Sitemap einreichen
- Google-Unternehmensprofil pflegen
- Eigene Domain, danach `siteUrl` und `REDIRECT_HOSTS`
- Entscheidung zu Training-Crawlern

## Quellen

- [OpenAI: Crawler (GPTBot, OAI-SearchBot, ChatGPT-User)](https://developers.openai.com/api/docs/bots)
- [Anthropic: Crawler (ClaudeBot, Claude-SearchBot, Claude-User)](https://support.claude.com/en/articles/8896518)
- [Perplexity: Crawler (PerplexityBot, Perplexity-User)](https://docs.perplexity.ai/docs/resources/perplexity-crawlers.md)
- [Google: Common Crawlers inkl. Google-Extended](https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers)
- [Cloudflare Workers: Limits (CPU-Zeit, Anfragen)](https://developers.cloudflare.com/workers/platform/limits/)
- [Cloudflare Static Assets: `run_worker_first`](https://developers.cloudflare.com/workers/static-assets/binding/)
- [Cloudflare Static Assets: `_headers` gilt nicht für Worker-Antworten](https://developers.cloudflare.com/workers/static-assets/headers/)
- [Cloudflare Workers: Cache API](https://developers.cloudflare.com/workers/runtime-apis/cache/)
