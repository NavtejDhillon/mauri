"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useOnlineStatus } from "@/hooks/use-online-status";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: "🏠" },
  { href: "/clients", label: "Clients", icon: "👩" },
  { href: "/calendar", label: "Calendar", icon: "📅" },
  { href: "/claims", label: "Claims", icon: "💰" },
  { href: "/settings", label: "Settings", icon: "⚙️" },
];

export function Sidebar() {
  const pathname = usePathname();
  const isOnline = useOnlineStatus();

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-60 bg-white border-r border-warm-200 flex flex-col">
      <div className="p-4 flex items-center gap-3">
        <div className="flex items-center justify-center w-9 h-9 bg-sage-600 rounded-[10px]">
          <span className="text-white text-lg font-bold">M</span>
        </div>
        <span className="text-base font-semibold text-sage-900">Mauri</span>
      </div>

      <nav className="flex-1 px-3 py-2 space-y-0.5">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 text-sm rounded-[10px] transition-colors duration-150 ${
                isActive
                  ? "bg-sage-50 text-sage-600 font-medium"
                  : "text-warm-600 hover:bg-warm-50 hover:text-warm-800"
              }`}
            >
              <span className="text-base">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="px-3 pb-2">
        <button className="flex items-center gap-3 w-full px-3 py-2 text-sm text-plum-600 rounded-[10px] hover:bg-plum-50 transition-colors duration-150">
          <span className="text-base">✨</span>
          <span>Tautoko AI</span>
        </button>
      </div>

      <div className="px-4 py-3 border-t border-warm-200">
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${
              isOnline ? "bg-sage-500" : "bg-coral-400"
            }`}
          />
          <span className="text-xs text-warm-400">
            {isOnline ? "Online" : "Offline"}
          </span>
        </div>
      </div>
    </aside>
  );
}
