import { useEffect } from 'react';
import ProgressBar from './components/ProgressBar';
import Header from './components/Header';
import Hero from './components/Hero';
import About from './components/About';
import Services from './components/Services';
import Highlight from './components/Highlight';
import NewProducts from './components/NewProducts';
import Reviews from './components/Reviews';
import Location from './components/Location';
import Footer from './components/Footer';
import CookieConsent from './components/CookieConsent';
import SnackBotWidget from './components/chatbot/SnackBotWidget';

// The 3D character (src/components/character/, src/hooks/useCharacterScroll.ts)
// has been retired in favor of the 2D chatbot below. Its files are kept in
// place as a backup/reference, but nothing here imports or mounts them
// anymore, so neither the GLB nor react-three-fiber end up in the live
// bundle.

export default function App() {
  // A link like /produkte.html's "/#services" lands here via a full page
  // load, so the browser's native scroll-to-hash fires before React has
  // mounted the sections and finds nothing — do it again once they exist.
  useEffect(() => {
    if (!window.location.hash) return;
    const el = document.querySelector(window.location.hash);
    el?.scrollIntoView({ behavior: 'auto', block: 'start' });
  }, []);

  // TEMPORARY diagnostic — see chatPerf.ts / the chatbot-latency
  // investigation. ?pageSimple=1 freezes every decorative animation on the
  // WHOLE page (not just the chat widget, unlike ?chatSimple=1), to test
  // whether inserting the fixed-position chat panel is expensive because
  // iOS Safari has to recomposite everything else that's concurrently
  // animating (blurred blobs, the marquee, etc.), not because of anything
  // in the widget's own CSS.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('pageSimple') === '1') {
      document.body.classList.add('page-simple');
    }
  }, []);

  return (
    <>
      <ProgressBar />
      <Header />
      <main>
        <Hero />
        <About />
        <Services />
        <Highlight />
        <NewProducts />
        <Reviews />
        <Location />
      </main>
      <Footer />
      <SnackBotWidget />
      <CookieConsent />
    </>
  );
}
