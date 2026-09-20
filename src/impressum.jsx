import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import Impressum from './components/legal/Impressum.jsx';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Impressum />
  </StrictMode>
);
