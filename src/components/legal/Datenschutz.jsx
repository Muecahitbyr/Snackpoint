import { ADDRESS, CONTACT } from '../../data/constants';
import { useSite } from '../../site/SiteProvider';
import LegalHeader from './LegalHeader';
import Placeholder from './Placeholder';
import Footer from '../Footer';
import CookieConsent from '../CookieConsent';
import './Legal.css';

export default function Datenschutz() {
  const legal = useSite().settings.legal;

  return (
    <div className="legal-page">
      <LegalHeader />
      <main className="legal-content">
        <p className="eyebrow">Rechtliches</p>
        <h1>Datenschutzerklärung</h1>
        <p className="legal-updated">Stand: Oktober 2026</p>

        <h2>1. Verantwortlicher</h2>
        <div className="legal-card">
          <p>
            <strong>
              {legal.operator ? (
                [legal.operator, legal.legalForm].filter(Boolean).join(' ')
              ) : (
                <Placeholder>Vor- und Nachname des Betreibers / Firmenname und Rechtsform</Placeholder>
              )}
            </strong>
          </p>
          <p>SnackPoint Kaufbeuren</p>
          <p>{ADDRESS}</p>
          <p>
            E-Mail: {CONTACT.email || <Placeholder>[E-Mail-Adresse einfügen]</Placeholder>}
            <br />
            Telefon: {CONTACT.phone || <Placeholder>[Telefonnummer einfügen]</Placeholder>}
          </p>
        </div>

        <h2>2. Ihre Rechte als betroffene Person</h2>
        <p>Sie haben jederzeit das Recht:</p>
        <ul>
          <li>Auskunft über Ihre bei uns gespeicherten Daten zu verlangen (Art. 15 DSGVO),</li>
          <li>die Berichtigung unrichtiger Daten zu verlangen (Art. 16 DSGVO),</li>
          <li>die Löschung Ihrer Daten zu verlangen (Art. 17 DSGVO),</li>
          <li>die Einschränkung der Verarbeitung zu verlangen (Art. 18 DSGVO),</li>
          <li>der Verarbeitung zu widersprechen (Art. 21 DSGVO),</li>
          <li>Ihre Daten in einem gängigen Format zu erhalten (Datenübertragbarkeit, Art. 20 DSGVO),</li>
          <li>
            sich bei einer Datenschutz-Aufsichtsbehörde zu beschweren, z. B. beim Bayerischen Landesamt für
            Datenschutzaufsicht.
          </li>
        </ul>

        <h2>3. Hosting, Server und Server-Logfiles</h2>
        <p>
          Diese Website wird über das Netzwerk der Cloudflare, Inc. (101 Townsend St., San Francisco, CA 94107,
          USA) ausgeliefert. Beim Aufruf der Website verarbeitet Cloudflare automatisch technische
          Zugriffsdaten, u. a. IP-Adresse, Datum und Uhrzeit der Anfrage, aufgerufene Seite, verwendeter Browser
          und Betriebssystem sowie die zuvor besuchte Seite (Referrer). Diese Daten sind technisch erforderlich,
          um die Website schnell und sicher auszuliefern und vor Angriffen zu schützen (Art. 6 Abs. 1 lit. f
          DSGVO, berechtigtes Interesse an einer funktionierenden und sicheren Website). Cloudflare ist unter
          dem EU-US Data Privacy Framework zertifiziert; weitere Informationen:{' '}
          <a href="https://www.cloudflare.com/privacypolicy/" target="_blank" rel="noopener noreferrer">
            cloudflare.com/privacypolicy
          </a>
          .
        </p>
        <p>
          Die Inhalte der Website (Produkte, Öffnungszeiten, Events, Bilder usw.) liegen in einer Datenbank, die
          wir bei der Railway Corporation (USA) betreiben. Beim Seitenaufruf ruft Ihr Browser diese Inhalte über
          Cloudflare von unserem Server ab. Dabei werden keine Daten über Sie gespeichert. Mit beiden Anbietern
          bestehen Verträge zur Auftragsverarbeitung (Art. 28 DSGVO); Übermittlungen in die USA erfolgen auf
          Grundlage des EU-US Data Privacy Framework bzw. der EU-Standardvertragsklauseln.
        </p>

        <h2>4. SSL-/TLS-Verschlüsselung</h2>
        <p>
          Diese Seite nutzt aus Sicherheitsgründen eine SSL-/TLS-Verschlüsselung. Eine verschlüsselte
          Verbindung erkennen Sie an dem Schloss-Symbol Ihres Browsers und daran, dass die Adresszeile mit
          „https://" beginnt.
        </p>

        <h2>5. Google Fonts</h2>
        <p>
          Diese Website bindet Schriftarten (Google Fonts) von Google ein, die über einen Server von Google
          in den USA geladen werden. Dabei kann Ihre IP-Adresse an Google übertragen werden. Weitere
          Informationen finden Sie in der Datenschutzerklärung von Google:{' '}
          <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">
            policies.google.com/privacy
          </a>
          .
        </p>

        <h2>6. Google Maps</h2>
        <p>
          Im Bereich „Standort" binden wir eine Karte des Dienstes Google Maps ein. Beim Laden der Karte
          überträgt Google Daten (u. a. Ihre IP-Adresse) an Server in den USA und kann eigene Cookies
          setzen. Aus diesem Grund laden wir die Karte <strong>erst, nachdem Sie im Cookie-Banner bzw.
          direkt an der Karte aktiv zugestimmt haben</strong>. Ihre Zustimmung speichern wir lokal in Ihrem
          Browser (siehe Punkt 7) und können Sie jederzeit über den Link „Cookie-Einstellungen" im Footer
          widerrufen. Alternativ können Sie den Standort auch ohne eingebettete Karte über den Button
          „In Google Maps öffnen" direkt bei Google ansehen. Informationen zum Umgang mit Ihren Daten bei
          Google finden Sie unter{' '}
          <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">
            policies.google.com/privacy
          </a>
          . Rechtsgrundlage ist Ihre Einwilligung (Art. 6 Abs. 1 lit. a DSGVO).
        </p>

        <h2>7. Lokale Speicherung (localStorage) &amp; Cookies</h2>
        <p>
          Um Ihre Cookie-Entscheidung (siehe Punkt 6) nicht bei jedem Besuch erneut abfragen zu müssen,
          speichern wir diese in Ihrem Browser (localStorage), nicht in Form eines klassischen Cookies.
          Schließen Sie einen Hinweis-Banner oben auf der Seite, merken wir uns das bis zum Schließen des
          Browsers (sessionStorage), damit er nicht auf jeder Seite erneut erscheint. Diese Einträge verlassen
          Ihr Gerät nicht und werden nicht an uns übertragen. Sie sind für die von Ihnen gewünschten Funktionen
          unbedingt erforderlich (§ 25 Abs. 2 Nr. 2 TDDDG, Art. 6 Abs. 1 lit. f DSGVO). Erst wenn Sie der
          Google-Maps-Einbindung zustimmen, kann Google eigene Cookies setzen (siehe Punkt 6).
        </p>

        <h2>8. SnackPoint Assistent (Chat-Widget)</h2>
        <p>
          Der Chat-Assistent unten rechts beantwortet Fragen vollständig lokal in Ihrem Browser über eine
          feste, hinterlegte Wissensdatenbank. Ihre Eingaben werden <strong>nicht an einen Server
          übertragen, nicht gespeichert und nicht an Dritte weitergegeben</strong> — es findet keine
          Anbindung an einen externen KI-Dienst statt.
        </p>

        <h2>9. Verwaltungsbereich</h2>
        <p>
          Die Inhalte dieser Website pflegen wir über einen passwortgeschützten Verwaltungsbereich, der nur
          unseren Mitarbeitenden zugänglich ist. Für Besucherinnen und Besucher der Website werden dabei keine
          Daten verarbeitet. Bei der Anmeldung setzen wir ein technisch notwendiges Sitzungs-Cookie, das nach
          dem Abmelden bzw. spätestens nach Ablauf der Sitzung gelöscht wird (§ 25 Abs. 2 Nr. 2 TDDDG). Zum Schutz
          vor Angriffen auf die Anmeldung (z. B. massenhaftes Ausprobieren von Passwörtern) speichern wir bei
          jedem Anmeldeversuch die IP-Adresse, die eingegebene E-Mail-Adresse und den Zeitpunkt für 7 Tage
          (Art. 6 Abs. 1 lit. f DSGVO, berechtigtes Interesse an der Sicherheit unserer Systeme).
        </p>

        <h2>10. Änderung dieser Datenschutzerklärung</h2>
        <p>
          Wir behalten uns vor, diese Datenschutzerklärung anzupassen, damit sie stets den aktuellen
          rechtlichen Anforderungen entspricht oder um Änderungen unserer Leistungen umzusetzen.
        </p>
      </main>
      <Footer />
      <CookieConsent />
    </div>
  );
}
