import React, { useEffect } from "react";
import { CheckCircle2, AlertTriangle, Info, X } from "lucide-react";

const stylesByType = {
  success: {
    icon: CheckCircle2,
    ring: "ring-emerald-200",
    bg: "bg-emerald-50",
    text: "text-emerald-800",
    iconColor: "text-emerald-600",
    title: "Éxito",
  },
  error: {
    icon: AlertTriangle,
    ring: "ring-red-200",
    bg: "bg-red-50",
    text: "text-red-800",
    iconColor: "text-red-600",
    title: "Ocurrió un error",
  },
  info: {
    icon: Info,
    ring: "ring-slate-200",
    bg: "bg-slate-50",
    text: "text-slate-800",
    iconColor: "text-slate-600",
    title: "Información",
  },
  warning: {
    icon: AlertTriangle,
    ring: "ring-amber-200",
    bg: "bg-amber-50",
    text: "text-amber-800",
    iconColor: "text-amber-600",
    title: "Atención",
  },
};

export default function NotificationModal({
  open,
  type = "info",
  title,
  message,
  onClose,
  autoCloseMs = 2500,
}) {
  const cfg = stylesByType[type] || stylesByType.info;
  const Icon = cfg.icon;

  useEffect(() => {
    if (!open) return;
    if (!autoCloseMs) return;

    const t = setTimeout(() => onClose?.(), autoCloseMs);
    return () => clearTimeout(t);
  }, [open, autoCloseMs, onClose]);

  useEffect(() => {
    const onKey = (e) => {
      if (!open) return;
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm px-4">
      <div
        className={`w-full max-w-md rounded-2xl bg-white shadow-2xl ring-1 ${cfg.ring}`}
        role="dialog"
        aria-modal="true"
      >
        <div className={`flex items-start gap-3 p-5 rounded-t-2xl ${cfg.bg}`}>
          <Icon className={`h-6 w-6 ${cfg.iconColor} flex-shrink-0`} />

          <div className="min-w-0 flex-1">
            <p className={`font-black ${cfg.text}`}>
              {title || cfg.title}
            </p>
            {message ? (
              <p className="mt-1 text-sm text-slate-600 break-words">
                {message}
              </p>
            ) : null}
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:text-slate-700 hover:bg-white/60"
            aria-label="Cerrar"
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex justify-end gap-2 p-4">
          <button
            onClick={onClose}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800"
            type="button"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}