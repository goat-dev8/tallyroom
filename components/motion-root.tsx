'use client';
import { useEffect } from 'react';
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
/** Lenis smooth scroll driving GSAP ScrollTrigger; [data-reveal] elements rise in; [data-steps] pins the counting walkthrough. */
export function MotionRoot() {
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    gsap.registerPlugin(ScrollTrigger);
    const lenis = new Lenis({ lerp: 0.12 }); lenis.on('scroll', ScrollTrigger.update);
    const tick = (t: number) => lenis.raf(t * 1000); gsap.ticker.add(tick); gsap.ticker.lagSmoothing(0);
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach(el => gsap.from(el, { y: 28, autoAlpha: 0, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 88%', once: true } }));
      const steps = document.querySelector<HTMLElement>('[data-steps]');
      if (steps && matchMedia('(min-width: 1024px)').matches) {
        const items = gsap.utils.toArray<HTMLElement>('[data-step]');
        const tl = gsap.timeline({ scrollTrigger: { trigger: steps, start: 'top 15%', end: `+=${items.length * 380}`, scrub: 0.6, pin: true } });
        items.forEach((it, i) => { if (i) tl.fromTo(it, { autoAlpha: 0.25 }, { autoAlpha: 1, duration: 1 }, i); tl.to(`[data-step-bar="${i}"]`, { scaleX: 1, duration: 1, ease: 'none' }, i); });
        tl.fromTo('[data-flow]', { strokeDashoffset: 600 }, { strokeDashoffset: 0, duration: items.length, ease: 'none' }, 0);
      }
    });
    return () => { ctx.revert(); gsap.ticker.remove(tick); lenis.destroy(); };
  }, []);
  return null;
}
