import { lazy, Suspense } from 'react';
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

// Code-split behind the rest of the site: three.js/R3F dominate the bundle
// (see CHARACTER_3D.md "Bundle"), so the main page JS (React, GSAP, the
// sections) parses/executes without waiting on it. The GLB itself already
// starts downloading immediately regardless, via the <link rel="preload">
// in index.html, so this doesn't delay the model — only the character
// component's own (much smaller) JS chunk loads a beat later. fallback={null}
// means there's nothing to visually pop in; the character simply isn't
// mounted yet for the first frame or two.
const CharacterCanvas = lazy(() => import('./components/character/CharacterCanvas'));

export default function App() {
  return (
    <>
      <ProgressBar />
      <Suspense fallback={null}>
        <CharacterCanvas />
      </Suspense>
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
    </>
  );
}
