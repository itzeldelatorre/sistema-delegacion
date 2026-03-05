import React from "react";
import { FileSpreadsheet, Target } from "lucide-react";

const TitleMainSectionAdmin = ({
    area,
    setArea,
    downloadExcel,
    handleOpenNewOKR,
}) => {
    return (
        <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            {/* Título */}
            <h2 className="text-lg font-bold text-slate-800 md:text-2xl">
                OBJETIVOS DE{" "}
                <span className="ml-1 rounded-md bg-blue-100 px-2 py-0.5 text-lg font-semibold text-blue-700 md:ml-2 md:px-3 md:py-1 md:text-2xl">
                    {area}
                </span>
            </h2>

            {/* Divisor */}
            <div className="my-4 h-px w-full bg-slate-200" />

            {/* Controles (SIEMPRE en fila) */}
            <div className="flex items-center justify-between gap-3">
                {/* Izquierda: Selector */}
                <div className="flex min-w-0 items-center gap-2">
                    <span className="hidden text-sm font-semibold text-slate-600 md:inline">
                        Departamento:
                    </span>

                    <select
                        value={area}
                        onChange={(e) => setArea(e.target.value)}
                        className="min-w-0 max-w-[220px] truncate rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-800 outline-none focus:border-blue-500 md:max-w-[380px]"
                    >
                        <option value="ESTRATEGIA Y GESTION CORPORATIVA">
                            ESTRATEGIA Y GESTION CORPORATIVA
                        </option>
                        <option value="GESTION DE TALENTO">GESTION DE TALENTO</option>
                    </select>
                </div>

                {/* Derecha: Botones */}
                <div className="flex items-center gap-2 md:gap-3">

                    {/* Nuevo objetivo */}
                    <button
                        onClick={handleOpenNewOKR}
                        className="flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 font-bold text-white shadow-sm transition-opacity hover:opacity-90 md:px-4"
                        type="button"
                        aria-label="Nuevo objetivo"
                    >
                        <Target className="h-5 w-5" />
                        <span className="hidden md:inline">Nuevo Objetivo</span>
                    </button>

                    {/* Descargar */}
                    <button
                        onClick={downloadExcel}
                        className="flex items-center gap-2 rounded-xl bg-emerald-500 px-3 py-2 font-bold text-white shadow-sm transition-opacity hover:opacity-90 md:px-4"
                        type="button"
                        aria-label="Descargar reporte"
                    >
                        <FileSpreadsheet className="h-5 w-5" />
                        <span className="hidden md:inline">Descargar Reporte</span>
                    </button>
                </div>
            </div>
        </section>
    );
};

export default TitleMainSectionAdmin;