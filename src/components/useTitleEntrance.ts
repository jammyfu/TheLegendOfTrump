import { useLayoutEffect, type RefObject } from "react";
import { gsap } from "gsap";

/** One finite entrance per mount; CSS retains ownership of idle motion/parallax. */
export function useTitleEntrance(surface: RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    const root = surface.current;
    if (!root) return;
    const media = gsap.matchMedia();
    media.add(
      {
        animate: "(prefers-reduced-motion: no-preference)",
        reduce: "(prefers-reduced-motion: reduce)",
      },
      (context) => {
        if (context.conditions?.reduce) {
          root.dataset.introState = "ready";
          return;
        }
        let active = true;
        root.dataset.introState = "entering";
        const timeline = gsap.timeline({
          paused: true,
          defaults: { ease: "power3.out" },
          onComplete: () => {
            root.dataset.introState = "ready";
          },
        });
        timeline
          .from(".lt-frame, .lt-light", { opacity: 0, duration: 1.2 }, 0)
          .from(
            ".lt-sword img",
            { opacity: 0, y: -65, rotation: -8, duration: 1.05 },
            0.08,
          )
          .from(
            ".lt-shield img",
            { opacity: 0, x: -30, y: 12, scale: 0.9, duration: 1.1 },
            0.18,
          )
          .from(
            ".lt-logo-art img",
            { opacity: 0, y: 20, scale: 0.96, duration: 1.15 },
            0.3,
          )
          .from(".lt-overline", { opacity: 0, y: -8, duration: 0.7 }, 0.5)
          .from(
            ".lt-menu > button",
            { opacity: 0.2, y: 16, duration: 0.65, stagger: 0.12 },
            0.7,
          )
          .from(
            ".lt-footer > button",
            { opacity: 0.2, y: 8, duration: 0.6, stagger: 0.08 },
            0.9,
          )
          .set(
            ".lt-frame, .lt-light, .lt-sword img, .lt-shield img, .lt-logo-art img, .lt-overline, .lt-menu > button, .lt-footer > button",
            { clearProps: "opacity,transform" },
          );
        const play = () => {
          if (active) timeline.play();
        };
        // Let the artwork decode first, with a bounded wait for slow or missing images.
        const timer = window.setTimeout(play, 1200);
        Promise.all(
          Array.from(root.querySelectorAll("img"), (img) =>
            img.decode().catch(() => {}),
          ),
        ).then(() => {
          if (active) {
            window.clearTimeout(timer);
            play();
          }
        });
        return () => {
          active = false;
          window.clearTimeout(timer);
        };
      },
      root,
    );
    return () => {
      media.revert();
      delete root.dataset.introState;
    };
  }, [surface]);
}
