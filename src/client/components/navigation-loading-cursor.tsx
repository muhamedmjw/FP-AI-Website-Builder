"use client";

import { useCallback, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

const NAVIGATION_CURSOR_TIMEOUT_MS = 15000;

function isInternalNavigationClick(event: MouseEvent): boolean {
  if (event.defaultPrevented || event.button !== 0) {
    return false;
  }

  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return false;
  }

  const target = event.target;
  if (!(target instanceof Element)) {
    return false;
  }

  const anchor = target.closest("a[href]");
  if (!(anchor instanceof HTMLAnchorElement)) {
    return false;
  }

  if ((anchor.target && anchor.target !== "_self") || anchor.hasAttribute("download")) {
    return false;
  }

  const rawHref = anchor.getAttribute("href");
  if (!rawHref || rawHref.startsWith("#")) {
    return false;
  }

  if (rawHref.startsWith("mailto:") || rawHref.startsWith("tel:")) {
    return false;
  }

  const url = new URL(anchor.href, window.location.href);
  if (url.origin !== window.location.origin) {
    return false;
  }

  return !(url.pathname === window.location.pathname && url.search === window.location.search);
}

/**
 * Shows a global loading cursor while an internal navigation is in-flight.
 */
export default function NavigationLoadingCursor() {
  const pathname = usePathname();
  const timeoutIdRef = useRef<number | null>(null);

  const stopLoadingCursor = useCallback(() => {
    if (typeof document === "undefined") {
      return;
    }

    if (timeoutIdRef.current !== null) {
      window.clearTimeout(timeoutIdRef.current);
      timeoutIdRef.current = null;
    }

    document.documentElement.removeAttribute("data-nav-loading");
  }, []);

  const startLoadingCursor = useCallback(() => {
    if (typeof document === "undefined") {
      return;
    }

    document.documentElement.setAttribute("data-nav-loading", "true");

    if (timeoutIdRef.current !== null) {
      window.clearTimeout(timeoutIdRef.current);
    }

    timeoutIdRef.current = window.setTimeout(() => {
      stopLoadingCursor();
    }, NAVIGATION_CURSOR_TIMEOUT_MS);
  }, [stopLoadingCursor]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (isInternalNavigationClick(event)) {
        startLoadingCursor();
      }
    };

    document.addEventListener("click", handleClick, true);

    return () => {
      document.removeEventListener("click", handleClick, true);
      stopLoadingCursor();
    };
  }, [startLoadingCursor, stopLoadingCursor]);

  useEffect(() => {
    stopLoadingCursor();
  }, [pathname, stopLoadingCursor]);

  return null;
}
