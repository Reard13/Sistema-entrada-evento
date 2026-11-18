import React, { useState } from 'react';
import { MessageCircle, Instagram } from 'lucide-react';
import { EVENTO, INSTAGRAM, WHATSAPP } from '../config';
import { TermsModal } from './TermsModal';

export const Footer: React.FC<{ onOpenPanel: () => void }> = ({ onOpenPanel }) => {
  const [termsOpen, setTermsOpen] = useState(false);
  return (
    <footer className="bg-oscuro text-white">
      <div className="max-w-6xl mx-auto px-4 py-10 grid gap-8 sm:grid-cols-2">
        <div>
          {EVENTO.logoMarca && <img src={EVENTO.logoMarca} alt={EVENTO.organizador} className="mb-4 h-20 w-auto" />}
          <p className="font-extrabold text-lg">{EVENTO.nombre}</p>
          <p className="mt-1 text-sm text-white/70">
            {EVENTO.fechaTexto} · {EVENTO.horaTexto}
            <br />
            {EVENTO.lugar}, {EVENTO.ciudad}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:items-end text-sm">
          <a href={`https://wa.me/${WHATSAPP}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 font-semibold hover:underline">
            <MessageCircle className="w-4 h-4" />
            Escríbenos por WhatsApp
          </a>
          {INSTAGRAM && (
            <a href={`https://instagram.com/${INSTAGRAM}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 font-semibold hover:underline">
              <Instagram className="w-4 h-4" />@{INSTAGRAM}
            </a>
          )}
          <button type="button" onClick={() => setTermsOpen(true)} className="text-left sm:text-right text-white/80 hover:underline cursor-pointer">
            Términos y condiciones
          </button>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-2 text-xs text-white/60">
          <span>
            © {new Date(EVENTO.fechaISO).getFullYear()} {EVENTO.organizador} · Desarrollado por Alejandro Reina
          </span>
          {/* Acceso discreto al panel del personal */}
          <button type="button" onClick={onOpenPanel} className="hover:text-white cursor-pointer">
            Personal
          </button>
        </div>
      </div>
      <TermsModal isOpen={termsOpen} onClose={() => setTermsOpen(false)} />
    </footer>
  );
};
