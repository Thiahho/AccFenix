"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

/** Botón destructivo con confirmación. `action` devuelve el ActionResult de la server action. */
export function ConfirmButton({
  label,
  title,
  description,
  action,
  onDone,
  size = "default",
  children,
}: {
  label: string;
  title: string;
  description: string;
  action: () => Promise<{ ok: boolean; error?: string } | void>;
  onDone?: () => void;
  size?: "default" | "sm" | "icon";
  children?: React.ReactNode;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size={size} className="text-destructive hover:text-destructive" disabled={pending} aria-label={label}>
          {children ?? label}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-white hover:bg-destructive/90"
            onClick={() =>
              startTransition(async () => {
                const res = await action();
                if (res && !res.ok) toast.error(res.error);
                else onDone?.();
              })
            }
          >
            Eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
