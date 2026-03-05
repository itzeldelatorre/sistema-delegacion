export const generateNextName = (tasks, type, parentName = null, ownerEmail = null) => {
  const norm = (s) => (s || "").trim().toLowerCase();

  if (type === "OKR") {
    const owner = norm(ownerEmail);

    // OKRs del dueño (no delegados) -> IdRegistroPadre vacío/null/undefined
    const ownerRootOKRs = tasks.filter(t =>
      t?.Tipo === "OKR" &&
      norm(t["Correo encargado"]) === owner &&
      !t?.IdRegistroPadre // <- excluye OKRs delegados
    );

    // En vez de length+1, usa el máximo existente + 1 (evita repetir si hay huecos)
    const maxNum = ownerRootOKRs.reduce((max, t) => {
      const m = String(t["Nombre Tarea"] || "").match(/^OKR\s+(\d+)\b/i);
      const n = m ? parseInt(m[1], 10) : 0;
      return Math.max(max, Number.isFinite(n) ? n : 0);
    }, 0);

    return `OKR ${maxNum + 1}`;
  }

  if (type === "KR" && parentName) {
    const parent = String(parentName);

    // Captura el número COMPLETO del padre: 1, 1.2, 3.4.5, etc.
    // Funciona si parentName empieza con "OKR 2 ..." o "KR 1.2 ..."
    const mParent = parent.match(/^(OKR|KR)\s+(\d+(?:\.\d+)*)\b/i);
    const parentNum = mParent?.[2] || "X";

    // Hermanos: mismo "Objetivo Padre"
    const siblingKRs = tasks.filter(t =>
      t?.Tipo === "KR" &&
      String(t["Objetivo Padre"] || "").trim() === parent.trim()
    );

    // Igual: usa máximo existente + 1 (no length+1)
    const maxChild = siblingKRs.reduce((max, t) => {
      const m = String(t["Nombre Tarea"] || "").match(new RegExp(`^KR\\s+${parentNum.replace(/\./g, "\\.")}\\.(\\d+)\\b`, "i"));
      const n = m ? parseInt(m[1], 10) : 0;
      return Math.max(max, Number.isFinite(n) ? n : 0);
    }, 0);

    return `KR ${parentNum}.${maxChild + 1}`;
  }

  return type;
};