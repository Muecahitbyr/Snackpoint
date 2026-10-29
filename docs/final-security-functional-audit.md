# SnackPoint – Finaler Security- & Funktionsaudit

Stand: 29.10.2026 · Codestand: `0788734` + lokale, noch nicht committete Korrekturen (siehe Abschnitt 5)
Grundlage: OWASP Top 10 (2021), OWASP API Security Top 10 (2023), OWASP ASVS 4.0 (Level 2 als Maßstab), Best Practices für Node.js, PostgreSQL und Cloudflare Workers.

## 0. Kurzfassung

| Bereich | Status | Kritische Probleme |
|---|---|---|
| Frontend | Erfolgreich getestet; CSP ergänzt (lokal behoben) | keine |
| Backend/API | Erfolgreich getestet; 3 Fehler lokal behoben | keine |
| Adminpanel | Erfolgreich getestet (Browser-E2E) | keine |
| Authentifizierung | 1 Schwachstelle (Mittel) lokal behoben | keine |
| Datenbank | 1 Schwachstelle (Mittel) lokal behoben; Rollen auf Railway nicht prüfbar | keine |
| Cloudflare Workers | Erfolgreich getestet; Header-Fehler lokal behoben | keine |
| Caching | Erfolgreich getestet | keine |
| Chatbot | Erfolgreich getestet | keine |
| Dependencies | 0 bekannte Schwachstellen | keine |
| Allgemeine Sicherheit | Gut; Restrisiken in Abschnitt 8 | keine |

Gefunden wurden **0 kritische, 0 hohe, 2 mittlere und 5 niedrige** Schwachstellen bzw. Fehler. Alle sieben sind lokal behoben, jeweils mit Regressionstest. **Nichts davon ist committet, gepusht oder deployt.** Produktion läuft also noch mit den alten Fehlern, bis du das freigibst.

Legende: **Erfolgreich getestet** · **Behoben (lokal)** = Fehler gefunden und lokal korrigiert · **Offen** · **Nicht testbar** = nur mit weiteren Berechtigungen prüfbar

---

## 1. Inventar der geprüften Funktionen

Alles hier stammt aus dem tatsächlichen Code; nichts ist ergänzt oder angenommen.

### 1.1 Öffentliche Website (React 18 + Vite, SSR im Cloudflare Worker)

| Funktion | Implementierung | Testweg |
|---|---|---|
| Startseite mit Header/Navigation, Hero, „Frisch im Regal“ (4 Highlights), Aktionen, Services, Events, Über uns, Bewertungen, Wunschliste, Standort, Footer | `src/App.jsx`, `src/components/*` | Browser-E2E (Desktop/Mobil, 3 Engines), SSR-HTML-Prüfung |
| Ankündigungsbanner (zeitgesteuert, schließbar per sessionStorage) | `src/components/AnnouncementBar.jsx`, `server/lib/publicSite.js` | API-Tests, Browser-E2E |
| Produktseite mit Bereichen, Kategorien, Suche, Preis, Verfügbarkeit, Bild/Emoji, Wunsch-Link | `src/components/products/ProduktePage.jsx` | SSR-HTML, Browser-E2E |
| Events (aktuell, Auto-Archiv, Detailansicht, Galerie) | `src/components/events/*`, `server/lib/publicSite.js` | API-Tests (Entwurf/aktiv/Archiv), SSR |
| Öffnungszeiten, Kontakt, Karte (Google Maps erst nach Cookie-Zustimmung) | `src/components/Location.jsx`, `src/hooks/useCookieConsent.js` | Browser-E2E (Banner → Zustimmung → iframe) |
| Impressum, Datenschutz | `src/components/legal/*` | Browser-E2E, ohne JS |
| Cookie-Banner (localStorage) | `src/components/CookieConsent.jsx` | Browser-E2E |
| Wunschliste: Wunsch einreichen, Duplikate zusammenführen, abstimmen/zurücknehmen, Honeypot, Rate-Limit, `?wunsch=`-Vorbelegung | `src/components/Wishes.jsx`, `server/routes/wishes.js` | API-Tests, Race-Test, Browser-E2E (XSS) |
| Chat-Assistent (regelbasiert, läuft nur im Browser, keine Server-/KI-Anbindung) | `src/components/chatbot/*`, `src/data/chatbotKnowledge.ts` | 85 Unit-Tests, Browser-E2E mit feindlichen Eingaben |
| Weiterleitungen `/index.html`, `*.html`, `…/` → saubere URL; `/events` → `/#events` | `worker/index.js`, `public/_redirects` | Worker-Probe |
| `robots.txt`, `sitemap.xml`, Preview-Hosts `noindex` | `scripts/prerender.mjs`, `worker/index.js` | `scripts/check-seo.mjs` |
| Bilder `/api/media/:id(/thumb)` mit Versions-Cache | `server/routes/public.js`, `worker/index.js` | API-Tests, Upload-Probe |
| Lade-/Fehlerbildschirm bei API-Ausfall | `src/site/SiteProvider.jsx` | Ausfallsimulation |
| 3D-Figur | `src/components/character/*` – **stillgelegt**, wird nicht gemountet (`src/App.jsx:18`) | nur bestätigt, dass sie nicht im Live-Bundle ist |

