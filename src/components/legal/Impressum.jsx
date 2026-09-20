import { ADDRESS } from '../../data/constants';
import LegalHeader from './LegalHeader';
import Placeholder from './Placeholder';
import Footer from '../Footer';
import CookieConsent from '../CookieConsent';
import './Legal.css';

export default function Impressum() {
  return (
    <div className="legal-page">
      <LegalHeader />
      <main className="legal-content">
        <p className="eyebrow">Rechtliches</p>
        <h1>Impressum</h1>
        <p className="legal-updated">Angaben gemäß § 5 TMG, § 18 Abs. 2 MStV</p>

        <div className="legal-card">
          <p>
            <strong>
              <Placeholder>Vor- und Nachname des Betreibers / Firmenname und Rechtsform</Placeholder>
            </strong>
          </p>
          <p>SnackPoint Kaufbeuren</p>
          <p>{ADDRESS}</p>
        </div>

        <h2>Kontakt</h2>
        <p>
          Telefon: <Placeholder>[Telefonnummer einfügen]</Placeholder>
          <br />
          E-Mail: <Placeholder>[E-Mail-Adresse einfügen]</Placeholder>
        </p>

        <h2>Umsatzsteuer-ID</h2>
        <p>
          Umsatzsteuer-Identifikationsnummer gemäß § 27 a Umsatzsteuergesetz:{' '}
          <Placeholder>[USt-IdNr. einfügen, falls vorhanden]</Placeholder>
        </p>

        <h2>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h2>
        <p>
          <Placeholder>[Vor- und Nachname, Anschrift wie oben]</Placeholder>
        </p>

        <h2>EU-Streitschlichtung</h2>
        <p>
          Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:{' '}
          <a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noopener noreferrer">
            https://ec.europa.eu/consumers/odr/
          </a>
          . Unsere E-Mail-Adresse finden Sie oben im Impressum.
        </p>
        <p>
          Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer
          Verbraucherschlichtungsstelle teilzunehmen.
        </p>

        <h2>Haftung für Inhalte</h2>
        <p>
          Als Diensteanbieter sind wir gemäß § 7 Abs. 1 TMG für eigene Inhalte auf diesen Seiten nach den
          allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG sind wir als Diensteanbieter jedoch
          nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen oder nach
          Umständen zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen.
        </p>

        <h2>Haftung für Links</h2>
        <p>
          Unser Angebot enthält Links zu externen Websites Dritter (z. B. Google Maps), auf deren Inhalte
          wir keinen Einfluss haben. Deshalb können wir für diese fremden Inhalte auch keine Gewähr
          übernehmen. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter verantwortlich.
        </p>

        <h2>Urheberrecht</h2>
        <p>
          Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem
          deutschen Urheberrecht. Beiträge Dritter sind als solche gekennzeichnet. Die Vervielfältigung,
          Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der Grenzen des Urheberrechtes
          bedürfen der schriftlichen Zustimmung des jeweiligen Autors bzw. Erstellers.
        </p>
      </main>
      <Footer />
      <CookieConsent />
    </div>
  );
}
