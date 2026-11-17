import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { COLORES } from './config';

// Colores de la marca desde config.ts
const root = document.documentElement.style;
root.setProperty('--marca', COLORES.marca);
root.setProperty('--marca-oscuro', COLORES.marcaOscuro);
root.setProperty('--fondo-oscuro', COLORES.fondoOscuro);
root.setProperty('--suave', COLORES.suave);
root.setProperty('--vip', COLORES.vip);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
