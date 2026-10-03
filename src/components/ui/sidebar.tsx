"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconHome, IconUsers, IconCalendar, IconSettings } from "./icons";

const navItems = [
  { href: "/dashboard", label: "Dashboard", Icon: IconHome },
  { href: "/clients", label: "Clients", Icon: IconUsers },
  { href: "/cover", label: "Cover", Icon: IconCalendar },
  { href: "/settings", label: "Settings", Icon: IconSettings },
];

export function Sidebar() {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  // Only one of the two navigations is displayed at a time (by screen width), so assistive
  // technology only ever finds one. Each link is named by its visible label; icons are hidden.
  return (
    <>
      {/* Desktop sidebar, hidden on mobile */}
      <aside className="fixed left-0 top-0 bottom-0 w-60 bg-white border-r border-warm-200 flex-col hidden md:flex z-40">
        <div className="p-4 flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 bg-sage-600 rounded-[10px]" aria-hidden>
            <span className="text-white text-lg font-bold">M</span>
          </div>
          <span className="text-base font-semibold text-sage-900">Mauri</span>
        </div>

        <nav aria-label="Main" className="flex-1 px-3 py-2 space-y-0.5">
          {navItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.label}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 min-h-11 px-3 py-2 text-sm rounded-[10px] transition-colors duration-150 ${
                  active ? "bg-sage-50 text-sage-600 font-medium" : "text-warm-600 hover:bg-warm-50 hover:text-warm-800"
                }`}
              >
                <item.Icon size={20} aria-hidden />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Mobile bottom tab bar */}
      <nav aria-label="Main" className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-warm-200 flex md:hidden z-50 pb-[env(safe-area-inset-bottom)]">
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 min-h-[56px] transition-colors duration-150 active:scale-95 ${
                active ? "text-sage-600" : "text-warm-400"
              }`}
            >
              <item.Icon size={22} aria-hidden />
              <span className="text-xs font-medium leading-tight">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
