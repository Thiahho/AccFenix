/**
 * First-visit intro: an egg wobbles, cracks, splits open and the view dives into the yolk while the page settles
 * with a short zoom-out. Pure CSS (keyframes in globals.css), so it plays on first paint without waiting for JS.
 *
 * The inline script runs before the overlay is parsed and only adds `intro-play` to <html> when the intro should
 * play: once per browser session, never under /admin, never with reduced motion. Without it (or without JS) the
 * overlay stays `display: none`. It holds no text or images, so it is never the LCP element and the server HTML
 * underneath stays intact for crawlers.
 */

const INTRO_SCRIPT = `(function(){try{var d=document.documentElement;if(location.pathname.indexOf("/admin")===0)return;if(matchMedia("(prefers-reduced-motion: reduce)").matches)return;if(sessionStorage.getItem("eggy-intro"))return;sessionStorage.setItem("eggy-intro","1");d.classList.add("intro-play");setTimeout(function(){d.classList.remove("intro-play")},2400)}catch(e){}})();`;

// Egg outline and the zigzag crack that splits it (viewBox 0 0 120 150).
const EGG = "M60 6C92 6 112 58 112 92C112 124 89 144 60 144C31 144 8 124 8 92C8 58 28 6 60 6Z";
const CRACK = "0,82 14,74 26,88 40,76 54,90 66,77 80,89 94,75 106,87 120,79";
const CRACK_REVERSED = CRACK.split(" ").reverse().join(" ");

export function IntroSplash() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: INTRO_SCRIPT }} />
      <div aria-hidden className="intro-splash">
        <svg viewBox="0 0 120 150" className="intro-egg">
          <defs>
            <radialGradient id="intro-shell" cx="38%" cy="30%" r="75%">
              <stop offset="0%" stopColor="var(--paper)" />
              <stop offset="60%" stopColor="var(--cream)" />
              <stop offset="100%" stopColor="var(--cream-deep)" />
            </radialGradient>
            <radialGradient id="intro-yolk" cx="42%" cy="38%" r="65%">
              <stop offset="0%" stopColor="var(--yolk-light)" />
              <stop offset="100%" stopColor="oklch(0.74 0.17 62)" />
            </radialGradient>
            <clipPath id="intro-top">
              <polygon points={`0,0 120,0 ${CRACK_REVERSED}`} />
            </clipPath>
            <clipPath id="intro-bottom">
              <polygon points={`${CRACK} 120,150 0,150`} />
            </clipPath>
          </defs>

          <circle className="intro-yolk" cx="60" cy="92" r="30" fill="url(#intro-yolk)" />
          <g className="intro-shell-bottom">
            <path d={EGG} fill="url(#intro-shell)" clipPath="url(#intro-bottom)" />
          </g>
          <g className="intro-shell-top">
            <path d={EGG} fill="url(#intro-shell)" clipPath="url(#intro-top)" />
          </g>
          {/* Uncut shell above the halves until the split, so the anti-aliased seam between them never shows. */}
          <path className="intro-shell-whole" d={EGG} fill="url(#intro-shell)" />
          <polyline
            className="intro-crack"
            points={CRACK}
            fill="none"
            stroke="var(--charcoal)"
            strokeWidth="2"
            strokeLinejoin="round"
            pathLength={1}
            clipPath="url(#intro-egg-clip)"
          />
          <clipPath id="intro-egg-clip">
            <path d={EGG} />
          </clipPath>
        </svg>
      </div>
    </>
  );
}
