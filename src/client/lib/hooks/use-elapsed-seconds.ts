import { useEffect, useState } from "react";

export function useElapsedSeconds(active: boolean): number {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (!active) {
      setElapsedSeconds(0);
      return;
    }

    setElapsedSeconds(0);
    const startedAt = Date.now();

    const interval = setInterval(() => {
      const nextSeconds = Math.floor((Date.now() - startedAt) / 1000);
      setElapsedSeconds(nextSeconds);
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [active]);

  return elapsedSeconds;
}
