'use client';
import { useEffect } from 'react';
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { MorphSVGPlugin } from 'gsap/MorphSVGPlugin';
import { SCENE, barW } from './count-scene';
import { EXACT } from './glyphs';
gsap.registerPlugin(ScrollTrigger, SplitText, DrawSVGPlugin, MorphSVGPlugin);
const EASE = 'expo.out';
/**
 * Landing motion. Lenis drives ScrollTrigger. Under prefers-reduced-motion nothing animates and every element
 * stays in its final, static state (the server-rendered markup). All tweens use transforms, opacity or SVG attributes.
 */
export function MotionRoot() {
  useEffect(() => {
    const mm = gsap.matchMedia(); let lenis: Lenis | null = null; let tick: ((t: number) => void) | null = null;
    mm.add({ motion: '(prefers-reduced-motion: no-preference)', desktop: '(min-width: 1024px)' }, ctx => {
      const { motion, desktop } = ctx.conditions as { motion: boolean; desktop: boolean };
      document.documentElement.classList.add('motion-ready');
      if (!motion) { gsap.set('[data-split]', { autoAlpha: 1 }); return; }
      lenis = new Lenis({ lerp: 0.12 }); lenis.on('scroll', ScrollTrigger.update);
      tick = (t: number) => lenis!.raf(t * 1000); gsap.ticker.add(tick); gsap.ticker.lagSmoothing(0);

      // Hero headline: line-masked word rise, re-split on resize/font load.
      if (desktop) SplitText.create('[data-split]', { type: 'lines,words', mask: 'lines', autoSplit: true, onSplit: self => {
        gsap.set('[data-split]', { autoAlpha: 1 });
        return gsap.from(self.words, { yPercent: 110, duration: 1.1, ease: EASE, stagger: 0.045 });
      } });
      // Section reveals: rise 16px + fade, staggered per batch.
      gsap.set('[data-reveal]', { autoAlpha: 0, y: 16 });
      ScrollTrigger.batch('[data-reveal]', { start: 'top 92%', once: true, onEnter: els => gsap.to(els, { y: 0, autoAlpha: 1, duration: 0.9, ease: EASE, stagger: 0.06, overwrite: true }) });

      // Parity cards: final-round bars grow, "≈" morphs into "=".
      document.querySelectorAll<HTMLElement>('[data-parity]').forEach(card => {
        const tl = gsap.timeline({ scrollTrigger: { trigger: card, start: 'top 80%', once: true } });
        tl.from(card.querySelectorAll('[data-pbar]'), { attr: { width: 0 }, duration: 1.2, ease: EASE, stagger: 0.12 })
          .to(card.querySelector('[data-morph]'), { morphSVG: EXACT, duration: 0.6, ease: 'power2.inOut' }, 0.7);
      });

      // How it counts: steps light up while the scene counts 3 rounds.
      const root = document.querySelector<HTMLElement>('[data-steps]'); if (!root) return;
      const q = gsap.utils.selector(root); const R = SCENE.rounds;
      const bars = q('[data-scene-bar]'), nums = q('[data-scene-num]'), d = q('[data-scene-thread="d"]'), c = q('[data-scene-thread="c"]');
      const label = { r: 1, cont: 100 }; const rEl = q('[data-scene-round]')[0], cEl = q('[data-scene-cont]')[0];
      const setLabel = () => { rEl.textContent = String(label.r); cEl.textContent = String(Math.round(label.cont)); };
      const vals = R[0].v.map(v => ({ v }));
      const toRound = (k: number) => {
        const t = gsap.timeline();
        bars.forEach((b, i) => t.to(b, { attr: { width: barW(R[k].v[i], R[k].cont) }, duration: 1, ease: 'power2.inOut' }, 0));
        vals.forEach((o, i) => t.to(o, { v: R[k].v[i], duration: 1, ease: 'power2.inOut', snap: { v: 1 }, onUpdate: () => { nums[i].textContent = o.v ? String(o.v) : '—'; } }, 0));
        t.to(label, { r: k + 1, cont: R[k].cont, duration: 1, snap: { r: 1 }, onUpdate: setLabel }, 0);
        return t;
      };
      gsap.set(bars, { attr: { width: 0 } }); vals.forEach((o, i) => { o.v = R[0].v[i]; nums[i].textContent = String(o.v); }); setLabel();
      gsap.set([...d, ...c], { drawSVG: '0%' }); gsap.set(q('[data-scene-win]'), { autoAlpha: 0, scale: 0.4, transformOrigin: '8px 8px' });
      const steps = q('[data-step]');
      const tl = gsap.timeline({ defaults: { ease: 'power2.inOut' } });
      const lit = (i: number, at: number) => { tl.to(steps[i], { borderColor: '#1c1f25', backgroundColor: 'rgba(255,255,255,.025)', duration: 0.3 }, at).to(q(`[data-step-bar="${i}"]`), { scaleX: 1, duration: 0.9, ease: 'none' }, at);
        if (i) tl.to(steps[i - 1], { borderColor: 'rgba(0,0,0,0)', backgroundColor: 'rgba(0,0,0,0)', duration: 0.3 }, at); };
      lit(0, 0); tl.from(q('[data-scene-row]'), { autoAlpha: 0, x: -8, stagger: 0.08, duration: 0.6 }, 0);
      lit(1, 1); bars.forEach((b, i) => tl.to(b, { attr: { width: barW(R[0].v[i], R[0].cont) }, duration: 0.9, ease: EASE }, 1 + i * 0.05));
      lit(2, 2); tl.to(d, { drawSVG: '100%', duration: 0.6, stagger: 0.08 }, 2).add(toRound(1), 2.5).to(d, { autoAlpha: 0.25, duration: 0.3 }, 3.4)
        .to(c, { drawSVG: '100%', duration: 0.6, stagger: 0.08 }, 3.5).add(toRound(2), 4).to(c, { autoAlpha: 0.25, duration: 0.3 }, 4.9);
      lit(3, 5); tl.to(q('[data-scene-win]'), { autoAlpha: 1, scale: 1, duration: 0.5, ease: 'back.out(2)' }, 5.3);
      if (desktop) ScrollTrigger.create({ animation: tl, trigger: root, start: 'top top', end: '+=1800', scrub: 0.6, pin: true, anticipatePin: 1 });
      else ScrollTrigger.create({ animation: tl, trigger: root, start: 'top 70%', toggleActions: 'play none none none' });
    });
    return () => { mm.revert(); if (tick) gsap.ticker.remove(tick); lenis?.destroy(); };
  }, []);
  return null;
}
