# SnackPoint – Adminpanel, Backend & Datenbank

Was sich im Tagesgeschäft ändert – **Produkte, Kategorien, Events, Banner, Aktionen, Bilder, Öffnungszeiten** –
liegt in einer PostgreSQL-Datenbank und wird im Adminpanel unter **`/admin`** gepflegt.

**Texte, Kontaktdaten, Social-Media-Links, Google-Bewertung, rechtliche Angaben, Leistungen und Bewertungen**
pflegt der Entwickler im Code: [`src/data/siteContent.js`](src/data/siteContent.js) bearbeiten, committen,
pushen – Cloudflare deployt automatisch.

```
Browser ──► Cloudflare (Worker + Static Assets, eine Domain)
              ├─ /admin, Skripte, Bilder        ← dist/ (Vite-Build)
              ├─ /, /produkte, /impressum, /datenschutz  ← dist/, im Worker mit aktuellen Daten gerendert
              └─ /api/*  ──(PROXY_SECRET)──►  Railway: API-Dienst (server/node.js, Hono)
                                                        └──► Railway: PostgreSQL (Inhalte + Bilder)
```

Für den Browser liegt alles auf derselben Domain – Login-Cookie und CSRF-Schutz funktionieren ohne CORS.
Die Railway-Adresse der API antwortet nur auf Anfragen, die das gemeinsame `PROXY_SECRET` mitschicken
(also nur über den Worker).

Die öffentlichen Seiten kommen als fertiges HTML mit den aktuellen Produkten, Events und Öffnungszeiten
beim Besucher an (auch bei Suchmaschinen und KI-Crawlern ohne JavaScript): Der Worker holt dafür bei
jedem Aufruf `/api/public/site` und rendert die Seite (`src/prerender.jsx`). Antwortet die API nicht
innerhalb von 1,5 Sekunden, geht die Seite im Stand des letzten Builds raus. Daten und gerenderte Seiten
bleiben 5 Sekunden im Speicher des Workers. Speichern im Adminpanel leert diesen Speicher sofort. Details:
`docs/seo-geo-final-audit.md`.

| Ordner / Datei | Inhalt |
| --- | --- |
| `server/app.js` | API: `/api/public`, `/api/media`, `/api/auth`, `/api/admin` |
| `server/routes/` | Endpunkte (CRUD, Medien, Öffnungszeiten, Benutzer, Dashboard, Backup) |
| `server/auth/` | Passwort-Hashing (Argon2id), Sessions, CSRF, Login-Sperre |
| `server/db/migrations/` | SQL-Migrationen (werden genau einmal, in Reihenfolge, angewendet) |
| `server/db/seedData.js` | Ursprüngliches Sortiment + Öffnungszeiten (einmalige Erstbefüllung) |
| `src/data/siteContent.js` | Texte, Kontakt, Rechtliches, Leistungen, Bewertungen der Webseite (im Code gepflegt) |
| `src/admin/` | Das Adminpanel |
| `src/site/SiteProvider.jsx` | Lädt die Inhalte für die Webseite |
| `src/prerender.jsx`, `src/seo/structuredData.js`, `scripts/prerender.mjs` | Fertiges HTML, JSON-LD, `sitemap.xml`, `robots.txt` (Suchmaschinen und KI-Crawler) |
| `worker/index.js`, `wrangler.jsonc`, `public/_headers` | Cloudflare (Worker, Seiten, Header) |
| `.railway/railway.ts` | Railway-Konfiguration als Code (Build, Migration beim Deploy, Start, Health-Check); Änderungen mit `npx railway config plan` / `apply` |

---

## 1. Lokal starten

Voraussetzungen: Node.js ≥ 22.6, Docker (für die lokale Datenbank).

```bash
npm install
cp .env.example .env          # lokale Einstellungen (nicht in Git)
npm run db:up                 # startet PostgreSQL in Docker (Port 5442)
npm run db:seed               # legt die Tabellen an + übernimmt alle bisherigen Inhalte
npm run admin:create          # Admin-Konto anlegen (fragt E-Mail + Passwort ab)
npm run dev                   # Webseite + Adminpanel + API: http://localhost:5173
```

- Webseite: <http://localhost:5173>, Adminpanel: <http://localhost:5173/admin>
- `npm run dev` startet Webseite, Adminpanel **und** Backend zusammen (die API läuft im Vite-Server mit).
  Änderungen am Server-Code gelten ab der nächsten Anfrage.
