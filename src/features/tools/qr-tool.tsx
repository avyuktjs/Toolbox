"use client";

import QRCode from "qrcode";
import { useEffect, useRef, useState } from "react";
import { Download, QrCode, Trash2 } from "lucide-react";
import { toast } from "sonner";

export function QrTool() {
  const [input, setInput] = useState("https://example.com");
  const [size, setSize] = useState<256 | 384 | 512>(256);
  const [dark, setDark] = useState("#1d1d1f");
  const [light, setLight] = useState("#ffffff");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const text = input.trim() || "";
    if (!text) {
      canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }
    if (text.length > 1500) return;
    QRCode.toCanvas(
      canvas,
      text,
      {
        width: size,
        margin: 2,
        color: { dark, light },
        errorCorrectionLevel: "M",
      },
      (error) => {
        if (error) console.error(error);
      },
    );
  }, [input, size, dark, light]);

  const download = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = "toolbox-qr.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
    toast.success("QR code saved");
  };

  return (
    <div className="soft-shadow overflow-hidden rounded-[18px] border border-line bg-panel">
      <div className="flex items-center justify-between border-b border-line bg-sunken/40 px-4 py-2">
        <span className="flex items-center gap-2 font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-ink3">
          <QrCode className="size-4" /> QR code
        </span>
        <button
          type="button"
          onClick={() => setInput("")}
          aria-label="Clear"
          className="grid size-8 place-items-center rounded-full text-ink3 transition-colors hover:bg-sunken hover:text-ink"
        >
          <Trash2 className="size-4" />
        </button>
      </div>

      <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_auto]">
        <div className="flex flex-col border-b border-line p-5 lg:border-b-0 lg:border-r">
          <label className="font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-ink3" htmlFor="qr-input">
            Content
          </label>
          <textarea
            id="qr-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="https://example.com, a Wi-Fi string, an email…"
            spellCheck={false}
            className="mt-1.5 h-32 w-full resize-y rounded-[10px] border border-line bg-sunken/40 p-3 font-mono text-[13px] leading-relaxed text-ink outline-none placeholder:text-ink3 focus:border-line2"
          />
          <p className="mt-2 flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.16em] text-ink3">
            <span>Error correction M — survives ~15% damage</span>
            <span className={input.trim().length > 1500 ? "text-danger" : ""}>
              {input.trim().length}/1500
            </span>
          </p>

          <div className="mt-4 grid grid-cols-2 gap-3">
            {[
              { label: "Foreground", value: dark, set: setDark },
              { label: "Background", value: light, set: setLight },
            ].map(({ label, value, set }) => (
              <label key={label} className="flex items-center gap-2 rounded-[10px] border border-line px-3 py-2">
                <input
                  type="color"
                  value={value}
                  onChange={(e) => set(e.target.value)}
                  aria-label={label}
                  className="size-7 cursor-pointer rounded-md border border-line p-0.5"
                />
                <span className="min-w-0">
                  <span className="block font-mono text-[8px] font-semibold uppercase tracking-[0.18em] text-ink3">
                    {label}
                  </span>
                  <span className="block font-mono text-[11px] uppercase text-ink">{value}</span>
                </span>
              </label>
            ))}
          </div>

          <div className="mt-4 flex items-center gap-2">
            <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-ink3">Size</span>
            {([256, 384, 512] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSize(s)}
                aria-pressed={size === s}
                className={`h-8 rounded-full border px-3 font-mono text-[11px] font-semibold transition-colors ${
                  size === s
                    ? "border-ink bg-ink text-paper"
                    : "border-line2 text-ink2 hover:border-ink hover:text-ink"
                }`}
              >
                {s}px
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col items-center justify-center gap-4 p-6 lg:w-72">
          <canvas
            ref={canvasRef}
            width={256}
            height={256}
            role="img"
            aria-label="Generated QR code"
            className="w-full max-w-[256px] rounded-[10px] border border-line bg-white"
            style={{ height: "auto", aspectRatio: "1 / 1" }}
          />
          <button
            type="button"
            onClick={download}
            disabled={!input.trim()}
            className="flex h-10 items-center gap-2 rounded-full border border-black/10 bg-white px-5 text-[13px] font-semibold text-[#0a0a0b] shadow-[0_1px_2px_rgba(0,0,0,0.12)] transition-all duration-200 hover:border-brand hover:bg-brand hover:text-white hover:shadow-[0_8px_20px_-8px_rgba(29,67,242,0.55)] disabled:pointer-events-none disabled:opacity-40"
          >
            <Download className="size-4" /> Download PNG
          </button>
        </div>
      </div>
    </div>
  );
}
