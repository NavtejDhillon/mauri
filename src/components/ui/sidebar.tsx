"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useOnlineStatus } from "@/hooks/use-online-status";
import {
  IconHome,
  IconUsers,
  IconCalendar,
  IconDollar,
  IconSettings,
  IconSparkles,
} from "./icons";

const navItems = [
  { href: "/dashboard", label: "Dashboard", Icon: IconHome },
  { href: "/clients", label: "Clients", Icon: IconUsers },
  { href: "/calendar", label: "Calendar", Icon: IconCalendar },
  { href: "/claims", label: "Claims", Icon: IconDollar },
  { href: "/settings", label: "Settings", Icon: IconSettings },
];

export function Sidebar() {
  const pathname = usePathname();
  const isOnline = useOnlineStatus();

  return (
    <>
      {/* Desktop sidebar — hidden on mobile */}
      <aside className="fixed left-0 top-0 bottom-0 w-60 bg-white border-r border-warm-200 flex-col hidden md:flex z-40">
        <div className="p-4 flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 bg-sage-600 rounded-[10px]">
            <span className="text-white text-lg font-bold">M</span>
          </div>
          <span className="text-base font-semibold text-sage-900">Mauri</span>
        </div>

        <nav className="flex-1 px-3 py-2 space-y-0.5">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              pathname.startsWith(item.href + "/");
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
                <item.Icon size={20} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="px-3 pb-2">
          <button className="flex items-center gap-3 w-full px-3 py-2 text-sm text-plum-600 rounded-[10px] hover:bg-plum-50 transition-colors duration-150">
            <IconSparkles size={20} />
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

      {/* Mobile bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-warm-200 flex md:hidden z-50 pb-[env(safe-area-inset-bottom)]">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 min-h-[56px] transition-colors duration-150 active:scale-95 ${
                isActive ? "text-sage-600" : "text-warm-400"
              }`}
            >
              <item.Icon size={22} />
              <span className="text-[10px] font-medium leading-tight">
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
