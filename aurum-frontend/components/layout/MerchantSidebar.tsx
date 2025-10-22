
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Plus, BarChart3, ShieldCheck } from "lucide-react";

const navItems = [
  {
    label: "Overview",
    href: "/dashboard/merchant",
    icon: LayoutDashboard,
  },
  {
    label: "Create",
    href: "/dashboard/merchant/create",
    icon: Plus,
  },
  {
    label: "Analytics",
    href: "/dashboard/merchant/analytics",
    icon: BarChart3,
  },
  {
    label: "Verify",
    href: "/dashboard/merchant/verify",
    icon: ShieldCheck,
  },
];

export function MerchantSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-56 min-h-screen flex-col border-r border-bronze/60 bg-carbon/70 lg:flex">
      <div className="px-4 pt-8 pb-4 text-[10px] uppercase tracking-[0.2em] text-[#8B92A8]">
        Application
      </div>
      <nav className="flex flex-1 flex-col gap-1 px-4 pb-8">
        {navItems.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm ${
                active
                  ? "bg-[#c9a961]/70 text-text-primary"
                  : "text-text-primary"
              }`}
            >
              <Icon size={16} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
