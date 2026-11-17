# Sistema de entradas · Paquete Básico

Venta de entradas con mapa de asientos, pago por Pago Móvil, entradas con código QR y escáner para la puerta.

Desarrollado por **Alejandro Reina**.

## Qué incluye

**Página pública**
- Portada con nombre, fecha, hora, lugar y cuenta regresiva.
- Entradas General y VIP con precio en $ y en Bs (tasa BCV del día).
- Mapa de asientos: libres, ocupados y seleccionados, actualizado en tiempo real.
- Reserva de los asientos por 15 minutos mientras la persona paga.
- Pago Móvil: datos para copiar, reporte de la referencia y aviso por WhatsApp.
- Términos y condiciones que se aceptan antes de comprar.
- «Consultar Mi Boleto» por localizador o teléfono.
- Entrada digital con QR, que se libera cuando el organizador aprueba el pago.

**Panel del personal** (enlace «Personal» en el pie de página, o `/?panel`)
- **Administrador:** contadores (vendidas, por revisar, recaudado, ingresos), aprobar o rechazar pagos, enviar la entrada por WhatsApp, reactivar o borrar rechazadas.
- **Puerta:** escáner QR con la cámara, subir foto o escribir el localizador. Cada entrada pasa una sola vez. Se puede anular un ingreso hecho por error.

## Adaptarlo a un evento nuevo

1. Cambia **`src/config.ts`**: nombre, fecha, lugar, precios, Pago Móvil, WhatsApp, colores, mapa de asientos y términos.
2. Cambia las imágenes de `public/icons/` (ícono y vista previa del enlace, 1200×630).
3. Crea las claves en `.env.local` (local) o en Render (publicado). Mira `.env.example`.

## Probar en la computadora

```bash
npm install
cp .env.example .env.local   # y escribe tus claves
npm run dev                  # http://localhost:3000
```

## Publicar en Render

1. Sube el repositorio a GitHub.
2. En Render: **New → Blueprint** y elige el repositorio (usa `render.yaml`).
3. Escribe `ADMIN_PIN` y `PUERTA_PIN` en **Environment**.
4. Pon la dirección final en `EVENTO.urlPublica` (`src/config.ts`) y vuelve a publicar.

Los datos se guardan en el disco de Render (`/data`): `.reservas.json` e `.ingresos.json`.
No se suben a GitHub.

## Seguridad

- Las claves se validan en el servidor, con límite de intentos.
- El servidor calcula los precios y verifica que los asientos estén libres.
- Cada QR lleva una firma del servidor: no se puede fabricar una entrada válida.
- La búsqueda pública exige el localizador o el teléfono completo, con límite de intentos.
