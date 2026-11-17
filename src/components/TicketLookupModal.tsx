import React, { useState } from 'react';
import { X, Search } from 'lucide-react';
import { ReservationData } from '../types';
import { lookupReservations } from '../utils/api';
import { etiquetaEntrada } from '../constants';
import { ASIENTOS_NUMERADOS } from '../config';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelectReservation: (r: ReservationData) => void;
}

const STATUS: Record<ReservationData['approvalStatus'], [string, string]> = {
  approved: ['Aprobada', 'bg-emerald-100 text-emerald-800'],
  pending_approval: ['En revisión', 'bg-amber-100 text-amber-800'],
  rejected: ['Rechazada', 'bg-red-100 text-red-800'],
};

export const TicketLookupModal: React.FC<Props> = ({ isOpen, onClose, onSelectReservation }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ReservationData[] | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (!isOpen) return null;

  const close = () => {
    setQuery('');
    setResults(null);
    setError('');
    onClose();
  };

  const search = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setBusy(true);
    const { list, error: err } = await lookupReservations(query.trim());
    setBusy(false);
    setError(err || '');
    if (list.length === 1) {
      onSelectReservation(list[0]);
      close();
      return;
    }
    setResults(list);
  };

  return (
    <div className="fixed inset-0 z-[2500] grid place-items-center p-4 bg-oscuro/60 backdrop-blur-sm animate-fadeIn" onClick={close}>
      <div role="dialog" aria-modal="true" aria-labelledby="lookup-title" onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="lookup-title" className="text-xl font-extrabold text-oscuro">
              Consultar Mi Boleto
            </h2>
            <p className="mt-1 text-sm text-gray-600">Escribe tu localizador o el teléfono con el que compraste.</p>
          </div>
          <button type="button" onClick={close} aria-label="Cerrar" className="w-10 h-10 shrink-0 rounded-full grid place-items-center hover:bg-suave cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={search} className="mt-5 flex gap-2">
          <label htmlFor="lookup-q" className="sr-only">
            Localizador o teléfono
          </label>
          <input
            id="lookup-q"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ej. 12345678 o 0414-1234567"
            autoFocus
            className="flex-1 min-w-0 rounded-xl border border-gray-300 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-marca/50"
          />
          <button type="submit" disabled={busy} className="shrink-0 w-12 rounded-xl bg-marca text-white grid place-items-center cursor-pointer disabled:opacity-50" aria-label="Buscar">
            <Search className="w-5 h-5" />
          </button>
        </form>

        {error && <p className="mt-3 text-sm font-semibold text-red-600">{error}</p>}
        {results && results.length === 0 && !error && (
          <p className="mt-4 text-sm text-gray-600">No encontramos compras con ese dato. Revisa el localizador o usa el teléfono completo.</p>
        )}
        {results && results.length > 1 && (
          <ul className="mt-4 space-y-2">
            {results.map((r) => (
              <li key={r.locatorCode}>
                <button
                  type="button"
                  onClick={() => {
                    onSelectReservation(r);
                    close();
                  }}
                  className="w-full text-left rounded-xl border border-gray-200 px-4 py-3 hover:border-marca cursor-pointer"
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-bold text-oscuro">{r.locatorCode}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${STATUS[r.approvalStatus][1]}`}>{STATUS[r.approvalStatus][0]}</span>
                  </span>
                  <span className="block text-sm text-gray-600">{ASIENTOS_NUMERADOS ? 'Asientos' : 'Entradas'}: {r.seats.map((s) => etiquetaEntrada(s)).join(', ')}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
