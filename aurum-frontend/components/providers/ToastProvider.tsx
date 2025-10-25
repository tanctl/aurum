"use client";

import type { ReactNode } from "react";
import { Toaster } from "sonner";

type ToastProviderProps = {
  children: ReactNode;
};

export function ToastProvider({ children }: ToastProviderProps) {
  return (
    <>
      {children}
      <Toaster
        richColors
        position="top-right"
        expand
        toastOptions={{
          duration: 5000,
        }}
      />
    </>
  );
}