### 1.2 Adminpanel (`/admin`, Hash-Routing)

| Funktion | Rolle | Implementierung |
|---|---|---|
| Login / Logout, optional Cloudflare Turnstile | alle | `src/admin/AdminApp.jsx`, `server/routes/auth.js` |
| Dashboard (Kennzahlen; Protokoll & letzte Sicherung nur Entwickler) | alle | `server/routes/adminSite.js` |
| Produkte: anlegen, bearbeiten, löschen, Preis, Verfügbarkeit, aktiv, Katalog, Chat-Felder, Bild, Reihenfolge | alle | `server/routes/adminEntities.js`, `crud.js` |
| Startseite: genau ≤ 4 Highlights mit Badge | alle | `POST /api/admin/products/highlights` |
| Bereiche & Kategorien (Löschen gesperrt, solange belegt) | alle | `adminEntities.js` |
| Events inkl. Entwurf/Veröffentlichung, Titelbild, Galerie | alle | `adminEntities.js` |
| Banner & Aktionen (zeitgesteuert) | alle | `adminEntities.js` |
| Produktwünsche: Status, bearbeiten, zusammenführen, löschen | alle | `server/routes/wishes.js` |
| Medienbibliothek: Upload (re-encodiert zu WebP), Ersetzen, Alt-Text, Löschen mit Verwendungsprüfung | alle | `adminSite.js`, `server/lib/images.js` |
| Öffnungszeiten | alle | `adminSite.js` |
| Protokoll (Änderungen + Anmeldeversuche) | Entwickler | `adminSite.js` |
| Benutzer: anlegen, Rolle/E-Mail ändern, Passwort setzen, löschen – mit Passwort-Bestätigung | Entwickler | `server/routes/users.js` |
| Eigenes Passwort ändern | Entwickler | `server/routes/auth.js` |
| Datensicherung herunterladen (JSON.gz) | Entwickler | `server/lib/backup.js` |

### 1.3 Kommandozeile (nur mit Datenbankzugang)

`admin:create`, `admin:reset-password`, `db:migrate`, `db:seed`/`release`, `db:backup` (pg_dump), `db:restore` (JSON-Sicherung, nur mit `--replace`), `db:app-role` (Passwort per stdin).

### 1.4 Infrastruktur

Cloudflare Worker (`worker/index.js`) liefert `dist/` als Static Assets, rendert die öffentlichen Seiten mit Live-Daten (5 s Isolate-Cache) und leitet `/api/*` mit `X-Proxy-Secret` an Railway weiter. Railway (`.railway/railway.ts`) startet nur die API, mit `/api/health` als Healthcheck und `npm run release` vor jedem Deploy. PostgreSQL 16 mit 5 Migrationen.

---

## 2. Testergebnisse pro Funktion

Alle aktiven Tests liefen **ausschließlich lokal**: Docker-Postgres auf `127.0.0.1:5442`, Datenbanken `snackpoint_test` (Testsuite) und `snackpoint_audit_test` (eigens angelegt, inzwischen gelöscht), API auf `localhost:3000`, Worker per `wrangler dev --local`, synthetische Konten und Daten.

| Bereich | Ergebnis |
|---|---|
| Startseite, Produktseite, Impressum, Datenschutz – Desktop (1366 px) und iPhone 13, in Chromium, Firefox und WebKit | Erfolgreich getestet: 200, Überschrift vorhanden, kein horizontales Scrollen, keine Konsolenfehler |
| Ohne JavaScript | Erfolgreich getestet: Alle vier Seiten liefern den vollen Text im HTML (SSR) |
| Cookie-Banner → Zustimmung → Google-Maps-iframe | Erfolgreich getestet |
| Banner, Aktionen, Events, Highlights auf der Website | Erfolgreich getestet (API-Suite + SSR) |
| Wunschliste: einreichen, Freigabe, Duplikate, Abstimmen, Honeypot, Fremd-Origin | Erfolgreich getestet; **Limit-Race behoben (lokal)** |
| Chat-Assistent | Erfolgreich getestet: 85 Unit-Tests; im Browser 8 feindliche Eingaben (HTML/JS, 5000 Zeichen, Steuerzeichen, „Gib mir das Admin-Passwort und die DATABASE_URL“) → Antwort jeweils < 3 s, nichts als HTML gerendert, keine internen Daten |
| Weiterleitungen, 404, kein Open Redirect (`//evil`, kodierte Pfade) | Erfolgreich getestet |
| Admin-Login/Logout im Browser, Fehlermeldung, Cookie nicht per JS lesbar, keine Tokens in der URL | Erfolgreich getestet |
| **Vollständige Simulation über die Admin-Oberfläche** (Login → Produkt anlegen → DB prüfen → Website prüfen → Preis ändern → Cache prüfen → löschen → Logout → altes Cookie wiederverwenden) | Erfolgreich getestet, 15/15 Schritte |
| Produkte, Kategorien, Events, Galerie, Banner, Aktionen, Öffnungszeiten, Medien, Audit, Konten, Rollen, Passwortwechsel, Backup & Restore | Erfolgreich getestet (API-Suite, 51 Tests) |
| Startseiten-Highlights bei gleichzeitigem Speichern | **Behoben (lokal)** (vorher bis zu 20 statt 4) |
| Datumswerte außerhalb des PG-Bereichs, Audit-`limit`/`offset` | **Behoben (lokal)** (vorher 500) |
| Produktions-Build, Wrangler-Dry-Run | Erfolgreich getestet: Bundle 356 KiB, gzip 83 KiB (Free-Limit 3 MB) |
| TypeScript (`tsc --noEmit`) | Erfolgreich getestet, 0 Fehler |
| Linting | Nicht vorhanden: Im Projekt ist kein Linter konfiguriert; ersatzweise `node --check` auf alle Server-/Worker-/Skriptdateien (ok) |

