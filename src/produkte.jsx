import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import ProduktePage from './components/products/ProduktePage.jsx';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ProduktePage />
  </StrictMode>
);
