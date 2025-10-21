"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Menu, X, BookText, Github } from "lucide-react";
import Image from "next/image";

import { RoleSwitcher } from "@/components/layout/RoleSwitcher";

type HeaderProps = {
  showDashboardControls?: boolean;
};

function HeaderDashboardControls({ variant }: { variant: "desktop" | "mobile" }) {
  const connectButton = (
    <ConnectButton.Custom>
      {({ account, openAccountModal, openConnectModal, mounted }) => {
        const ready = mounted;
        const connected = ready && account;

        if (!connected) {
          return (
            <button
              type="button"
              onClick={openConnectModal}
              className="inline-flex items-center gap-2 rounded-md border border-primary bg-primary px-4 py-2 text-xs font-semibold uppercase tracking-widest text-foundation-black transition-colors hover:bg-secondary hover:text-foundation-black"
            >
              Connect Wallet
            </button>
          );
        }

        return (
          <button
            type="button"
            onClick={openAccountModal}
            className="inline-flex items-center gap-2 rounded-md border border-primary bg-transparent px-4 py-2 text-xs font-semibold uppercase tracking-widest text-primary transition-colors hover:bg-primary/10"
          >
            {account.displayName}
          </button>
        );
      }}
    </ConnectButton.Custom>
  );

  if (variant === "desktop") {
    return (
      <div className="hidden items-center gap-4 md:flex">
        <RoleSwitcher />
        {connectButton}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 border-t border-bronze/60 pt-4">
      <RoleSwitcher />
      {connectButton}
    </div>
  );
}

export function Header({ showDashboardControls }: HeaderProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isDashboardRoute = pathname?.startsWith("/dashboard") ?? false;
  const explicitProp = typeof showDashboardControls === "boolean";
  const shouldShowDashboardControls = explicitProp
    ? showDashboardControls
    : isDashboardRoute;

  if (isDashboardRoute && !explicitProp) {
    return null;
  }

  const closeMenu = () => setOpen(false);

  return (
    <header className="sticky top-0 z-40 border-b border-bronze bg-foundation-black/75 backdrop-blur-lg">
      <div className="flex items-center justify-between gap-6 px-8 py-4">
        <Link
          href="/"
          className="flex items-center gap-2 text-lg font-semibold text-primary transition-colors hover:text-secondary"
          onClick={closeMenu}
        >
          <Image src="/favicon.png" alt="Aurum icon" width={28} height={28} className="h-7 w-7" />
          <span className="hidden sm:inline">Aurum</span>
        </Link>

        {!shouldShowDashboardControls ? (
          <nav className="hidden items-center gap-6 text-sm text-text-muted md:ml-auto md:flex">
            <a
              href="https://github.com/tanya/aurum/blob/main/aurum.md"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 transition-colors hover:text-text-primary"
            >
              <BookText size={16} />
              Docs
            </a>
            <a
              href="https://github.com/tanya/aurum"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 transition-colors hover:text-text-primary"
            >
              <Github size={16} />
              GitHub
            </a>
          </nav>
        ) : (
          <span className="hidden md:flex md:flex-1" />
        )}

        <div className="flex items-center gap-4">
          {shouldShowDashboardControls ? (
            <HeaderDashboardControls variant="desktop" />
          ) : null}

          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-md border border-bronze/60 text-text-muted transition-colors hover:border-primary hover:text-primary md:hidden"
            onClick={() => setOpen((prev) => !prev)}
            aria-label="Toggle navigation"
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      <div
        className={`md:hidden ${
          open ? "max-h-80 opacity-100" : "pointer-events-none max-h-0 opacity-0"
        } overflow-hidden px-6 transition-all duration-300 ease-in-out`}
      >
        <div className="flex flex-col gap-4 pb-6 text-sm text-text-muted">
          {!shouldShowDashboardControls ? (
            <>
              <a
                href="https://github.com/tanya/aurum/blob/main/aurum.md"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 transition-colors hover:text-text-primary"
                onClick={closeMenu}
              >
                <BookText size={16} />
                Docs
              </a>
              <a
                href="https://github.com/tanya/aurum"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 transition-colors hover:text-text-primary"
                onClick={closeMenu}
              >
                <Github size={16} />
                GitHub
              </a>
            </>
          ) : null}

          {shouldShowDashboardControls ? (
            <HeaderDashboardControls variant="mobile" />
          ) : null}
        </div>
      </div>
    </header>
  );
}
