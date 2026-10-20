'use client';
import dynamic from 'next/dynamic';
/** GSAP, its plugins and Lenis load in their own chunk after hydration, keeping them off the critical path. */
export const MotionLazy = dynamic(() => import('./motion-root').then(m => m.MotionRoot), { ssr: false });