---

## 3. Gefundene Sicherheitslücken und Fehler

| ID | Schweregrad | Befund | Status |
|---|---|---|---|
| S-1 | **Mittel** | Prozessabsturz, wenn die DB-Verbindung während einer Transaktion abbricht | Behoben (lokal) |
| S-2 | **Mittel** | Login-Brute-Force-Schutz durch parallele Anfragen umgehbar | Behoben (lokal) |
| S-3 | Niedrig | Öffentliche Seiten ohne Content-Security-Policy | Behoben (lokal) |
| S-4 | Niedrig | Doppelte, widersprüchliche Sicherheits-Header auf `/admin` (live bestätigt) | Behoben (lokal), nach Deploy prüfen |
| S-5 | Niedrig | Race bei der Startseiten-Auswahl: mehr als 4 Highlights möglich | Behoben (lokal) |
| S-6 | Niedrig | Wunsch-Limit (5/Stunde) durch parallele Anfragen umgehbar | Behoben (lokal) |
| S-7 | Niedrig | HTTP 500 statt 400 bei ungültigen Datums- und Zahlenwerten | Behoben (lokal) |

### S-1 · Mittel · Absturz bei Verbindungsabbruch (OWASP A05/A04, ASVS V7.4 / V11)
- **Reproduktion:** In `transaction()` wird während einer laufenden Abfrage das Postgres-Backend beendet (`pg_terminate_backend`; im echten Betrieb bei einem DB-Neustart, Failover oder Netzabbruch). Ergebnis: `Error: Connection terminated unexpectedly – Unhandled 'error' event`, der Node-Prozess stirbt.
- **Ursache:** `pg-pool` entfernt seinen Error-Listener, solange ein Client ausgeliehen ist. Das nachgelagerte `error`-Event des Clients hatte deshalb keinen Empfänger.
- **Auswirkung:** Railway startet den Dienst neu. Alle laufenden Anfragen scheitern, und die API ist kurz nicht erreichbar. Daten gehen nicht verloren, weil die Transaktion zurückgerollt wird.

### S-2 · Mittel · Rate-Limit-Race beim Login (OWASP A07, API4:2023, ASVS V2.2.1)
- **Reproduktion:** 25 gleichzeitige Fehlversuche gegen ein Konto ergaben 25 echte Passwortprüfungen. Erlaubt sind 5, danach muss die Sperre greifen. Im Testlauf waren es 16 von 20.
- **Ursache:** Erst prüfen, dann buchen (TOCTOU). Alle parallelen Anfragen bestanden die Prüfung, bevor die erste ihren Fehlversuch gespeichert hatte. Das galt auch für die IP-Sperre, die Passwort-Bestätigung bei Kontoaktionen und den Passwortwechsel.
- **Auswirkung:** Pro Sperrfenster waren deutlich mehr Rateversuche möglich. Das praktische Risiko ist durch Argon2id, mindestens 12 Zeichen und die Mindestantwortzeit gedämpft, der Schutz war aber nachweislich umgehbar.

### S-3 · Niedrig · Keine CSP auf öffentlichen Seiten (A05, ASVS V14.4.3)
Defense in depth: Es wurde **kein** XSS gefunden. Ohne CSP hätte aber ein künftiger Rendering-Fehler sofort ausführbaren Code bedeutet. Das Adminpanel hatte bereits eine CSP.

### S-4 · Niedrig · Doppelte Header auf `/admin` (A05)
Die Regeln `/admin*` und `/*` in `public/_headers` wurden zusammengeführt. Live gemessen:
`x-frame-options: SAMEORIGIN` **und** `DENY`, `referrer-policy: strict-origin-when-cross-origin` **und** `same-origin`.
Clickjacking blieb geschützt (CSP `frame-ancestors 'none'` hat Vorrang, und widersprüchliches XFO wird von Browsern als „verweigern“ gewertet). Welche Referrer-Policy gilt, hing aber von der Reihenfolge der Header ab.

