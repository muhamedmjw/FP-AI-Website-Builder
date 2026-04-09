import { useEffect, useState } from "react";

export function useElapsedSeconds(active: boolean): number {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (!active) {
      return;
    }

    let seconds = 0;
    const resetTimeoutId = window.setTimeout(() => {
      setElapsedSeconds(0);
    }, 0);

    const interval = window.setInterval(() => {
      seconds += 1;
      setElapsedSeconds(seconds);
    }, 1000);

    return () => {
      window.clearTimeout(resetTimeoutId);
      window.clearInterval(interval);
    };
  }, [active]);

  if (!active) {
    return 0;
  }

  return elapsedSeconds;
}
