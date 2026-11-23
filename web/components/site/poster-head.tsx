import { Starburst } from "@/components/site/starburst";

type Props = {
  label: string;
  title: string;
  children?: React.ReactNode;
  /** Optional line above the label, such as a breadcrumb. */
  top?: React.ReactNode;
};

/** Full-bleed espresso page head shared by the inner public pages. */
export function PosterHead({ label, title, children, top }: Props) {
  return (
    <header className="poster-ink relative overflow-hidden border-b-[3px] border-espresso">
      <div className="relative z-10 px-4 py-8 pr-20 sm:px-6 sm:pr-40 lg:px-8 lg:py-12">
        {top}
        <p className="poster-label text-latte">{label}</p>
        <h1 className="poster-display poster-section-title mt-2 text-balance">{title}</h1>
        {children && <div className="mt-3 max-w-2xl text-pretty text-cream">{children}</div>}
      </div>
      <Starburst spikes={16} fill="var(--caramel-deep)" className="absolute top-1/2 -right-12 w-32 -translate-y-1/2 sm:right-4 sm:w-44 lg:right-10 lg:w-56" />
    </header>
  );
}
