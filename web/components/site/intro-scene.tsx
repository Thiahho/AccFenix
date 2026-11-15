"use client";

import { useEffect, useRef } from "react";

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
 * fades the overlay out, so the site never depends on the animation.
 */
export function IntroScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const root = document.documentElement;
    if (!root.classList.contains(PLAY)) return;

    let cancelled = false;
    let stop: (() => void) | undefined;
    const clear = () => root.classList.remove(PLAY, REVEAL, OUT);
    const skip = () => {
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

    import("@/lib/intro/egg-scene")
      .then(({ playEggIntro }) => {
        // Dev-only handle to replay the scene from the console; removed from production builds.
        if (process.env.NODE_ENV === "development") Object.assign(window, { __playEggIntro: playEggIntro });
        if (cancelled || !canvasRef.current) return;
        window.clearTimeout(budget);
        stop = playEggIntro(canvasRef.current, {
          onReveal: () => root.classList.add(REVEAL),
          onFade: () => root.classList.add(OUT),
          onEnd: clear,
        });
      })
      .catch(() => {
        window.clearTimeout(budget);
        if (!cancelled) skip();
      });

    return () => {
      cancelled = true;
      window.clearTimeout(budget);
      stop?.();
    };
  }, []);

  return <canvas ref={canvasRef} className="intro-canvas" />;
}