- Produktions-Build lokal testen: `npm run build && npm start` → <http://localhost:3000>
- Cloudflare lokal nachstellen: `cp .dev.vars.example .dev.vars`, `npm run build`, dann
  `PROXY_SECRET=local-dev-secret npm run start:api` und in einem zweiten Terminal
  `npx wrangler dev --var API_ORIGIN:http://localhost:3000` → <http://localhost:8787>

### Tests

```bash
npm test               # Chat-Assistent (85 Tests, ohne Datenbank)
npm run test:server    # API-Tests (46 Tests) gegen die Test-Datenbank aus TEST_DATABASE_URL
npm run test:all       # beides
npm run test:seo       # robots.txt, Sitemap, Meta-Tags, JSON-LD, Statuscodes, Links (nur lesend)
                       # gegen den laufenden Worker (wrangler dev, Port 8787); andere Adresse:
                       # node scripts/check-seo.mjs https://snackpoint.mucahitbayar.workers.dev
```

`test:server` **löscht** die Datenbank in `TEST_DATABASE_URL` vor jedem Lauf vollständig und verweigert den Start,
wenn deren Name nicht „test“ enthält. Niemals auf eine echte Datenbank zeigen lassen.

---

## 2. Umgebungsvariablen

**Railway – API-Dienst** (Service → *Variables*):

| Variable | Pflicht | Beschreibung |
| --- | --- | --- |
| `DATABASE_URL` | ja | Verbindung der **eingeschränkten** Rolle `snackpoint_app` (nur Daten lesen/schreiben), siehe „Datenbank-Rechte“ unten |
| `MIGRATION_DATABASE_URL` | ja | `${{Postgres.DATABASE_URL}}` – Eigentümer-Zugang, nur für Migrationen, Erstbefüllung, Wiederherstellung und Kommandozeilen-Befehle |
| `PROXY_SECRET` | ja | Langer Zufallswert (`openssl rand -hex 32`), identisch mit dem Cloudflare-Secret |
| `NODE_ENV` | ja | `production` (Login-Cookie nur über HTTPS) |
| `MAX_UPLOAD_MB` | nein | Max. Bildgröße beim Upload (Standard 10). Handyfotos werden schon im Browser verkleinert. |
| `SESSION_IDLE_HOURS` | nein | Automatisches Abmelden nach Inaktivität (Standard 24 h) |
| `SESSION_MAX_DAYS` | nein | Maximale Sitzungsdauer (Standard 7 Tage) |
| `LOGIN_MIN_MS` | nein | Mindestdauer jeder Login-Antwort in ms (Standard 800) |
| `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | nein | Cloudflare-Turnstile-Botschutz für den Login (nur aktiv, wenn beide gesetzt sind) |
| `DATABASE_SSL` | nein | `true` / `false` / `no-verify`. Standard: aus für `localhost` und `*.railway.internal`, sonst an. Für die *öffentliche* Railway-DB-URL vom eigenen Rechner: `no-verify`. |
| `ALLOWED_ORIGINS` | nein | Nur nötig für Sonderfälle (zusätzliche Domains, die die Admin-API direkt aufrufen) |

**Cloudflare – Worker** (`wrangler.jsonc` bzw. Dashboard → Worker → *Settings → Variables*):

| Variable | Art | Beschreibung |
| --- | --- | --- |
| `API_ORIGIN` | Variable | Öffentliche URL des Railway-API-Dienstes, z. B. `https://snackpoint-api-production.up.railway.app` |
| `PROXY_SECRET` | **Secret** | Derselbe Wert wie auf Railway (`npx wrangler secret put PROXY_SECRET`) |
| `REDIRECT_HOSTS` | Variable, optional | Erst nach dem Umzug auf eine eigene Domain: alte Hostnamen (kommagetrennt, z. B. `snackpoint.mucahitbayar.workers.dev`), deren Seiten per 301 auf `SETTINGS.siteUrl` umleiten |

**Lokal** (`.env`, siehe `.env.example`): `DATABASE_URL`, `TEST_DATABASE_URL`.

Es gibt kein Session-Secret und keine API-Keys: Sessions sind zufällige Tokens, die nur gehasht in der
Datenbank liegen. Zugangsdaten stehen nirgends im Code; `.env` und `.dev.vars` sind in `.gitignore`.

