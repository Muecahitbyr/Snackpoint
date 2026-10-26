import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { SiteProvider } from './site/SiteProvider';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <SiteProvider>
      <App />
    </SiteProvider>
  </StrictMode>
);
