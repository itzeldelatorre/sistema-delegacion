export const generateNextName = (tasks, type, parentName = null, ownerEmail = null) => {
  const norm = (s) => (s || "").trim().toLowerCase();
  const owner = norm(ownerEmail);

  // --- RAÍCES: OKR y KPI ---
  if (type === "OKR" || type === "KPI") {
    const prefix = type;

    const ownerRootTasks = tasks.filter(
      (t) =>
        t?.tipo === type &&
        norm(t.correoEncargado) === owner
    );

    const maxNum = ownerRootTasks.reduce((max, t) => {
      const regex = new RegExp(`^${prefix}\\s+(\\d+)\\b`, "i");
      const m = String(t.nombreTarea || "").match(regex);
      return Math.max(max, m ? parseInt(m[1], 10) : 0);
    }, 0);

    return `${prefix} ${maxNum + 1}`;
  }

  // --- HIJOS: KR y Sub-KPI ---
  if ((type === "KR" || type === "Sub-KPI") && parentName) {
    const parent = String(parentName).trim();
    const childPrefix = type === "Sub-KPI" ? "KPI" : "KR";

    const mParent = parent.match(/^(OKR|KR|KPI|Sub-KPI)\s+(\d+(?:\.\d+)*)\b/i);
    const parentNum = mParent?.[2] || "X";

    const siblings = tasks.filter(
      (t) =>
        t.tipo === type &&
        String(t.objetivoPadre || "").trim() === parent
    );

    const maxChild = siblings.reduce((max, t) => {
      const regex = new RegExp(
        `^${childPrefix}\\s+${parentNum.replace(/\./g, "\\.")}\\.(\\d+)\\b`,
        "i"
      );
      const m = String(t.nombreTarea || "").match(regex);
      return Math.max(max, m ? parseInt(m[1], 10) : 0);
    }, 0);

    return `${childPrefix} ${parentNum}.${maxChild + 1}`;
  }

  return type;
};

export const stripNomenclature = (name) => {
  return String(name || "")
    .replace(/^(OKR|KR|KPI|Sub-KPI)\s+(\d+(?:\.\d+)*)\s+/i, "")
    .trim();
};