---

## 3. Den ersten Admin sicher anlegen

Es gibt bewusst **keine** Registrierung im Web. Das Konto wird auf der Kommandozeile angelegt – wer das
kann, hat ohnehin Zugriff auf die Datenbank:

```bash
npm run admin:create
```

- Fragt E-Mail und Passwort ab (Passwort wird nicht angezeigt, mind. 12 Zeichen).
- Weigert sich, wenn schon ein Konto existiert.
- Für die Produktionsdatenbank auf Railway: Die Datenbank hat absichtlich **keine öffentliche Adresse**.
  Der Befehl läuft deshalb direkt im API-Container auf Railway (dort ist `DATABASE_URL` schon gesetzt):
  ```bash
  railway ssh --service snackpoint-api
  npm run admin:create        # im Container; danach: exit
  ```

### Weitere Konten

Weitere Konten legst du im Adminpanel unter **Benutzer** an (mit „Sicheres Passwort erzeugen“). Es gibt zwei
Rollen – auch serverseitig durchgesetzt:

| Rolle | Sieht |
| --- | --- |
| **Inhaber** | Dashboard, Produkte, Kategorien, Events, Banner & Aktionen, Medienbibliothek, Öffnungszeiten |
| **Entwickler** | zusätzlich Protokoll, Benutzer, Passwort ändern und die Datensicherung (Dashboard) |

Der Inhaber wendet sich für Texte, Kontaktdaten, Rechtliches, Passwörter usw. an den Entwickler. Per
Kommandozeile angelegte Konten sind Entwickler-Konten. Die eigene Rolle lässt sich nicht ändern. Anlegen, Löschen und das Setzen eines fremden Passworts musst du mit deinem eigenen
Passwort bestätigen; das eigene Konto lässt sich nicht löschen, es bleibt also immer mindestens eins übrig.

### Passwort ändern / vergessen

- Im Adminpanel: **Passwort ändern** (alle anderen Geräte werden dabei abgemeldet).
- Vergessen: `npm run admin:reset-password` (genauso im Container über `railway ssh`). Setzt ein neues Passwort,
  beendet alle Sitzungen und hebt eine Login-Sperre auf. Ein Zurücksetzen per E-Mail-Link ist absichtlich
  nicht eingebaut – dafür bräuchte es einen Mail-Dienst, und ein Link-Versand ist ein zusätzliches Einfallstor.

---

## 4. Bedienung des Adminpanels

Anmelden unter `/admin`. Das Panel funktioniert auch auf dem Smartphone (Menü oben links).

| Bereich | Was du dort machst |
| --- | --- |
| **Dashboard** | Zahlen auf einen Blick, nächste Events, letzte Änderungen, Schnellaktionen |
| **Produkte** | Anlegen, bearbeiten, löschen; Preis, Bild, Beschreibung, Allergene; Schalter *Aktiv*; *Bald verfügbar* / *Ausverkauft*; *Im Produktkatalog anzeigen* (die Seite „Produkte“; unabhängig von „Frisch im Regal“ auf der Startseite). Reihenfolge: Kategorie wählen, dann ↑/↓. |
| **Startseite** | Die **4 Produkte** unter „Frisch im Regal“ auswählen: Platz für Platz *Produkt wählen* oder *Ersetzen*, Etikett (NEU, TREND …), Reihenfolge mit ↑/↓, dann **Speichern**. Mehr als 4 geht nicht. |
| **Kategorien** | Bereiche (Reiter im Produktkatalog, z. B. „Getränke“, mit Hinweistext und 18+) und Kategorien (Filter darunter): anlegen, umbenennen, sortieren, löschen. Löschen geht erst, wenn nichts mehr darin ist – so geht nichts versehentlich verloren. |
| **Events** | Anlegen mit Titel, Beschreibung, Ort, Beginn/Ende, Eintritt (frei / Preis / Hinweis), Titelbild und Galerie. **Als Entwurf speichern** = unsichtbar, **Veröffentlichen** = sofort online. Aktiv-Schalter, Hervorheben, Duplizieren (praktisch für wiederkehrende Events). |
| **Banner & Aktionen** | *Banner*: Hinweisleiste ganz oben („Heute Sonderaktion!“), mit Link, Farbe und optionalem Zeitraum – schaltet sich automatisch ein/aus. *Aktionen*: Angebotskarten mit Bild, Preis und Etikett; erscheinen als eigener Bereich auf der Startseite. |
| **Produktwünsche** | Was Kunden sich auf der Webseite (Bereich „Wunschliste“) wünschen. Neue Wünsche erst **freigeben**, dann sind sie sichtbar und es kann abgestimmt werden. Status *Geplant* / *Im Laden* erscheinen als Hinweis auf der Webseite, *Abgelehnt* blendet aus. Tippfehler korrigieren, Doppelte **zusammenführen** (Stimmen werden übernommen). |
| **Medienbibliothek** | Bilder hochladen (auch per Drag & Drop), ansehen, Beschreibung pflegen, **ersetzen** (alle Stellen, die das Bild nutzen, zeigen sofort das neue), löschen (nur wenn nirgends verwendet). |
| **Öffnungszeiten** | Pro Wochentag; gelten auch für „Geöffnet/Geschlossen“ oben und für den Chat-Assistenten. |
| **Protokoll** | Wer hat wann was geändert (nur Entwickler). |
| **Benutzer** | Weitere Admin-Konten anlegen, umbenennen, Passwort setzen, löschen. |

