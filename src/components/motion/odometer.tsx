"use client";

import { useEffect, useRef, useState } from "react";
import { Minus, Plus } from "lucide-react";
import "./odometer.css";

/* Odometer — a number between a minus and a plus. Every digit is a strip
   of 0–9 behind a window, and changing the number rolls the strips to
   their new digits like an odometer.

   Each column COUNTS, it does not show: a column's target is the whole
   count at its place, so 9 → 10 rolls forward, never back through eight
   digits. One spring per column, ones first, staggered so a carry reads
   as a carry. Drag the number or hold the keys; release while moving
   and it coasts, running down. */

const stillness = () =>
  typeof window !== "undefined" &&
  !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

const PLACES = 5;
const CELL = 40;
const PX = 12;
const PAD = 5;
const H = CELL + PAD * 2;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

const springOf = (tune: number) => ({
  k: 0.08 + (tune / 100) * 0.16,
  d: 0.62 + (tune / 100) * 0.2,
});

type Col = { pos: number; vel: number; target: number; due: number[]; next: number[] };

export function Odometer({
  bounce = 45,
  stagger = 45,
  blur = 50,
  corner = 14,
  start = 23,
  min = 0,
  max = 99999,
  onChange,
  ariaLabel = "Value. Drag up or down to change it.",
}: {
  /* how lively a digit lands, 0..100 */
  bounce?: number;
  /* ms between one column moving and the next, 0..120 */
  stagger?: number;
  /* how much a spinning digit smears, 0..100 */
  blur?: number;
  /* the slab's corner, px */
  corner?: number;
  start?: number;
  min?: number;
  max?: number;
  onChange?: (value: number) => void;
  ariaLabel?: string;
}) {
  const still = stillness();
  const [value, setValue] = useState(() => clamp(start, min, max));
  const val = useRef(clamp(start, min, max));
  const strips = useRef<(HTMLDivElement | null)[]>([]);
  const cols = useRef<Col[]>(null as unknown as Col[]);
  if (cols.current === null) {
    // lazy init — computed once from the initial prop, never from a ref
    const initial = clamp(start, min, max);
    cols.current = Array.from({ length: PLACES }, (_, p) => {
      const n = Math.floor(initial / 10 ** p);
      return { pos: n, vel: 0, target: n, due: [], next: [] };
    });
  }
  const raf = useRef(0);
  const knobs = useRef({ bounce, stagger, blur, min, max });
  useEffect(() => {
    knobs.current = { bounce, stagger, blur, min, max };
  }, [bounce, stagger, blur, min, max]);

  /* paint */
  const paint = () => {
    cols.current.forEach((c, p) => {
      const el = strips.current[p];
      if (!el) return;
      const m = ((c.pos % 10) + 10) % 10;
      const smear = Math.min(3, Math.abs(c.vel) * 2.4) * (knobs.current.blur / 50);
      el.style.transform = `translateY(${-m * CELL}px)`;
      el.style.filter = smear > 0.15 ? `blur(${smear.toFixed(2)}px)` : "";
    });
  };

  const run = () => {
    if (raf.current) return;
    let prev = 0;
    const tick = (t: number) => {
      const dt = prev ? clamp((t - prev) / 16.67, 0, 2.5) : 1;
      prev = t;
      const { k, d } = springOf(knobs.current.bounce);
      const now = performance.now();
      let busy = false;
      for (const c of cols.current) {
        while (c.due.length && c.due[0] <= now) {
          c.due.shift();
          c.target = c.next.shift()!;
        }
        if (c.due.length) busy = true;
        const gap = c.target - c.pos;
        if (Math.abs(gap) > 24) c.pos += Math.round((gap - Math.sign(gap) * 24) / 10) * 10;
        c.vel += (c.target - c.pos) * k * dt;
        c.vel *= Math.pow(d, dt);
        c.pos += c.vel * dt;
        if (Math.abs(c.target - c.pos) < 0.004 && Math.abs(c.vel) < 0.004) {
          c.pos = c.target;
          c.vel = 0;
        } else busy = true;
      }
      paint();
      raf.current = busy ? requestAnimationFrame(tick) : 0;
    };
    raf.current = requestAnimationFrame(tick);
  };

  useEffect(() => {
    paint();
  }, [blur]);
  useEffect(() => () => {
    cancelAnimationFrame(raf.current);
    raf.current = 0;
  }, []);

  /* controlled sync — when the parent sets start externally (presets).
     Deferred so the effect body doesn't set state synchronously. */
  const lastStart = useRef(start);
  useEffect(() => {
    if (start === lastStart.current) return;
    lastStart.current = start;
    const t = window.setTimeout(() => {
      val.current = clamp(start, min, max);
      setValue(val.current);
      const now = performance.now();
      cols.current.forEach((c, p) => {
        const to = Math.floor(val.current / 10 ** p);
        if (still) {
          c.pos = c.target = to;
          c.vel = 0;
          c.due = [];
          c.next = [];
          return;
        }
        c.due.push(now + p * knobs.current.stagger);
        c.next.push(to);
      });
      if (still) paint();
      else run();
    }, 0);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start, min, max]);

  /* the one way the number changes */
  const bump = (n: number) => {
    const v = clamp(val.current + n, knobs.current.min, knobs.current.max);
    if (v === val.current) return;
    val.current = v;
    setValue(v);
    onChange?.(v);
    const now = performance.now();
    cols.current.forEach((c, p) => {
      const to = Math.floor(v / 10 ** p);
      if (still) {
        c.pos = c.target = to;
        c.vel = 0;
        c.due = [];
        c.next = [];
        return;
      }
      c.due.push(now + p * knobs.current.stagger);
      c.next.push(to);
    });
    if (still) paint();
    else run();
  };

  /* holding a button */
  const hold = useRef({ t: 0, since: 0 });
  const release = () => {
    window.clearTimeout(hold.current.t);
    hold.current.t = 0;
  };
  useEffect(() => release, []);
  const press = (dir: 1 | -1) => {
    release();
    bump(dir);
    hold.current.since = performance.now();
    const repeat = () => {
      const held = performance.now() - hold.current.since;
      bump(dir * (held > 1500 ? 10 : 1));
      hold.current.t = window.setTimeout(repeat, held > 900 ? 55 : 90);
    };
    hold.current.t = window.setTimeout(repeat, 380);
  };

  /* taking the number itself */
  const drag = useRef<{ y: number; acc: number; v: number; t: number } | null>(null);
  const fling = useRef(0);
  useEffect(() => () => cancelAnimationFrame(fling.current), []);
  const steps = (acc: number) => {
    const n = acc > 0 ? Math.floor(acc / PX) : Math.ceil(acc / PX);
    if (n) bump(n);
    return acc - n * PX;
  };

  const onPointerDown = (e: React.PointerEvent) => {
    cancelAnimationFrame(fling.current);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* a scripted pointer */
    }
    drag.current = { y: e.clientY, acc: 0, v: 0, t: performance.now() };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const g = drag.current;
    if (!g) return;
    const now = performance.now();
    const dy = g.y - e.clientY;
    g.y = e.clientY;
    const dt = Math.max(1, now - g.t);
    g.t = now;
    g.v = g.v * 0.6 + (dy / dt) * 0.4;
    g.acc = steps(g.acc + dy);
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const g = drag.current;
    drag.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* never captured */
    }
    if (!g || still) return;
    let v = performance.now() - g.t > 90 ? 0 : g.v * 16.67;
    if (Math.abs(v) < 2) return;
    let acc = g.acc;
    const coast = () => {
      acc = steps(acc + v);
      v *= 0.94;
      if (Math.abs(v) > 0.4) fling.current = requestAnimationFrame(coast);
    };
    fling.current = requestAnimationFrame(coast);
  };

  const shown = Math.max(2, String(value).length);
  const r = clamp(corner, 0, H / 2);
  const inner = Math.max(0, r - PAD);

  return (
    <div
      className="odo"
      style={
        {
          "--odo-r": `${r}px`,
          "--odo-in": `${inner}px`,
          "--odo-cell": `${CELL}px`,
        } as React.CSSProperties
      }
    >
      <button
        type="button"
        className="odo-btn"
        aria-label="Less"
        onPointerDown={() => press(-1)}
        onPointerUp={release}
        onPointerLeave={release}
        onPointerCancel={release}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            bump(-1);
          }
        }}
      >
        <Minus size={16} strokeWidth={2.2} />
      </button>

      <div
        className="odo-num"
        role="spinbutton"
        aria-valuenow={value}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-label={ariaLabel}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "ArrowUp") {
            e.preventDefault();
            bump(1);
          }
          if (e.key === "ArrowDown") {
            e.preventDefault();
            bump(-1);
          }
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {Array.from({ length: PLACES }, (_, i) => {
          const p = PLACES - 1 - i;
          return (
            <span key={p} className="odo-pair">
              <span className="odo-col" data-on={p < shown || undefined}>
                <span
                  className="odo-strip"
                  ref={(el) => {
                    strips.current[p] = el as HTMLDivElement | null;
                  }}
                >
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((d, j) => (
                    <span key={j}>{d}</span>
                  ))}
                </span>
              </span>
              {p === 3 && <span className="odo-sep" data-on={shown > 3 || undefined}>,</span>}
            </span>
          );
        })}
      </div>

      <button
        type="button"
        className="odo-btn"
        aria-label="More"
        onPointerDown={() => press(1)}
        onPointerUp={release}
        onPointerLeave={release}
        onPointerCancel={release}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            bump(1);
          }
        }}
      >
        <Plus size={16} strokeWidth={2.2} />
      </button>
    </div>
  );
}
