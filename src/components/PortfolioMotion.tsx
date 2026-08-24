import { useEffect } from "react";
import CountUp from "./CountUp";

type RevealTarget = HTMLElement;

const ease = "cubic-bezier(0.16, 1, 0.3, 1)";

function play(target: Element | null, keyframes: Keyframe[], options: KeyframeAnimationOptions) {
  if (!(target instanceof HTMLElement)) return null;
  const animation = target.animate(keyframes, { fill: "both", ...options });
  return animation;
}

function revealTitle(target: RevealTarget) {
  return play(target, [
    { opacity: 0, clipPath: "inset(0 0 100% 0)", translate: "0 96px", scale: "0.68 1.16", filter: "blur(9px)" },
    { opacity: 1, clipPath: "inset(0 0 0% 0)", translate: "0 0", scale: "1 1", filter: "blur(0px)" },
  ], { duration: 1450, easing: ease });
}

function revealCard(target: RevealTarget, index: number) {
  const isRight = target.classList.contains("is-right");
  return play(target, [
    {
      opacity: 0,
      clipPath: "inset(0 0 100% 0)",
      translate: `${isRight ? 68 : -68}px 108px`,
      scale: "0.91 0.97",
      filter: "blur(7px) saturate(.65)",
    },
    {
      opacity: 1,
      clipPath: "inset(0 0 0% 0)",
      translate: "0 0",
      scale: "1 1",
      filter: "blur(0px) saturate(1)",
    },
  ], { duration: 1150, delay: index * 150, easing: ease });
}

function revealImage(target: RevealTarget) {
  return play(target, [
    { opacity: 0.58, scale: 1.18, translate: "0 34px" },
    { opacity: 1, scale: 1.035, translate: "0 0" },
  ], { duration: 1450, easing: ease });
}

