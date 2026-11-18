import React from 'react';
import { Search, Ticket } from 'lucide-react';
import { EVENTO, INSTAGRAM_URL } from '../config';

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
      <div className="min-w-0 flex items-center gap-3">
        {logo &&
          (INSTAGRAM_URL ? (
            <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer" aria-label={`${EVENTO.organizador} en Instagram`} className="shrink-0 rounded-lg">
              <img src={logo} alt={EVENTO.organizador} className="h-14 sm:h-16 w-auto" />
            </a>
          ) : (
            <img src={logo} alt={EVENTO.organizador} className="h-14 sm:h-16 w-auto shrink-0" />
          ))}
        {!logo && (
          <button type="button" onClick={onGoHome} className="text-left cursor-pointer min-w-0">
            <span className="block font-extrabold text-base sm:text-lg leading-tight truncate">{EVENTO.nombre}</span>
          </button>
        )}
      </div>
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
