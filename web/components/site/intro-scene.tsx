"use client";

import { useEffect, useRef } from "react";
import { site } from "@/lib/site";

/**
 * Hard limit, measured from navigation start, for the 3D scene to be ready. Past it (slow device or network) the
 * intro is skipped instead of holding the page behind the overlay.
 */
const LOAD_BUDGET_MS = 3000;
const FADE_MS = 400;

const PLAY = "intro-play";
const REVEAL = "intro-reveal";
const OUT = "intro-out";

/**
 * Client half of the intro: when the inline gate script marked this visit (`intro-play` on <html>), loads three.js
 * on demand and runs the egg scene on the overlay canvas. Any failure (no WebGL, chunk error, budget exceeded) just
 * fades the overlay out, so the site never depends on the animation. A tap on the overlay or any key skips it.
 */
export function IntroScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const root = document.documentElement;
    if (!root.classList.contains(PLAY)) return;

    let cancelled = false;
    let stop: (() => void) | undefined;
    // The inline script's safety timer may already have removed `intro-play`; late scene callbacks must then do
    // nothing, or the page would zoom again under an overlay that is already gone.
    const playing = () => root.classList.contains(PLAY);
    const clear = () => root.classList.remove(PLAY, REVEAL, OUT);
    const skip = () => {
      if (!playing()) return;
      root.classList.add(OUT);
      window.setTimeout(clear, FADE_MS);
    };

    const remaining = LOAD_BUDGET_MS - performance.now();
    if (remaining <= 0) {
      skip();
      return;
    }
    const budget = window.setTimeout(() => {
      cancelled = true;
      skip();
    }, remaining);

    // While playing, the overlay captures pointer input (see globals.css), so a tap cannot reach links the user cannot
    // see; that tap, or any key (which would otherwise move focus behind the overlay), ends the intro right away.
    const overlay = canvasRef.current?.parentElement;
    const skipNow = (event: Event) => {
      // The skipping key must not also act on the hidden page (Space/arrows would scroll it, Tab would move focus).
      event.preventDefault();
      cancelled = true;
      window.clearTimeout(budget);
      removeSkipListeners();
      stop?.();
      stop = undefined;
      skip();
    };
    function removeSkipListeners() {
      overlay?.removeEventListener("pointerdown", skipNow);
      window.removeEventListener("keydown", skipNow);
    }
    overlay?.addEventListener("pointerdown", skipNow);
    window.addEventListener("keydown", skipNow);

    // The shell prints the wordmark on a canvas, so the script font must be loaded before the texture is drawn.
    const fontFamily = getComputedStyle(root).getPropertyValue("--font-yellowtail").trim() || "cursive";
    const fontReady = document.fonts.load(`140px ${fontFamily}`).catch(() => undefined);

    Promise.all([import("@/lib/intro/egg-scene"), fontReady])
      .then(([{ playEggIntro }]) => {
        // Dev-only handle to replay the scene from the console; removed from production builds.
        if (process.env.NODE_ENV === "development") Object.assign(window, { __playEggIntro: playEggIntro });
        if (cancelled || !canvasRef.current || !playing()) return;
        window.clearTimeout(budget);
        stop = playEggIntro(canvasRef.current, { text: site.name, fontFamily }, {
          onReveal: () => {
            if (playing()) root.classList.add(REVEAL);
          },
          onFade: () => {
            if (playing()) root.classList.add(OUT);
          },
          onEnd: () => {
            removeSkipListeners();
            if (playing()) clear();
          },
        });
      })
      .catch(() => {
        window.clearTimeout(budget);
        if (!cancelled) skip();
      });

    return () => {
      cancelled = true;
      window.clearTimeout(budget);
      removeSkipListeners();
      stop?.();
    };
  }, []);

  return <canvas ref={canvasRef} className="intro-canvas" />;
}
