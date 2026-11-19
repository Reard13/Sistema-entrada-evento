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
  const [enEntradas, setEnEntradas] = useState(false);

  useEffect(() => {
    const hero = document.getElementById('hero-cta');
    const entradas = document.getElementById('entradas');
    const observers: IntersectionObserver[] = [];
    if (hero) {
      // Solo cuenta como «pasado» cuando el botón de la portada quedó por encima de la pantalla
      const o = new IntersectionObserver(([e]) => setHeroPassed(!e.isIntersecting && e.boundingClientRect.top < 0));
      o.observe(hero);
      observers.push(o);
    }
    if (entradas) {
      // Mientras la sección de entradas está en pantalla, la compra ya está ahí: el botón se oculta
      const o = new IntersectionObserver(([e]) => setEnEntradas(e.isIntersecting));
      o.observe(entradas);
      observers.push(o);
    }
    return () => observers.forEach((o) => o.disconnect());
  }, []);

  const show = !hidden && heroPassed && !enEntradas;

  return (
    <div
      aria-hidden={!show}
      // Solo el botón flota: el contenedor es transparente y no recibe toques
      className={`fixed z-40 inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom))] sm:inset-x-auto sm:right-6 sm:bottom-6 flex justify-center pointer-events-none transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-opacity motion-reduce:translate-y-0 ${
        show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      <a
        href="#entradas"
        tabIndex={show ? 0 : -1}
        className={`${show ? 'pointer-events-auto' : ''} inline-flex items-center justify-center gap-2 min-h-[52px] px-7 rounded-full bg-marca hover:bg-marca-oscuro active:scale-[0.97] text-white font-semibold text-base shadow-[0_8px_24px_rgba(0,0,0,0.45),0_2px_6px_rgba(0,0,0,0.3)] ring-1 ring-white/15 transition-transform duration-100`}
      >
        Comprar entradas · ${ENTRADAS.General.precio}
        <ArrowRight className="w-5 h-5" />
      </a>
    </div>
  );
};
