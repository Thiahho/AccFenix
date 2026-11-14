"use client";

import { ArrowDownIcon, ArrowUpIcon, ExternalLinkIcon, MapPinIcon, RouteIcon, XIcon } from "lucide-react";
import { createContext, useContext, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { TableCell, TableHead } from "@/components/ui/table";
import type { AdminOrderSummary } from "@/lib/admin/types";
import { mapsPlaceLink, mapsRouteLegs, routeStop } from "@/lib/maps-url";

/** One delivery in the route, kept in the order the admin chose (never sorted automatically). */
type Stop = { id: number; number: number; customerName: string; place: string; stop: string };

type RouteState = {
  active: boolean;
  setActive: (active: boolean) => void;
  stops: Stop[];
  toggle: (stop: Stop, selected: boolean) => void;
  move: (id: number, offset: -1 | 1) => void;
};

const RouteContext = createContext<RouteState | null>(null);

function useRoute() {
  const ctx = useContext(RouteContext);
  if (!ctx) throw new Error("Route builder components must be inside <RouteBuilderProvider>");
  return ctx;
}

export function RouteBuilderProvider({ children }: { children: React.ReactNode }) {
  const [active, setActive] = useState(false);
  const [stops, setStops] = useState<Stop[]>([]);

  const value = useMemo<RouteState>(
    () => ({
      active,
      setActive,
      stops,
      toggle: (stop, selected) =>
        setStops((prev) => (selected ? (prev.some((s) => s.id === stop.id) ? prev : [...prev, stop]) : prev.filter((s) => s.id !== stop.id))),
      move: (id, offset) =>
        setStops((prev) => {
          const from = prev.findIndex((s) => s.id === id);
          const to = from + offset;
          if (from < 0 || to < 0 || to >= prev.length) return prev;
          const next = [...prev];
          [next[from], next[to]] = [next[to], next[from]];
          return next;
        }),
    }),
    [active, stops],
  );

  return <RouteContext.Provider value={value}>{children}</RouteContext.Provider>;
}

export function RouteModeToggle() {
  const { active, setActive } = useRoute();
  return (
    <Button variant={active ? "default" : "outline"} aria-pressed={active} onClick={() => setActive(!active)}>
      <RouteIcon /> {active ? "Salir de la ruta" : "Armar ruta"}
    </Button>
  );
}

type Place = Pick<AdminOrderSummary, "zone" | "address" | "locality" | "latitude" | "longitude">;

function placeLabel({ address, locality }: Place) {
  return [address, locality].map((p) => p?.trim()).filter(Boolean).join(", ") || "Punto marcado en el mapa";
}

/** Only own deliveries with an address or a pin can be routed; carrier orders ship from the depot. */
function stopOf(order: AdminOrderSummary): Stop | null {
  if (order.zone !== "buenosAires") return null;
  const stop = routeStop(order);
  return stop ? { id: order.id, number: order.number, customerName: order.customerName, place: placeLabel(order), stop } : null;
}

export function RouteSelectHead() {
  const { active } = useRoute();
  return active ? <TableHead className="w-10"><span className="sr-only">En la ruta</span></TableHead> : null;
}

export function RouteSelectCell({ order }: { order: AdminOrderSummary }) {
  const { active, stops, toggle } = useRoute();
  if (!active) return null;

  const stop = stopOf(order);
  const position = stops.findIndex((s) => s.id === order.id);
  return (
    // Not `relative`: the overlay below must stretch over the whole (relative) row.
    <TableCell className="w-10 whitespace-normal">
      {/* In route mode the whole row selects the order instead of opening it. */}
      <button
        type="button"
        tabIndex={-1}
        aria-hidden
        disabled={!stop}
        onClick={() => stop && toggle(stop, position < 0)}
        className="absolute inset-0 z-10 cursor-pointer disabled:cursor-not-allowed"
      />
      {stop ? (
        <span className="relative z-20 flex items-center gap-1.5">
          <Checkbox
            checked={position >= 0}
            onCheckedChange={(v) => toggle(stop, v === true)}
            aria-label={`Agregar el pedido #${order.number} a la ruta`}
          />
          {position >= 0 && <span className="text-xs font-semibold tabular-nums text-brand">{position + 1}</span>}
        </span>
      ) : (
        <span className="relative z-20 block text-xs leading-tight text-muted-foreground">{order.zone === "buenosAires" ? "Sin dirección" : "Expreso"}</span>
      )}
    </TableCell>
  );
}

/** Small pin next to the zone that opens the order's place, for own deliveries only. */
export function OrderMapsLink({ order }: { order: Place & { number: number } }) {
  const href = order.zone === "buenosAires" ? mapsPlaceLink(order) : null;
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Ver el pedido #${order.number} en Google Maps`}
      title="Ver en Google Maps"
      className="relative z-20 -my-2 ml-1 inline-flex size-8 items-center justify-center rounded-md text-brand hover:bg-muted"
    >
      <MapPinIcon aria-hidden className="size-4" />
    </a>
  );
}

export function RoutePanel() {
  const { active, stops, toggle, move } = useRoute();
  const legs = useMemo(() => mapsRouteLegs(stops.map((s) => s.stop)), [stops]);
  if (!active) return null;

  return (
    <section
      aria-labelledby="ruta-titulo"
      className="sticky bottom-0 z-20 mt-4 rounded-xl border bg-background p-4 shadow-lg md:bottom-4"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 id="ruta-titulo" className="font-semibold">
          Ruta <span className="font-normal text-muted-foreground tabular-nums">({stops.length} parada{stops.length === 1 ? "" : "s"})</span>
        </h2>
        <p className="text-xs text-muted-foreground">Sale desde tu ubicación. Ordená las paradas con las flechas.</p>
      </div>

      {stops.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">Marcá los pedidos en el orden en que los vas a entregar.</p>
      ) : (
        <>
          <ol className="mt-3 max-h-[40vh] divide-y overflow-y-auto rounded-lg border" aria-live="polite">
            {stops.map((s, i) => (
              <li key={s.id} className="flex items-center gap-2 py-1 pr-1 pl-3">
                <span className="w-6 shrink-0 text-sm font-semibold tabular-nums text-brand">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {s.customerName} <span className="font-normal text-muted-foreground tabular-nums">#{s.number}</span>
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{s.place}</p>
                </div>
                <Button variant="ghost" size="icon" disabled={i === 0} onClick={() => move(s.id, -1)} aria-label={`Subir la parada ${i + 1} (pedido #${s.number})`}>
                  <ArrowUpIcon />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={i === stops.length - 1}
                  onClick={() => move(s.id, 1)}
                  aria-label={`Bajar la parada ${i + 1} (pedido #${s.number})`}
                >
                  <ArrowDownIcon />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => toggle(s, false)} aria-label={`Quitar el pedido #${s.number} de la ruta`}>
                  <XIcon />
                </Button>
              </li>
            ))}
          </ol>

          <div className="mt-3 flex flex-wrap gap-2">
            {legs.map((leg, i) => (
              <Button key={leg.from} asChild>
                <a href={leg.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLinkIcon />
                  {legs.length === 1 ? "Abrir en Maps" : `Tramo ${i + 1} (paradas ${leg.from}–${leg.to})`}
                </a>
              </Button>
            ))}
          </div>
          {legs.length > 1 && (
            <p className="mt-2 text-xs text-muted-foreground">
              Google Maps acepta hasta 10 paradas por link: cada tramo arranca en la última parada del anterior.
            </p>
          )}
        </>
      )}
    </section>
  );
}
