import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const pillTones = { espresso: "bg-espresso", caramel: "bg-caramel-deep" } as const;
export type PillTone = keyof typeof pillTones;

type PillProps = {
  icon: LucideIcon;
  children: React.ReactNode;
  tone?: PillTone;
  as?: "p" | "h2" | "h3" | "span";
  id?: string;
  className?: string;
};

/** Printed-menu section label: a pill with a circular icon overlapping its left end. */
export function MenuPill({ icon: Icon, children, tone = "espresso", as: Tag = "p", id, className }: PillProps) {
  return (
    <Tag id={id} className={cn("inline-flex h-12 max-w-full items-center", className)}>
      <span aria-hidden className={cn("relative z-10 grid size-12 shrink-0 place-items-center rounded-full border-2 border-ivory text-ivory", pillTones[tone])}>
        <Icon className="size-6" />
      </span>
      <span className={cn("-ml-4 flex h-9 min-w-0 items-center rounded-r-full pr-6 pl-7 text-sm font-bold tracking-[0.14em] text-ivory uppercase", pillTones[tone])}>
        <span className="truncate">{children}</span>
      </span>
    </Tag>
  );
}

type CardProps = {
  title: string;
  icon: LucideIcon;
  tone?: PillTone;
  children: React.ReactNode;
  className?: string;
};

/** Thin-border menu card whose pill header sits on the top edge. */
export function MenuCard({ title, icon, tone, children, className }: CardProps) {
  return (
    <article aria-label={title} className={cn("relative mt-6 rounded-2xl border border-caramel/70 bg-card/70 px-3 pt-9 pb-3 sm:px-4", className)}>
      <MenuPill as="h3" icon={icon} tone={tone} className="absolute -top-6 left-2">
        {title}
      </MenuPill>
      {children}
    </article>
  );
}

/** Organic coffee-stain corners. The parent needs `relative overflow-hidden`; content above them needs `relative`. */
export function CoffeeStains() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <svg viewBox="0 0 200 160" className="absolute -top-2 -right-2 w-36 text-caramel sm:w-56 lg:w-72">
        <path fill="currentColor" fillOpacity={0.3} d="M200 0H42c8 26 30 34 56 38 30 5 42 20 50 48 7 25 26 42 52 46Z" />
        <path fill="var(--espresso)" fillOpacity={0.72} d="M200 0h-82c6 15 20 21 37 25 20 5 27 16 32 33 2 8 7 14 13 18Z" />
      </svg>
      <svg viewBox="0 0 200 160" className="absolute -bottom-2 -left-2 w-32 rotate-180 text-caramel sm:w-48 lg:w-64">
        <path fill="currentColor" fillOpacity={0.3} d="M200 0H42c8 26 30 34 56 38 30 5 42 20 50 48 7 25 26 42 52 46Z" />
        <path fill="var(--espresso)" fillOpacity={0.72} d="M200 0h-82c6 15 20 21 37 25 20 5 27 16 32 33 2 8 7 14 13 18Z" />
      </svg>
    </div>
  );
}

/** Handwritten accent phrase from the printed menu. Decorative, so it is hidden from assistive technology. */
export function ScriptAccent({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p aria-hidden className={cn("font-script leading-tight text-caramel-deep", className)}>
      {children}
    </p>
  );
}
