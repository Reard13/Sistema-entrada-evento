import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { TERMINOS } from '../config';

/** Términos y condiciones del evento (se abren desde el pie de página y desde el pago). */
export const TermsModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[3300] bg-oscuro/60 grid place-items-center p-3 sm:p-6" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="terms-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl max-h-[88dvh] flex flex-col rounded-3xl bg-white text-gray-800 shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-200">
          <h2 id="terms-title" className="font-extrabold text-lg text-oscuro">
            Términos y condiciones
          </h2>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="w-10 h-10 rounded-full grid place-items-center hover:bg-suave cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="overflow-y-auto overscroll-contain px-5 py-4 space-y-5 text-sm leading-relaxed">
          {TERMINOS.map((section, i) => (
            <section key={section.titulo} className="space-y-1.5">
              <h3 className="font-bold text-marca-oscuro">{i + 1}. {section.titulo}</h3>
              <ul className="space-y-1.5">
                {section.puntos.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>
        <div className="px-5 py-3 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="w-full min-h-[46px] rounded-xl bg-marca text-white font-bold text-sm cursor-pointer active:scale-[0.98]"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
