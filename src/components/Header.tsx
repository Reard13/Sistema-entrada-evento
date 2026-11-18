import React from 'react';
import { Search, Ticket } from 'lucide-react';
import { EVENTO } from '../config';

interface HeaderProps {
  onGoHome: () => void;
  onOpenLookup: () => void;
  onBuy: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onGoHome, onOpenLookup, onBuy }) => (
  <header className="sticky top-0 z-50 bg-oscuro text-white border-b border-white/10">
    <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
      <button type="button" onClick={onGoHome} className="min-w-0 text-left cursor-pointer">
        {/* Si el cliente tiene logo, se puede poner aquí: <img src="/logo.png" className="h-9" /> */}
        <span className="block font-extrabold text-base sm:text-lg leading-tight truncate">{EVENTO.nombre}</span>
        <span className="block text-[11px] sm:text-xs text-white/70 leading-tight">
          {EVENTO.fechaCorta} · {EVENTO.lugar}
        </span>
      </button>
      <nav className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={onOpenLookup}
          className="inline-flex items-center gap-1.5 min-h-[40px] px-3 sm:px-4 rounded-full text-sm font-semibold text-white/90 hover:bg-white/10 cursor-pointer"
        >
          <Search className="w-4 h-4" />
          <span className="hidden sm:inline">Consultar Mi Boleto</span>
          <span className="sm:hidden">Mi boleto</span>
        </button>
        <button
          type="button"
          onClick={onBuy}
          className="inline-flex items-center gap-1.5 min-h-[40px] px-4 rounded-full bg-white text-marca-oscuro text-sm font-bold hover:bg-suave cursor-pointer"
        >
          <Ticket className="w-4 h-4" />
          Comprar
        </button>
      </nav>
    </div>
  </header>
);