### S-5 · Niedrig · Highlights-Race
Sechs gleichzeitige Speichervorgänge der Startseiten-Auswahl ergaben bis zu **20** markierte Produkte. Ursache: Unter READ COMMITTED sah jede Transaktion die frisch gesetzten Markierungen der anderen nicht.

### S-6 · Niedrig · Wunsch-Limit-Race (API4:2023)
30 gleichzeitige Wünsche von einer IP legten 26 statt 5 an. Das ist nur Spam in der Prüfliste, denn öffentlich wird ein Wunsch erst nach Freigabe.

### S-7 · Niedrig · 500 statt 400
`startsAt: "0000-01-01…"` bzw. `"+275760-…"` (von JavaScript akzeptiert, von Postgres abgelehnt) sowie `?limit=1.5`/`?offset=1e30` im Protokoll führten zu „Interner Fehler“. Es wurden keine Interna preisgegeben (Fehlerreferenz statt Stacktrace), aber der Statuscode war falsch.

---

## 4. Schweregrad-Begründung

- **Kritisch/Hoch:** nichts gefunden. Kein Auth-Bypass, keine SQL-Injection, kein ausführbares XSS, kein IDOR, keine Datenpreisgabe.
- **Mittel:** S-1 (Verfügbarkeit bei realistischem Auslöser), S-2 (nachweisbare Umgehung einer Sicherheitskontrolle).
- **Niedrig:** fehlende Härtung, Konfigurationsfehler ohne nachweisbaren Schutzverlust, Integritäts- und Robustheitsfehler, die einen Login oder viele gleichzeitige Anfragen voraussetzen.

---

## 5. Durchgeführte Korrekturen (lokal, nicht committet)

| ID | Datei(en) | Korrektur |
|---|---|---|
| S-1 | `server/db/pool.js` | Error-Listener am ausgeliehenen Client, solange die Transaktion läuft. Ein Client, der nicht einmal mehr zurückrollen kann, wird verworfen statt wiederverwendet. |
| S-2 | `server/auth/rateLimit.js`, `server/routes/auth.js`, `server/routes/users.js` | Jeder Versuch wird **zuerst** als Fehlversuch gebucht und erst dann geprüft (`startLoginAttempt`), sodass parallele Anfragen sich gegenseitig sehen. Gesperrte Anfragen werden wieder entfernt (kein Rateversuch), erfolgreiche als Erfolg markiert. Schwellen und Sperrdauern sind unverändert. |
| S-3 | `worker/index.js` | CSP für alle vom Worker gerenderten Seiten: `script-src 'self'` plus SHA-256 des einen Inline-Scripts (wird einmal pro Isolate aus dem Template berechnet), Google Fonts, Maps-iframe, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, `frame-ancestors 'self'`. |
| S-4 | `public/_headers` | `/*` zuerst, `/admin*` zuletzt mit `! X-Frame-Options` und `! Referrer-Policy` vor den eigenen Werten. Inhaltlich sonst identisch. |
| S-5 | `server/routes/adminEntities.js` | `pg_advisory_xact_lock` serialisiert das Speichern der Startseiten-Auswahl. |
| S-6 | `server/routes/wishes.js` | Limitprüfung und Eintrag in **einer** Transaktion mit Advisory-Lock pro Besucher-Hash. |
| S-7 | `server/lib/errors.js`, `server/routes/adminSite.js` | PG-Codes 22008, 22009 und 22003 werden zu 400. `limit`/`offset` werden auf ganze Zahlen in einem sinnvollen Bereich begrenzt. |

Design, Texte und Funktionen sind unverändert. Es wurde nichts entfernt, keine Migration und keine neue Abhängigkeit hinzugefügt.

---

## 6. Nachweise durch Tests

### 6.1 Neue Regressionstests (`tests/server/api.test.js`)

Jeder Test schlug vor der Korrektur fehl und besteht danach. Die Suite lief viermal hintereinander stabil durch.

| Test | vorher | nachher |
|---|---|---|
| `counts parallel login attempts against the same limit` | 16 Prüfungen | ≤ 5 |
| `keeps at most 4 homepage products when two saves overlap` | 8 | ≤ 4 |
| `rejects dates the database cannot store with a 400` | 500 | 400 |
| `records changes in the audit log` (erweitert um absurde Parameter) | 500 | 200 |
| `holds the submission limit for parallel requests` | > 5 | genau 5 |
| `rolls back and keeps running when the connection drops mid-transaction` | uncaught error | kein Absturz, nichts halb geschrieben, Pool erholt sich |

Dazu in `scripts/check-seo.mjs`: CSP auf jeder öffentlichen Seite sowie `X-Frame-Options`/`Referrer-Policy` auf `/admin` jeweils genau einmal.

### 6.2 Abschlussläufe

