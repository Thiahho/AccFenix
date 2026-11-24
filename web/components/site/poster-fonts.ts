import { Caveat } from "next/font/google";

// Loaded from the public layout and the root 404 only, so admin pages never download it. Montserrat comes from the root layout.
const hand = Caveat({ variable: "--font-poster-hand", subsets: ["latin"], display: "swap" });

/** Scope class for the public design: exposes the handwritten font and switches on the `.poster` tokens in globals.css. */
export const posterClass = `poster ${hand.variable}`;
