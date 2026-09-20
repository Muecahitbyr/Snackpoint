import { ADDRESS } from '../../data/constants';
import LegalHeader from './LegalHeader';
import Placeholder from './Placeholder';
import Footer from '../Footer';
import CookieConsent from '../CookieConsent';
import './Legal.css';

export default function Datenschutz() {
  return (
    <div className="legal-page">
      <LegalHeader />
      <main className="legal-content">
        <p className="eyebrow">Rechtliches</p>
        <h1>Datenschutzerklärung</h1>
        <p className="legal-updated">Stand: September 2026</p>

        <h2>1. Verantwortlicher</h2>
        <div className="legal-card">
          <p>
            <strong>
              <Placeholder>Vor- und Nachname des Betreibers / Firmenname und Rechtsform</Placeholder>
            </strong>
          </p>
          <p>SnackPoint Kaufbeuren</p>
          <p>{ADDRESS}</p>
          <p>
            E-Mail: <Placeholder>[E-Mail-Adresse einfügen]</Placeholder>
            <br />
            Telefon: <Placeholder>[Telefonnummer einfügen]</Placeholder>
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

        <h2>3. Hosting und Server-Logfiles</h2>
        <p>
          Diese Website wird bei Vercel Inc. gehostet. Beim Aufruf der Website erhebt der Hosting-Anbieter
          automatisch technische Zugriffsdaten (sogenannte Server-Logfiles), u. a. IP-Adresse, Datum und
          Uhrzeit der Anfrage, aufgerufene Seite, verwendeter Browser und Betriebssystem sowie die zuvor
          besuchte Seite (Referrer). Diese Daten sind technisch erforderlich, um die Website auszuliefern
          und die Betriebssicherheit zu gewährleisten (Art. 6 Abs. 1 lit. f DSGVO, berechtigtes Interesse
          an einer funktionierenden Website).
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
          Dieser Eintrag verlässt Ihr Gerät nicht und wird nicht an uns übertragen. Er wird ausschließlich
          benötigt, um Ihre Zustimmung technisch umzusetzen (Art. 6 Abs. 1 lit. f DSGVO). Erst wenn Sie der
          Google-Maps-Einbindung zustimmen, kann Google eigene Cookies setzen (siehe Punkt 6).
        </p>

        <h2>8. SnackPoint Assistent (Chat-Widget)</h2>
        <p>
          Der Chat-Assistent unten rechts beantwortet Fragen vollständig lokal in Ihrem Browser über eine
          feste, hinterlegte Wissensdatenbank. Ihre Eingaben werden <strong>nicht an einen Server
          übertragen, nicht gespeichert und nicht an Dritte weitergegeben</strong> — es findet keine
          Anbindung an einen externen KI-Dienst statt.
        </p>

        <h2>9. Änderung dieser Datenschutzerklärung</h2>
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