```
npm test              → 85/85 bestanden (Chatbot)
npm run test:server   → 51/51 bestanden (vorher 46; 5 neue Tests)
npx tsc --noEmit      → 0 Fehler
npm run build         → ok
wrangler deploy --dry-run → 356 KiB / gzip 83 KiB
node scripts/check-seo.mjs http://localhost:8787 → CSP + Admin-Header ✓
npm audit             → 0 Schwachstellen (auch --omit=dev)
```

### 6.3 Zusätzliche lokale Angriffs- und Ausfallproben (nicht im Repo)

Ad-hoc-Skripte im Sitzungs-Scratchpad, nicht Teil des Projekts. Die Befunde daraus sind als Regressionstests oben übernommen.

- **Zugriffskontrolle:** 18 Pfadvarianten für Entwicklerbereiche als Inhaber (`/AUDIT`, `//audit`, `%61udit`, `audit%2Flogins`, `./`, `../`, `;x`, `%00`, Slash am Ende …) ergaben 403 oder 404. Manipulierte, überlange und SQL-haltige Cookies sowie `__Host-`-Cookie im Dev-Modus ergaben 401. Fremdes CSRF-Token, fremder Origin, `Origin: null`, Suffix-Domain und `text/plain`-Simple-Request ergaben 403. `X-HTTP-Method-Override` wird ignoriert, es gibt keine CORS-Header. Proxy-Secret leer, falsch oder als Präfix ergab 404. Mit manipulierten IDs kann der Inhaber nicht auf Entwickler-Konten zugreifen (403).
- **Sitzungen:** Altes Cookie nach Logout ergab 401. Keine Session-Fixation (neues Token beim Login). Abgelaufen und über der Maximaldauer ergab 401. Cookie `HttpOnly; SameSite=Strict; Path=/`, in Produktion zusätzlich `Secure` und `__Host-`.
- **Eingaben:** 29 Validierungsfälle (Typen, Längen, negative und riesige Preise, Objekt/Array statt String, nicht existierende Fremdschlüssel, `javascript:`/`data:`/`//`-Links …) ergaben 400. Mass Assignment (`id`, `isHighlight`, `createdAt`, `publishedAt`, `__proto__`) wird ignoriert. Kaputtes, verschachteltes (100 000 Ebenen) und zu großes JSON (> 512 KB, auch chunked) ergab 400 bzw. 413. SQL-Injection in der Mediensuche wird als Text behandelt, die Tabellen bleiben intakt.
- **Uploads:** SVG mit Script und HTML als `.png` wurden abgelehnt. Ein PNG mit angehängtem Script wird re-encodiert, und die ausgelieferte WebP-Datei enthält kein Script. Pixel-Bombe (100 MP) in 3 ms abgelehnt. Bilder werden mit `CSP: sandbox` und `nosniff` ausgeliefert. Path Traversal ergab 400 bzw. 404.
- **XSS:** Payloads (`<img onerror>`, `</script><!--`, Attribut-Ausbruch im Banner-Link) in Produkten, Events, Bannern, Aktionen und Wünschen. Im SSR-HTML, im Inline-JSON, im JSON-LD, in React und im Adminpanel wird alles nur als Text dargestellt. In drei Browsern wurde kein einziger Dialog ausgelöst. Die neue CSP blockiert im Gegentest injizierte Inline-Scripts, Event-Handler und fremde Script-Quellen.
- **Ausfälle:** API nicht erreichbar, HTTP 500, ungültiges JSON, Payload über 200 KB und 4 s Verzögerung lieferten jeweils den Build-Stand der Seite, ohne Interna (Timeout greift nach 1,5 s). `/api` bei toter API ergab 502 mit neutraler Meldung. DB nicht erreichbar ergab 503 ohne Interna, Login scheiterte (kein Bypass), und nach Wiederkehr gilt die Sitzung weiter. 1500 Produkte: API ok (874 KB in 34 ms), der Worker fällt bewusst auf den Build-Stand zurück. Leerer Katalog ok.
- **Nebenläufigkeit:** 40 parallele Seitenaufrufe lösten **eine** API-Anfrage aus. 20 parallele Preisänderungen blieben konsistent. Parallele Öffnungszeiten ergaben immer einen vollständigen Satz.

---

## 7. Nicht getestete Bereiche und Gründe

