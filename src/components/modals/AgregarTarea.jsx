import React, { useState, useEffect, useMemo } from "react";
import { X, Target, Lock } from "lucide-react";
import { generateNextName, stripNomenclature } from "../../utils/nomenclature";

const AgregarTarea = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  allEmployees,
  currentArea,
  allTasks,
  employeeData,
}) => {
  const [nombreSinNomenclatura, setNombreSinNomenclatura] = useState("");

  const [formData, setFormData] = useState({
    tipo: "OKR",
    nombreTarea: "",
    correoEncargado: "",
    correoAsignacion: "",
    numeroEmpleadoEncargado: "",
    nombreEncargado: "",
    unidadMedida: "Porcentaje (%)",
    orientacion: "Incremento",
    valorInicial: 0,
    metaQ1: "",
    metaQ2: "",
    metaQ3: "",
    metaQ4: "",
    metaAnual: "",
    objetivoPadre: "",
    idTareaPadre: "",
    krPadre: "",
    area: currentArea,
    periodo: "AF26",
  });

  const filteredEmployees = useMemo(() => {
    return (allEmployees || []).filter((emp) => emp.area === currentArea);
  }, [allEmployees, currentArea]);

  // --- Catalogos / opciones ---
  const unidadOptions = [
    "Porcentaje (%)",
    "Número (#)",
    "Moneda (MXN)",
  ];

  const orientacionOptions = ["Incremento", "Decremento"];

  // --- Helpers para identificar contexto ---
  const isEditing = !!initialData?.idTarea;
  const isDelegating = !!initialData?.isDelegating;

  const availableEmployees = useMemo(() => {
    if (!isDelegating) return filteredEmployees;

    // Si viene de delegación de una tarea ajena, usamos el numeroEmpleadoEncargado del origen.
    // Si no, usamos el del usuario logueado.
    const numeroEmpleadoJefeBase = String(
      initialData?.numeroEmpleadoEncargado ||
      employeeData?.numeroEmpleado ||
      ""
    ).trim();

    if (!numeroEmpleadoJefeBase) return [];

    return filteredEmployees.filter(
      (emp) => String(emp.numeroEmpleadoJefe || "").trim() === numeroEmpleadoJefeBase
    );
  }, [filteredEmployees, isDelegating, initialData, employeeData]);

  const sortedAvailableEmployees = useMemo(() => {
    return [...availableEmployees].sort((a, b) =>
      (a.nombreCompleto || "").localeCompare(b.nombreCompleto || "", "es", {
        sensitivity: "base",
      })
    );
  }, [availableEmployees]);

  // Vincular (KR/Sub-KPI) = viene con objetivoPadre e idTareaPadre (y tipo ya definido)
  const isLinkingChild =
    !!initialData?.idTareaPadre &&
    !!initialData?.objetivoPadre &&
    !isDelegating &&
    !isEditing;

  const isChildType = formData.tipo === "KR" || formData.tipo === "Sub-KPI";
  const isRootType = formData.tipo === "OKR" || formData.tipo === "KPI";


  const delegatedRootType = useMemo(() => {
    if (!isDelegating) return null;
    return initialData?.tipo || "OKR";
  }, [isDelegating, initialData?.tipo]);

  // --- Reglas UI ---
  // Tipo editable SOLO en “Nuevo Objetivo” normal (sin initialData)
  const lockTipo = isEditing || isDelegating || isLinkingChild;

  // Objetivo Padre:
  // - bloqueado si viene precargado (vincular / delegar / editar con padre)
  const lockObjetivoPadre =
    isDelegating || isLinkingChild || !!initialData?.objetivoPadre;

  // Responsable:
  // - bloqueado si estás vinculando hijo (hereda del padre) o delegando (origen manda)
  const lockResponsable = isLinkingChild;

  // Mostrar selector de padre:
  // Solo aplica cuando es hijo (KR/Sub-KPI). En raíces NO mostramos.
  const showParentSelect = isChildType;

  // 1) Cargar datos al abrir modal
  useEffect(() => {
    if (!isOpen) return;

    if (initialData) {
      const fullName = initialData.nombreTarea || "";
      setNombreSinNomenclatura(stripNomenclature(fullName));

      const forcedTipo = initialData.tipo || "OKR";

      setFormData((prev) => ({
        ...prev,
        ...initialData,
        tipo: forcedTipo,
        area: currentArea,
        krPadre: initialData.isDelegating ? fullName : initialData.krPadre || "",
      }));
    } else {
      setNombreSinNomenclatura("");
      setFormData({
        tipo: "OKR",
        nombreTarea: "",
        correoEncargado: "",
        correoAsignacion: "",
        numeroEmpleadoEncargado: "",
        nombreEncargado: "",
        unidadMedida: "Porcentaje (%)",
        orientacion: "Incremento",
        valorInicial: 0,
        metaQ1: "",
        metaQ2: "",
        metaQ3: "",
        metaQ4: "",
        metaAnual: "",
        objetivoPadre: "",
        idTareaPadre: "",
        krPadre: "",
        area: currentArea,
        periodo: "AF26",
      });
    }
  }, [initialData, currentArea, isOpen]);

  // 2) Lista de padres disponibles según el tipo actual
  const parentOptions = useMemo(() => {
    if (!showParentSelect) return [];

    if (formData.tipo === "KR") {
      return (allTasks || []).filter((t) => t.tipo === "OKR");
    }
    if (formData.tipo === "Sub-KPI") {
      return (allTasks || []).filter((t) => t.tipo === "KPI");
    }
    return [];
  }, [allTasks, formData.tipo, showParentSelect]);

  // 3) Prefijo a mostrar (solo lectura)
  const prefijo = useMemo(() => {
    // Edición: conserva prefijo existente
    if (isEditing) {
      return (
        initialData.nombreTarea?.match(
          /^(OKR|KR|KPI|Sub-KPI)\s+(\d+(?:\.\d+)*)\b/i
        )?.[0] || ""
      );
    }

    // Delegación: crea raíz correcto (OKR o KPI)
    if (isDelegating) {
      if (!formData.correoEncargado) return "";
      if (!delegatedRootType) return "";
      return generateNextName(allTasks, delegatedRootType, null, formData.correoEncargado);
    }

    // Nuevo / Vincular: genera según tipo/padre/responsable
    if (!formData.correoEncargado) return "";
    return generateNextName(
      allTasks,
      formData.tipo,
      formData.objetivoPadre,
      formData.correoEncargado
    );
  }, [
    isEditing,
    isDelegating,
    delegatedRootType,
    initialData?.nombreTarea,
    formData.correoEncargado,
    formData.tipo,
    formData.objetivoPadre,
    allTasks,
  ]);

  const calcularDatosFinales = () => {
    const trimestres = [];
    let ultimoQ = "";

    if (formData.metaQ1 !== "") {
      trimestres.push("Q1");
      ultimoQ = "1.° trim. AF26";
    }
    if (formData.metaQ2 !== "") {
      trimestres.push("Q2");
      ultimoQ = "2.° trim. AF26";
    }
    if (formData.metaQ3 !== "") {
      trimestres.push("Q3");
      ultimoQ = "3.° trim. AF26";
    }
    if (formData.metaQ4 !== "") {
      trimestres.push("Q4");
      ultimoQ = "4.° trim. AF26";
    }

    let periodoFinal = "AF26";
    if (trimestres.length > 0 && trimestres.length < 4) periodoFinal = ultimoQ;
    if (trimestres.length == 0) {
      trimestres.push("Q1");
      trimestres.push("Q2");
      trimestres.push("Q3");
      trimestres.push("Q4");
    }

    const descripcion = (nombreSinNomenclatura || "").trim();
    const nombreFinalFull = `${prefijo} ${descripcion}`.trim();

    // krPadre:
    // - delegación: guarda ORIGEN (nombre del KR/Sub-KPI origen)
    // - hijo nuevo: puedes guardarlo como tracking (si lo quieres)
    // - raíz normal: vacío
    let krPadreFinal = "";
    if (isDelegating) {
      krPadreFinal = formData.krPadre || "";
    } else if (isChildType) {
      // si quieres que el KR/SubKPI tenga krPadre con su propio nombre, solo en creación nueva:
      // (si NO lo quieres, quita este bloque y queda vacío siempre)
      if (!isEditing) krPadreFinal = nombreFinalFull;
      else krPadreFinal = formData.krPadre || "";
    }

    // objetivoPadre / idTareaPadre:
    // - raíz normal: vacío
    // - hijo: los del formulario
    // - delegación: conserva idTareaPadre (link técnico al origen) y objetivoPadre (si lo mandas desde handleDelegate)
    const objetivoPadreFinal =
      isRootType && !isDelegating ? "" : formData.objetivoPadre || "";
    const idTareaPadreFinal =
      isRootType && !isDelegating ? "" : formData.idTareaPadre || "";

    return {
      ...formData,
      nombreTarea: nombreFinalFull,

      idDocumento: isEditing
        ? initialData.idTarea
        : `ID-${Date.now()}-${Math.floor(Math.random() * 10000)}`,

      periodo: periodoFinal,
      trimestresAplicables: trimestres.join(","),

      objetivoPadre: objetivoPadreFinal,
      idTareaPadre: idTareaPadreFinal,
      krPadre: krPadreFinal,

      valorInicial: Number(formData.valorInicial) || 0,
      metaAnual: Number(formData.metaAnual) || 0,
      metaQ1: formData.metaQ1 === "" ? null : Number(formData.metaQ1),
      metaQ2: formData.metaQ2 === "" ? null : Number(formData.metaQ2),
      metaQ3: formData.metaQ3 === "" ? null : Number(formData.metaQ3),
      metaQ4: formData.metaQ4 === "" ? null : Number(formData.metaQ4),
    };
  };

  if (!isOpen) return null;

  const metaInputStyles = {
    valorInicial: {
      box: "bg-slate-50 border-slate-200",
      label: "text-slate-400",
      input: "border-slate-200 focus:border-slate-400"
    },
    metaQ1: {
      box: "bg-blue-50",
      label: "text-blue-400",
      input: "border-blue-200 focus:border-blue-400"
    },
    metaQ2: {
      box: "bg-blue-50",
      label: "text-blue-400",
      input: "border-blue-200 focus:border-blue-400"
    },
    metaQ3: {
      box: "bg-blue-50",
      label: "text-blue-400",
      input: "border-blue-200 focus:border-blue-400"
    },
    metaQ4: {
      box: "bg-blue-50",
      label: "text-blue-400",
      input: "border-blue-200 focus:border-blue-400"
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 text-left">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden">
        <div className="bg-slate-50 px-8 py-4 border-b border-slate-200 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Target className="text-[#01013c]" size={20} />
            <h2 className="text-xl font-bold text-slate-800 uppercase tracking-tight">
              {isEditing ? "Editar" : "Nuevo"} {formData.tipo}
            </h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-red-500">
            <X size={24} />
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSave(calcularDatosFinales());
          }}
          className="p-8 space-y-5 max-h-[80vh] overflow-y-auto"
        >
          {/* Tipo + Responsable */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">
                Tipo
              </label>
              <select
                disabled={lockTipo}
                className={`w-full border border-slate-200 rounded-xl px-4 py-2.5 font-bold ${lockTipo
                  ? "bg-slate-100 text-slate-500 cursor-not-allowed"
                  : "bg-slate-50 text-slate-700"
                  }`}
                value={formData.tipo}
                onChange={(e) => {
                  const tipo = e.target.value;

                  setFormData((prev) => ({
                    ...prev,
                    tipo,
                    // si cambia a raíz, limpia padre
                    objetivoPadre: tipo === "KR" || tipo === "Sub-KPI" ? prev.objetivoPadre : "",
                    idTareaPadre: tipo === "KR" || tipo === "Sub-KPI" ? prev.idTareaPadre : "",
                    // opcional: si cambias a raíz, puedes limpiar krPadre
                    krPadre: tipo === "KR" || tipo === "Sub-KPI" ? prev.krPadre : "",
                  }));
                }}
              >
                <option value="OKR">OKR</option>
                <option value="KR">KR</option>
                <option value="KPI">KPI</option>
                <option value="Sub-KPI">Sub-KPI</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">
                Responsable
              </label>
              <select
                required
                disabled={lockResponsable}
                className={`w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none font-bold ${lockResponsable
                  ? "bg-slate-100 text-slate-500 cursor-not-allowed"
                  : "bg-slate-50 text-slate-700 focus:border-blue-500"
                  }`}
                value={formData.correoEncargado}
                onChange={(e) => {
                  const emp = sortedAvailableEmployees.find(emp => emp.correoCorporativo === e.target.value);
                  if (!emp) return;
                  setFormData((prev) => ({
                    ...prev,
                    correoEncargado: emp.correoCorporativo || "",
                    correoAsignacion: emp.correoAsignacion || emp.correoCorporativo || "",
                    nombreEncargado: emp.nombreCompleto,
                    numeroEmpleadoEncargado: emp.numeroEmpleado,
                  }));
                }}
              >
                <option value="">Seleccionar responsable...</option>
                {sortedAvailableEmployees.map(emp => (
                  <option key={emp.uid} value={emp.correoCorporativo}>
                    {emp.nombreCompleto}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Correo de Asignacion */}
          <div>
            <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">
              Correo de asignación
            </label>
            <input
              type="email"
              required
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-blue-500 font-bold text-slate-700"
              value=""
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  correoAsignacion: e.target.value.trim().toLowerCase(),
                }))
              }
              placeholder="usuario@cimanet.mx"
            />
            <p className="mt-1 text-[10px] text-slate-400 font-medium">
              Correo al que se asignará la tarea en Asana.
            </p>
          </div>

          {/* Objetivo Padre (solo para KR/Sub-KPI) */}
          {showParentSelect && (
            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">
                {formData.tipo === "KR" ? "OKR Padre" : "KPI Padre"}
              </label>

              <select
                disabled={lockObjetivoPadre}
                className={`w-full border border-slate-200 rounded-xl px-4 py-2.5 font-bold ${lockObjetivoPadre
                  ? "bg-slate-100 text-slate-500 cursor-not-allowed"
                  : "bg-slate-50 text-slate-700 focus:border-blue-500"
                  }`}
                value={formData.objetivoPadre || ""}
                onChange={(e) => {
                  const nombrePadre = e.target.value;
                  const padre = parentOptions.find((t) => t.nombreTarea === nombrePadre);

                  setFormData((prev) => ({
                    ...prev,
                    objetivoPadre: nombrePadre,
                    // en tus tareas, el id viene como `id`
                    idTareaPadre: padre?.id || "",
                  }));
                }}
              >
                <option value="">
                  {formData.tipo === "KR"
                    ? "Seleccionar OKR padre..."
                    : "Seleccionar KPI padre..."}
                </option>

                {parentOptions.map((p) => (
                  <option key={p.id} value={p.nombreTarea}>
                    {p.nombreTarea}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Prefijo + Descripción */}
          <div>
            <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block flex items-center gap-1">
              Nombre {isDelegating && <Lock size={10} />}
            </label>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                readOnly
                className="w-full border border-slate-200 rounded-xl px-4 py-3 bg-slate-100 text-slate-600 font-black"
                value={prefijo}
                placeholder="Prefijo"
              />

              <input
                required
                readOnly={isDelegating}
                className={`w-full md:col-span-2 border border-slate-200 rounded-xl px-4 py-3 outline-none font-semibold ${isDelegating
                  ? "bg-slate-100 text-slate-500 italic"
                  : "bg-slate-50 text-slate-800 focus:border-blue-500"
                  }`}
                value={nombreSinNomenclatura}
                onChange={(e) => setNombreSinNomenclatura(e.target.value)}
                placeholder="Escribe la descripción…"
              />
            </div>

            {isDelegating && formData.krPadre ? (
              <p className="mt-1 text-[10px] text-indigo-500 font-bold italic">
                Origen: {formData.krPadre}
              </p>
            ) : null}
          </div>

          {/* Unidad / Orientación */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">
                Unidad de medida
              </label>
              <select
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-blue-500 font-bold text-slate-700"
                value={formData.unidadMedida}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, unidadMedida: e.target.value }))
                }
              >
                {unidadOptions.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">
                Orientación
              </label>
              <select
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-blue-500 font-bold text-slate-700"
                value={formData.orientacion}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, orientacion: e.target.value }))
                }
              >
                {orientacionOptions.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Metas */}
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">

            <div className="grid grid-cols-5 gap-2 mb-4">
              {["valorInicial", "metaQ1", "metaQ2", "metaQ3", "metaQ4"].map((f) => {

                const style = metaInputStyles[f];

                return (
                  <div key={f} className={`rounded-lg p-2 ${style.box}`}>
                    <p className={`text-[9px] font-black text-center uppercase mb-1 ${style.label}`}>
                      {f.replace("meta", "")}
                    </p>

                    <input
                      type="number"
                      step="any"
                      className={`w-full rounded-lg py-2 text-center font-bold bg-white ${style.input}`}
                      value={formData[f]}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, [f]: e.target.value }))
                      }
                    />
                  </div>
                );
              })}
            </div>

            <div className="flex flex-col items-center border-t border-slate-200 pt-4">
              <label className="text-[10px] font-black text-emerald-600 uppercase mb-1">
                Meta Anual
              </label>

              <input
                required
                type="number"
                step="any"
                className="w-1/2 bg-emerald-50 border-2 border-emerald-400 rounded-xl py-3 text-center text-2xl font-black text-emerald-700 focus:border-emerald-600"
                value={formData.metaAnual}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, metaAnual: e.target.value }))
                }
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="bg-[#01013c] text-white px-10 py-2.5 rounded-xl font-bold shadow-lg shadow-blue-900/20 hover:bg-slate-800 transition-all uppercase text-sm tracking-wide"
            >
              {isEditing ? "Actualizar" : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AgregarTarea;