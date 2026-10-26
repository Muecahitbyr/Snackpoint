import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import ProduktePage from './components/products/ProduktePage.jsx';
import { SiteProvider } from './site/SiteProvider';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <SiteProvider>
      <ProduktePage />
    </SiteProvider>
  </StrictMode>
);
