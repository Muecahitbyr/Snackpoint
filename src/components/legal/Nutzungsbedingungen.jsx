import { ADDRESS, CONTACT } from '../../data/constants';
import { useSite } from '../../site/SiteProvider';
import LegalHeader from './LegalHeader';
import Placeholder from './Placeholder';
import Footer from '../Footer';
import CookieConsent from '../CookieConsent';
import './Legal.css';

// Draft: describes only what the website really does (information, product
// overview, wish list, local chat assistant, embeds after consent). Nothing
// can be bought or booked here. The placeholders must go before it is published.
export default function Nutzungsbedingungen() {
  const { legal, siteUrl } = useSite().settings;
  const host = new URL(siteUrl).host;

  return (
    <div className="legal-page">
      <LegalHeader />
      <main className="legal-content">
        <p className="eyebrow">Rechtliches</p>
        <h1>Nutzungsbedingungen</h1>
        <p className="legal-updated">
          Stand: <Placeholder>[Datum nach der rechtlichen Prüfung einsetzen]</Placeholder>
        </p>
        <p>
          <Placeholder>Entwurf: vor der Veröffentlichung rechtlich prüfen lassen und diesen Hinweis entfernen.</Placeholder>
        </p>

        <h2>1. Geltungsbereich</h2>
        <p>
          Diese Nutzungsbedingungen gelten für die Nutzung der Website {host}. Betreiber der Website ist:
        </p>
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
        </div>
        <p>
          Weitere Angaben finden Sie im <a href="/impressum">Impressum</a>. Die Website können Sie kostenlos und
          ohne Anmeldung nutzen. Für Einkäufe und Leistungen in unserem Laden gelten diese Nutzungsbedingungen
          nicht.
        </p>

        <h2>2. Was die Website bietet</h2>
        <ul>
          <li>Informationen über unseren Kiosk, unsere Leistungen, Öffnungszeiten und Anfahrt</li>
          <li>eine Übersicht über einen Teil unseres Sortiments unter <a href="/produkte">/produkte</a></li>
          <li>Hinweise auf Aktionen und Veranstaltungen</li>
          <li>eine Wunschliste, auf der Sie Produkte vorschlagen und über Vorschläge abstimmen können</li>
          <li>
            einen Chat-Assistenten, der Fragen anhand der Inhalte dieser Website beantwortet, und zwar
            vollständig in Ihrem Browser
          </li>
          <li>eine Google-Maps-Karte und unsere TikTok- und Instagram-Profile, die erst nach Ihrer Einwilligung laden</li>
        </ul>
        <p>
          Über die Website können Sie nichts bestellen, kaufen oder reservieren, und es gibt kein Kundenkonto.
          Lotto-Spielaufträge und Paketsendungen nehmen wir nur im Laden an. Dafür gelten die Bedingungen des
          jeweiligen Anbieters.
        </p>
        <p>
          Der passwortgeschützte Verwaltungsbereich ist nur für unser Team bestimmt. Versuche, sich ohne
          Berechtigung Zugang zu verschaffen, sind nicht erlaubt.
        </p>

        <h2>3. Wunschliste</h2>
        <p>
          Ein Wunsch besteht aus einem Produktnamen und optional einem kurzen Hinweis. Bevor ein Wunsch auf
          der Website erscheint, prüfen wir ihn. Öffentlich angezeigt wird nur der Produktname, der Hinweis
          ist nur für uns sichtbar. Bitte beachten Sie beim Einsenden:
        </p>
        <ul>
          <li>Geben Sie keine personenbezogenen Daten ein, weder eigene noch die anderer Personen.</li>
          <li>
            Senden Sie keine beleidigenden, diskriminierenden, rechtswidrigen oder werblichen Inhalte und
            nichts, was Rechte Dritter verletzt.
          </li>
          <li>Stimmen Sie pro Wunsch nur einmal ab und versenden Sie Wünsche nicht automatisiert.</li>
        </ul>
        <p>
          Wir entscheiden selbst, ob wir einen Wunsch veröffentlichen. Wir können Wünsche ablehnen, kürzen,
          in der Schreibweise korrigieren, gleiche Wünsche zusammenfassen oder wieder löschen. Ein Anspruch
          auf Veröffentlichung besteht nicht, und ein Wunsch bedeutet nicht, dass wir das Produkt ins Sortiment
          aufnehmen. Um Missbrauch zu verhindern, begrenzen wir die Zahl der Einsendungen. Mit dem Absenden
          erlauben Sie uns, Ihren Wunsch unentgeltlich auf der Website zu zeigen und für unsere
          Sortimentsplanung zu nutzen. Wie wir dabei mit Daten umgehen, steht in der{' '}
          <a href="/datenschutz">Datenschutzerklärung</a>.
        </p>

        <h2>4. Ihre Pflichten bei der Nutzung</h2>
        <p>Bei der Nutzung der Website dürfen Sie nicht:</p>
        <ul>
          <li>
            den Betrieb der Website stören, etwa durch eine große Zahl automatisierter Anfragen in kurzer
            Zeit,
          </li>
          <li>Sicherheitsmaßnahmen umgehen oder Schwachstellen ausnutzen,</li>
          <li>Schadsoftware oder andere schädliche Inhalte übertragen.</li>
        </ul>

        <h2>5. Verfügbarkeit und technische Einschränkungen</h2>
        <p>
          Wir stellen die Website kostenlos bereit. Einen Anspruch darauf, dass sie jederzeit und ohne
          Unterbrechung erreichbar ist, gibt es nicht. Wartungsarbeiten, Störungen bei unseren technischen
          Dienstleistern oder Umstände außerhalb unseres Einflusses können die Nutzung zeitweise einschränken.
          Wir können Funktionen ändern, erweitern oder einstellen.
        </p>
        <p>
          Einige Funktionen brauchen JavaScript. Eingebettete Inhalte von Google, TikTok und Instagram kommen
          von diesen Anbietern. Ob und wie sie angezeigt werden, liegt nicht bei uns. Der Chat-Assistent
          arbeitet mit festen Regeln und den Inhalten dieser Website. Seine Antworten können unvollständig
          sein und sind keine verbindliche Auskunft.
        </p>

        <h2>6. Inhalte, Produktinformationen und Preise</h2>
        <p>
          Wir erstellen die Inhalte der Website sorgfältig. Sortiment, Verfügbarkeit, Öffnungszeiten, Aktionen
          und Veranstaltungen können sich aber ändern, und kurzfristige Änderungen tragen wir nicht immer
          rechtzeitig ein. Die Produktübersicht zeigt nur einen Teil unseres Sortiments und keinen
          tagesaktuellen Bestand. Ob ein Produkt gerade da ist, erfahren Sie im Laden.
        </p>
        <p>
          Soweit die Website Preise nennt, sind das keine verbindlichen Angebote. Ein Kaufvertrag kommt erst
          im Laden zustande. Maßgeblich ist der Preis, der beim Kauf im Laden ausgezeichnet ist.
        </p>
        <p>
          Produktabbildungen können vom tatsächlichen Produkt abweichen. Abbildungen mit dem Hinweis
          „KI-generiertes Symbolbild“ wurden mit künstlicher Intelligenz erstellt und zeigen nicht das konkrete
          Produkt. Soweit wir Angaben zu Allergenen oder Inhaltsstoffen machen, ersetzen sie nicht die Angaben
          auf der Verpackung. Fragen Sie im Zweifel im Laden nach. Für Tabakwaren, E-Zigaretten, Alkohol und
          Lotto gelten gesetzliche Altersgrenzen, die wir beim Kauf im Laden prüfen.
        </p>

        <h2>7. Externe Links und Drittanbieter</h2>
        <p>
          Die Website enthält Links zu Angeboten anderer Anbieter, zum Beispiel zu Google Maps, TikTok und
          Instagram. Auf deren Inhalte haben wir keinen Einfluss. Für sie ist der jeweilige Anbieter
          verantwortlich. Erfahren wir von rechtswidrigen Inhalten auf einer verlinkten Seite, entfernen wir den
          Link.
        </p>
        <p>
          Die Google-Maps-Karte und die TikTok- und Instagram-Profile binden wir erst ein, wenn Sie zustimmen.
          Danach gelten für diese Inhalte auch die Bedingungen und Datenschutzbestimmungen des jeweiligen
          Anbieters. Einzelheiten stehen in der <a href="/datenschutz">Datenschutzerklärung</a>. Ihre Auswahl
          können Sie jederzeit über „Cookie-Einstellungen“ unten auf jeder Seite ändern.
        </p>

        <h2>8. Urheberrechte und Nutzungsrechte</h2>
        <p>
          Die Inhalte dieser Website, etwa Texte, Gestaltung, Logo und das SnackPoint-Maskottchen, sind
          urheberrechtlich geschützt, soweit sie die Voraussetzungen dafür erfüllen. Marken, Produktnamen,
          Produktabbildungen und Logos von Herstellern und Partnern (zum Beispiel Hermes und Lotto) gehören den
          jeweiligen Rechteinhabern.
        </p>
        <p>
          Sie dürfen die Website für private Zwecke ansehen, Seiten ausdrucken und Links darauf teilen. Jede
          weitere Verwendung, insbesondere das Kopieren, Bearbeiten oder Verbreiten von Inhalten, ist nur mit
          Zustimmung des jeweiligen Rechteinhabers erlaubt, soweit das Gesetz nichts anderes zulässt. Wenn Sie
          meinen, dass Inhalte auf dieser Website Ihre Rechte verletzen, schreiben Sie uns bitte. Wir prüfen
          den Hinweis und entfernen betroffene Inhalte, wenn er berechtigt ist.
        </p>

        <h2>9. Haftung</h2>
        <p>
          Wir haften unbeschränkt für Vorsatz und grobe Fahrlässigkeit, für Schäden aus der Verletzung des
          Lebens, des Körpers oder der Gesundheit und nach dem Produkthaftungsgesetz.
        </p>
        <p>
          Bei leichter Fahrlässigkeit haften wir nur, wenn wir eine wesentliche Pflicht verletzen. Das ist eine
          Pflicht, deren Erfüllung die ordnungsgemäße Nutzung der Website überhaupt erst möglich macht und auf
          deren Einhaltung Sie regelmäßig vertrauen dürfen. In diesem Fall ist die Haftung auf den
          vorhersehbaren, typischerweise eintretenden Schaden begrenzt. Im Übrigen haften wir für leichte
          Fahrlässigkeit nicht.
        </p>
        <p>
          Diese Regeln betreffen nur die Nutzung der Website. Für Einkäufe und Leistungen im Laden gelten die
          gesetzlichen Vorschriften.
        </p>

        <h2>10. Änderungen dieser Nutzungsbedingungen</h2>
        <p>
          Wir können diese Nutzungsbedingungen ändern, zum Beispiel wenn neue Funktionen dazukommen oder sich
          die Rechtslage ändert. Es gilt die Fassung, die zum Zeitpunkt Ihres Besuchs auf dieser Seite
          veröffentlicht ist. Den Stand sehen Sie oben auf der Seite.
        </p>

        <h2>11. Kontakt</h2>
        <p>
          Bei Fragen zu diesen Nutzungsbedingungen oder Hinweisen auf rechtswidrige Inhalte erreichen Sie uns
          so:
          <br />
          E-Mail: {CONTACT.email || <Placeholder>[E-Mail-Adresse einfügen]</Placeholder>}
          <br />
          Telefon: {CONTACT.phone || <Placeholder>[Telefonnummer einfügen]</Placeholder>}
        </p>

        <h2>12. Schlussbestimmungen</h2>
        <p>
          Es gilt das Recht der Bundesrepublik Deutschland. Sind Sie Verbraucher, gilt diese Rechtswahl nur,
          soweit Ihnen dadurch nicht der Schutz zwingender Vorschriften des Staates entzogen wird, in dem Sie
          Ihren gewöhnlichen Aufenthalt haben.
        </p>
        <p>
          Ist eine Bestimmung dieser Nutzungsbedingungen unwirksam, bleiben die übrigen Bestimmungen wirksam.
          An die Stelle der unwirksamen Bestimmung treten die gesetzlichen Vorschriften.
        </p>
      </main>
      <Footer />
      <CookieConsent />
    </div>
  );
}
