import React, { useRef, useState } from 'react';
import { MessageCircle, Instagram } from 'lucide-react';
import { EVENTO, INSTAGRAM, WHATSAPP } from '../config';
import { TermsModal } from './TermsModal';

export const Footer: React.FC<{ onOpenPanel: () => void }> = ({ onOpenPanel }) => {
  const [termsOpen, setTermsOpen] = useState(false);
  // Acceso oculto al panel del personal: 5 toques seguidos sobre el logo (o el nombre) del pie
  const taps = useRef<number[]>([]);
  const secretTap = () => {
    const now = Date.now();
    taps.current = [...taps.current.filter((t) => now - t < 3000), now];
    if (taps.current.length >= 5) {
      taps.current = [];
      onOpenPanel();
    }
  };
  return (
    <footer className="bg-oscuro text-crema border-t border-oro/15">
      <div className="max-w-6xl mx-auto px-4 py-12 grid gap-8 sm:grid-cols-2">
        <div>
          {EVENTO.logoMarca ? (
            <img src={EVENTO.logoMarca} alt={EVENTO.organizador} onClick={secretTap} draggable={false} className="mb-4 h-20 w-auto select-none" />
          ) : null}
          <p className="font-display font-bold text-xl sm:text-2xl" onClick={EVENTO.logoMarca ? undefined : secretTap}>
            {EVENTO.nombre}
          </p>
          <p className="mt-2 text-[15px] leading-relaxed text-tenue">
            {EVENTO.fechaTexto} · {EVENTO.horaTexto}
            <br />
            {EVENTO.lugar}, {EVENTO.ciudad}
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:items-end text-[15px]">
          <a href={`https://wa.me/${WHATSAPP}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 font-medium text-oro hover:text-white hover:underline">
            <MessageCircle className="w-4 h-4" />
            Escríbenos por WhatsApp
          </a>
          {INSTAGRAM && (
            <a href={`https://instagram.com/${INSTAGRAM}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 font-medium text-oro hover:text-white hover:underline">
              <Instagram className="w-4 h-4" />@{INSTAGRAM}
            </a>
          )}
          <button type="button" onClick={() => setTermsOpen(true)} className="text-left sm:text-right text-tenue hover:text-white hover:underline cursor-pointer">
            Términos y condiciones
          </button>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="max-w-6xl mx-auto px-4 pt-4 pb-28 sm:pb-5 flex flex-col items-center gap-1.5 text-center">
          <span className="text-xs sm:text-[13px] text-[#8F8A7F]">
            © {new Date(EVENTO.fechaISO).getFullYear()} {EVENTO.organizador}
          </span>
          {/* Crédito del desarrollador, pequeño y discreto al final de la página */}
          <span className="text-[11px] tracking-wide text-[#8F8A7F]/80">Desarrollado por Alejandro Reina</span>
        </div>
      </div>
      <TermsModal isOpen={termsOpen} onClose={() => setTermsOpen(false)} />
    </footer>
  );
};
