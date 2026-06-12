// Public header behaviour: collapses the header from its large (150px) to
// compact (56px) state on scroll, drives the animated brand mark, and fits the
// lead sentence to the headline's width.
//
// The static logo (an <img>) is the always-visible base. The animated MP4 is
// only played — and only swapped in over the logo — when ALL of these hold:
//   • the header is expanded (not scrolled / collapsed),
//   • the user hasn't requested reduced motion,
//   • the browser can play H.264 MP4 (effectively everywhere, incl. Safari),
//   • autoplay actually succeeds (rules out iOS Low Power Mode).
// Anything else falls back to the static logo.
//
// Lead fitting: the headline ("GRADUATION TOUR 17–21.06 2026") is a fixed string,
// so its cqi size fills the band by construction. The lead sentence varies per
// site/locale, so no single cqi value fills exactly — this script measures the
// headline's rendered width and scales the lead's font-size to match it. Font
// size scales text width linearly, so one measurement gives the exact value. The
// CSS cqi value remains a no-JS fallback (fills ~95%).

(() => {
  const header = document.querySelector("[data-site-header]");
  if (!header) return;

  const box = document.querySelector("[data-site-eyes]");
  const video = box && box.querySelector("[data-site-eyes-video]");
  const band = header.querySelector(".header-band");
  const lead = header.querySelector(".header-lead");
  const headline = header.querySelector(".header-headline");

  // Width of an element's actual text content (not its block width).
  const textWidth = (el) => {
    const range = document.createRange();
    range.selectNodeContents(el);
    return range.getBoundingClientRect().width;
  };

  // Scale the lead so its text is exactly as wide as the headline. Skips when the
  // lead is hidden (collapsed, or dropped by an @container rule on a narrow band).
  const fitLead = () => {
    if (!lead || !headline) return;
    lead.style.fontSize = ""; // revert to the cqi base before measuring
    if (getComputedStyle(lead).display === "none") return;
    const target = textWidth(headline);
    const current = textWidth(lead);
    if (target > 0 && current > 0) {
      const base = parseFloat(getComputedStyle(lead).fontSize);
      lead.style.fontSize = `${(base * target) / current}px`;
    }
  };
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const canPlayMp4 = video ? video.canPlayType('video/mp4; codecs="avc1.42E01E"') !== "" : false;
  const animationAllowed = Boolean(video) && canPlayMp4 && !prefersReducedMotion;

  // Collapse/expand thresholds. The expanded (tall) header can only sit flush
  // above the sticky nav at the very top of the page, so we collapse as soon as
  // the user leaves the top and only re-expand right back at it. Scroll
  // anchoring is disabled (see styles.css) so these transitions don't move
  // scrollY — that removes the feedback loop that used to cause twitching, and
  // lets the band stay narrow without oscillating. The small gap is just
  // hysteresis against scroll jitter at the boundary.
  const COLLAPSE_AT = 8;
  const EXPAND_AT = 2;

  let collapsed = false;
  let ticking = false;

  const showVideo = (on) => box && box.classList.toggle("is-animating", on);

  const startAnim = () => {
    if (!animationAllowed || collapsed) return;
    const p = video.play(); // play() also triggers the (preload="none") download
    if (p && typeof p.then === "function") {
      p.then(() => showVideo(true)).catch(() => showVideo(false)); // blocked / low-power
    } else {
      showVideo(true);
    }
  };

  const stopAnim = () => {
    if (!video) return;
    video.pause();
    showVideo(false);
  };

  const setCollapsed = (next) => {
    if (next === collapsed) return;
    collapsed = next;
    header.classList.toggle("is-collapsed", next);
    if (next) stopAnim();
    else {
      startAnim();
      fitLead(); // lead reappears on expand — re-match it to the headline
    }
  };

  const apply = () => {
    ticking = false;
    const y = window.scrollY;
    if (!collapsed && y > COLLAPSE_AT) setCollapsed(true);
    else if (collapsed && y < EXPAND_AT) setCollapsed(false);
  };

  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(apply);
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  apply(); // sync initial collapsed state (e.g. navigating back to a scrolled page)
  if (!collapsed) startAnim(); // begin animating if we loaded at the top

  // Refit the lead on band-width changes and once webfonts settle (the initial
  // measurement before Inter loads would otherwise be off).
  if (lead && headline && band) {
    fitLead();
    if (window.ResizeObserver) new ResizeObserver(fitLead).observe(band);
    else window.addEventListener("resize", fitLead);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitLead);
  }
})();