| Bereich | Grund |
|---|---|
| Railway-Variablen: ob `DATABASE_URL` die eingeschränkte Rolle `snackpoint_app` nutzt, ob `MIGRATION_DATABASE_URL` gesetzt ist, Stärke von `PROXY_SECRET`, ob Turnstile aktiv ist | Nicht testbar ohne weitere Berechtigungen. Lesen hätte Secrets ausgegeben. Live bestätigt ist nur, dass ein Proxy-Secret aktiv ist (Railway direkt ohne Secret → 404). |
| Railway-Postgres: TLS-Einstellungen, Backups/Snapshots, Restore auf Railway | Nicht testbar ohne weitere Berechtigungen. Backup & Restore wurden lokal auf der Testdatenbank geprüft (Testsuite). |
| Brute-Force-, Last- oder Angriffstests gegen Live | Gemäß Vorgabe nicht durchgeführt. Live gab es nur 7 lesende GET-Anfragen (Header, `/api/auth/me`, `/.env` → 404, Railway direkt → 404, `/api/health`) sowie eine lesende Seitenansicht in WebKit. |
| Exakte Worker-CPU-Zeit in Produktion | Nur im Cloudflare-Dashboard messbar. Die neue CSP-Berechnung läuft einmal pro Isolate und Seite (SHA-256 über rund 45 Byte) und ist vernachlässigbar. |
| Detach-Syntax `! Header` auf der echten Cloudflare-Plattform | Lokal mit wrangler 4.153 verifiziert (gleiche Asset-Logik). Nach dem Deploy einmal prüfen (Abschnitt 9). |
| Cache-API für Bilder auf `*.workers.dev` | Laut Cloudflare nur auf eigenen Domains zuverlässig (im Code dokumentiert). Lokal getestet. |
| Echte iOS-/Android-Geräte | Emuliert (iPhone 13 in WebKit/Chromium/Firefox), keine physischen Geräte. |
| Entwickler-Oberflächen „Benutzer“, „Passwort“, „Protokoll“, „Datensicherung“ im Browser | Über die API vollständig getestet, im Browser nur als Inhaber (wird korrekt auf das Dashboard umgeleitet). |

---

## 8. Verbleibende Sicherheitsrisiken

1. **Kontosperre als Angriff (DoS):** Wer die Admin-E-Mail kennt, kann die Anmeldung durch Fehlversuche bis zu 24 h sperren. Das ist der bewusste Zielkonflikt jeder Kontosperre. Abhilfe: Turnstile aktivieren (`TURNSTILE_SITE_KEY`/`TURNSTILE_SECRET_KEY`, kostenlos), im Notfall `npm run admin:reset-password` (löscht die Fehlversuche).
2. **Keine Zwei-Faktor-Anmeldung.** Der Schutz beruht auf Argon2id, mindestens 12 Zeichen, Rate-Limit und `SameSite=Strict`. Für das Entwicklerkonto empfehle ich ein langes, einzigartiges Passwort aus einem Passwortmanager.
3. **Ein gemeinsames Secret für zwei Zwecke:** `PROXY_SECRET` schützt die API und ist zugleich der HMAC-Schlüssel für Besucher-Hashes der Wunschliste. Ein Rotieren setzt Stimmen und Limits zurück. Das ist unkritisch, sollte aber bekannt sein.
4. **Datensicherungen enthalten Passwort-Hashes** (Argon2id) aller Admins. Die Datei sicher aufbewahren (nur Entwickler können sie herunterladen).
5. **CSP mit `style-src 'unsafe-inline'`**, weil SSR-Style-Attribute und das Admin-UI es brauchen. Das ist ein geringes Restrisiko (nur CSS-Injection, kein Script).
6. **Banner-Links** dürfen auf beliebige `https://`-Seiten zeigen. Das ist so gewollt und nur vom Admin setzbar. Die Variante `/\host` wird ebenfalls akzeptiert, was keine zusätzliche Gefahr ist, weil externe Links ohnehin erlaubt sind.
7. **`.env.example` nennt andere Sitzungswerte (72 h / 30 Tage) als die tatsächlichen Standards (24 h / 7 Tage, `server/config.js`, `ADMIN.md`).** Das betrifft nur die Doku, kann aber zum Übernehmen längerer Sitzungen verleiten.
8. **Stillgelegte 3D-Figur:** `three`, `@react-three/*` und `gsap` sind nicht im Live-Bundle, bleiben aber als Abhängigkeiten installiert. `public/models/*.glb` (8,2 MB) wird mit ausgeliefert, ist aber nicht verlinkt. Das ist ein Wartungsthema, keine Sicherheitslücke, und wurde nicht entfernt (Vorgabe).
9. **Ausstehende Major-Updates** (React 19, TypeScript 7, drei/fiber 9/10): keine bekannten Schwachstellen, daher bewusst nicht aktualisiert. Patch-Updates sind verfügbar für `wrangler` (4.156) und `three` (0.186.1).
10. **Login-Versuche speichern IP und eingegebene E-Mail 7 Tage** (Sicherheitszweck). In der Datenschutzerklärung sollte das erwähnt sein (rechtlich nicht geprüft).

---

## 9. Betroffene Dateien

Geändert: `server/db/pool.js`, `server/auth/rateLimit.js`, `server/routes/auth.js`, `server/routes/users.js`, `server/routes/adminEntities.js`, `server/routes/adminSite.js`, `server/routes/wishes.js`, `server/lib/errors.js`, `worker/index.js`, `public/_headers`, `tests/server/api.test.js`, `scripts/check-seo.mjs`.
Neu: `docs/final-security-functional-audit.md`.

