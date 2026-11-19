import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { X, LogOut, Check, Ban, MessageCircle, RotateCcw, Trash2, Search, Lock, ScanLine, Wallet, Copy, Download } from 'lucide-react';
import { CheckInMap, ReservationData } from '../types';
import { ASIENTOS_NUMERADOS, EVENTO, METODOS_PAGO } from '../config';
import { etiquetaEntrada } from '../constants';
import { formatBs } from '../utils/exchangeRate';
import { clearSession, login, readSession, SESSION_EXPIRED_EVENT, staffFetch, StaffSession } from '../utils/adminSession';
import { connectRealtime, INGRESOS_EVENT, RESERVAS_EVENT } from '../utils/api';
import { DoorScanner } from './DoorScanner';

type Filter = 'pending_approval' | 'approved' | 'rejected' | 'all';
const FILTERS: [Filter, string][] = [
  ['pending_approval', 'Por revisar'],
  ['approved', 'Aprobadas'],
  ['rejected', 'Rechazadas'],
  ['all', 'Todas'],
];
const STATUS_CHIP: Record<ReservationData['approvalStatus'], [string, string]> = {
  approved: ['Aprobada', 'bg-emerald-100 text-emerald-800'],
  pending_approval: ['Por revisar', 'bg-amber-100 text-amber-800'],
  rejected: ['Rechazada', 'bg-red-100 text-red-800'],
};

