# Sistema de entradas · Canta La Navidad

Venta de entradas con pago por Pago Móvil o transferencia, un código QR por compra y escáner para la puerta.

Desarrollado por **Alejandro Reina**.

## Qué incluye

**Página pública**
- Portada con nombre, fecha, hora, lugar y cuenta regresiva.
- Precio base en **euros** (€). Debajo se muestra el equivalente en bolívares, calculado con la tasa BCV del euro del día.
- Pago por Pago Móvil o transferencia: datos para copiar, reporte de la referencia y aviso por WhatsApp.
- Términos y condiciones que se aceptan antes de comprar.
- «Consultar mi boleto» por localizador o teléfono.
- Entrada digital con **un solo QR por compra**, que se libera cuando el organizador aprueba el pago. Ese QR valida todas las entradas de la compra.

**Panel del personal** (5 toques seguidos sobre el logo del pie de página)
- **Pagos:** contadores, aprobar o rechazar pagos, enviar la entrada por WhatsApp, reactivar, borrar y descargar un respaldo.
- **Escáner:** cámara, subir foto o escribir el localizador. Una compra entra una sola vez. Se puede anular un ingreso hecho por error.

Un aviso aparece cuando llega un pago nuevo mientras el panel está abierto.

## Adaptarlo a un evento nuevo

1. Cambia **`src/config.ts`**: nombre, fecha, lugar, precio, datos de pago, WhatsApp, colores, términos y `urlPublica` (la dirección pública).
   Los métodos de pago están en `METODOS_PAGO`. Cada uno tiene sus datos, su moneda y `activo` para mostrarlo u ocultarlo.
   Si el lugar no tiene asientos numerados, `ASIENTOS_NUMERADOS = false` y `CAPACIDAD` es el aforo.
2. Cambia las imágenes de `public/` (logos, título, portada) y de `public/icons/` (ícono y vista previa del enlace, 1200×630).
3. Crea las claves en `.env.local` (local) o en Render (publicado). Mira `.env.example`.

## Claves

- `ADMIN_PIN`: clave del administrador. Puedes escribir varias separadas por comas (`clave1,clave2`) para dar acceso a cada persona con su propia clave y quitarla después sin cambiar las demás.
- `PUERTA_PIN`: clave opcional para el personal que solo usa el escáner. Si el equipo usa la misma clave de administrador, no hace falta.
- `ADMIN_SESSION_SECRET`: secreto de las sesiones. En Render se genera solo.

## Probar en la computadora

```bash
npm install
cp .env.example .env.local   # y escribe tus claves
npm run dev                  # http://localhost:3000
```

Los datos de prueba se guardan en la carpeta del proyecto, en `.reservas.json` e `.ingresos.json`. Son ignorados por Git. Para probar con datos aislados, usa `DATA_DIR` con otra carpeta.

## Publicar en Render

1. Sube el repositorio a GitHub.
2. En Render: **New → Blueprint** y elige el repositorio (usa `render.yaml`).
3. Escribe `ADMIN_PIN` (y `PUERTA_PIN` si la usas) en **Environment**.
4. Cuando el dominio funcione, pon la dirección final en `urlPublica` (`src/config.ts`) y vuelve a publicar.

Los datos se guardan en el disco de Render (`/data`). Antes y después de la venta, descarga el respaldo desde el panel de administrador. No se suben a GitHub.

## Seguridad

- Las claves se validan en el servidor, con límite de intentos.
- El servidor calcula los montos y verifica que las entradas estén disponibles.
- Cada QR lleva una firma del servidor: no se puede fabricar una entrada válida.
- Una misma referencia de pago no puede reportarse dos veces con el mismo teléfono.
- La búsqueda pública exige el localizador o el teléfono completo, con límite de intentos.