export default function PortfolioMotion() {
  useEffect(() => {
    const root = document.documentElement;
    delete root.dataset.openingComplete;
    const animations: Animation[] = [];
    const timers: number[] = [];
    let raf = 0;

    root.classList.add("motion-enhanced");

    const workImages = Array.from(document.querySelectorAll<RevealTarget>(".work-card > img"));

    const heroCopy = document.querySelector<RevealTarget>(".hero-copy");
    const portrait = document.querySelector<RevealTarget>(".hero-portrait-card");
    const marquee = document.querySelector<RevealTarget>(".hero-project-marquee");
    const outline = document.querySelector<RevealTarget>(".outline-word");
    const opening = document.querySelector<RevealTarget>("[data-motion-opening]");
    let heroAnimationsStarted = false;
    const startHeroAnimations = () => {
      if (heroAnimationsStarted) return;
      heroAnimationsStarted = true;
      [
        play(heroCopy, [
          { opacity: 0, translate: "0 72px", scale: "0.86 1.08", filter: "blur(10px)" },
          { opacity: 1, translate: "0 0", scale: "1 1", filter: "blur(0px)" },
        ], { duration: 1450, delay: 0, easing: ease }),
        play(outline, [
          { opacity: 0, scale: "0.9 1", translate: "40px 0" },
          { opacity: 1, scale: "1 1", translate: "0 0" },
        ], { duration: 1550, delay: 480, easing: ease }),
      ].forEach((animation) => { if (animation) animations.push(animation); });
    };
    const finishOpening = () => {
      startHeroAnimations();
      document.documentElement.dataset.openingComplete = "true";
      window.dispatchEvent(new Event("portfolio:opening-complete"));
      if (opening) opening.style.display = "none";
        [heroCopy, portrait, outline, marquee]
        .filter((element): element is RevealTarget => element instanceof HTMLElement)
        .forEach((element) => {
          element.style.opacity = "1";
          // The portrait uses 3D depth on hover; an ancestor clip-path would
          // crop the translated image and its education tag during interaction.
          element.style.clipPath = element === portrait ? "none" : "inset(0 0 0% 0)";
          element.style.translate = "0 0";
          element.style.scale = "1 1";
          element.style.filter = "none";
        });
    };
    window.addEventListener("portfolio:count-complete", finishOpening, { once: true });

    timers.push(window.setTimeout(finishOpening, 6500));

    const revealGroup = (heading: RevealTarget) => {
      if (heading.dataset.motionRevealed === "true") return;
      heading.dataset.motionRevealed = "true";
      heading.dataset.motionVisible = "true";
      heading.classList.add("is-motion-visible");
      const title = heading.querySelector<RevealTarget>(".experience-title");
      const titleAnimation = title && revealTitle(title);
      if (titleAnimation) animations.push(titleAnimation);

      const adjacentGroup = heading.nextElementSibling?.classList.contains("experience-group")
        ? heading.nextElementSibling
        : null;
      const section = heading.closest("section, footer");
      const cards = adjacentGroup
        ? []
        : Array.from(section?.querySelectorAll<RevealTarget>(".work-card, .ability-card") ?? []);
      const delay = adjacentGroup ? 420 : 520;
      const timer = window.setTimeout(() => {
        cards.forEach((card, index) => {
          card.dataset.motionVisible = "true";
          card.classList.add("is-motion-visible");
          const animation = revealCard(card, index);
          if (animation) animations.push(animation);
          const image = card.classList.contains("work-card")
            ? card.querySelector<RevealTarget>(":scope > img")
            : null;
          if (image) {
            image.style.setProperty("--motion-image-scale", "1.035");
            const imageAnimation = revealImage(image);
            if (imageAnimation) animations.push(imageAnimation);
          }
        });
      }, delay);
      timers.push(timer);
    };

    const headingObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) revealGroup(entry.target as RevealTarget);
      });
    }, { threshold: 0.18, rootMargin: "0px 0px -10%" });
    document.querySelectorAll<RevealTarget>(".experience-heading").forEach((heading) => headingObserver.observe(heading));

    const timelineCleanups: Array<() => void> = [];
    document.querySelectorAll<RevealTarget>(".experience-scroll").forEach((scrollRoot) => {
      let timelineRaf = 0;
      const revealVisibleRows = () => {
        timelineRaf = 0;
        const rootRect = scrollRoot.getBoundingClientRect();
        const visibleTop = Math.max(0, rootRect.top);
        const visibleBottom = Math.min(window.innerHeight, rootRect.bottom);
        if (visibleBottom <= visibleTop) return;
        scrollRoot.querySelectorAll<RevealTarget>(".experience-row").forEach((row) => {
          if (row.dataset.motionRevealed === "true") return;
          const rowRect = row.getBoundingClientRect();
          const overlap = Math.min(rowRect.bottom, visibleBottom) - Math.max(rowRect.top, visibleTop);
          if (overlap < Math.min(180, rowRect.height * 0.32)) return;
          row.dataset.motionRevealed = "true";
          const group = row.closest(".experience-group");
          const isFirst = group?.querySelector(".experience-row") === row;
          const timer = window.setTimeout(() => {
            row.dataset.motionVisible = "true";
            row.classList.add("is-motion-visible");
            const animation = revealCard(row, 0);
            if (animation) animations.push(animation);
          }, isFirst ? 520 : 80);
          timers.push(timer);
        });
      };
      const scheduleTimeline = () => {
        if (!timelineRaf) timelineRaf = requestAnimationFrame(revealVisibleRows);
      };
      scrollRoot.addEventListener("scroll", scheduleTimeline, { passive: true });
      window.addEventListener("scroll", scheduleTimeline, { passive: true });
      window.addEventListener("resize", scheduleTimeline, { passive: true });
      scheduleTimeline();
      timelineCleanups.push(() => {
        scrollRoot.removeEventListener("scroll", scheduleTimeline);
        window.removeEventListener("scroll", scheduleTimeline);
        window.removeEventListener("resize", scheduleTimeline);
        if (timelineRaf) cancelAnimationFrame(timelineRaf);
      });
    });

    const contactObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        [".contact-copy", ".contact-card", ".contact-bottom"].forEach((selector, index) => {
          const target = document.querySelector<RevealTarget>(selector);
          if (!target || target.dataset.motionRevealed === "true") return;
          target.dataset.motionRevealed = "true";
          target.dataset.motionVisible = "true";
          target.classList.add("is-motion-visible");
          const animation = play(target, index === 0
            ? [
              // Keep the small contact label readable throughout the reveal;
              // clipping the entire copy block cuts that label mid-glyph.
              { opacity: 0, translate: "-44px 54px", filter: "blur(5px)" },
              { opacity: 1, translate: "0 0", filter: "blur(0px)" },
            ]
            : [
              { opacity: 0, clipPath: "inset(0 0 100% 0)", translate: `${index === 1 ? 44 : -44}px 54px`, filter: "blur(5px)" },
              { opacity: 1, clipPath: "inset(0 0 0% 0)", translate: "0 0", filter: "blur(0px)" },
            ], { duration: 1050, delay: index * 150, easing: ease });
          if (animation) animations.push(animation);
        });
      });
    }, { threshold: 0.1 });
    const contact = document.querySelector<RevealTarget>("#contact");
    if (contact) contactObserver.observe(contact);

    const updateParallax = () => {
      raf = 0;
      const viewport = window.innerHeight;
      workImages.forEach((image) => {
        const card = image.closest<HTMLElement>(".work-card");
        if (!card) return;
        const rect = card.getBoundingClientRect();
        if (rect.bottom < -80 || rect.top > viewport + 80) return;
        const offset = ((rect.top + rect.height / 2) - viewport / 2) * -0.018;
        image.style.setProperty("--motion-parallax", `${Math.max(-10, Math.min(10, offset))}px`);
      });
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(updateParallax); };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    updateParallax();

    return () => {
      headingObserver.disconnect();
      timelineCleanups.forEach((cleanup) => cleanup());
      contactObserver.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
      timers.forEach(window.clearTimeout);
      animations.forEach((animation) => animation.cancel());
      window.removeEventListener("portfolio:count-complete", finishOpening);
      root.classList.remove("motion-enhanced", "motion-reduced");
    };
  }, []);

  return (
    <div className="portfolio-opening" data-motion-opening aria-hidden="true">
      <CountUp from={0} to={100} duration={2.8} className="portfolio-opening-count" />
    </div>
  );
}
