"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageSquare, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Header() {
  const pathname = usePathname();

  return (
    <header className="bg-surface border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">S</span>
            </div>
            <span className="text-lg font-semibold text-slate-900">Skylar</span>
            <span className="text-sm text-secondary hidden sm:inline">
              HR Advisor
            </span>
          </Link>

          <nav className="flex items-center gap-1">
            <Link
              href="/chat"
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                pathname === "/chat"
                  ? "bg-primary/10 text-primary"
                  : "text-secondary hover:text-slate-900 hover:bg-slate-100"
              )}
            >
              <MessageSquare className="w-4 h-4" />
              <span>Chat</span>
            </Link>
            <Link
              href="/admin"
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                pathname === "/admin"
                  ? "bg-primary/10 text-primary"
                  : "text-secondary hover:text-slate-900 hover:bg-slate-100"
              )}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Admin</span>
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
