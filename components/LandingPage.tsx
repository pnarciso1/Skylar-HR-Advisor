"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { ArrowRight, Building2, Loader2, RefreshCw, BriefcaseBusiness } from "lucide-react";
import { createOrGetClient } from "@/lib/firebase";
import { initClientStorage } from "@/lib/clientStorage";
import { hashIdentifier } from "@/lib/utils";

export default function LandingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Read synchronously to avoid a flash of the wrong view
  const clientParam = searchParams.get("client");
  const pilotClientName = clientParam ? decodeURIComponent(clientParam) : null;

  const [identifier, setIdentifier] = useState("");
  const [loading, setLoading] = useState(false);
  const [autoLoading, setAutoLoading] = useState(!!pilotClientName);
  const [error, setError] = useState<string | null>(null);
  const [logoError, setLogoError] = useState(false);

  function initPilot(name: string) {
    setAutoLoading(true);
    setError(null);
    try {
      // Use a stable local hash immediately — no async wait before navigating
      const clientId = hashIdentifier(name);
      initClientStorage(clientId, name);
      // Sync to Firestore in the background using the same clientId
      void createOrGetClient(clientId, name, true, name).catch(() => undefined);
      router.push("/chat");
    } catch {
      setError("Something went wrong. Please try again.");
      setAutoLoading(false);
    }
  }

  // Auto-initialize pilot clients on mount
  useEffect(() => {
    if (!pilotClientName) return;
    void initPilot(pilotClientName);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pilotClientName]);

  function handleContinue() {
    const trimmed = identifier.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setError(null);

    try {
      // Use a stable local hash immediately — no async wait before navigating
      const clientId = hashIdentifier(trimmed);
      initClientStorage(clientId, trimmed);
      // Sync to Firestore in the background using the same clientId
      void createOrGetClient(clientId, trimmed, false).catch(() => undefined);
      router.push("/chat");
    } catch (err) {
      console.error("[LandingPage] handleContinue error:", err);
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") handleContinue();
  }

  const LogoImage = (
    <div className="rounded-xl overflow-hidden ring-2 ring-white/40 shadow-lg bg-white/10">
      {logoError ? (
        <div className="w-48 h-[72px] flex items-center justify-center gap-2">
          <BriefcaseBusiness className="w-7 h-7 text-white" />
          <span className="text-white font-bold text-lg">Skylar</span>
        </div>
      ) : (
        <Image
          src="/SkylarLogo.jpg"
          alt="Skylar"
          width={240}
          height={91}
          className="object-contain"
          priority
          onError={() => setLogoError(true)}
        />
      )}
    </div>
  );

  // ─── Pilot client view ──────────────────────────────────────────────────────
  if (pilotClientName) {
    return (
      <div className="h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md text-center overflow-hidden">
          <div className="bg-gradient-to-br from-blue-600 to-indigo-600 px-8 py-8">
            <div className="flex justify-center mb-4">{LogoImage}</div>
            <h1 className="text-2xl font-bold text-white">
              Welcome, {pilotClientName}!
            </h1>
            <p className="text-blue-100 text-sm mt-1">
              Your Skylar HR workspace is ready.
            </p>
          </div>

          <div className="px-8 py-8">
            {autoLoading ? (
              <div className="flex flex-col items-center gap-3 py-2">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                <p className="text-gray-500 text-sm">Setting up your workspace…</p>
              </div>
            ) : (
              <>
                {error && (
                  <p className="text-red-500 text-sm mb-4 bg-red-50 rounded-lg px-3 py-2">
                    {error}
                  </p>
                )}
                <button
                  onClick={() => void initPilot(pilotClientName)}
                  className="w-full flex items-center justify-center gap-2 px-8 py-4 bg-blue-600 text-white rounded-lg font-semibold text-base hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-lg shadow-blue-600/25"
                >
                  {error ? (
                    <>
                      <RefreshCw className="w-5 h-5" />
                      Try Again
                    </>
                  ) : (
                    <>
                      Start Conversation
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ─── Standard input flow ────────────────────────────────────────────────────
  return (
    <div className="h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-600 px-8 py-8 text-center">
          <div className="flex justify-center mb-4">{LogoImage}</div>
          <h1 className="text-2xl font-bold text-white">Skylar HR Assistant</h1>
          <p className="text-blue-100 text-sm mt-1">
            Get instant HR guidance for California employers
          </p>
        </div>

        {/* Form */}
        <div className="px-8 py-8 space-y-5">
          <div>
            <label
              htmlFor="identifier"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Before we begin, what&apos;s your company name or email?
            </label>
            <div className="relative">
              <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              <input
                id="identifier"
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Company name or email"
                autoFocus
                className="w-full h-16 pl-12 pr-4 rounded-lg border-2 border-gray-200 shadow-md text-gray-900 placeholder:text-gray-400 text-base focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
              />
            </div>
            <p className="text-xs text-gray-400 mt-2">
              This helps us track your conversations and won&apos;t be shared.
            </p>
          </div>

          {error && (
            <p className="text-red-500 text-sm bg-red-50 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            onClick={handleContinue}
            disabled={!identifier.trim() || loading}
            className="w-full flex items-center justify-center gap-2 px-8 py-4 bg-blue-600 text-white rounded-lg font-semibold text-base hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-blue-600/25"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Setting up…
              </>
            ) : (
              <>
                Continue
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>

          <p className="text-center text-xs text-gray-400">
            For HR guidance purposes only — not legal advice
          </p>
        </div>
      </div>
    </div>
  );
}
