import React, { useCallback, useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { Camera, ImageUp, Keyboard, CheckCircle2, XCircle, Clock, Undo2 } from 'lucide-react';
import { ReservationData } from '../types';
import { etiquetaEntrada } from '../constants';
import { ASIENTOS_NUMERADOS } from '../config';
import { staffFetch } from '../utils/adminSession';

type ScanStatus = 'valid' | 'used' | 'pending' | 'rejected' | 'invalid' | 'not_found' | 'choose_seat';
interface ScanResult {
  status: ScanStatus;
  message?: string;
  reservation?: ReservationData;
  seatId?: string;
  at?: number;
  checkIns?: Record<string, number>;
}

const hora = (t: number) => new Date(t).toLocaleTimeString('es-VE', { hour: 'numeric', minute: '2-digit' });

/** Escáner de la puerta: lee el QR con la cámara, lo valida en el servidor y registra el ingreso una sola vez. */
export const DoorScanner: React.FC<{ isAdmin: boolean; entered: number; total: number }> = ({ isAdmin, entered, total }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const busyRef = useRef(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [result, setResult] = useState<ScanResult | null>(null);
  const [manual, setManual] = useState('');

  const stopCamera = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOn(false);
  }, []);

  const send = useCallback(
    async (body: object) => {
      if (busyRef.current) return;
      busyRef.current = true;
      stopCamera();
      try {
        const res = await staffFetch('/api/scan', { method: 'POST', body: JSON.stringify(body) });
        const data = await res.json().catch(() => ({}));
        setResult(res.ok ? data : { status: 'invalid', message: data?.message || 'No se pudo validar. Revisa la conexión.' });
        navigator.vibrate?.(data?.status === 'valid' ? 120 : [80, 60, 80]);
      } catch {
        setResult({ status: 'invalid', message: 'Sin conexión. Revisa el internet del teléfono.' });
      } finally {
        busyRef.current = false;
      }
    },
    [stopCamera]
  );

  const startCamera = useCallback(async () => {
    setCameraError('');
    setResult(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Este navegador no permite usar la cámara. Usa «Subir foto» o escribe el localizador.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
      streamRef.current = stream;
      setCameraOn(true);
      const video = videoRef.current!;
      video.srcObject = stream;
      video.setAttribute('playsinline', 'true');
      await video.play().catch(() => undefined);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
      const tick = () => {
        if (!streamRef.current) return;
        if (video.readyState >= 2 && video.videoWidth > 0) {
          // Se lee exactamente el cuadro que se ve en pantalla (el centro de la imagen, como object-cover)
          const lado = Math.min(video.videoWidth, video.videoHeight);
          const sx = (video.videoWidth - lado) / 2;
          const sy = (video.videoHeight - lado) / 2;
          canvas.width = lado;
          canvas.height = lado;
          ctx.drawImage(video, sx, sy, lado, lado, 0, 0, lado, lado);
          const code = jsQR(ctx.getImageData(0, 0, lado, lado).data, lado, lado, { inversionAttempts: 'dontInvert' });
          if (code?.data) return void send({ payload: code.data });
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch (err) {
      const name = (err as Error)?.name;
      setCameraError(
        name === 'NotAllowedError'
          ? 'El permiso de la cámara está bloqueado. Actívalo en el candado de la barra de direcciones.'
          : 'No se pudo abrir la cámara. Usa «Subir foto» o escribe el localizador.'
      );
      setCameraOn(false);
    }
  }, [send]);

  useEffect(() => stopCamera, [stopCamera]);

  const scanFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      const code = jsQR(ctx.getImageData(0, 0, img.width, img.height).data, img.width, img.height, { inversionAttempts: 'attemptBoth' });
      URL.revokeObjectURL(img.src);
      if (code?.data) send({ payload: code.data });
      else setCameraError('No se encontró un QR en la foto. Asegúrate de que se vea nítido.');
    };
    img.src = URL.createObjectURL(file);
  };

  const undo = async () => {
    if (!result?.reservation || !result.seatId) return;
    if (!window.confirm(`¿Anular el ingreso ${seat ? `de ${etiquetaEntrada(seat)}` : ''}? La entrada podrá escanearse de nuevo.`)) return;
    const res = await staffFetch('/api/checkin/undo', {
      method: 'POST',
      body: JSON.stringify({ locator: result.reservation.locatorCode, seatId: result.seatId }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return window.alert(data?.message || 'No se pudo anular.');
    setResult(null);
  };

  const r = result?.reservation;
  const seat = r?.seats.find((s) => s.id === result?.seatId);
  const view: Record<ScanStatus, { bg: string; icon: React.ReactNode; title: string }> = {
    valid: { bg: 'bg-emerald-600', icon: <CheckCircle2 className="w-14 h-14" />, title: '¡ENTRADA VÁLIDA!' },
    used: { bg: 'bg-red-600', icon: <XCircle className="w-14 h-14" />, title: 'YA INGRESÓ' },
    pending: { bg: 'bg-amber-500', icon: <Clock className="w-14 h-14" />, title: 'PAGO SIN APROBAR' },
    rejected: { bg: 'bg-red-600', icon: <XCircle className="w-14 h-14" />, title: 'PAGO RECHAZADO' },
    invalid: { bg: 'bg-red-600', icon: <XCircle className="w-14 h-14" />, title: 'QR NO VÁLIDO' },
    not_found: { bg: 'bg-red-600', icon: <XCircle className="w-14 h-14" />, title: 'NO ENCONTRADA' },
    choose_seat: { bg: 'bg-oscuro', icon: <Keyboard className="w-14 h-14" />, title: ASIENTOS_NUMERADOS ? 'ELIGE EL ASIENTO' : 'ELIGE LA ENTRADA' },
  };

  return (
    <main className="max-w-md mx-auto px-4 py-5 space-y-4">
      <p className="text-center text-sm font-semibold text-gray-600">
        Ingresaron <span className="text-oscuro font-extrabold tabular-nums">{entered}</span> de <span className="tabular-nums">{total}</span> entradas vendidas
      </p>

      {result ? (
        <section className={`rounded-3xl ${view[result.status].bg} text-white p-6 text-center space-y-3`} aria-live="assertive">
          <div className="flex justify-center">{view[result.status].icon}</div>
          <h2 className="text-2xl font-extrabold tracking-wide">{view[result.status].title}</h2>
          {seat && (
            <p>
              <span className="block text-5xl font-extrabold">{etiquetaEntrada(seat)}</span>
              <span className="text-sm font-semibold uppercase tracking-wider text-white/85">Entrada {seat.pkg}</span>
            </p>
          )}
          {r && <p className="text-lg font-bold">{r.buyer.fullName}</p>}
          {result.status === 'used' && result.at && <p className="font-semibold">Entró a las {hora(result.at)}</p>}
          {result.message && <p className="text-sm text-white/90">{result.message}</p>}
          {!seat && r && result.status === 'valid' && (
            <p>
              <span className="block text-5xl font-extrabold">{r.seats.length}</span>
              <span className="text-sm font-semibold uppercase tracking-wider text-white/85">{r.seats.length === 1 ? 'entrada' : 'entradas'} en esta compra</span>
            </p>
          )}
          {r && r.seats.length > 1 && result.checkIns && result.status !== 'choose_seat' && (
            <p className="text-sm text-white/85">
              Esta compra tiene {r.seats.length} entradas · ingresaron {Object.keys(result.checkIns).length}
            </p>
          )}

          {/* Validación a mano: elegir qué asiento entra */}
          {result.status === 'choose_seat' && r && (
            <div className="grid grid-cols-3 gap-2 pt-2">
              {r.seats.map((s) => {
                const at = result.checkIns?.[s.id];
                return (
                  <button
                    key={s.id}
                    type="button"
                    disabled={!!at || r.approvalStatus !== 'approved'}
                    onClick={() => send({ locator: r.locatorCode, seatId: s.id })}
                    className="rounded-xl bg-white text-oscuro py-2 font-extrabold cursor-pointer disabled:opacity-40"
                  >
                    {etiquetaEntrada(s)}
                    <span className="block text-[11px] font-semibold">{at ? `Entró ${hora(at)}` : s.pkg}</span>
                  </button>
                );
              })}
              {r.approvalStatus !== 'approved' && <p className="col-span-3 text-sm font-semibold">Esta compra todavía no está aprobada.</p>}
            </div>
          )}

          <button type="button" onClick={startCamera} className="w-full min-h-[52px] rounded-full bg-white text-oscuro font-extrabold cursor-pointer">
            Escanear siguiente
          </button>
          {result.status === 'valid' && (
            <button type="button" onClick={undo} className="inline-flex items-center gap-1.5 text-sm font-semibold text-white/90 underline underline-offset-4 cursor-pointer">
              <Undo2 className="w-4 h-4" />
              Anular este ingreso (fue un error)
            </button>
          )}
        </section>
      ) : (
        <section className="space-y-3">
          <div className="relative aspect-square rounded-3xl overflow-hidden bg-black">
            <video ref={videoRef} muted playsInline className={`w-full h-full object-cover ${cameraOn ? '' : 'hidden'}`} />
            {cameraOn ? (
              <div className="pointer-events-none absolute inset-0 rounded-3xl border-4 border-white/80" aria-hidden="true" />
            ) : (
              <button type="button" onClick={startCamera} className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white cursor-pointer">
                <Camera className="w-12 h-12" />
                <span className="font-bold">Activar cámara</span>
              </button>
            )}
          </div>
          {cameraError && <p className="text-sm font-semibold text-red-600">{cameraError}</p>}
          <label className="flex items-center justify-center gap-2 min-h-[44px] rounded-full border border-gray-300 bg-white text-sm font-semibold text-gray-700 cursor-pointer">
            <ImageUp className="w-4 h-4" />
            Subir foto del QR
            <input type="file" accept="image/*" className="sr-only" onChange={scanFile} />
          </label>
        </section>
      )}

      {/* Validar a mano por localizador (si el QR no se puede leer) */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (manual.trim()) send({ locator: manual.trim() });
          setManual('');
        }}
        className="rounded-2xl bg-white border border-gray-200 p-4"
      >
        <label htmlFor="manual-loc" className="text-sm font-semibold text-gray-700">
          ¿No lee el QR? Escribe el localizador
        </label>
        <div className="mt-2 flex gap-2">
          <input
            id="manual-loc"
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            inputMode="numeric"
            placeholder="Ej. 12345678"
            className="flex-1 min-w-0 rounded-xl border border-gray-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-marca/50"
          />
          <button type="submit" className="shrink-0 px-4 rounded-xl bg-marca text-white font-bold cursor-pointer">
            Buscar
          </button>
        </div>
      </form>
      {!isAdmin && <p className="text-center text-xs text-gray-400">Puedes anular un ingreso hasta 30 minutos después de escanearlo.</p>}
    </main>
  );
};
