"use client";

import { useState } from "react";
import { Button } from "@heroui/react";

interface AlertDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm?: () => void;
  cancelLabel?: string;
  showCancel?: boolean;
}

export function AlertDialog({
  open,
  onClose,
  title,
  message,
  confirmLabel = "确定",
  onConfirm,
  cancelLabel = "取消",
  showCancel = false,
}: AlertDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 dark:bg-neutral-900">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="mt-2 text-sm opacity-80">{message}</p>
        <div className="mt-4 flex justify-end gap-2">
          {showCancel && (
            <Button variant="ghost" onPress={onClose}>
              {cancelLabel}
            </Button>
          )}
          <Button
            variant="primary"
            onPress={() => {
              onConfirm?.();
              onClose();
            }}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function useAlertDialog() {
  const [dialog, setDialog] = useState<{
    open: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    onConfirm?: () => void;
    showCancel?: boolean;
  }>({ open: false, title: "", message: "" });

  function showAlert(title: string, message: string) {
    setDialog({ open: true, title, message });
  }

  function showConfirm(
    title: string,
    message: string,
    onConfirm: () => void,
    confirmLabel?: string,
  ) {
    setDialog({
      open: true,
      title,
      message,
      onConfirm,
      confirmLabel,
      showCancel: true,
    });
  }

  function closeDialog() {
    setDialog((prev) => ({ ...prev, open: false }));
  }

  return {
    dialog,
    showAlert,
    showConfirm,
    closeDialog,
  };
}
