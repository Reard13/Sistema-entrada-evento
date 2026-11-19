import React, { useRef, useState } from 'react';
import { MessageCircle, Instagram } from 'lucide-react';
import { EVENTO, INSTAGRAM, INSTAGRAM_URL, WHATSAPP } from '../config';
import { TermsModal } from './TermsModal';

export const Footer: React.FC<{ onOpenPanel: () => void }> = ({ onOpenPanel }) => {
  const [termsOpen, setTermsOpen] = useState(false);
  // Acceso oculto al panel del personal: 5 toques seguidos sobre el logo del pie
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
      <div className="max-w-6xl mx-auto px-4 py-12 flex flex-col items-start gap-8 text-left">
        <div>
          {/* El logo abre el panel del personal con 5 toques (no es un enlace) */}
          {EVENTO.logoMarca && (
            <img
              src={EVENTO.logoMarca}
              alt={EVENTO.organizador}
              onClick={secretTap}
              draggable={false}
              className="mb-4 block h-20 w-auto select-none cursor-pointer"
            />
          )}
          {INSTAGRAM_URL ? (
            <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer" className="block w-fit font-display font-bold text-xl sm:text-2xl hover:underline underline-offset-4">
              {EVENTO.nombre}
            </a>
          ) : (
            <p className="block font-display font-bold text-xl sm:text-2xl">{EVENTO.nombre}</p>
          )}
          <p className="mt-2 text-[15px] leading-relaxed text-tenue">{EVENTO.ciudad}</p>
        </div>
        <div className="flex flex-col items-start gap-3 text-[15px]">
          <a href={`https://wa.me/${WHATSAPP}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 font-medium text-oro hover:text-white hover:underline">
            <MessageCircle className="w-4 h-4" />
            Escríbenos por WhatsApp
          </a>
          {INSTAGRAM && (
            <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 font-medium text-oro hover:text-white hover:underline">
              <Instagram className="w-4 h-4" />@{INSTAGRAM}
            </a>
          )}
          <button type="button" onClick={() => setTermsOpen(true)} className="text-left text-tenue hover:text-white hover:underline cursor-pointer">
            Términos y condiciones
          </button>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="max-w-6xl mx-auto px-4 pt-4 pb-28 sm:pb-5 flex flex-col items-start gap-1.5 text-left">
          <span className="text-xs sm:text-[13px] text-[#8F8A7F]">
            © {new Date(EVENTO.fechaISO).getFullYear()}{' '}
            {INSTAGRAM_URL ? (
              <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer" className="hover:text-white hover:underline">
                {EVENTO.organizador}
              </a>
            ) : (
              EVENTO.organizador
            )}
          </span>
        </div>
      </div>
      <TermsModal isOpen={termsOpen} onClose={() => setTermsOpen(false)} />
    </footer>
  );
};
