import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import Datenschutz from './components/legal/Datenschutz.jsx';
import { SiteProvider } from './site/SiteProvider';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <SiteProvider>
      <Datenschutz />
    </SiteProvider>
  </StrictMode>
);
