import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronUp } from "lucide-react";
import "./BackToTop.css";

const SCROLL_THRESHOLD = 350;

export default function BackToTop() {
  const [isVisible, setIsVisible] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);
  const [isPulsing, setIsPulsing] = useState(false);
  const isScrollingToTopRef = useRef(false);
  const lastScrollYRef = useRef(0);

  const checkVisibility = useCallback(() => {
    const scrollY = window.scrollY || document.documentElement.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight;
    const clientHeight = document.documentElement.clientHeight;
    const isScrollable = scrollHeight - clientHeight > 150;

    if (isScrollable && scrollY > SCROLL_THRESHOLD) {
      setIsVisible(true);
    } else if (!isScrollingToTopRef.current) {
      setIsVisible(false);
    }

    if (isScrollingToTopRef.current) {
      if (scrollY <= 3) {
        isScrollingToTopRef.current = false;
        setIsScrolling(false);
        setIsVisible(false);
        setIsPulsing(true);
        window.setTimeout(() => setIsPulsing(false), 750);
      } else if (scrollY > lastScrollYRef.current && scrollY > 20) {
        isScrollingToTopRef.current = false;
        setIsScrolling(false);
      }
    }

    lastScrollYRef.current = scrollY;
  }, []);

  useEffect(() => {
    let isTicking = false;

    const handleScroll = () => {
      if (!isTicking) {
        window.requestAnimationFrame(() => {
          checkVisibility();
          isTicking = false;
        });
        isTicking = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll, { passive: true });
    checkVisibility();

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, [checkVisibility]);

  const handleClick = () => {
    if (isScrollingToTopRef.current) return;

    isScrollingToTopRef.current = true;
    setIsScrolling(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <button
      id="back-to-top-btn"
      className={[
        "back-to-top",
        isVisible && "visible",
        isScrolling && "scrolling",
        isPulsing && "pulse",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label="Back to top"
      title="Back to top"
      type="button"
      onClick={handleClick}
    >
      <span className="back-to-top-icon">
        <ChevronUp aria-hidden="true" />
      </span>
    </button>
  );
}