Änderungen sind **sofort** auf der Webseite sichtbar – die Webseite fragt die Daten bei jedem Aufruf neu
ab. Bilder werden zusätzlich von Cloudflare zwischengespeichert; wird ein Bild ersetzt, ändert sich seine
Adresse automatisch.

**Was erscheint wo?**
- **Events** stehen groß direkt unter dem Kopfbereich der Startseite (nächstes Event als große Karte mit
  Countdown, weitere darunter); ein Klick öffnet alle Infos inkl. Galerie, Kalender-Datei und Route. Der
  Menüpunkt „Events“ springt dorthin. Ohne geplante Events verschwinden Bereich und Menüpunkt.
- Der Bereich *Aktionen* erscheint nur, wenn es aktive Aktionen gibt.
- Vergangene Events werden automatisch archiviert (`EVENT_ARCHIVE` in `server/lib/publicSite.js`). Ein Event
  ohne Ende gilt bis Mitternacht als laufend.
- Die 12 zusätzlichen Markenprodukte des Chat-Assistenten (Takis, Red Bull, Monster, Marlboro) wurden als
  Produkte mit „Im Produktkatalog anzeigen = aus“ übernommen. Sie waren im alten Code als
  *Beispieldaten* markiert – bitte prüfen.

---

## 5. Produktiv betreiben: Cloudflare + Railway

**Railway** betreibt den API-Dienst und die PostgreSQL-Datenbank (Inhalte **und** Bilder – Bilder
überleben damit jedes Deployment und sind in jedem Datenbank-Backup enthalten). **Cloudflare** liefert die
Webseite aus und reicht `/api/*` an Railway weiter. Beide deployen automatisch bei jedem Push auf `main`.

### Railway

1. Railway → *New Project* → **Deploy from GitHub repo** → `Muecahitbyr/Snackpoint`. Region: **EU West
   (Amsterdam)**.
2. Im selben Projekt: *+ Create* → **Database → PostgreSQL**.
3. API-Dienst → *Variables*: `DATABASE_URL=${{Postgres.DATABASE_URL}}`, `PROXY_SECRET=<zufällig>`,
   `NODE_ENV=production`.
4. API-Dienst → *Settings → Networking* → **Generate Domain** → URL notieren (für `API_ORIGIN`).
5. `.railway/railway.ts` regelt den Rest (nach Änderungen: `railway config plan` und `railway config apply`): Bei jedem Deploy laufen vorher `npm run release` (Migrationen + einmalige
   Übernahme der ursprünglichen Inhalte), dann `npm run start:api`; Health-Check `/api/health`.
   Die Übernahme der Inhalte passiert genau einmal pro Datenbank – später geleerte Listen bleiben leer.

### Cloudflare

1. In `wrangler.jsonc` bei `API_ORIGIN` die Railway-URL eintragen (oder im Dashboard als Variable setzen).
2. Cloudflare → *Workers & Pages* → **Create → Import a repository** → `Muecahitbyr/Snackpoint`.
   Build command: `npm run build` · Deploy command: `npx wrangler deploy`.
