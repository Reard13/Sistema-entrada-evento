import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, Plugin } from 'vite';
import { COLORES, EVENTO } from './src/config';

// Llena el título, la descripción y la vista previa del enlace con los datos de src/config.ts
const datosDelEvento = (): Plugin => ({
  name: 'datos-del-evento',
  transformIndexHtml: (html) =>
    html
      .replaceAll('%TITULO%', `${EVENTO.nombre} ${EVENTO.edicion}`)
      .replaceAll('%DESCRIPCION%', `${EVENTO.fechaTexto}, ${EVENTO.horaTexto} · ${EVENTO.lugar}. Elige tu asiento y compra tu entrada aquí.`)
      .replaceAll('%URL%', EVENTO.urlPublica.replace(/\/$/, ''))
      .replaceAll('%COLOR%', COLORES.fondoOscuro),
});

export default defineConfig({
  plugins: [react(), tailwindcss(), datosDelEvento()],
});
