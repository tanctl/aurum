"use client";

import { toast } from "sonner";

type ToastOptions = {
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  dismissible?: boolean;
};

export function useToast() {
  const success = (title: string, options: ToastOptions = {}) =>
    toast.success(title, {
      description: options.description,
      action:
        options.actionLabel && options.onAction
          ? {
              label: options.actionLabel,
              onClick: options.onAction,
            }
          : undefined,
      dismissible: options.dismissible ?? true,
    });

  const error = (title: string, options: ToastOptions = {}) =>
    toast.error(title, {
      description: options.description,
      action:
        options.actionLabel && options.onAction
          ? {
              label: options.actionLabel,
              onClick: options.onAction,
            }
          : undefined,
      dismissible: options.dismissible ?? true,
    });

  const info = (title: string, options: ToastOptions = {}) =>
    toast.info(title, {
      description: options.description,
      action:
        options.actionLabel && options.onAction
          ? {
              label: options.actionLabel,
              onClick: options.onAction,
            }
          : undefined,
      dismissible: options.dismissible ?? true,
    });

  const loading = (title: string, options: ToastOptions = {}) =>
    toast.loading(title, {
      description: options.description,
      dismissible: options.dismissible ?? false,
    });

  return { success, error, info, loading, dismiss: toast.dismiss };
}