3. Worker → *Settings → Variables and Secrets* → **Secret** `PROXY_SECRET` (derselbe Wert wie auf Railway).
4. Eigene Domain: Worker → *Settings → Domains & Routes* → **Custom Domain** (Domain muss in Cloudflare
   verwaltet werden). Ohne eigene Domain läuft die Seite unter `snackpoint.<konto>.workers.dev`.
   Danach `SETTINGS.siteUrl` in `src/data/siteContent.js` auf die neue Domain setzen: daraus entstehen
   Canonical-Links, `sitemap.xml`, `robots.txt`, strukturierte Daten und Link-Vorschauen. Nach dem
   Deploy die Variable `REDIRECT_HOSTS` mit der alten `workers.dev`-Adresse setzen, damit sie per 301
   auf die neue Domain zeigt (siehe `docs/seo-geo-final-audit.md`).

Alternativ per Kommandozeile: `npx wrangler login`, `npx wrangler secret put PROXY_SECRET`, `npm run deploy`.

### Danach

- Admin-Konto anlegen (Abschnitt 3), `/admin` öffnen, anmelden.
- Das alte Vercel-Projekt trennen bzw. löschen: Es würde sonst bei jedem Push weiter eine Version ohne
  Backend ausliefern.

**Kosten (zur Orientierung, bitte aktuelle Preise prüfen):** Cloudflare: Auslieferung der Seite und der
Worker im kostenlosen Tarif (Worker-Aufrufe für `/api/*` und die vier öffentlichen Seiten, das
Tageskontingent von 100.000 Aufrufen reicht für eine Kiosk-Seite bei Weitem). Railway: nutzungsbasiert im bestehenden Railway-Tarif (API-Dienst + Postgres, beide klein).

### Backups (kostenlos)

Railways eingebaute Datenbank-Backups sind im Hobby-Tarif nicht enthalten. Deshalb hat das Adminpanel eine
eigene Datensicherung:

- **Sichern:** Dashboard → *Datensicherung → Backup herunterladen* (nur Entwickler).
  Eine Datei `snackpoint-backup-<datum>.json.gz` mit allen Inhalten, Bildern und Benutzerkonten (ohne
  Sitzungen). Das Dashboard erinnert, wenn die letzte Sicherung älter als 14 Tage ist.
  Empfehlung: alle 1–2 Wochen und vor größeren Änderungen; Datei an einem sicheren Ort aufbewahren
  (enthält Passwort-*Hashes*), nicht weitergeben.
- **Wiederherstellen** (ersetzt **alle** Daten, in einer Transaktion – bei einem Fehler bleibt alles wie es war;
  danach müssen sich alle neu anmelden):
  ```bash
  cd ~/VSProjects/SnackPoint
  railway ssh --service snackpoint-api -- npm run db:restore -- - --replace < snackpoint-backup-2026-11-01.json.gz
  ```
  Lokal bzw. gegen eine andere Datenbank: `npm run db:restore -- <datei> --replace`.

### Schutz vor Datenverlust

- Löschen fragt immer nach; Produkte/Events lassen sich stattdessen deaktivieren.
- Bilder, Kategorien und Bereiche, die noch verwendet werden, können nicht gelöscht werden.
- Migrationen ergänzen nur und löschen keine Daten; die Inhalts-Übernahme überschreibt nie etwas.
- Jede Änderung steht im Protokoll.

---

## 6. Sicherheit (Überblick)

- **Login**: Argon2id-Hashes; gleiche Fehlermeldung *und* gleiche Antwortzeit (mind. 800 ms) für falsche
  E-Mail und falsches Passwort – verrät nicht, ob ein Konto existiert, und bremst Durchprobieren.
  Sperren werden immer länger: pro Konto 5 Fehlversuche/15 min → 15 min, 15 in 24 h → 1 h, 30 in 24 h →
  24 h; pro IP 20/15 min → 15 min, 60 in 24 h → 24 h. Die echte Besucher-IP kommt vom Worker und wird nur
  mit gültigem `PROXY_SECRET` akzeptiert. Optional Bot-Schutz per Cloudflare Turnstile.
- **Passwortregeln**: mind. 12 Zeichen, mind. 6 verschiedene Zeichen. Passwörter werden nie mit anderen
  Konten oder Daten verglichen – keine Meldung kann etwas über fremde Passwörter verraten.
