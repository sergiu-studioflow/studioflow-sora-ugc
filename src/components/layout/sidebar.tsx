"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Sparkles, Users, UserCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { name: "Studio", href: "/studio", icon: Sparkles },
  { name: "Sora Characters", href: "/characters", icon: Users },
  { name: "Personas", href: "/personas", icon: UserCircle },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-full w-[220px] shrink-0 flex-col border-r border-border bg-[#0d0d0d]">
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 py-4 border-b border-white/5">
        <Image
          src="/studioflow-logo.png"
          alt="StudioFlow"
          width={24}
          height={24}
          className="rounded"
        />
        <span className="text-xs font-semibold text-white">AI UGC Studio</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-3 space-y-0.5">
        {NAV_ITEMS.map(({ name, href, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-xs font-medium transition-colors",
                isActive
                  ? "bg-white/10 text-white"
                  : "text-white/50 hover:text-white/80 hover:bg-white/5"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {name}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
