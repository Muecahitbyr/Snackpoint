import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import EventsPage from './components/events/EventsPage.jsx';
import { SiteProvider } from './site/SiteProvider';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <SiteProvider>
      <EventsPage />
    </SiteProvider>
  </StrictMode>
);
