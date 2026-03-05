import React, { useMemo } from 'react';
import { X, Share2, RefreshCcw, Edit2, Trash2, Plus, User, Target, ArrowRight } from "lucide-react";
import useIsLgUp from '../utils/useIsLgUp';

const TablaObjetivos = ({ tasks, empleados, onDelegate, onRemoveDelegation, onAddKR, role, canDelegate, onEdit, onDelete }) => {
  if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
    return (
      <div className="p-10 text-center bg-white rounded-3xl border border-dashed border-slate-300">
        <p className="text-slate-500 font-medium">No hay tareas disponibles en esta área.</p>
      </div>
    );
  }

  // ==========================
  // Helpers / Indexes
  // ==========================
  const norm = (s) => (s ?? '').replace(/\s+/g, ' ').trim();

  // Index por IdRegistro (docId)
  const byId = useMemo(() => {
    const m = new Map();
    tasks.forEach(t => {
      if (t?.IdRegistro) m.set(t.IdRegistro, t);
    });
    return m;
  }, [tasks]);

  // Index por Nombre Tarea (para ubicar KR origen por texto)
  const byName = useMemo(() => {
    const m = new Map();
    tasks.forEach(t => {
      const n = norm(t?.['Nombre Tarea']);
      if (n) m.set(n, t);
    });
    return m;
  }, [tasks]);

  // Index KR.id -> OKR delegado (solo 1)
  const delegatedOKRByKRId = useMemo(() => {
    const m = new Map();
    tasks.forEach(t => {
      if (t?.Tipo === 'OKR' && t?.IdRegistroPadre) {
        // Si hubiera más de uno, el último pisa (pero tú ya lo restringes a 1)
        m.set(t.IdRegistroPadre, t);
      }
    });
    return m;
  }, [tasks]);

  const groupedByOwner = tasks.reduce((acc, curr) => {
    const owner = curr['Correo encargado'];
    if (!owner) return acc;
    if (!acc[owner]) acc[owner] = [];
    acc[owner].push(curr);
    return acc;
  }, {});

  const empleadosByEmail = useMemo(() => {
    const map = new Map();
    empleados?.forEach(emp => {
      if (emp?.CorreoElectronicoCorporativo) {
        map.set(emp.CorreoElectronicoCorporativo, emp);
      }
    });
    return map;
  }, [empleados]);

  // ==========================
  // Estilos de tabla
  // ==========================
  // Columnas numéricas del mismo ancho
  const numCell = "px-2 py-3 text-center text-[11px] font-bold border-r border-slate-50 last:border-r-0 w-16";
  const headerNum = "px-2 py-3 text-center w-16";

  // Columna nombre: más ancha y con wrap
  const nameHeader = "px-4 py-3 w-[320px] min-w-[240px]";
  const nameCell = "px-4 py-3 font-semibold text-slate-700 align-middle w-[320px] min-w-[240px]";

  // Columna delegado: badge + botones
  const delegatedHeader = "px-6 py-3 text-right w-56 min-w-[220px] text-[10px]";
  const delegatedCell = "px-6 py-3 text-right w-56 min-w-[220px] text-[10px]";

  // Columna acciones: editar/eliminar
  const actionsHeader = "px-6 py-3 text-right w-28 min-w-[120px] ";
  const actionsCell = "px-6 py-3 text-right w-28 min-w-[120px]";

  const isLgUp = useIsLgUp();

  return (
  <div className="space-y-12 w-full">
    {Object.entries(groupedByOwner).map(([ownerEmail, userTasks], ownerIdx) => {
      const empleado = empleadosByEmail.get(ownerEmail);
      const puesto = empleado?.Puesto || "Sin Puesto";
      const userHeaders = userTasks.filter(
        (t) =>
          t["Tipo"] === "OKR" ||
          !userTasks.some(
            (parent) => parent["Nombre Tarea"] === t["Objetivo Padre"]
          )
      );

      const UserContent = (
        <div className="grid grid-cols-1 gap-8">
          {userHeaders.map((objetivo, idx) => {
            const isDelegatedOKR = !!objetivo["IdRegistroPadre"];
            const childrenKRs = userTasks.filter(
              (t) =>
                t["Objetivo Padre"] === objetivo["Nombre Tarea"] &&
                t["Tipo"] === "KR"
            );

            const krPadreName = norm(objetivo["KR Padre"]);
            const krOrigenDoc = krPadreName ? byName.get(krPadreName) : null;
            const krOrigenOwner =
              krOrigenDoc?.["Nombre encargado"] || "";

            return (
              <details
                key={idx}
                defaultOpen={isLgUp}
                className="group bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden"
              >
                {/* ===== OKR HEADER ===== */}
                <summary
                  className={`cursor-pointer list-none p-6 border-b border-slate-100 flex flex-wrap gap-4 items-center ${
                    isDelegatedOKR ? "bg-indigo-50/30" : "bg-white"
                  }`}
                >
                  <div
                    className={`${
                      isDelegatedOKR
                        ? "bg-indigo-100 text-indigo-600"
                        : "bg-blue-100 text-blue-600"
                    } p-2.5 rounded-xl`}
                  >
                    <Target className="w-6 h-6" />
                  </div>

                  <div className="flex-1 min-w-[250px]">
                    <div className="flex items-center gap-3 mb-1">
                      <span
                        className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md border ${
                          isDelegatedOKR
                            ? "bg-indigo-100 text-indigo-700 border-indigo-200"
                            : "bg-blue-50 text-blue-700 border-blue-100"
                        }`}
                      >
                        {isDelegatedOKR
                          ? "OKR DELEGADO"
                          : "OBJETIVO DEPARTAMENTAL"}
                      </span>

                      {isDelegatedOKR && (
                        <div className="flex items-center gap-1.5 text-[10px] text-indigo-500 italic">
                          <ArrowRight className="w-3 h-3" />
                          <span>
                            Viene de: {objetivo["KR Padre"]}
                            {krOrigenOwner && (
                              <span className="text-indigo-400">
                                {" "}
                                ({krOrigenOwner})
                              </span>
                            )}
                          </span>
                        </div>
                      )}
                    </div>

                    <h3 className="text-lg font-bold text-slate-900">
                      {objetivo["Nombre Tarea"]}
                    </h3>
                  </div>

                  {/* Acciones OKR */}
                  <div className="ml-auto flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onEdit(objetivo);
                      }}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onDelete(objetivo["IdRegistro"]);
                      }}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <div className="text-slate-400 transition-transform group-open:rotate-180">
                      ▾
                    </div>
                  </div>
                </summary>

                {/* ===== CONTENIDO OKR ===== */}
                {/* TABLA DE KRs */}
                    <div className="p-0 sm:p-4">
                      {childrenKRs.length > 0 ? (
                        <>
                          {/* ======= MOBILE / TABLET (< lg): CARDS ======= */}
                          <div className="space-y-3 lg:hidden">
                            {childrenKRs.map((kr, kIdx) => {
                              const okrDelegado = delegatedOKRByKRId.get(kr.IdRegistro);
                              const delegatedToName = okrDelegado?.["Nombre encargado"] || "";
                              const delegatedToEmail = okrDelegado?.["Correo encargado"] || "";
                              const isAlreadyDelegated = !!okrDelegado;

                              return (
                                <div
                                  key={kIdx}
                                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                                >
                                  {/* KR title */}
                                  <div className="flex items-start gap-3">
                                    <div className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-emerald-500" />
                                    <div className="min-w-0">
                                      <p className="font-semibold text-slate-800">
                                        {kr["Nombre Tarea"]}
                                      </p>
                                    </div>
                                  </div>

                                  {/* Metrics grid */}
                                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                                    <div className="rounded-lg bg-slate-50 p-2">
                                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                        Valor Inicial
                                      </p>
                                      <p className="font-bold text-slate-700">{kr["Valor Inicial"] || "0"}</p>
                                    </div>

                                    <div className="rounded-lg bg-slate-50 p-2">
                                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                        Meta Anual
                                      </p>
                                      <p className="font-black text-blue-700">{kr["Meta Anual"] || "-"}</p>
                                    </div>

                                    <div className="rounded-lg bg-slate-50 p-2">
                                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Q1</p>
                                      <p className="font-bold text-slate-700">{kr["Meta Q1"] || "-"}</p>
                                    </div>
                                    <div className="rounded-lg bg-slate-50 p-2">
                                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Q2</p>
                                      <p className="font-bold text-slate-700">{kr["Meta Q2"] || "-"}</p>
                                    </div>
                                    <div className="rounded-lg bg-slate-50 p-2">
                                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Q3</p>
                                      <p className="font-bold text-slate-700">{kr["Meta Q3"] || "-"}</p>
                                    </div>
                                    <div className="rounded-lg bg-slate-50 p-2">
                                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Q4</p>
                                      <p className="font-bold text-slate-700">{kr["Meta Q4"] || "-"}</p>
                                    </div>

                                    <div className="col-span-2 rounded-lg bg-slate-50 p-2">
                                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                        Delegado
                                      </p>
                                      <p className="font-bold text-slate-700">
                                        {isAlreadyDelegated ? (delegatedToName || delegatedToEmail) : "-"}
                                      </p>
                                    </div>
                                  </div>

                                  {/* Acciones: 3 botones (Delegar/Reasignar, Editar, Eliminar) */}
                                  <div className="mt-3 flex items-center justify-end gap-2">
                                    {(role === "admin" || canDelegate) && (
                                      <button
                                        onClick={() => onDelegate(kr)}
                                        className={`p-1.5 rounded-md transition-colors ${isAlreadyDelegated
                                          ? "text-indigo-600 hover:text-indigo-800"
                                          : "text-slate-400 hover:text-indigo-600"
                                          }`}
                                        title={isAlreadyDelegated ? "Reasignar" : "Delegar"}
                                        aria-label={isAlreadyDelegated ? "Reasignar" : "Delegar"}
                                        type="button"
                                      >
                                        {isAlreadyDelegated ? (
                                          <RefreshCcw className="w-4 h-4" />
                                        ) : (
                                          <Share2 className="w-4 h-4" />
                                        )}
                                      </button>
                                    )}

                                    <button
                                      onClick={() => onEdit(kr)}
                                      className="p-1.5 text-slate-400 hover:text-blue-600 rounded-md transition-colors"
                                      title="Editar"
                                      aria-label="Editar"
                                      type="button"
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </button>

                                    <button
                                      onClick={() => onDelete(kr["IdRegistro"])}
                                      className="p-1.5 text-slate-400 hover:text-red-600 rounded-md transition-colors"
                                      title="Eliminar"
                                      aria-label="Eliminar"
                                      type="button"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>

                                </div>
                              );
                            })}
                          </div>

                          {/* ======= LAPTOP+ (lg+): TABLE ======= */}
                          <div className="hidden overflow-x-auto lg:block">
                            <table className="w-full text-sm text-left border-collapse table-fixed">
                              <thead>
                                <tr className="bg-slate-50 text-[9px] font-black text-slate-400 uppercase tracking-widest border-y border-slate-100">
                                  <th className={nameHeader}>Resultado Clave (KR)</th>
                                  <th className={headerNum}>V.I.</th>
                                  <th className={headerNum}>Q1</th>
                                  <th className={headerNum}>Q2</th>
                                  <th className={headerNum}>Q3</th>
                                  <th className={headerNum}>Q4</th>
                                  <th className={`${headerNum} text-blue-600`}>ANUAL</th>
                                  <th className={delegatedHeader}>Delegado</th>
                                  <th className={actionsHeader}>Acciones</th>
                                </tr>
                              </thead>

                              <tbody className="divide-y divide-slate-100">
                                {childrenKRs.map((kr, kIdx) => {
                                  const okrDelegado = delegatedOKRByKRId.get(kr.IdRegistro);
                                  const delegatedToName = okrDelegado?.["Nombre encargado"] || "";
                                  const delegatedToEmail = okrDelegado?.["Correo encargado"] || "";
                                  const isAlreadyDelegated = !!okrDelegado;

                                  return (
                                    <tr key={kIdx} className="hover:bg-slate-50/80 transition-all">
                                      {/* KR: 1 línea + tooltip */}
                                      <td className={nameCell}>
                                        <div className="flex items-center gap-3 min-w-0">
                                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0"></div>

                                          <div
                                            className="truncate whitespace-nowrap overflow-hidden"
                                            title={kr["Nombre Tarea"]}
                                          >
                                            {kr["Nombre Tarea"]}
                                          </div>
                                        </div>
                                      </td>
                                      <td className={`${numCell} text-slate-400`}>{kr["Valor Inicial"] || "0"}</td>
                                      <td className={numCell}>{kr["Meta Q1"] || "-"}</td>
                                      <td className={numCell}>{kr["Meta Q2"] || "-"}</td>
                                      <td className={numCell}>{kr["Meta Q3"] || "-"}</td>
                                      <td className={numCell}>{kr["Meta Q4"] || "-"}</td>
                                      <td className={`${numCell} text-blue-700 bg-blue-50/20 font-black`}>
                                        {kr["Meta Anual"] || "-"}
                                      </td>

                                      {/* Delegado: solo nombre (sin “Delegado a:” ni botones) */}
                                      <td className={delegatedCell}>
                                        <span
                                          className="inline-block max-w-[240px] truncate text-[11px] font-bold text-slate-700"
                                          title={delegatedToEmail || ""}
                                        >
                                          {isAlreadyDelegated ? (delegatedToName || delegatedToEmail) : "-"}
                                        </span>
                                      </td>

                                      {/* Acciones: 3 botones (Delegar/Reasignar, Editar, Eliminar) */}
                                      <td className={actionsCell}>
                                        <div className="flex items-center justify-end gap-2">
                                          {(role === "admin" || canDelegate) && (
                                            <button
                                              onClick={() => onDelegate(kr)}
                                              className={`p-1.5 rounded-md transition-colors ${isAlreadyDelegated
                                                ? "text-indigo-600 hover:text-indigo-800"
                                                : "text-slate-400 hover:text-indigo-600"
                                                }`}
                                              title={isAlreadyDelegated ? "Reasignar" : "Delegar"}
                                              aria-label={isAlreadyDelegated ? "Reasignar" : "Delegar"}
                                              type="button"
                                            >
                                              {isAlreadyDelegated ? (
                                                <RefreshCcw className="w-4 h-4" />
                                              ) : (
                                                <Share2 className="w-4 h-4" />
                                              )}
                                            </button>
                                          )}

                                          <button
                                            onClick={() => onEdit(kr)}
                                            className="p-1.5 text-slate-400 hover:text-blue-600 rounded-md transition-colors"
                                            title="Editar"
                                            aria-label="Editar"
                                            type="button"
                                          >
                                            <Edit2 className="w-4 h-4" />
                                          </button>

                                          <button
                                            onClick={() => onDelete(kr["IdRegistro"])}
                                            className="p-1.5 text-slate-400 hover:text-red-600 rounded-md transition-colors"
                                            title="Eliminar"
                                            aria-label="Eliminar"
                                            type="button"
                                          >
                                            <Trash2 className="w-4 h-4" />
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </>
                      ) : (
                        <div className="text-center py-8 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                          <p className="text-[10px] text-slate-400 font-medium italic">
                            No hay resultados clave (KRs) vinculados.
                          </p>
                        </div>
                      )}

                      <div className="mt-4 flex justify-start">
                        <button
                          onClick={() => onAddKR(objetivo)}
                          className="flex items-center gap-2 text-emerald-600 hover:text-emerald-700 text-[10px] font-black uppercase tracking-widest p-2 hover:bg-emerald-50 rounded-xl transition-all"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Vincular KR</span>
                        </button>
                      </div>
                    </div>
              </details>
            );
          })}
        </div>
      );

      // ===== ADMIN → USUARIO COMO ACORDEÓN =====
      if (role === "admin") {
        return (
          <details
            key={ownerIdx}
            defaultOpen={isLgUp}
            className="group bg-slate-50 rounded-3xl border border-slate-200 shadow-sm"
          >
            <summary className="cursor-pointer list-none p-4 sm:p-8 flex items-center gap-4">
              <div className="bg-slate-800 p-3 rounded-2xl text-white shadow-lg">
                <User className="w-6 h-6" />
              </div>

              <div className="flex-1 min-w-0">
                <h2 className="text-xl sm:text-2xl font-black text-slate-800 uppercase tracking-tight truncate">
                  {userTasks[0]["Nombre encargado"] || "Usuario"}
                </h2>

                <div className="flex flex-wrap items-center gap-2 text-slate-500 text-sm font-medium">
                  <span className="bg-slate-200 px-2 py-0.5 rounded text-[10px]">
                    Número Empleado: {userTasks[0]["Numero de empleado encargado"]}
                  </span>

                  <span className="hidden sm:inline">•</span>

                  {/* Puesto como badge sutil */}
                  <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-[10px] font-semibold">
                    {puesto}
                  </span>
                </div>
              </div>

              <div className="text-slate-400 transition-transform group-open:rotate-180">
                ▾
              </div>
            </summary>

            <div className="px-4 pb-6 sm:px-8 sm:pb-8">
              {UserContent}
            </div>
          </details>
        );
      }

      // ===== COLABORADOR → USUARIO NORMAL =====
      return (
        <div
          key={ownerIdx}
          className="bg-slate-50 p-4 sm:p-8 rounded-3xl border border-slate-200 shadow-sm"
        >
          <div className="flex flex-wrap items-center gap-4 mb-8">
            <div className="bg-slate-800 p-3 rounded-2xl text-white shadow-lg">
              <User className="w-6 h-6" />
            </div>

            <div className="flex-1 min-w-[200px]">
              <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">
                {userTasks[0]["Nombre encargado"] || "Usuario"}
              </h2>

              <div className="flex flex-wrap items-center gap-2 text-slate-500 text-sm font-medium">
                <span className="bg-slate-200 px-2 py-0.5 rounded text-[10px]">
                  Número Empleado: {userTasks[0]["Numero de empleado encargado"]}
                </span>

                <span className="hidden sm:inline">•</span>

                {/* Puesto como badge sutil */}
                <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-[10px] font-semibold">
                  {puesto}
                </span>
              </div>
            </div>
          </div>

          {UserContent}
        </div>
      );
    })}
  </div>
);
};

export default TablaObjetivos;