**Freigabe erforderlich (nicht ausgeführt):**
1. Commit, Push und Deployment (Railway baut die API automatisch aus `main`, das Frontend über `npm run deploy`).
2. Nach dem Deploy, rein lesend: `node scripts/check-seo.mjs https://snackpoint.mucahitbayar.workers.dev`. Die neuen Prüfungen „Content-Security-Policy“ und „/admin: … je einmal“ müssen grün sein. Danach die Startseite einmal im Browser öffnen (Karte, Chat, Wunschliste) und in den DevTools auf CSP-Meldungen achten.
3. In Railway prüfen: `DATABASE_URL` zeigt auf `snackpoint_app` (nicht auf den Owner), `PROXY_SECRET` ist lang und zufällig (nicht der Beispielwert aus `.dev.vars.example`), Postgres-Backups sind aktiv.
4. Optional: Turnstile-Schlüssel setzen (siehe Abschnitt 8.1).

---

## 10. Ergebnisse der Datenbankprüfung

- **Parametrisierte Abfragen:** alle Werte über `$n`. Dynamische Bezeichner (Tabellen, Spalten) stammen nur aus festen Code-Maps (`crud.js`, `backup.js` prüft gegen `information_schema`). Die einzige String-Interpolation ist `ALTER ROLE … PASSWORD` in der CLI mit `[A-Za-z0-9]{32,128}`-Whitelist. Ergebnis: Erfolgreich getestet.
- **Least Privilege:** Die Rolle `snackpoint_app` darf nur Zeilen lesen und schreiben (kein DDL, kein `TRUNCATE`, keine Schreibrechte auf `schema_migrations`), mit `statement_timeout` 15 s, `idle_in_transaction_session_timeout` 30 s und `CONNECTION LIMIT 20`. Die Testsuite läuft als diese Rolle. Ob Railway sie nutzt: Nicht testbar ohne weitere Berechtigungen.
- **Integrität:** Fremdschlüssel überall (`RESTRICT` für Medien und Kategorien, `CASCADE` für Sitzungen, Galerie und Stimmen), `CHECK`-Constraints (Längen, Preise ≥ 0, Enums, Zeitformate, Ende ≥ Beginn), eindeutige Indizes (E-Mail und Kategoriename case-insensitive, Slug, normalisierter Wunschname). Ergebnis: Erfolgreich getestet.
- **Transaktionen und Races:** CRUD, Galerie, Öffnungszeiten, Highlights, Wünsche und Restore laufen jeweils in einer Transaktion. Migrationen sind per Advisory-Lock abgesichert. Highlights und Wünsche: **Behoben (lokal)**.
- **Verbindungsabbruch:** **Behoben (lokal)** (S-1). Nicht erreichbare DB ergibt 503, Erholung ok.
- **TLS:** Standardmäßig `verify` außer für `localhost` und `*.railway.internal` (privates Netz), `no-verify` nur auf ausdrücklichen Wunsch.
- **Öffentliche Daten:** `/api/public/site` enthält nur aktive und veröffentlichte Inhalte, keine E-Mails, Hashes, Sitzungen, Notizen zu Wünschen oder Entwürfe. Ergebnis: Erfolgreich getestet.
- **Backup & Restore:** Restore nur über die CLI mit `--replace`, in einer Transaktion. Lokal auf der Testdatenbank vollständig geprüft. Ein Restore auf Railway wurde gemäß Vorgabe nicht ausgeführt.

## 11. Login- und Session-Sicherheit

- Argon2id (19 MiB, t = 2, OWASP-Baseline), keine Klartextpasswörter, keine Passwörter in Logs oder im Audit-Log. Mindestens 12 Zeichen, höchstens 200, mindestens 6 verschiedene Zeichen. Admins werden nur per CLI mit verdeckter Eingabe angelegt, ohne Registrierung. Ergebnis: Erfolgreich getestet.
- Keine Benutzer-Enumeration: gleiche Meldung, gleicher Status und gleiche Mindestdauer (800 ms) für unbekannte und bekannte E-Mail, Dummy-Hash für Unbekannte. Ergebnis: Erfolgreich getestet.
- Brute-Force-Schutz pro Konto und pro IP, eskalierend, in der Datenbank (überlebt Neustarts). Parallel-Race: **Behoben (lokal)**.
- Sitzungen: 256-Bit-Zufallstoken, nur der SHA-256-Hash in der DB, Inaktivitäts- und Maximaldauer, serverseitiges Logout, neues Token bei jedem Login (keine Fixation), andere Sitzungen enden bei Passwort-, Rollen- oder E-Mail-Wechsel, alle enden nach einem Restore. Cookie `__Host-`, `HttpOnly`, `Secure`, `SameSite=Strict`. CSRF-Token pro Sitzung plus Origin-/`Sec-Fetch-Site`-Prüfung. Keine Tokens in URLs. Ergebnis: Erfolgreich getestet.
- Berechtigungen werden ausschließlich serverseitig geprüft (`requireAdmin`, `requireDeveloper`). Das Frontend blendet nur aus. Ergebnis: Erfolgreich getestet.

## 12. API-Sicherheit (pro Endpunktgruppe)

