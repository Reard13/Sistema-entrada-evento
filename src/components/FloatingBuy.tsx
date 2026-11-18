import React, { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { ENTRADAS } from '../config';

/**
 * Botón «Comprar entradas» que acompaña al usuario mientras baja por la página.
 * Aparece cuando el usuario ya bajó más allá del botón de la portada y se queda fijo hasta el final
 * de la página. Solo se oculta si hay una ventana abierta (pago, «Mi boleto», entrada o panel).
 */
export const FloatingBuy: React.FC<{ hidden: boolean }> = ({ hidden }) => {
  const [heroPassed, setHeroPassed] = useState(false);

  useEffect(() => {
    const hero = document.getElementById('hero-cta');
    const observers: IntersectionObserver[] = [];
    if (hero) {
      // Solo cuenta como «pasado» cuando el botón de la portada quedó por encima de la pantalla
      const o = new IntersectionObserver(([e]) => setHeroPassed(!e.isIntersecting && e.boundingClientRect.top < 0));
      o.observe(hero);
      observers.push(o);
    }
    return () => observers.forEach((o) => o.disconnect());
  }, []);

  const show = !hidden && heroPassed;

  return (
    <div
      aria-hidden={!show}
      className={`fixed z-40 inset-x-0 bottom-0 sm:inset-x-auto sm:right-6 sm:bottom-6 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-0 bg-oscuro/95 sm:bg-transparent border-t border-oro/15 sm:border-0 backdrop-blur-md sm:backdrop-blur-none transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-opacity motion-reduce:translate-y-0 ${
        show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
      }`}
    >
      <a
        href="#entradas"
        tabIndex={show ? 0 : -1}
        className="flex sm:inline-flex items-center justify-center gap-2 min-h-[52px] px-7 rounded-full bg-marca hover:bg-marca-oscuro active:scale-[0.97] text-white font-semibold text-base shadow-[0_10px_30px_rgba(0,0,0,0.35)] transition-transform duration-100"
      >
        Comprar entradas · ${ENTRADAS.General.precio}
        <ArrowRight className="w-5 h-5" />
      </a>
    </div>
  );
};
