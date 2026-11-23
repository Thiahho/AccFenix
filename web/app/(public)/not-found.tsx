import Link from "next/link";
import { PosterHead } from "@/components/site/poster-head";

export default function NotFound() {
  return (
    <>
      <PosterHead label="404" title="No encontramos esta página">
        Puede que el producto ya no esté en el catálogo.
      </PosterHead>
      <div className="px-4 py-8 sm:px-6 lg:px-8">
        <Link href="/" className="poster-cta w-full bg-espresso text-ivory hover:bg-roast sm:w-fit">
          Volver al inicio
        </Link>
      </div>
    </>
  );
}
