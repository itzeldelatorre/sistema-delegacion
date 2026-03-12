import React, { useMemo } from 'react';
import { Share2, RefreshCcw, Edit2, Trash2, Plus, User, Target, BarChart3, ArrowRightCircle, X } from "lucide-react";

const TablaObjetivos = ({
  tasks,
  empleados,
  onDelegate,
  onAddKR,
  role,
  canDelegate,
  onEdit,
  onDelete,
  onRemoveDelegation,
  hideOwnerHeader,
}) => {
  if (!tasks || tasks.length === 0) {
    return (
      <div className="p-10 text-center bg-white rounded-3xl border border-dashed border-slate-300">
        <p className="text-slate-500 font-medium">No hay tareas disponibles en esta área.</p>
      </div>
    );
  }

  // ==========================
  // Indexes & Helpers
  // ==========================
  const delegatedRootsByParentId = useMemo(() => {
    const map = new Map();

    tasks.forEach((t) => {
      if (t?.idTareaPadre && (t?.tipo === "OKR" || t?.tipo === "KPI")) {
        const key = t.idTareaPadre;
        const current = map.get(key) || [];
        current.push(t);
        map.set(key, current);
      }
    });

    return map;
  }, [tasks]);

  const groupedByOwner = useMemo(() => {
    return tasks.reduce((acc, curr) => {
      const owner = curr.correoEncargado;
      if (!owner) return acc;
      if (!acc[owner]) acc[owner] = [];
      acc[owner].push(curr);
      return acc;
    }, {});
  }, [tasks]);

  const groups = hideOwnerHeader ? { self: tasks } : groupedByOwner;

  const empleadosByEmail = useMemo(() => {
    const map = new Map();
    empleados?.forEach(emp => {
      if (emp?.correoCorporativo) {
        map.set(emp.correoCorporativo, emp);
      }
    });
    return map;
  }, [empleados]);

  // Estilos
  const numCell = "px-2 py-3 text-center text-[11px] font-bold border-r border-slate-50 last:border-r-0 w-16";
  const headerNum = "px-2 py-3 text-center w-16 text-[9px] font-black text-slate-400 uppercase tracking-widest";

  // Helpers para headers por sección
  const getRootHeaders = (userTasks, rootType) => {
    // root = tipo KPI/OKR que NO sea hijo del mismo tipo
    // (ej: un Sub-KPI nunca debería ser root, y un KPI puede tener hijos sin dejar de ser root)
    const childTypes = {
      OKR: "KR",
      KPI: "Sub-KPI"
    };

    const childType = childTypes[rootType];

    // IDs de padres referenciados por hijos
    const parentIdsFromChildren = new Set(
      userTasks
        .filter(t => t.tipo === childType && t.idTareaPadre)
        .map(t => t.idTareaPadre)
    );

    return userTasks.filter(t => t.tipo === rootType);
  };

  const tasksByIdTarea = useMemo(() => {
    const map = new Map();
    tasks.forEach((t) => {
      if (t?.idTarea) {
        map.set(t.idTarea, t);
      }
    });
    return map;
  }, [tasks]);

  const formatMetricValue = (value, unidadMedida) => {
    if (value === null || value === undefined || value === "") return "-";

    const num = Number(value);
    if (Number.isNaN(num)) return value;

    switch (unidadMedida) {
      case "Porcentaje (%)":
        return `${num}%`;

      case "Moneda (MXN)":
        return `$${num.toLocaleString("es-MX", {
          minimumFractionDigits: 0,
          maximumFractionDigits: 2,
        })}`;

      case "Número (#)":
        return num.toLocaleString("es-MX", {
          minimumFractionDigits: 0,
          maximumFractionDigits: 2,
        });

      default:
        return num.toLocaleString("es-MX", {
          minimumFractionDigits: 0,
          maximumFractionDigits: 2,
        });
    }
  };

  const getMetricStyle = (label) => {
    if (label === "V.I.") {
      return {
        box: "border-slate-200 bg-slate-50",
        label: "text-slate-400",
        value: "text-slate-700"
      };
    }

    if (label === "Anual") {
      return {
        box: "border-emerald-200 bg-emerald-50",
        label: "text-emerald-500",
        value: "text-emerald-700"
      };
    }

    return {
      box: "border-blue-200 bg-blue-50/50",
      label: "text-blue-400",
      value: "text-blue-700"
    };
  };

  const renderChildrenTable = ({ children, childLabel, parent, isKPISection }) => (
    <div className="p-4">
      {/* DESKTOP / TABLET */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-y border-slate-100">
              <th className="px-3 py-3 font-black text-slate-400 text-[9px] uppercase tracking-widest min-w-[280px]">
                {childLabel}
              </th>
              <th className={headerNum}>V.I.</th>
              <th className={headerNum}>Q1</th>
              <th className={headerNum}>Q2</th>
              <th className={headerNum}>Q3</th>
              <th className={headerNum}>Q4</th>
              <th className={`${headerNum} text-blue-600`}>ANUAL</th>
              <th className="px-4 py-3 font-black text-slate-400 text-[9px] uppercase tracking-widest min-w-[250px]">
                Delegado
              </th>
              <th className="px-4 py-3 text-right text-[9px] font-black text-slate-400 uppercase tracking-widest">
                Acciones
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {children.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-6 text-center text-slate-400 font-semibold">
                  Sin {isKPISection ? "subindicadores" : "resultados clave"} vinculados.
                </td>
              </tr>
            ) : (
              children.map((child, idx) => {
                const delegatedRoots = delegatedRootsByParentId.get(child.idTarea) || [];
                const isAlreadyDelegated = delegatedRoots.length > 0; 

                return (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-all">
                    <td className="px-3 py-3 min-w-[280px]">
                      <div className="flex items-start gap-2">
                        <div className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${isKPISection ? "bg-indigo-500" : "bg-emerald-500"}`} />
                        <span className="text-slate-700 break-words leading-snug font-semibold">
                          {child.nombreTarea}
                        </span>
                      </div>
                    </td>

                    <td className={`${numCell} text-slate-400`}>{child.valorInicial ?? 0}</td>
                    <td className={numCell}>{child.metaQ1 ?? "-"}</td>
                    <td className={numCell}>{child.metaQ2 ?? "-"}</td>
                    <td className={numCell}>{child.metaQ3 ?? "-"}</td>
                    <td className={numCell}>{child.metaQ4 ?? "-"}</td>
                    <td className={`${numCell} text-blue-700 bg-blue-50/20 font-black`}>
                      {child.metaAnual ?? "-"}
                    </td>

                    <td className="px-4 py-3 text-center">
                      {delegatedRoots.length > 0 ? (
                        <div className="flex flex-col items-center gap-1">
                          {delegatedRoots.map((delegado) => (
                            <span
                              key={delegado.idTarea}
                              className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-1 text-[10px] font-bold text-indigo-700"
                            >
                              <span>{delegado.nombreEncargado}</span>

                              {(role === "admin" || canDelegate) && (
                                <button
                                  type="button"
                                  onClick={() => onRemoveDelegation?.(delegado)}
                                  className="ml-1 rounded-full p-0.5 hover:bg-indigo-100 text-indigo-600"
                                  title="Quitar delegación"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              )}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        {(role === "admin" || canDelegate) && (
                          <button
                            onClick={() => onDelegate(child)}
                            className={`p-1.5 rounded-md transition-colors ${
                              isAlreadyDelegated ? "text-indigo-600" : "text-slate-400 hover:text-indigo-600"
                            }`}
                            title={isAlreadyDelegated ? "Agregar delegación" : "Delegar"}
                          >
                            {isAlreadyDelegated ? <RefreshCcw className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                          </button>
                        )}

                        <button
                          onClick={() => onEdit(child)}
                          className="p-1.5 text-slate-400 hover:text-blue-600"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => onDelete(child)}
                          className="p-1.5 text-slate-400 hover:text-red-600"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* MOBILE */}
      <div className="md:hidden space-y-3">
        {children.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-slate-400 font-semibold">
            Sin {isKPISection ? "subindicadores" : "resultados clave"} vinculados.
          </div>
        ) : (
          children.map((child, idx) => {
            const delegatedRoots = delegatedRootsByParentId.get(child.idTarea) || [];
            const isAlreadyDelegated = delegatedRoots.length > 0;
            return (
              <div
                key={idx}
                className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 space-y-4"
              >
                {/* Nombre */}
                <div className="flex items-start gap-2">
                  <div className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${isKPISection ? "bg-indigo-500" : "bg-emerald-500"}`} />
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      {childLabel}
                    </p>
                    <p className="text-sm font-semibold text-slate-700 break-words leading-snug">
                      {child.nombreTarea}
                    </p>
                  </div>
                </div>

                {/* Metas */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    ["V.I.", child.valorInicial ?? 0],
                    ["Q1", child.metaQ1 ?? "-"],
                    ["Q2", child.metaQ2 ?? "-"],
                    ["Q3", child.metaQ3 ?? "-"],
                    ["Q4", child.metaQ4 ?? "-"],
                    ["ANUAL", child.metaAnual ?? "-"],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className={`rounded-xl border px-2 py-2 text-center ${label === "ANUAL"
                        ? "border-blue-200 bg-blue-50"
                        : "border-slate-200 bg-white"
                        }`}
                    >
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                        {label}
                      </p>
                      <p className={`text-sm font-bold ${label === "ANUAL" ? "text-blue-700" : "text-slate-700"}`}>
                        {value}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Delegado */}
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                    Delegado
                  </p>

                  {delegatedRoots.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {delegatedRoots.map((delegado) => (
                        <span
                          key={delegado.idTarea}
                          className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-1 text-[10px] font-bold text-indigo-700"
                        >
                          <span>{delegado.nombreEncargado}</span>

                          {(role === "admin" || canDelegate) && (
                            <button
                              type="button"
                              onClick={() => onRemoveDelegation?.(delegado)}
                              className="ml-1 rounded-full p-0.5 hover:bg-indigo-100 text-indigo-600"
                              title="Quitar delegación"
                            >
                              ×
                            </button>
                          )}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-sm text-slate-400">-</span>
                  )}
                </div>

                {/* Acciones */}
                <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-200">
                  {(role === "admin" || canDelegate) && (
                    <button
                      onClick={() => onDelegate(child)}
                      className={`p-2 rounded-lg transition-colors ${isAlreadyDelegated ? "text-indigo-600 bg-indigo-50" : "text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                        }`}
                      title={isAlreadyDelegated ? "Re-delegar" : "Delegar"}
                    >
                      {isAlreadyDelegated ? <RefreshCcw className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                    </button>
                  )}

                  <button
                    onClick={() => onEdit(child)}
                    className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                    title="Editar"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => onDelete(child)}
                    className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
                    title="Eliminar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <button
        onClick={() => onAddKR(parent)}
        className={`mt-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest p-2 rounded-xl transition-all
        ${isKPISection
            ? "text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
            : "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
          }`}
      >
        <Plus className="w-4 h-4" />
        <span>{isKPISection ? "Vincular Sub-KPI" : "Vincular KR"}</span>
      </button>
    </div>
  );

  const renderSection = ({ userTasks, sectionTitle, rootType, childType, badgeRoot, icon, isKPISection }) => {
    const roots = getRootHeaders(userTasks, rootType);

    if (roots.length === 0) return null;

    return (
      <div className="space-y-4">
        {/* Subtítulo */}
        <div className="flex items-center gap-3 px-1 border-b border-slate-200 pb-2">
          {/* <div className={`p-2 rounded-xl ${isKPISection ? "bg-indigo-100 text-indigo-700" : "bg-blue-100 text-blue-700"}`}>
            {icon}
          </div> */}
          <h3 className="text-sm font-black uppercase tracking-widest text-slate-600 ">
            {sectionTitle} <span className="text-slate-400">({roots.length})</span>
          </h3>
        </div>

        {/* Lista */}
        <div className="grid grid-cols-1 gap-6">
          {roots.map((root, idx) => {
            const isDelegatedOKR =!!root.idTareaPadre;

            const tareaOrigen = isDelegatedOKR ? tasksByIdTarea.get(root.idTareaPadre) : null;
            const nombreOrigen = root.krPadre || tareaOrigen?.nombreTarea || "";
            const encargadoOrigen = tareaOrigen?.nombreEncargado || "";

            const summaryMetrics = [
              ["V.I.", root.valorInicial],
              ["Q1", root.metaQ1],
              ["Q2", root.metaQ2],
              ["Q3", root.metaQ3],
              ["Q4", root.metaQ4],
              ["Anual", root.metaAnual],
            ];

            const children = userTasks.filter(t => {
              if (t.tipo !== childType) return false;

              // match ideal (link técnico)
              if (t.idTareaPadre && root.idTarea) return t.idTareaPadre === root.idTarea;

              // fallback (link por texto)
              return (t.objetivoPadre || "") === (root.nombreTarea || "");
            });

            return (
              <details key={idx} className="group bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <summary
                  className={`cursor-pointer list-none p-4 md:p-6 border-b border-slate-100 ${isDelegatedOKR ? "bg-indigo-50/30" : "bg-white"
                    }`}
                >
                  <div className="grid grid-cols-[auto_1fr] gap-4">
                    {/* ICONO */}
                    <div
                      className={`${isKPISection
                          ? "bg-indigo-100 text-indigo-700"
                          : isDelegatedOKR
                            ? "bg-indigo-100 text-indigo-600"
                            : "bg-blue-100 text-blue-600"
                        } p-2.5 rounded-xl h-fit`}
                    >
                      <Target className="w-6 h-6" />
                    </div>

                    {/* CONTENIDO */}
                    <div className="min-w-0">
                      {/* FILA 1: badge + botones */}
                      <div className="flex items-start justify-between gap-3">
                        <span
                          className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md border w-fit ${isKPISection
                              ? "bg-indigo-50 text-indigo-700 border-indigo-100"
                              : isDelegatedOKR
                                ? "bg-indigo-100 text-indigo-700 border-indigo-200"
                                : "bg-blue-50 text-blue-700 border-blue-100"
                            }`}
                        >
                          {isKPISection
                            ? "KPI DEPARTAMENTAL"
                            : isDelegatedOKR
                              ? "OKR DELEGADO"
                              : badgeRoot}
                        </span>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              onEdit(root);
                            }}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              onDelete(root);
                            }}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* FILA 2: nombre */}
                      <div className="mt-3">
                        <h3 className="text-base md:text-lg font-bold text-slate-900 leading-snug break-words">
                          {root.nombreTarea}
                        </h3>
                      </div>

                      {/* FILA 3: origen */}
                      {isDelegatedOKR && nombreOrigen && (
                        <div className="mt-2 flex items-start gap-1 text-[11px] text-indigo-700 font-medium">
                          <ArrowRightCircle className="w-3 h-3 shrink-0 mt-0.5" />
                          <span className="italic break-words">
                            Viene de: <b>{nombreOrigen}</b>
                            {encargadoOrigen ? ` (${encargadoOrigen})` : ""}
                          </span>
                        </div>
                      )}

                      {/* FILA 4: metas */}
                      <div className="mt-4 grid grid-cols-3 md:grid-cols-6 gap-2">
                        {summaryMetrics.map(([label, value]) => {
                          const style = getMetricStyle(label);

                          return (
                            <div
                              key={label}
                              className={`rounded-lg border px-2 py-2 text-center ${style.box}`}
                            >
                              <p
                                className={`text-[9px] font-black uppercase tracking-widest ${style.label}`}
                              >
                                {label}
                              </p>

                              <p className={`text-xs font-bold whitespace-nowrap ${style.value}`}>
                                {formatMetricValue(value, root.unidadMedida)}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </summary>

                {renderChildrenTable({
                  children,
                  childLabel: isKPISection ? "Subindicador (Sub-KPI)" : "Resultado Clave (KR)",
                  parent: root,
                  isKPISection
                })}
              </details>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-12 w-full fade-in">

      {Object.entries(groups).map(([ownerEmail, userTasks], ownerIdx) => {
        const empleado = empleadosByEmail.get(ownerEmail);
        const puesto = empleado?.posicion || "Sin Puesto";
        return !hideOwnerHeader ? (
          <details
            key={ownerIdx}
            className="bg-slate-50 rounded-3xl border border-slate-200 shadow-sm overflow-hidden"
          >
            <summary className="cursor-pointer list-none p-4 sm:p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4 hover:bg-slate-100/70 transition-colors">
              <div className="flex items-start gap-4">
                <div className="bg-slate-800 p-3 rounded-2xl text-white shadow-lg">
                  <User className="w-6 h-6" />
                </div>

                <div>
                  <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">
                    {userTasks[0].nombreEncargado || "Colaborador"}
                  </h2>

                  <div className="flex flex-wrap items-center gap-2 text-slate-500 text-sm font-medium">
                    <span className="bg-slate-200 px-2 py-0.5 rounded text-[10px]">
                      Número Empleado: {userTasks[0].numeroEmpleadoEncargado}
                    </span>

                    <span className="hidden sm:inline">•</span>

                    <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-[10px] font-semibold">
                      {puesto}
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-slate-400 text-xs font-bold uppercase tracking-widest">
                Ver objetivos
              </div>
            </summary>

            <div className="px-4 pb-4 sm:px-8 sm:pb-8 space-y-8">
              {renderSection({
                userTasks,
                sectionTitle: "Objetivos",
                rootType: "OKR",
                childType: "KR",
                badgeRoot: "OBJETIVO DEPARTAMENTAL",
                icon: <Target className="w-5 h-5" />,
                isKPISection: false
              })}

              {renderSection({
                userTasks,
                sectionTitle: "Indicadores",
                rootType: "KPI",
                childType: "Sub-KPI",
                badgeRoot: "KPI DEPARTAMENTAL",
                icon: <BarChart3 className="w-5 h-5" />,
                isKPISection: true
              })}
            </div>
          </details>
        ) : (
          <div
            key={ownerIdx}
            className="bg-slate-50 p-4 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-8"
          >
            {renderSection({
              userTasks,
              sectionTitle: "Objetivos",
              rootType: "OKR",
              childType: "KR",
              badgeRoot: "OBJETIVO DEPARTAMENTAL",
              icon: <Target className="w-5 h-5" />,
              isKPISection: false
            })}

            {renderSection({
              userTasks,
              sectionTitle: "Indicadores",
              rootType: "KPI",
              childType: "Sub-KPI",
              badgeRoot: "KPI DEPARTAMENTAL",
              icon: <BarChart3 className="w-5 h-5" />,
              isKPISection: true
            })}
          </div>
        );
      })}
    </div>
  );
};

export default TablaObjetivos;