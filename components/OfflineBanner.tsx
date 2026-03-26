"use client";

import { useState, useEffect } from "react";
import { WifiOff, Wifi } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Sticky banner that appears when the browser loses internet connectivity
 * and fades out when the connection is restored.
 */
export default function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(true);
  const [wasOffline, setWasOffline] = useState(false);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    // Read initial state after mount (navigator is browser-only)
    setIsOnline(navigator.onLine);

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
      setShowReconnected(false);
    };

    const handleOnline = () => {
      setIsOnline(true);
      if (wasOffline) {
        setShowReconnected(true);
        // Hide the "reconnected" message after 3 seconds
        setTimeout(() => setShowReconnected(false), 3000);
      }
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, [wasOffline]);

  if (isOnline && !showReconnected) return null;

  return (
    <div
      role="alert"
      aria-live="polite"
      className={cn(
        "flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition-all",
        isOnline
          ? "bg-green-500 text-white"
          : "bg-slate-800 text-white"
      )}
    >
      {isOnline ? (
        <>
          <Wifi className="w-4 h-4 shrink-0" />
          Back online — your messages will sync automatically.
        </>
      ) : (
        <>
          <WifiOff className="w-4 h-4 shrink-0" />
          No internet connection. Messages are saved locally and will sync when you&apos;re back online.
        </>
      )}
    </div>
  );
}
