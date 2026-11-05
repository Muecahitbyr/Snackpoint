import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import Nutzungsbedingungen from './components/legal/Nutzungsbedingungen.jsx';
import { SiteProvider } from './site/SiteProvider';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <SiteProvider>
      <Nutzungsbedingungen />
    </SiteProvider>
  </StrictMode>
);