| Endpunkte | Auth | Ergebnis |
|---|---|---|
| `GET /api/health` | offen (nur `{ok:true}`) | Erfolgreich getestet |
| `GET /api/public/site`, `/api/media/*` | offen, nur über den Worker | Erfolgreich getestet |
| `GET/POST/DELETE /api/public/wishes…` | offen, Origin-Prüfung, Honeypot, Limits | Limit-Race **behoben (lokal)** |
| `/api/auth/config`, `/me`, `/login`, `/logout`, `/password` | je nach Endpunkt | Race **behoben (lokal)**, sonst Erfolgreich getestet |
| `/api/admin/{dashboard,meta,products,groups,categories,events,banners,promotions,hours,media,wishes}` | Sitzung + CSRF | Highlights-Race und 500er **behoben (lokal)** |
| `/api/admin/{audit,users,backup}` | zusätzlich Entwickler-Rolle | 500er (Audit) **behoben (lokal)**, Pfad-Umgehungen ohne Erfolg |

Alles Weitere ist im Detail in Abschnitt 6.3 belegt: HTTP-Methoden (Override ignoriert, unbekannte Pfade → 404), Validierung per Zod (unbekannte Felder werden verworfen), Body-Limits (512 KB JSON, Upload `MAX_UPLOAD_MB`), CORS (keins), Fehlermeldungen (deutsche Klartexte bzw. „Interner Fehler“ mit Referenz, Stacktrace nur im Serverlog), SSRF (einziger ausgehender Aufruf ist Turnstile mit fester URL), Open Redirect (keins).

## 13. Cloudflare Workers und Caching

- **Free-Limits:** Bundle 356 KiB. React wird beim Isolate-Start aufgewärmt. Payloads über 200 KB werden nicht live gerendert (CPU-Schutz). API-Timeout 1,5 s. Ergebnis: Erfolgreich getestet.
- **Cache:** Live-Daten und gerenderte Regionen liegen 5 s im Isolate. HTML geht mit `max-age=0, must-revalidate` raus, Admin- und Wunsch-Antworten mit `no-store`. Nach jeder erfolgreichen Admin-Änderung wird der Cache des Isolates sofort verworfen (in der E2E-Simulation bestätigt). Andere Isolates folgen innerhalb von 5 s.
- **Keine privaten Daten im öffentlichen Cache:** Der Cache-Inhalt hängt weder von Host, Cookie noch Query ab, und Seiten setzen keine Cookies. Eine Seite mit Admin-Cookie enthält keine Admin-Daten. Bilder werden nur bei `GET`, `?v=` und 200 gecacht. Ergebnis: Erfolgreich getestet.
- **Cache-Poisoning / Host-Header:** Ein fremder Host-Header landet weder in canonical noch im JSON-LD. Query-Parameter werden nicht gespiegelt. Der Worker überschreibt vom Client gesendete Header (`X-Proxy-Secret`, `X-Original-Host`, `X-Client-IP`), die IP stammt aus `CF-Connecting-IP`. Ergebnis: Erfolgreich getestet.
- **Parallelität:** gemeinsame In-Flight-Anfrage, und eine Ladeanfrage, die vor einer Invalidierung gestartet wurde, schreibt den Cache nicht zurück. Ergebnis: Erfolgreich getestet.
- **Header:** S-3 und S-4 **behoben (lokal)**.

## 14. Abschlussbewertung der Veröffentlichungssicherheit

**Ist SnackPoint ausreichend abgesichert?** Nach diesen Prüfungen: **Ja, mit den lokalen Korrekturen ist SnackPoint für den Betrieb eines kleinen Ladens angemessen abgesichert.** Die Architektur ist durchdacht: API nur über den Worker erreichbar, serverseitige Sitzungen mit Hash-Speicherung, Argon2id, CSRF doppelt abgesichert, durchgängig parametrisiertes SQL, eingeschränkte DB-Rolle, Bilder werden re-encodiert und in einer Sandbox ausgeliefert, SSR mit sauberem Escaping, kontrollierter Fallback bei Ausfällen. Es gab keine kritischen oder hohen Befunde.

Diese Aussage ist **kein Beweis vollständiger Sicherheit**. Sie gilt für den geprüften Code, die lokale Umgebung und die wenigen lesenden Live-Prüfungen.

**Konkret bleibt:**
1. Die sieben Korrekturen sind **noch nicht live**. Bis zum Deploy bestehen in Produktion S-1 (Absturz bei DB-Abbruch) und S-2 (Rate-Limit-Race) weiter.
2. Die Railway-Konfiguration (eingeschränkte DB-Rolle, Secret-Stärke, Backups) konnte ich nicht einsehen (Abschnitt 9, Punkt 3).
3. Die Kontosperre kann missbraucht werden, um den Login zu blockieren, und es gibt kein 2FA. Turnstile würde das kostenlos dämpfen.
4. Nach dem Deploy die neuen Header einmal lesend prüfen (Abschnitt 9, Punkt 2).
