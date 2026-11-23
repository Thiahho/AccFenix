import Link from "next/link";
import { CupSodaIcon } from "lucide-react";
import { MenuPill } from "@/components/site/menu-card";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <MenuPill icon={CupSodaIcon} tone="caramel">404</MenuPill>
      <h1 className="title-display mt-4 text-4xl sm:text-5xl">No encontramos esta página</h1>
      <p className="mt-3 text-muted-foreground">Puede que el producto ya no esté en el catálogo.</p>
      <Button asChild className="mt-8 rounded-full px-5">
        <Link href="/">Volver al inicio</Link>
      </Button>
    </div>
  );
}
