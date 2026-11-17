"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Link2, Loader2, ArrowRight, X, AlertCircle } from "lucide-react";
import { useCallback, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";

const schema = z.object({
  url: z
    .string()
    .trim()
    .min(1, "Paste a link first.")
    .url("That doesn't look like a valid URL.")
    .refine((u) => /^https?:\/\//i.test(u), "Only http(s) links, sorry."),
});

type FormValues = z.infer<typeof schema>;

export function UrlConsole({
  loading,
  onInspect,
  initialUrl,
}: {
  loading: boolean;
  onInspect: (url: string) => void;
  /** Seed the field once on mount (parent remounts via key to change it). */
  initialUrl?: string | null;
}) {
  const {
    register,
    handleSubmit,
    watch,
    reset,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { url: initialUrl ?? "" } });

  const value = watch("url");
  const [fx, setFx] = useState<"idle" | "inhale" | "shake">("idle");
  const fireFx = (next: "inhale" | "shake") => {
    setFx(next);
    window.setTimeout(() => setFx("idle"), 620);
  };


  const clear = useCallback(() => {
    reset({ url: "" });
    setFocus("url");
  }, [reset, setFocus]);

  const busy = loading || isSubmitting;

  return (
    <div className="w-full">
      <form
        className={[
          "soft-shadow overflow-hidden rounded-[22px] border border-line bg-panel",
          fx === "inhale" ? "tb-inhale" : fx === "shake" ? "tb-shake" : null,
        ].filter(Boolean).join(" ")}
        onSubmit={handleSubmit(
          ({ url }) => {
            fireFx("inhale");
            onInspect(url);
          },
          () => fireFx("shake"),
        )}
        noValidate
      >
        {/* title strip */}
        <div className="flex h-8 items-center justify-between border-b border-line bg-sunken/40 px-4">
          <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.22em] text-ink3">
            {busy ? "Reading source" : "Link"}
          </span>
          <span className="hidden items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.18em] text-ink3 sm:flex">
            <kbd className="kbd">/</kbd> to focus
          </span>
        </div>

        {/* input row */}
        <div className="flex items-stretch">
          <label className="grid w-12 shrink-0 place-items-center border-r border-line text-ink3 sm:w-14">
            <Link2 className="size-5" strokeWidth={1.75} aria-hidden />
            <span className="sr-only">Media URL</span>
          </label>
          <input
            id="tb-url-input"
            type="url"
            inputMode="url"
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            placeholder="Paste a link — youtube.com/watch?v=…"
            aria-invalid={errors.url ? true : undefined}
            aria-describedby={errors.url ? "tb-url-error" : undefined}
            disabled={busy}
            className="h-14 min-w-0 flex-1 bg-transparent px-3 text-[15px] text-ink outline-none transition-colors placeholder:text-ink3 disabled:opacity-60 sm:h-16 sm:px-4 sm:text-[17px]"
            {...register("url")}
          />
          <div className="flex shrink-0 items-center gap-1.5 pr-2 sm:gap-2 sm:pr-3">
            {value ? (
              <button
                type="button"
                onClick={clear}
                disabled={busy}
                aria-label="Clear the link"
                className="grid size-9 place-items-center rounded-full text-ink3 transition-colors hover:bg-sunken hover:text-ink"
              >
                <X className="size-4" />
              </button>
            ) : null}
            <Button
              type="submit"
              variant="primary"
              disabled={busy}
              className="h-10 gap-2 sm:h-11 sm:px-5"
            >
              {busy ? (
                <>
                  <Loader2 className="animate-spin" />
                  <span className="hidden min-[480px]:inline">Inspecting</span>
                </>
              ) : (
                <>
                  <span className="hidden min-[480px]:inline">Inspect</span>
                  <ArrowRight />
                </>
              )}
            </Button>
          </div>
        </div>

        {/* footnote strip */}
        <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-2.5 text-[12px] text-ink3">
          <span className="truncate">Works with public videos from YouTube, Vimeo, SoundCloud and 1000+ sites</span>
          <span className="hidden shrink-0 items-center gap-1.5 sm:flex">
            <kbd className="kbd">↵</kbd>
            <span className="text-[11px]">inspect</span>
          </span>
        </div>
      </form>

      {errors.url ? (
        <p
          id="tb-url-error"
          role="alert"
          className="mt-2 flex items-center gap-2 px-1 text-[12px] font-medium text-danger"
        >
          <AlertCircle className="size-3.5" /> {errors.url.message}
        </p>
      ) : null}
    </div>
  );
}
