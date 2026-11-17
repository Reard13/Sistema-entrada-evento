/**
 * Guarda una imagen generada en el navegador.
 * En teléfonos abre el menú de compartir del sistema, donde "Guardar imagen" la deja en la galería
 * (Fotos en iPhone, Galería en Android). En computadoras, o si el teléfono no lo permite, se descarga.
 */

export function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('No se pudo generar la imagen'))), 'image/png');
  });
}

const isTouchPhone = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches && 'share' in navigator;

// Debe llamarse directamente desde el toque del usuario (el sistema exige un gesto para compartir)
export async function saveImage(blob: Blob, fileName: string, title: string): Promise<void> {
  const file = new File([blob], fileName, { type: 'image/png' });

  if (isTouchPhone() && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title });
      return;
    } catch (err) {
      // El usuario cerró el menú: no hacer nada más
      if ((err as Error)?.name === 'AbortError') return;
      // Otro error (p. ej. el gesto expiró): descargar como respaldo
    }
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

// Varias imágenes de una vez: en el teléfono, un solo menú de compartir con todas (Guardar imágenes);
// en la computadora, una descarga por imagen
export async function saveImages(items: { blob: Blob; fileName: string }[], title: string): Promise<void> {
  if (items.length === 1) return saveImage(items[0].blob, items[0].fileName, title);
  const files = items.map((it) => new File([it.blob], it.fileName, { type: 'image/png' }));

  if (isTouchPhone() && navigator.canShare?.({ files })) {
    try {
      await navigator.share({ files, title });
      return;
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return;
    }
  }

  for (const it of items) {
    const url = URL.createObjectURL(it.blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = it.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    // Pausa breve: algunos navegadores bloquean varias descargas seguidas
    await new Promise((r) => setTimeout(r, 400));
  }
}
