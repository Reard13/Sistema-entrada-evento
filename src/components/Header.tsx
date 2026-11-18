import React from 'react';
import { Search, Ticket } from 'lucide-react';
import { EVENTO } from '../config';

interface HeaderProps {
  onGoHome: () => void;
  onOpenLookup: () => void;
  onBuy: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onGoHome, onOpenLookup, onBuy }) => (
  <header className="sticky top-0 z-50 bg-oscuro text-crema border-b border-oro/15">
    <div className="max-w-6xl mx-auto px-4 h-16 sm:h-[72px] flex items-center justify-between gap-3">
      <button type="button" onClick={onGoHome} className="min-w-0 text-left cursor-pointer flex items-center gap-3">
        {EVENTO.logoMarcaTexto && <img src={EVENTO.logoMarcaTexto} alt={EVENTO.organizador} className="h-9 sm:h-10 w-auto shrink-0" />}
        <span className={EVENTO.logoMarcaTexto ? 'hidden sm:block min-w-0 pl-3 border-l border-white/15' : 'block min-w-0'}>
          {!EVENTO.logoMarcaTexto && <span className="block font-extrabold text-base sm:text-lg leading-tight truncate">{EVENTO.nombre}</span>}
          <span className="block text-[11px] sm:text-xs text-white/70 leading-tight">
            {EVENTO.fechaCorta} · {EVENTO.lugar}
          </span>
        </span>
      </button>
      <nav className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={onOpenLookup}
          className="inline-flex items-center gap-1.5 min-h-[44px] px-3 sm:px-4 rounded-full text-sm sm:text-[15px] font-medium text-crema hover:bg-white/10 cursor-pointer"
        >
          <Search className="w-4 h-4" />
          <span className="hidden sm:inline">Consultar Mi Boleto</span>
          <span className="sm:hidden">Mi boleto</span>
        </button>
        <button
          type="button"
          onClick={onBuy}
          className="inline-flex items-center gap-1.5 min-h-[44px] px-4 sm:px-5 rounded-full bg-marca hover:bg-marca-oscuro text-white text-sm sm:text-[15px] font-semibold cursor-pointer"
        >
          <Ticket className="w-4 h-4" />
          Comprar
        </button>
      </nav>
    </div>
  </header>
);
