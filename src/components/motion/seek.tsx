"use client";

import { useEffect, useRef, useState } from "react";
import { useSpring, clamp, stillness } from "./spring";
import "./seek.css";

const SHUT = 44;
const LENS = 18;
const INSET = (SHUT - LENS) / 2;

/**
 * Seek — a lens that becomes a field. One box whose width is the
 * state; the lens never moves relative to the box. Controlled:
 * the value lives with the caller.
 */
export function Seek({
  value,
  onChange,
  placeholder = "Filter…",
  ariaLabel = "Filter",
  width = 232,
  spring = 20,
  give = 50,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  width?: number;
  spring?: number;
  give?: number;
}) {
  const frame = useRef<HTMLDivElement | null>(null);
  const field = useRef<HTMLInputElement | null>(null);
  const beat = useRef(0);
  const rest = useRef(0);

  const [open, setOpen] = useState(false);
  const [press, setPress] = useState(false);
  const [busy, setBusy] = useState(false);
  const [lean, setLean] = useState({ x: 0, y: 0 });
  const [touch, setTouch] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches,
  );
  const still = stillness();

  useEffect(
    () => () => {
      window.clearTimeout(beat.current);
      window.clearTimeout(rest.current);
    },
    [],
  );
  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)");
    const read = () => setTouch(mq.matches);
    mq.addEventListener("change", read);
    return () => mq.removeEventListener("change", read);
  }, []);

  /* the width is the state */
  const span = Math.max(SHUT, width);
  const target = open ? span : SHUT;
  const w = useSpring(target, clamp(spring, 0, 100), still);
  const p = clamp((w - SHUT) / Math.max(1, span - SHUT), 0, 1);

  /* the magnet. Measured from the frame, which never moves,
        never from the object, which does. Off once open. */
  useEffect(() => {
    const el = frame.current;
    if (!el || open || still || touch) return;
    let raf = 0;
    let at = { x: 0, y: 0 };
    const publish = () => {
      raf = 0;
      setLean(at);
    };
    const read = (e: PointerEvent) => {
      const b = el.getBoundingClientRect();
      const k = b.width / (el.offsetWidth || b.width) || 1;
      const dx = (e.clientX - (b.left + b.width / 2)) / k;
      const dy = (e.clientY - (b.top + b.height / 2)) / k;
      const d = Math.hypot(dx, dy);
      const R = 110;
      if (d > R) {
        if (at.x || at.y) {
          at = { x: 0, y: 0 };
          if (!raf) raf = requestAnimationFrame(publish);
        }
        return;
      }
      const pull = (1 - d / R) ** 1.4 * (2 + (give / 100) * 5);
      at = { x: (dx / (d || 1)) * pull, y: (dy / (d || 1)) * pull };
      if (!raf) raf = requestAnimationFrame(publish);
    };
    const gone = () => {
      at = { x: 0, y: 0 };
      if (!raf) raf = requestAnimationFrame(publish);
    };
    document.addEventListener("pointermove", read, { passive: true });
    document.addEventListener("pointerleave", gone);
    return () => {
      document.removeEventListener("pointermove", read);
      document.removeEventListener("pointerleave", gone);
      cancelAnimationFrame(raf);
    };
  }, [open, give, still, touch]);

  /* opening: compress, expand, focus. In that order. */
  const start = () => {
    if (open) return;
    setPress(true);
    window.clearTimeout(beat.current);
    beat.current = window.setTimeout(
      () => {
        setPress(false);
        setOpen(true);
        field.current?.focus();
      },
      still ? 0 : 90,
    );
  };

  /* away with nothing typed and it goes back; with something
     typed, the value is the reason the field exists */
  const away = () => {
    if (value.trim()) return;
    setOpen(false);
  };

  const tapped = () => {
    setBusy(true);
    window.clearTimeout(rest.current);
    rest.current = window.setTimeout(() => setBusy(false), 340);
  };

  return (
    <div
      className="sek"
      ref={frame}
      data-open={open || undefined}
      data-press={press || undefined}
      data-busy={busy || undefined}
      style={
        {
          "--shut": `${SHUT}px`,
          "--span": `${span}px`,
          "--w": `${w.toFixed(2)}px`,
          "--inset": `${INSET}px`,
          "--lens": `${LENS}px`,
          "--say": clamp((p - 0.45) / 0.55, 0, 1).toFixed(3),
          transform: `translate(${lean.x.toFixed(2)}px, ${lean.y.toFixed(2)}px)`,
        } as React.CSSProperties
      }
    >
      <div className="sek-skin">
        <svg className="sek-lens" viewBox="0 0 18 18" aria-hidden="true">
          <circle cx="7.6" cy="7.6" r="5.4" />
          <path d="M11.6 11.6 L15.4 15.4" />
        </svg>
        <input
          ref={field}
          className="sek-field"
          type="text"
          value={value}
          placeholder={placeholder}
          aria-label={ariaLabel}
          inputMode={touch ? "none" : undefined}
          tabIndex={open ? 0 : -1}
          onChange={(e) => {
            onChange(e.target.value);
            tapped();
          }}
          onBlur={away}
          onKeyDown={(e) => {
            if (e.key !== "Escape") return;
            e.preventDefault();
            onChange("");
            setOpen(false);
            field.current?.blur();
          }}
        />
        {!open && <button type="button" className="sek-hit" aria-label={ariaLabel} onClick={start} />}
      </div>
    </div>
  );
}
