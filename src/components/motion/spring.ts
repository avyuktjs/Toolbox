"use client";

import { useEffect, useRef, useState } from "react";

/* Shared spring physics for the Toolbox motion bench.
   Frames, not milliseconds: dt is in sixtieths of a second and the
   damping is raised to it, so a dropped frame decays the same amount
   of energy as the frames it replaced. The loop parks itself the
   moment the value settles. */

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/* 0..100 into the two numbers a spring actually has.
   50 sits near the damping ratio Humidity/Brightness were tuned at
   (~0.41). 0 is heavy and arrives without a ring; 100 is lively with
   two visible rebounds. Both ends shippable. */
export const springOf = (tune: number) => ({
  /* stiffness: how hard it is pulled toward the target */
  k: 0.08 + (tune / 100) * 0.16,
  /* decay, per frame: how much of the velocity survives */
  d: 0.62 + (tune / 100) * 0.2,
});

/* Read once. A preference, not a live input. */
export const stillness = () =>
  typeof window !== "undefined" &&
  !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export function useSpring(target: number, tune = 50, instant = false) {
  const [at, setAt] = useState(target);
  const cur = useRef(target);
  const vel = useRef(0);
  const raf = useRef(0);

  useEffect(() => {
    if (instant) {
      // Instant mode renders `target` directly; the loop stays parked.
      cur.current = target;
      vel.current = 0;
      return;
    }
    const { k, d } = springOf(tune);
    let prev = 0;
    const tick = (t: number) => {
      const dt = prev ? clamp((t - prev) / 16.67, 0, 2.5) : 1;
      prev = t;
      vel.current += (target - cur.current) * k * dt;
      vel.current *= Math.pow(d, dt);
      cur.current += vel.current * dt;
      if (Math.abs(target - cur.current) < 0.02 && Math.abs(vel.current) < 0.02) {
        cur.current = target;
        vel.current = 0;
        setAt(target);
        raf.current = 0;
        return;
      }
      setAt(cur.current);
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf.current);
      raf.current = 0;
    };
    /* tune sits here beside target for the reason Brightness spells
       out: the loop closes over it, so without it a knob turned
       mid-flight would do nothing until something else restarted the
       effect. Restarting picks up from the refs, so it continues
       rather than snapping. */
  }, [target, tune, instant]);

  return instant ? target : at;
}
