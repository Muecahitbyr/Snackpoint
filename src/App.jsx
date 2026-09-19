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
import SnackBotWidget from './components/chatbot/SnackBotWidget';

// The 3D character (src/components/character/, src/hooks/useCharacterScroll.ts)
// has been retired in favor of the 2D chatbot below. Its files are kept in
// place as a backup/reference, but nothing here imports or mounts them
// anymore, so neither the GLB nor react-three-fiber end up in the live
// bundle.

export default function App() {
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
    </>
  );
}
