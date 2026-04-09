"use client";

import { useState, useEffect, useCallback } from "react";

interface CountdownResult {
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
  formatted: string;
  isExpired: boolean;
}

/**
 * Hook to manage a countdown timer.
 * 
 * @param targetTimestamp - The target timestamp to count down to (in milliseconds)
 * @returns Countdown state with hours, minutes, seconds, formatted string, and expiry status
 */
export function useCountdown(targetTimestamp: number | null): CountdownResult {
  const calculateTimeLeft = useCallback((): CountdownResult => {
    if (!targetTimestamp) {
      return {
        hours: 0,
        minutes: 0,
        seconds: 0,
        totalMs: 0,
        formatted: "00:00:00",
        isExpired: true,
      };
    }

    const now = Date.now();
    const difference = targetTimestamp - now;

    if (difference <= 0) {
      return {
        hours: 0,
        minutes: 0,
        seconds: 0,
        totalMs: 0,
        formatted: "00:00:00",
        isExpired: true,
      };
    }

    const hours = Math.floor(difference / (1000 * 60 * 60));
    const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((difference % (1000 * 60)) / 1000);

    const pad = (n: number) => n.toString().padStart(2, "0");
    const formatted = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;

    return {
      hours,
      minutes,
      seconds,
      totalMs: difference,
      formatted,
      isExpired: false,
    };
  }, [targetTimestamp]);

  const [timeLeft, setTimeLeft] = useState<CountdownResult>(() => calculateTimeLeft());

  useEffect(() => {
    // Update every second
    const timer = setInterval(() => {
      const updated = calculateTimeLeft();
      setTimeLeft(updated);

      // Stop the interval if expired
      if (updated.isExpired) {
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [calculateTimeLeft]);

  return timeLeft;
}

/**
 * Format a countdown for display with localized text
 */
export function formatCountdown(
  hours: number,
  minutes: number,
  seconds: number,
  language: "en" | "ar" | "ku" = "en"
): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  
  // Always include seconds in the countdown
  if (hours > 0) {
    // Show hours, minutes and seconds
    if (language === "ar") {
      return `${hours} ساعة ${minutes} دقيقة ${seconds} ثانية`;
    } else if (language === "ku") {
      return `${hours} کاتژمێر ${minutes} خولەک ${seconds} چرکە`;
    }
    return `${hours}h ${minutes}m ${seconds}s`;
  } else if (minutes > 0) {
    // Show minutes and seconds
    if (language === "ar") {
      return `${minutes} دقيقة ${seconds} ثانية`;
    } else if (language === "ku") {
      return `${minutes} خولەک ${seconds} چرکە`;
    }
    return `${minutes}m ${seconds}s`;
  } else {
    // Show only seconds
    if (language === "ar") {
      return `${seconds} ثانية`;
    } else if (language === "ku") {
      return `${seconds} چرکە`;
    }
    return `${seconds}s`;
  }
}
