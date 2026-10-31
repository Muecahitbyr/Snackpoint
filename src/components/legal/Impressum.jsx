import { ADDRESS, CONTACT } from '../../data/constants';
import { useSite } from '../../site/SiteProvider';
import LegalHeader from './LegalHeader';
import Placeholder from './Placeholder';
import Footer from '../Footer';
import CookieConsent from '../CookieConsent';
import './Legal.css';

export default function Impressum() {
  // Entered in the admin panel under Einstellungen → Rechtliche Angaben.
  const legal = useSite().settings.legal;

  return (
    <div className="legal-page">
      <LegalHeader />
      <main className="legal-content">
        <p className="eyebrow">Rechtliches</p>
        <h1>Impressum</h1>
        <p className="legal-updated">Angaben gemäß § 5 DDG</p>

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
          {legal.representative && <p>Vertreten durch: {legal.representative}</p>}
        </div>

        <h2>Kontakt</h2>
        <p>
          Telefon: {CONTACT.phone || <Placeholder>[Telefonnummer einfügen]</Placeholder>}
          <br />
          E-Mail: {CONTACT.email || <Placeholder>[E-Mail-Adresse einfügen]</Placeholder>}
        </p>

        {legal.register && (
          <>
            <h2>Registereintrag</h2>
            <p>{legal.register}</p>
          </>
        )}

        {legal.vatId && (
          <>
            <h2>Umsatzsteuer-ID</h2>
            <p>Umsatzsteuer-Identifikationsnummer gemäß § 27 a Umsatzsteuergesetz: {legal.vatId}</p>
          </>
        )}

        <h2>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h2>
        <p>
          {legal.responsible || legal.operator || <Placeholder>[Vor- und Nachname, Anschrift wie oben]</Placeholder>}
          {!legal.responsible && legal.operator && <>, {ADDRESS}</>}
        </p>

        <h2>Verbraucherstreitbeilegung</h2>
        <p>
          Wir sind nicht bereit und nicht verpflichtet, an Streitbeilegungsverfahren vor einer
          Verbraucherschlichtungsstelle teilzunehmen.
        </p>

        <h2>Haftung für Inhalte</h2>
        <p>
          Als Diensteanbieter sind wir für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen
          verantwortlich. Wir sind jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde
          Informationen zu überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige Tätigkeit
          hinweisen. Sobald uns eine Rechtsverletzung bekannt wird, entfernen wir die betreffenden Inhalte
          umgehend.
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

        <h2>Bildnachweis &amp; KI-generierte Inhalte</h2>
        <p>
          Abbildungen, die auf dieser Website mit „KI-generiertes Symbolbild“ gekennzeichnet sind, wurden
          vollständig mit künstlicher Intelligenz erstellt (ChatGPT, OpenAI). Sie dienen nur der
          Veranschaulichung und zeigen nicht das konkrete Produkt; Aussehen, Belag und Portionsgröße der
          angebotenen Ware können abweichen.
        </p>
      </main>
      <Footer />
      <CookieConsent />
    </div>
  );
}
