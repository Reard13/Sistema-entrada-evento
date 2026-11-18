import React, { useCallback, useEffect, useState } from 'react';
import { Header } from './components/Header';
import { HeroAndPackages } from './components/HeroAndPackages';
import { SeatMap } from './components/SeatMap';
import { CheckoutDrawer } from './components/CheckoutDrawer';
import { DigitalTicketModal } from './components/DigitalTicketModal';
import { TicketLookupModal } from './components/TicketLookupModal';
import { Footer } from './components/Footer';
import { FloatingBuy } from './components/FloatingBuy';
import { PackageType, SelectedSeat, ReservationData } from './types';
import { ASIENTOS_NUMERADOS, CAPACIDAD, MINUTOS_RESERVA } from './config';
import { entradasLibres } from './constants';
import { connectRealtime, fetchBlockedSeats, forgetTicket, lookupReservations, rememberedTicket, rememberTicket, RESERVAS_EVENT } from './utils/api';
import { fetchLatestBcvRate, getInitialBcvRate } from './utils/exchangeRate';
import { readSession } from './utils/adminSession';

// El panel (con el escáner) solo se descarga cuando alguien lo abre: los compradores no lo necesitan
const AdminPanel = React.lazy(() => import('./components/AdminPanel').then((m) => ({ default: m.AdminPanel })));

const TOTAL_SECONDS = MINUTOS_RESERVA * 60;
const PANEL_KEY = 'evento_panel_abierto';

