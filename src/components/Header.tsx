import React from 'react';
import { Search, Ticket } from 'lucide-react';
import { EVENTO } from '../config';

interface HeaderProps {
  onGoHome: () => void;
  onOpenLookup: () => void;
  onBuy: () => void;
}

// Logo completo del organizador (con el micrófono); si no hay, la versión de solo texto
const logo = EVENTO.logoMarca || EVENTO.logoMarcaTexto;

export const Header: React.FC<HeaderProps> = ({ onGoHome, onOpenLookup, onBuy }) => (
  <header className="header-vidrio sticky top-0 z-50 text-crema">
    <div className="max-w-6xl mx-auto px-4 h-[72px] sm:h-20 flex items-center justify-between gap-3">
      <button type="button" onClick={onGoHome} className="min-w-0 text-left cursor-pointer flex items-center gap-3">
        {logo && <img src={logo} alt={EVENTO.organizador} className="h-14 sm:h-16 w-auto shrink-0" />}
        <span className={logo ? 'hidden sm:block min-w-0 pl-3 border-l border-white/15' : 'block min-w-0'}>
          {!logo && <span className="block font-extrabold text-base sm:text-lg leading-tight truncate">{EVENTO.nombre}</span>}
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