- **Sitzungen**: zufälliger 256-Bit-Token im Cookie `__Host-sp_admin` (`HttpOnly`, `Secure`,
  `SameSite=Strict`); in der Datenbank nur dessen SHA-256-Hash. Abmeldung nach 24 h Inaktivität, spätestens
  nach 7 Tagen. Passwort-, Rollen- oder E-Mail-Änderung meldet die betroffene Person überall ab.
- **CSRF**: Pro Sitzung ein Token, das bei jeder Änderung im Header mitgeschickt werden muss, plus
  Origin-Prüfung.
- **Zugriffskontrolle**: Jede Route unter `/api/admin/*` prüft serverseitig Sitzung und Rolle. Die Railway-Adresse
  beantwortet ohne `PROXY_SECRET` nur `/api/health`.
- **Überwachung**: Protokoll → *Anmeldungen* zeigt alle Anmeldeversuche der letzten 7 Tage (Entwickler).
- **SQL-Injection**: Alle Abfragen sind parametrisiert; Tabellen-/Spaltennamen stammen nur aus festem Code
  (beim Wiederherstellen zusätzlich gegen das echte Schema geprüft). Jede Eingabe wird mit `zod` validiert.
- **Datenbank-Rechte**: Die laufende Webseite verbindet sich als `snackpoint_app` – darf nur Zeilen lesen
  und schreiben, keine Tabellen anlegen, ändern, leeren oder löschen, keine Rollen anlegen, keine Dateien
  lesen; Abfragen werden nach 15 s abgebrochen (getestet in `tests/server/api.test.js`). Migrationen,
  Erstbefüllung und Wiederherstellung laufen mit dem Eigentümer-Zugang (`MIGRATION_DATABASE_URL`). Die
  Datenbank hat keine öffentliche Adresse (nur Railways privates Netz).
- **Uploads**: Nur JPG/PNG/WebP/GIF/AVIF (kein SVG); jede Datei wird neu als WebP kodiert, EXIF-Daten
  (z. B. GPS) werden entfernt; Größenlimit; Auslieferung mit `nosniff` und restriktiver CSP.
- **Header**: `/admin` mit strenger CSP, `X-Frame-Options: DENY`, `noindex`; die ganze Seite mit HSTS,
  `nosniff`, Einbettungsschutz und `Permissions-Policy` (`public/_headers`).
- **Logs**: Fehler mit kurzer Referenz-ID, ohne Passwörter, Tokens oder Formularinhalte.

### Datenbank-Rechte einrichten (einmalig, Railway)

```bash
openssl rand -hex 24 > /tmp/app-pw                                   # Passwort erzeugen
railway variable set MIGRATION_DATABASE_URL='${{Postgres.DATABASE_URL}}' --service snackpoint-api --skip-deploys
railway ssh --service snackpoint-api -- npm run db:app-role < /tmp/app-pw
printf 'postgresql://snackpoint_app:%s@${{Postgres.PGHOST}}:${{Postgres.PGPORT}}/${{Postgres.PGDATABASE}}' "$(cat /tmp/app-pw)" \
  | railway variable set DATABASE_URL --stdin --service snackpoint-api
rm /tmp/app-pw
```

### Bot-Schutz (optional): Cloudflare Turnstile

Cloudflare-Dashboard → *Turnstile* → *Add widget* → Hostname der Seite (z. B.
`snackpoint.mucahitbayar.workers.dev`, später die eigene Domain), Modus „Managed“. Den *Site Key* als
`TURNSTILE_SITE_KEY` und den *Secret Key* als `TURNSTILE_SECRET_KEY` beim Railway-Dienst eintragen.

**Rechtliches:** Betreiber, Rechtsform, Vertretung, USt-IdNr., Registereintrag und Inhaltsverantwortlicher
stehen in `src/data/siteContent.js` (`SETTINGS.legal`) und werden automatisch in Impressum und
Datenschutzerklärung übernommen.

**Datenschutz:** Die Datenschutzerklärung nennt Cloudflare und Railway, den Verwaltungsbereich
(Sitzungs-Cookie, 7 Tage Speicherung von IP/E-Mail bei Anmeldeversuchen) und die Speicherung im Browser.
Mit Cloudflare und Railway jeweils den Auftragsverarbeitungsvertrag (DPA) abschließen bzw. akzeptieren.
