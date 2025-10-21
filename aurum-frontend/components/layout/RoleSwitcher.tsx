"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const roles = [
  {
    label: "Merchant",
    href: "/dashboard/merchant",
    key: "merchant",
  },
  {
    label: "Subscriber",
    href: "/dashboard/subscriber",
    key: "subscriber",
  },
];

export function RoleSwitcher() {
  const pathname = usePathname();

  return (
    <div
      className="inline-flex items-center gap-2 rounded-md border border-bronze/60 bg-carbon/70 px-3 py-1 text-xs text-text-muted"
      title="Switch between Merchant and Subscriber dashboards"
    >
      {roles.map((role) => {
        const isActive = pathname?.startsWith(`/dashboard/${role.key}`);
        return (
          <Link
            key={role.key}
            href={role.href}
            className={`rounded-md px-3 py-1 transition-colors ${
              isActive
                ? "bg-primary text-foundation-black"
                : "text-text-muted hover:text-text-primary"
            }`}
          >
            {role.label}
          </Link>
        );
      })}
    </div>
  );
}