export default function App() {
  const [view, setView] = useState<'home' | 'map'>('home');
  const [activePackage, setActivePackage] = useState<PackageType>('General');
  const [selectedSeats, setSelectedSeats] = useState<SelectedSeat[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [lookupOpen, setLookupOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(() => {
    try {
      return new URLSearchParams(window.location.search).has('panel') || (sessionStorage.getItem(PANEL_KEY) === '1' && !!readSession());
    } catch {
      return false;
    }
  });
  const [ticket, setTicket] = useState<ReservationData | null>(null);
  const [bcvRate, setBcvRate] = useState(getInitialBcvRate);
  const [blockedSeatIds, setBlockedSeatIds] = useState<string[]>([]);
  const [secondsLeft, setSecondsLeft] = useState(TOTAL_SECONDS);

  const openPanel = (open: boolean) => {
    try {
      if (open) sessionStorage.setItem(PANEL_KEY, '1');
      else sessionStorage.removeItem(PANEL_KEY);
    } catch {
      /* ignorar */
    }
    setPanelOpen(open);
  };

  // Tasa BCV del día
  useEffect(() => {
    fetchLatestBcvRate().then((r) => r && setBcvRate(r));
  }, []);

  // Entrada abierta desde el enlace (?boleto=...) o recordada al volver de WhatsApp
  useEffect(() => {
    const loc = rememberedTicket();
    if (!loc) return;
    lookupReservations(loc).then(({ list }) => {
      if (list[0]) setTicket(list[0]);
      else forgetTicket();
    });
  }, []);

  // Asientos ocupados: al cargar, cada 10 s y con cada aviso en tiempo real
  useEffect(() => {
    connectRealtime();
    let alive = true;
    const refresh = () =>
      fetchBlockedSeats().then((seats) => {
        if (alive && seats) setBlockedSeatIds((prev) => (prev.length === seats.length && seats.every((id) => prev.includes(id)) ? prev : seats));
      });
    refresh();
    const t = window.setInterval(refresh, 10000);
    window.addEventListener(RESERVAS_EVENT, refresh);
    return () => {
      alive = false;
      window.clearInterval(t);
      window.removeEventListener(RESERVAS_EVENT, refresh);
    };
  }, []);

  // Si otro comprador toma un asiento que esta persona tenía seleccionado, se quita y se avisa
  useEffect(() => {
    if (!ASIENTOS_NUMERADOS) return; // sin asientos, el servidor asigna las entradas al comprar
    const taken = selectedSeats.filter((s) => blockedSeatIds.includes(s.id));
    if (taken.length === 0) return;
    setSelectedSeats((prev) => prev.filter((s) => !blockedSeatIds.includes(s.id)));
    window.alert(`Otro comprador acaba de reservar: ${taken.map((s) => s.id).join(', ')}. Elige otro asiento.`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blockedSeatIds]);

  // Temporizador: los asientos se guardan MINUTOS_RESERVA minutos desde el primero elegido
  const timerActive = ASIENTOS_NUMERADOS && selectedSeats.length > 0;
  useEffect(() => {
    if (!timerActive) {
      setSecondsLeft(TOTAL_SECONDS);
      return;
    }
    const t = window.setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => window.clearInterval(t);
  }, [timerActive]);
  useEffect(() => {
    if (secondsLeft > 0) return;
    setSelectedSeats([]);
    setDrawerOpen(false);
    window.alert(`Pasaron los ${MINUTOS_RESERVA} minutos de reserva y los asientos se liberaron. Elígelos de nuevo.`);
  }, [secondsLeft]);

  const goToMap = (pkg: PackageType) => {
    setActivePackage(pkg);
    setView('map');
    window.scrollTo({ top: 0 });
  };
  // Sin asientos numerados: se elige la cantidad y se pasa directo al pago
  const buyQuantity = (cantidad: number) => {
    const libres = entradasLibres(blockedSeatIds, cantidad);
    if (libres.length < cantidad) {
      window.alert(libres.length ? `Solo quedan ${libres.length} entradas.` : 'Las entradas se agotaron.');
      return;
    }
    setSelectedSeats(libres.map((s) => ({ ...s, pkg: 'General' as PackageType })));
    setDrawerOpen(true);
  };
  const goHome = () => {
    setView('home');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleSeat = (id: string, fila: string, num: number) =>
    setSelectedSeats((prev) => (prev.some((s) => s.id === id) ? prev.filter((s) => s.id !== id) : [...prev, { id, fila, num, pkg: activePackage }]));

  const handleConfirmed = (r: ReservationData) => {
    setBlockedSeatIds((prev) => Array.from(new Set([...prev, ...r.seats.map((s) => s.id)])));
    rememberTicket(r.locatorCode.replace('#', ''));
    setTicket(r);
    setDrawerOpen(false);
    setSelectedSeats([]);
    setView('home');
  };

  const closeTicket = useCallback(() => {
    forgetTicket();
    setTicket(null);
    const url = new URL(window.location.href);
    if (url.searchParams.has('boleto')) {
      url.searchParams.delete('boleto');
      window.history.replaceState({}, '', url);
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Header
        onGoHome={goHome}
        onOpenLookup={() => setLookupOpen(true)}
        onBuy={() => {
          setView('home');
          window.setTimeout(() => document.getElementById('entradas')?.scrollIntoView({ behavior: 'smooth' }), 50);
        }}
      />

      <main className="flex-1">
        {view === 'home' ? (
          <HeroAndPackages bcvRate={bcvRate} onSelectPackage={goToMap} onBuyQuantity={buyQuantity} onOpenLookup={() => setLookupOpen(true)} compraAbierta={drawerOpen} disponibles={CAPACIDAD - blockedSeatIds.length} />
        ) : (
          <SeatMap
            selectedSeats={selectedSeats}
            activePackage={activePackage}
            onChangePackage={setActivePackage}
            onToggleSeat={toggleSeat}
            onProceedToCheckout={() => setDrawerOpen(true)}
            onBackToHome={goHome}
            blockedSeatIds={blockedSeatIds}
            bcvRate={bcvRate}
          />
        )}
      </main>

      {view === 'home' && <Footer onOpenPanel={() => openPanel(true)} />}
      {view === 'home' && <FloatingBuy hidden={drawerOpen || lookupOpen || !!ticket || panelOpen} />}

      <CheckoutDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        selectedSeats={selectedSeats}
        onConfirmReservation={handleConfirmed}
        onSeatsTaken={(ids) => setBlockedSeatIds((prev) => Array.from(new Set([...prev, ...ids])))}
        secondsLeft={secondsLeft}
        totalSeconds={TOTAL_SECONDS}
        bcvRate={bcvRate}
      />

      <DigitalTicketModal reservation={ticket} onClose={closeTicket} onUpdate={setTicket} />

      <TicketLookupModal isOpen={lookupOpen} onClose={() => setLookupOpen(false)} onSelectReservation={setTicket} />

      {panelOpen && (
        <React.Suspense fallback={null}>
          <AdminPanel onClose={() => openPanel(false)} />
        </React.Suspense>
      )}
    </div>
  );
}
