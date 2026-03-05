import React, { useEffect } from "react";
import { AlertTriangle, X } from "lucide-react";

export default function ConfirmModal({
  open,
  title = "Confirmar acción",
  message = "",
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  danger = false,
  onConfirm,
  onCancel,
}) {
  useEffect(() => {
    const onKey = (e) => {
      if (!open) return;
      if (e.key === "Escape") onCancel?.();
      if (e.key === "Enter") onConfirm?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel, onConfirm]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[210] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm px-4">
      <div
        className={`w-full max-w-md rounded-2xl bg-white shadow-2xl ring-1 ${
          danger ? "ring-red-200" : "ring-slate-200"
        }`}
        role="dialog"
        aria-modal="true"
      >
        <div className={`flex items-start gap-3 p-5 rounded-t-2xl ${danger ? "bg-red-50" : "bg-slate-50"}`}>
          <AlertTriangle className={`h-6 w-6 flex-shrink-0 ${danger ? "text-red-600" : "text-slate-600"}`} />

          <div className="min-w-0 flex-1">
            <p className={`font-black ${danger ? "text-red-800" : "text-slate-800"}`}>{title}</p>
            {message ? (
              <p className="mt-1 text-sm text-slate-600 break-words">{message}</p>
            ) : null}
          </div>

          <button
            onClick={onCancel}
            className="rounded-lg p-1 text-slate-400 hover:text-slate-700 hover:bg-white/60"
            aria-label="Cerrar"
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex justify-end gap-2 p-4">
          <button
            onClick={onCancel}
            className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-bold text-slate-800 hover:bg-slate-200"
            type="button"
          >
            {cancelText}
          </button>

          <button
            onClick={onConfirm}
            className={`rounded-lg px-4 py-2 text-sm font-bold text-white ${
              danger ? "bg-red-600 hover:bg-red-700" : "bg-slate-900 hover:bg-slate-800"
            }`}
            type="button"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}