/** Consistent chrome for every tool page. */
export function ToolShell({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: React.ReactNode;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mx-auto max-w-5xl px-4 pb-16 pt-10 sm:px-6 sm:pt-14">
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-ink3 sm:text-[11px]">
        {eyebrow}
      </p>
      <h1 className="mt-3 font-display text-[clamp(2.25rem,7vw,3.75rem)] font-semibold leading-[0.98] tracking-[-0.03em] text-ink">
        {title}
      </h1>
      <p className="mt-3 max-w-md text-[14px] leading-relaxed text-ink2">{description}</p>
      <div className="mt-8 sm:mt-10">{children}</div>
    </section>
  );
}