// 0414-1234567 → 584141234567 (para abrir el chat de WhatsApp del comprador)
const waPhone = (phone: string) => {
  let d = phone.replace(/\D/g, '');
  if (d.startsWith('0')) d = `58${d.slice(1)}`;
  else if (d.length === 10) d = `58${d}`;
  return d;
};
const fecha = (t: number) => new Date(t).toLocaleString('es-VE', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

const ticketMessage = (r: ReservationData) => {
  const una = r.seats.length === 1;
  const link = `${EVENTO.urlPublica}/?boleto=${encodeURIComponent(r.locatorCode.replace('#', ''))}`;
  return (
    `¡Hola, ${r.buyer.fullName.split(' ')[0]}! Tu pago fue verificado. ✅\n\n` +
    `${una ? 'Tu entrada' : 'Tus entradas'} para *${EVENTO.nombre}*:\n` +
    `${ASIENTOS_NUMERADOS ? (una ? 'Asiento' : 'Asientos') : una ? 'Entrada' : 'Entradas'}: *${r.seats.map((s) => etiquetaEntrada(s)).join(', ')}*\n` +
    `${EVENTO.fechaTexto} · ${EVENTO.horaTexto} · ${EVENTO.lugar}\n\n` +
    `Abre ${una ? 'tu entrada' : 'tus entradas'} con el código QR aquí:\n${link}\n\n` +
    `Localizador: ${r.locatorCode}`
  );
};

export const AdminPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [session, setSession] = useState<StaffSession | null>(readSession);
  const [pin, setPin] = useState('');
  const [loginError, setLoginError] = useState('');
  const [tab, setTab] = useState<'pagos' | 'escaner'>(() => (readSession()?.rol === 'puerta' ? 'escaner' : 'pagos'));
  const [reservations, setReservations] = useState<ReservationData[]>([]);
  const [checkIns, setCheckIns] = useState<CheckInMap>({});
  const [filter, setFilter] = useState<Filter>('pending_approval');
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [copiado, setCopiado] = useState<string | null>(null);
  const isAdmin = session?.rol === 'admin';

  // Aviso cuando llega un pago nuevo mientras el panel está abierto
  const [aviso, setAviso] = useState('');
  const pendientesAntes = useRef<number | null>(null);
  const sonar = () => {
    navigator.vibrate?.([200, 100, 200]);
    try {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AC();
      const o = ctx.createOscillator();
      o.frequency.value = 880;
      o.connect(ctx.destination);
      o.start();
      o.stop(ctx.currentTime + 0.4);
      window.setTimeout(() => ctx.close(), 700);
    } catch {
      /* sin sonido disponible */
    }
  };

  const load = useCallback(async () => {
    if (!readSession()) return;
    const [r, c] = await Promise.all([staffFetch('/api/reservations'), staffFetch('/api/checkins')]);
    if (r.ok) {
      const lista: ReservationData[] = (await r.json()).reservations || [];
      const pendientes = lista.filter((x) => x.approvalStatus === 'pending_approval').length;
      if (pendientesAntes.current !== null && pendientes > pendientesAntes.current) {
        const nuevos = pendientes - pendientesAntes.current;
        setAviso(`Llegó${nuevos > 1 ? 'n' : ''} ${nuevos} pago${nuevos > 1 ? 's' : ''} nuevo${nuevos > 1 ? 's' : ''} por revisar`);
        sonar();
      }
      pendientesAntes.current = pendientes;
      setReservations(lista);
    }
    if (c.ok) setCheckIns((await c.json()).checkIns || {});
  }, []);

  // Copia de seguridad de las compras e ingresos (solo administrador)
  const descargarRespaldo = async () => {
    const res = await staffFetch('/api/respaldo');
    if (!res.ok) return window.alert('No se pudo descargar el respaldo. Intenta de nuevo.');
    const url = URL.createObjectURL(await res.blob());
    const a = document.createElement('a');
    a.href = url;
    a.download = `respaldo-evento-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 10000);
  };

  // Datos al día: al entrar, con cada aviso en tiempo real y cada 30 s
  useEffect(() => {
    if (!session) return;
    connectRealtime();
    load();
    const t = window.setInterval(load, 30000);
    const expired = () => setSession(null);
    window.addEventListener(RESERVAS_EVENT, load);
    window.addEventListener(INGRESOS_EVENT, load);
    window.addEventListener(SESSION_EXPIRED_EVENT, expired);
    return () => {
      window.clearInterval(t);
      window.removeEventListener(RESERVAS_EVENT, load);
      window.removeEventListener(INGRESOS_EVENT, load);
      window.removeEventListener(SESSION_EXPIRED_EVENT, expired);
    };
  }, [session, load]);

  const submitLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await login(pin.trim());
    if (typeof res === 'string') return setLoginError(res);
    setPin('');
    setLoginError('');
    setTab(res.rol === 'puerta' ? 'escaner' : 'pagos');
    setSession(res);
  };

  const logout = () => {
    clearSession();
    setSession(null);
    connectRealtime();
  };

  const setStatus = async (r: ReservationData, status: ReservationData['approvalStatus'], reason?: string, waWin?: Window | null) => {
    setBusy(r.locatorCode);
    const res = await staffFetch(`/api/reservations/${encodeURIComponent(r.locatorCode.replace('#', ''))}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, reason }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) {
      waWin?.close();
      return window.alert(data?.message || 'No se pudo guardar.');
    }
    await load();
    // Al aprobar, el chat del comprador ya está abierto (se abrió en el mismo toque, para que el navegador no lo bloquee)
    if (status === 'approved') {
      const url = `https://wa.me/${waPhone(r.buyer.phone)}?text=${encodeURIComponent(ticketMessage(data.reservation))}`;
      if (waWin) {
        waWin.opener = null;
        waWin.location.href = url;
      } else {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    }
  };

  // Aprobar: se abre la pestaña de WhatsApp dentro del toque y luego se llena con el mensaje
  const aprobarYEnviar = (r: ReservationData) => {
    const waWin = window.open('', '_blank');
    setStatus(r, 'approved', undefined, waWin);
  };

  const reject = (r: ReservationData) => {
    const reason = window.prompt('Motivo del rechazo (lo verá el comprador):', 'No encontramos el pago en la cuenta.');
    if (reason !== null) setStatus(r, 'rejected', reason);
  };

  // Borrar: si la compra no está rechazada, primero se anula (así el servidor permite borrarla)
  const remove = async (r: ReservationData) => {
    const anular = r.approvalStatus !== 'rejected';
    const aviso = anular ? '\n\nSus entradas dejarán de funcionar.' : '';
    if (!window.confirm(`¿Borrar la compra ${r.locatorCode} de ${r.buyer.fullName}? No se puede deshacer.${aviso}`)) return;
    // Si la compra estaba activa, ofrecer avisar al comprador por WhatsApp antes de borrarla
    if (anular && window.confirm('¿Quieres avisarle al comprador por WhatsApp que su compra fue anulada?')) {
      const texto = `Hola, ${r.buyer.fullName.split(' ')[0]}. Te escribimos de ${EVENTO.nombre}: tu compra ${r.locatorCode} fue anulada y tu entrada ya no es válida. Si tienes dudas, respóndenos por aquí.`;
      window.open(`https://wa.me/${waPhone(r.buyer.phone)}?text=${encodeURIComponent(texto)}`, '_blank', 'noopener,noreferrer');
    }
    const ruta = `/api/reservations/${encodeURIComponent(r.locatorCode.replace('#', ''))}`;
    setBusy(r.locatorCode);
    if (anular) {
      const pre = await staffFetch(`${ruta}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'rejected', reason: 'Compra anulada por el organizador.' }),
      });
      if (!pre.ok) {
        setBusy(null);
        return window.alert((await pre.json().catch(() => ({})))?.message || 'No se pudo anular la compra.');
      }
    }
    const res = await staffFetch(ruta, { method: 'DELETE' });
    setBusy(null);
    if (!res.ok) window.alert((await res.json().catch(() => ({})))?.message || 'No se pudo borrar.');
    load();
  };

  // Copiar el mensaje de la entrada para pegarlo en WhatsApp
  const copiar = (r: ReservationData) => {
    navigator.clipboard
      ?.writeText(ticketMessage(r))
      .then(() => {
        setCopiado(r.locatorCode);
        window.setTimeout(() => setCopiado((c) => (c === r.locatorCode ? null : c)), 2000);
      })
      .catch(() => window.alert('No se pudo copiar. Intenta de nuevo.'));
  };

  // Contadores
  const stats = useMemo(() => {
    const approved = reservations.filter((r) => r.approvalStatus === 'approved');
    const seats = approved.flatMap((r) => r.seats);
    return {
      pending: reservations.filter((r) => r.approvalStatus === 'pending_approval').length,
      sold: seats.length,
      eur: approved.reduce((n, r) => n + (r.totalEur ?? 0), 0),
      usd: approved.reduce((n, r) => n + r.totalUsd, 0),
      bs: approved.reduce((n, r) => n + r.totalBs, 0),
      entered: Object.keys(checkIns).length,
    };
  }, [reservations, checkIns]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return reservations.filter(
      (r) =>
        (filter === 'all' || r.approvalStatus === filter) &&
        (!q ||
          [r.locatorCode, r.buyer.fullName, r.buyer.phone, r.paymentReport.referenceNumber, ...r.seats.flatMap((s) => [s.id, etiquetaEntrada(s)])].some((v) =>
            v.toLowerCase().includes(q)
          ))
    );
  }, [reservations, filter, query]);

  return (
    <div className="panel-oscuro fixed inset-0 z-[4000] overflow-y-auto text-crema">
      <header className="header-vidrio sticky top-0 z-10 text-white">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-bold leading-tight truncate">Panel · {EVENTO.nombre}</p>
            {session && <p className="text-xs text-white/70">{isAdmin ? 'Administrador' : 'Puerta'}</p>}
          </div>
          <div className="flex items-center gap-1">
            {session && (
              <button type="button" onClick={logout} className="inline-flex items-center gap-1.5 min-h-[40px] px-3 rounded-full text-sm hover:bg-white/10 cursor-pointer">
                <LogOut className="w-4 h-4" />
                Salir
              </button>
            )}
            <button type="button" onClick={onClose} aria-label="Cerrar panel" className="w-10 h-10 rounded-full grid place-items-center hover:bg-white/10 cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        {session && isAdmin && (
          <nav className="max-w-5xl mx-auto px-4 flex gap-1">
            {(
              [
                ['pagos', 'Pagos', Wallet],
                ['escaner', 'Escáner', ScanLine],
              ] as const
            ).map(([id, label, Icon]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold border-b-2 cursor-pointer ${tab === id ? 'border-white text-white' : 'border-transparent text-white/60'}`}
              >
                <Icon className="w-4 h-4" />
                {label}
                {id === 'pagos' && stats.pending > 0 && <span className="rounded-full bg-amber-400 text-amber-950 text-xs font-bold px-1.5">{stats.pending}</span>}
              </button>
            ))}
          </nav>
        )}
      </header>

      {!session ? (
        <form onSubmit={submitLogin} className="max-w-sm mx-auto mt-16 px-4">
          <div className="rounded-3xl bg-white p-6 shadow-sm border border-gray-200">
            <div className="w-12 h-12 rounded-2xl bg-suave text-marca grid place-items-center">
              <Lock className="w-6 h-6" />
            </div>
            <h1 className="mt-4 text-xl font-extrabold text-oscuro">Acceso del personal</h1>
            <p className="mt-1 text-sm text-gray-600">Escribe la clave del evento para entrar al panel de pagos y al escáner.</p>
            <label htmlFor="pin" className="sr-only">
              Clave
            </label>
            <input
              id="pin"
              type="password"
              inputMode="numeric"
              autoComplete="current-password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="mt-5 w-full rounded-xl border border-gray-300 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-marca/50"
              placeholder="Clave"
              autoFocus
            />
            {loginError && <p className="mt-2 text-sm font-semibold text-red-600">{loginError}</p>}
            <button type="submit" className="mt-4 w-full min-h-[48px] rounded-full bg-marca hover:bg-marca-oscuro text-white font-bold cursor-pointer">
              Entrar
            </button>
          </div>
        </form>
      ) : tab === 'escaner' || !isAdmin ? (
        <DoorScanner isAdmin={isAdmin} entered={stats.entered} total={stats.sold} />
      ) : (
        <main className="max-w-5xl mx-auto px-4 py-5 space-y-5">
          {/* Contadores */}
          <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {(
              [
                ['Entradas vendidas', String(stats.sold), 'aprobadas'],
                ['Por revisar', String(stats.pending), stats.pending === 1 ? 'pago' : 'pagos'],
                ['Recaudado', `€${stats.eur}`, `Bs. ${formatBs(stats.bs)}`],
                ['Ingresaron', String(stats.entered), `de ${stats.sold}`],
              ] as [string, string, string][]
            ).map(([label, value, sub]) => (
              <div key={label} className="rounded-2xl bg-white border border-gray-200 p-4">
                <p className="text-xs font-semibold text-gray-500">{label}</p>
                <p className="mt-1 text-2xl font-extrabold text-oscuro tabular-nums">{value}</p>
                <p className="text-xs text-gray-500">{sub}</p>
              </div>
            ))}
          </section>

          {aviso && (
            <div role="status" className="flex items-center justify-between gap-3 rounded-2xl bg-amber-400 text-oscuro px-4 py-3 font-bold">
              <span>{aviso}</span>
              <button type="button" onClick={() => setAviso('')} className="shrink-0 px-3 py-1 rounded-full bg-white/70 text-sm cursor-pointer">
                Ver
              </button>
            </div>
          )}
          {isAdmin && (
            <div className="flex justify-end">
              <button type="button" onClick={descargarRespaldo} className="inline-flex items-center gap-1.5 min-h-[36px] px-3.5 rounded-full border border-white/25 text-white/85 hover:bg-white/10 text-sm font-semibold cursor-pointer">
                <Download className="w-4 h-4" />
                Descargar respaldo
              </button>
            </div>
          )}

          {/* Filtros y búsqueda */}
          <section className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-1.5">
              {FILTERS.map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setFilter(id)}
                  aria-pressed={filter === id}
                  className={`min-h-[36px] px-3.5 rounded-full text-sm font-semibold border cursor-pointer ${filter === id ? 'bg-marca border-marca text-white' : 'bg-white border-gray-300 text-gray-700'}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <label className="relative sm:w-72">
              <span className="sr-only">Buscar</span>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`Nombre, teléfono, ${ASIENTOS_NUMERADOS ? 'asiento' : 'N° de entrada'}, referencia…`}
                className="w-full rounded-full border border-gray-300 bg-white pl-9 pr-4 py-2 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-marca/50"
              />
            </label>
          </section>

          {/* Lista de compras */}
          {list.length === 0 ? (
            <p className="py-12 text-center text-gray-500">No hay compras en esta lista.</p>
          ) : (
            <ul className="space-y-3">
              {list.map((r) => (
                <li key={r.locatorCode} className="rounded-2xl bg-white border border-gray-200 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-bold text-oscuro">{r.buyer.fullName}</p>
                      <p className="text-sm text-gray-600">
                        {r.buyer.phone} · {r.locatorCode} · {fecha(r.createdAt)}
                      </p>
                    </div>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${STATUS_CHIP[r.approvalStatus][1]}`}>{STATUS_CHIP[r.approvalStatus][0]}</span>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-3 text-sm">
                    <p>
                      <span className="block text-xs text-gray-500">{ASIENTOS_NUMERADOS ? 'Asientos' : 'Entradas'}</span>
                      <span className="font-semibold">{r.seats.map((s) => etiquetaEntrada(s)).join(', ')}</span>
                    </p>
                    <p>
                      <span className="block text-xs text-gray-500">
                        {METODOS_PAGO.find((m) => m.id === (r.paymentReport.method || 'pagomovil'))?.nombre || r.paymentReport.method}
                      </span>
                      <span className="font-semibold">
                        Ref. {r.paymentReport.referenceNumber}
                        {r.paymentReport.bank ? ` · ${r.paymentReport.bank}` : ''}
                      </span>
                      {r.paymentReport.payerPhone !== r.buyer.phone && <span className="block text-gray-600">Desde {r.paymentReport.payerPhone}</span>}
                    </p>
                    <p>
                      <span className="block text-xs text-gray-500">Monto</span>
                      <span className="font-semibold tabular-nums">
                        {r.totalEur !== undefined && `€${r.totalEur} · `}Bs. {formatBs(r.totalBs)}
                      </span>
                    </p>
                  </div>
                  {r.approvalStatus === 'rejected' && r.rejectionReason && <p className="mt-2 text-sm text-red-700">Motivo: {r.rejectionReason}</p>}

                  <div className="mt-3 flex flex-wrap gap-2">
                    {r.approvalStatus === 'pending_approval' && (
                      <>
                        <button
                          type="button"
                          disabled={busy === r.locatorCode}
                          onClick={() => aprobarYEnviar(r)}
                          className="inline-flex items-center gap-1.5 min-h-[40px] px-4 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold cursor-pointer disabled:opacity-50"
                        >
                          <Check className="w-4 h-4" />
                          Aprobar y enviar
                        </button>
                        <button
                          type="button"
                          disabled={busy === r.locatorCode}
                          onClick={() => reject(r)}
                          className="inline-flex items-center gap-1.5 min-h-[40px] px-4 rounded-full border border-red-300 text-red-700 hover:bg-red-50 text-sm font-bold cursor-pointer disabled:opacity-50"
                        >
                          <Ban className="w-4 h-4" />
                          Rechazar
                        </button>
                      </>
                    )}
                    {r.approvalStatus === 'approved' && (
                      <>
                        <a
                          href={`https://wa.me/${waPhone(r.buyer.phone)}?text=${encodeURIComponent(ticketMessage(r))}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 min-h-[40px] px-4 rounded-full bg-[#25D366] text-white text-sm font-bold"
                        >
                          <MessageCircle className="w-4 h-4" />
                          Reenviar entrada
                        </a>
                        <button
                          type="button"
                          onClick={() => copiar(r)}
                          className="inline-flex items-center gap-1.5 min-h-[40px] px-4 rounded-full border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-bold cursor-pointer"
                        >
                          {copiado === r.locatorCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          {copiado === r.locatorCode ? 'Copiado' : 'Copiar mensaje'}
                        </button>
                      </>
                    )}
                    {r.approvalStatus === 'rejected' && (
                      <button
                        type="button"
                        onClick={() => setStatus(r, 'pending_approval')}
                        className="inline-flex items-center gap-1.5 min-h-[40px] px-4 rounded-full border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-bold cursor-pointer"
                      >
                        <RotateCcw className="w-4 h-4" />
                        Reactivar
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={busy === r.locatorCode}
                      onClick={() => remove(r)}
                      className="inline-flex items-center gap-1.5 min-h-[40px] px-4 rounded-full text-red-700 hover:bg-red-50 text-sm font-bold cursor-pointer disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
                      Borrar
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </main>
      )}
    </div>
  );
};
