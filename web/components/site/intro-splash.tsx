import { IntroScene } from "@/components/site/intro-scene";

/**
 * First-visit intro: a real-time 3D egg (three.js, see lib/intro/egg-scene.ts) drops in, cracks, splits and the camera
 * dives into the yolk while the page settles with a short zoom-out.
 *
 * The inline script runs before the overlay is parsed and only adds `intro-play` to <html> when the intro should
 * play: once per browser session, never under /admin, never with reduced motion. Without it (or without JS) the
 * overlay stays `display: none`. The overlay holds no text or images, so it is never the LCP element and the server
 * HTML underneath stays intact for crawlers. A safety timer clears the overlay even if the scene never reports back.
 */

const INTRO_SCRIPT = `(function(){try{var d=document.documentElement;if(location.pathname.indexOf("/admin")===0)return;if(matchMedia("(prefers-reduced-motion: reduce)").matches)return;if(sessionStorage.getItem("eggy-intro"))return;sessionStorage.setItem("eggy-intro","1");d.classList.add("intro-play");setTimeout(function(){d.classList.remove("intro-play","intro-reveal","intro-out")},6000)}catch(e){}})();`;

export function IntroSplash() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: INTRO_SCRIPT }} />
      <div aria-hidden className="intro-splash">
        <IntroScene />
      </div>
    </>
  );
}
