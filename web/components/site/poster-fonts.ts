import { Anton, Archivo } from "next/font/google";

// Loaded from the public layout and the root 404 only, so admin pages never download them.
const display = Anton({ variable: "--font-poster-display", subsets: ["latin"], weight: "400", display: "swap" });
const text = Archivo({ variable: "--font-poster-text", subsets: ["latin"], display: "swap" });

/** Scope class for the public design: exposes both fonts and switches on the `.poster` tokens in globals.css. */
export const posterClass = `poster ${display.variable} ${text.variable}`;
