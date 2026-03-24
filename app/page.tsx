import { Suspense } from "react";
import LandingPage from "@/components/LandingPage";

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="h-screen bg-gradient-to-br from-blue-50 to-indigo-100" />
      }
    >
      <LandingPage />
    </Suspense>
  );
}
