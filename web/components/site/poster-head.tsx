type Props = {
  label: string;
  title: string;
  children?: React.ReactNode;
  /** Optional line above the label, such as a breadcrumb. */
  top?: React.ReactNode;
};

/** Full-bleed dark page head with a warm glow, shared by the inner public pages. */
export function PosterHead({ label, title, children, top }: Props) {
  return (
    <header className="poster-ink relative overflow-hidden border-b border-border">
      <div className="relative z-10 px-4 py-8 pr-20 sm:px-6 sm:pr-40 lg:px-8 lg:py-12">
        {top}
        <p className="poster-hand text-2xl text-latte">{label}</p>
        <h1 className="poster-display poster-section-title mt-2 text-balance">{title}</h1>
        {children && <div className="mt-3 max-w-2xl text-pretty text-cream">{children}</div>}
      </div>
      <div aria-hidden className="absolute top-1/2 -right-24 aspect-square w-72 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,color-mix(in_oklch,var(--poster-gold)_24%,transparent),transparent_68%)] lg:right-0 lg:w-96" />
    </header>
  );
}
