import express from 'express';
import admin from 'firebase-admin';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config({ path: '/var/www/proyecto1/goals/.env' });

// Inicializar Firebase Admin (ya lo tienes configurado con tus credenciales)
const credentials = {
  client_email: process.env.GOOGLE_CLIENT_EMAIL,
  private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  project_id: process.env.GOOGLE_PROJECT_ID
};

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(credentials)
  });
}

const db = admin.firestore();
const app = express();

app.use(cors());
app.use(express.json());

// --- MIDDLEWARE DE SEGURIDAD (Se mantiene igual) ---
const checkAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).send('No authorized');
  const idToken = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.user = decodedToken;
    next();
  } catch (error) { res.status(403).send('Invalid Token'); }
};

app.use('/api', checkAuth);

// ==========================
// Helpers Periodo/Trimestres
// ==========================
const toClean = (v) => (v ?? "").toString().trim();

// Lee Meta Q1 aunque venga con otro nombre o con espacios raros
const getMeta = (task, key) => {
  // 1) exacto
  if (key in task) return task[key];

  // 2) intenta variantes comunes
  const variants = [
    key.trim(),
    key.replace(/\s+/g, " "),                // colapsa espacios
    key.replace(/\s+/g, ""),                 // "MetaQ1"
    key.replace("Meta ", ""),                // "Q1"
    key.replace("Meta ", "Meta"),            // "MetaQ1"
  ];

  for (const k of variants) {
    if (k in task) return task[k];
  }

  // 3) búsqueda por normalización de keys (por si hay espacios invisibles)
  const normalizedTarget = key.replace(/\s+/g, "").toLowerCase();
  for (const realKey of Object.keys(task)) {
    const normalizedReal = realKey.replace(/\s+/g, "").toLowerCase();
    if (normalizedReal === normalizedTarget) return task[realKey];
  }

  return undefined;
};

const hasValue = (v) => {
  if (v === null || v === undefined) return false;

  // Si viene como string tipo "-" o "—"
  const s = toClean(v);
  if (s === "" || s === "-" || s === "—") return false;

  // Si es número real
  if (typeof v === "number") return true;

  // Si es string numérico
  const n = Number(s);
  if (!Number.isNaN(n)) return true;

  // Si por alguna razón guardas texto como meta y lo quieres contar
  return true;
};

const computePeriodoAndTrimestres = (task) => {
  console.log("DEBUG metas:", {
    nombre: task["Nombre Tarea"],
    keys: Object.keys(task),
    q1: getMeta(task, "Meta Q1"),
    q2: getMeta(task, "Meta Q2"),
    q3: getMeta(task, "Meta Q3"),
    q4: getMeta(task, "Meta Q4"),
  });

  const q1 = getMeta(task, "Meta Q1");
  const q2 = getMeta(task, "Meta Q2");
  const q3 = getMeta(task, "Meta Q3");
  const q4 = getMeta(task, "Meta Q4");

  const applicable = [];
  if (hasValue(q1)) applicable.push("Q1");
  if (hasValue(q2)) applicable.push("Q2");
  if (hasValue(q3)) applicable.push("Q3");
  if (hasValue(q4)) applicable.push("Q4");

  let periodo = "AF26";
  if (applicable.length === 4) {
    periodo = "AF26";
  } else if (applicable.length > 0) {
    const last = applicable[applicable.length - 1];
    const map = {
      Q1: "1.° trim. AF26",
      Q2: "2.° trim. AF26",
      Q3: "3.° trim. AF26",
      Q4: "4.° trim. AF26",
    };
    periodo = map[last] || "AF26";
  }

  return {
    "Periodo": periodo,
    "Trimestres Aplicables": applicable,
  };
};

// --- ENDPOINTS FIRESTORE ---

// GET: Obtener empleados de Firestore
app.get('/api/employees', async (req, res) => {
  try {
    const snapshot = await db.collection('empleados').get();
    const employees = snapshot.docs.map(doc => doc.data());
    res.json(employees);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET: Obtener tareas (filtradas por área)
app.get('/api/tasks', async (req, res) => {
  const { area } = req.query;
  try {
    const snapshot = await db.collection('tasks')
      .where('Area', '==', area)
      .get();
    const tasks = snapshot.docs.map(doc => doc.data());
    res.json(tasks);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST: Crear o Delegar Tarea
app.post('/api/delegate', async (req, res) => {
  const { newTask, updateParent, calcValue } = req.body;
  
  try {
    // Validamos que newTask exista y tenga el ID
    if (!newTask || !newTask.IdRegistro) {
      console.error("❌ Error: Datos incompletos", req.body);
      return res.status(400).json({ error: "Falta el objeto newTask o el IdRegistro" });
    }

    console.log(`🚀 Intentando guardar tarea: ${newTask['Nombre Tarea']} con ID: ${newTask.IdRegistro}`);

    // Regla: un KR solo puede tener 1 delegado
    if (newTask?.Tipo === "OKR" && newTask?.IdRegistroPadre) {
      const existing = await db.collection('tasks')
        .where('IdRegistroPadre', '==', newTask.IdRegistroPadre)
        .where('Tipo', '==', 'OKR')
        .limit(1)
        .get();

      if (!existing.empty) {
        return res.status(409).json({
          error: "Este KR ya tiene un OKR delegado. Reasigna o elimina la delegación."
        });
      }
    }

    const extra = computePeriodoAndTrimestres(newTask);
    const taskToSave = { ...newTask, ...extra };

    await db.collection('tasks').doc(taskToSave.IdRegistro).set(taskToSave);

    if (updateParent && calcValue) {
      await db.collection('tasks').doc(updateParent).update({
        'Cálcular Valor Global': calcValue
      });
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("❌ Error en Firestore:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/delegate/assign', async (req, res) => {
  const { krId, targetEmployee } = req.body;
  if (!krId || !targetEmployee?.email) {
    return res.status(400).json({ error: "Falta krId o targetEmployee" });
  }

  try {
    const tasksCol = db.collection('tasks');

    // 1) Buscar el OKR delegado existente (si existe)
    const existingSnap = await tasksCol
      .where('IdRegistroPadre', '==', krId)
      .where('Tipo', '==', 'OKR')
      .limit(1)
      .get();

    if (existingSnap.empty) {
      return res.status(404).json({ error: "No existe delegación para este KR" });
    }

    const okrDoc = existingSnap.docs[0];
    const okrRef = okrDoc.ref;

    const current = okrDoc.data();

    const merged = {
      ...current,
      "Correo encargado": targetEmployee.email,
      "Nombre encargado": targetEmployee.nombre,
      "Numero de empleado encargado": targetEmployee.numero,
      "Departamento": targetEmployee.departamento || "",
      "Area": targetEmployee.area || ""
    };

    const extra = computePeriodoAndTrimestres(merged);

    // 2) Actualizar responsable
    await okrRef.update({
      "Correo encargado": targetEmployee.email,
      "Nombre encargado": targetEmployee.nombre,
      "Numero de empleado encargado": targetEmployee.numero,
      "Departamento": targetEmployee.departamento || "",
      "Area": targetEmployee.area || "",
      ...extra
    });

    return res.json({ success: true });
  } catch (err) {
    console.error("Error assign delegation:", err);
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/delegate/remove', async (req, res) => {
  const { krId } = req.body;
  if (!krId) return res.status(400).json({ error: "Falta krId" });

  try {
    const tasksCol = db.collection('tasks');

    const existingSnap = await tasksCol
      .where('IdRegistroPadre', '==', krId)
      .where('Tipo', '==', 'OKR')
      .limit(1)
      .get();

    if (existingSnap.empty) {
      return res.json({ success: true, message: "No había delegación" });
    }

    const okrDoc = existingSnap.docs[0];
    const okrData = okrDoc.data();
    const okrId = okrDoc.id;
    const okrName = (okrData["Nombre Tarea"] || "").trim();

    const batch = db.batch();

    // 1) borrar KRs hijos del OKR delegado
    const hijosSnap = await tasksCol
      .where('Objetivo Padre', '==', okrName)
      .get();

    hijosSnap.forEach(d => batch.delete(d.ref));

    // 2) borrar OKR delegado
    batch.delete(tasksCol.doc(okrId));

    await batch.commit();
    return res.json({ success: true });
  } catch (err) {
    console.error("Error remove delegation:", err);
    return res.status(500).json({ error: err.message });
  }
});

// POST: Editar con Sincronización
app.post('/api/update-task', async (req, res) => {
  const { taskId, updatedFields } = req.body;
  if (!taskId) return res.status(400).json({ error: "Falta el ID" });

  try {
    const tasksCol = db.collection('tasks');
    const mainRef = tasksCol.doc(taskId);
    const mainSnap = await mainRef.get();
    if (!mainSnap.exists) return res.status(404).json({ error: "No encontrado" });

    const norm = (s) => (s ?? "").replace(/\s+/g, " ").trim();
    const getPrefix = (name) => name?.match(/^(OKR|KR)\s+\d+(\.\d+)*\s+/)?.[0] || "";
    const stripPrefix = (name) => norm(name).replace(/^(OKR|KR)\s+\d+(\.\d+)*\s+/, "");

    const oldMain = mainSnap.data();
    const tipo = oldMain["Tipo"];
    const oldName = norm(oldMain["Nombre Tarea"]);

    const incomingName = norm(updatedFields["Nombre Tarea"]);
    const nameChanged = !!incomingName && incomingName !== oldName;

    // =========================================================
    // 0) Si NO cambia el nombre => solo update + recomputo Periodo/Trimestres
    // =========================================================
    if (!nameChanged) {
      const merged = { ...oldMain, ...updatedFields };
      const extra = computePeriodoAndTrimestres(merged);
      await mainRef.update({ ...updatedFields, ...extra });
      return res.json({ success: true });
    }

    const batch = db.batch();

    // =========================================================
    // FLUJO A: EDITAS UN KR
    // =========================================================
    if (tipo === "KR") {
      // A1) Actualizar KR principal:
      const mergedKR = {
        ...oldMain,
        ...updatedFields,
        "Nombre Tarea": incomingName,
        "KR Padre": incomingName
      };
      const extraKR = computePeriodoAndTrimestres(mergedKR);

      batch.update(mainRef, {
        ...updatedFields,
        "Nombre Tarea": incomingName,
        "KR Padre": incomingName,
        ...extraKR
      });

      // A2) Buscar OKR(s) delegados directos: IdRegistroPadre == KR.IdRegistro (docId)
      const okrDelegadosSnap = await tasksCol.where("IdRegistroPadre", "==", taskId).get();

      for (const okrDoc of okrDelegadosSnap.docs) {
        const okrData = okrDoc.data();
        const okrOldName = norm(okrData["Nombre Tarea"]);

        // A3) Nuevo nombre del OKR delegado mantiene nomenclatura del OKR (su prefijo)
        // pero usa el texto del KR actualizado (sin prefijo del KR)
        const okrPrefix = getPrefix(okrOldName);      // ej "OKR 1 "
        const baseFromKR = stripPrefix(incomingName); // texto sin "KR 1.1 "
        const okrNewName = norm(`${okrPrefix}${baseFromKR}`);

        // A4) Actualizar OKR delegado:
        // - Nombre Tarea = okrNewName
        // - KR Padre = incomingName (nombre nuevo del KR)
        const mergedOKR = {
          ...okrData,
          "Nombre Tarea": okrNewName,
          "KR Padre": incomingName
        };
        const extraOKR = computePeriodoAndTrimestres(mergedOKR);

        batch.update(okrDoc.ref, {
          "Nombre Tarea": okrNewName,
          "KR Padre": incomingName,
          ...extraOKR
        });

        // A5) Actualizar KRs hijos de ese OKR delegado:
        const hijosKR = await tasksCol
          .where("Tipo", "==", "KR")
          .where("Objetivo Padre", "==", okrOldName)
          .get();

        hijosKR.forEach(hijo => {
          batch.update(hijo.ref, { "Objetivo Padre": okrNewName });
        });
      }

      await batch.commit();
      return res.json({ success: true });
    }

    // =========================================================
    // FLUJO B: EDITAS UN OKR
    // =========================================================
    if (tipo === "OKR") {
      const isDelegado = !!oldMain["IdRegistroPadre"];
      const okrOldName = oldName;
      const okrNewName = incomingName;

      // B1) OKR principal (KR Padre se define abajo si es delegado)
      const okrUpdate = { ...updatedFields, "Nombre Tarea": okrNewName };

      // B2) Actualizar Objetivo Padre de sus KRs hijos (por texto)
      const hijosKRSnap = await tasksCol
        .where("Tipo", "==", "KR")
        .where("Objetivo Padre", "==", okrOldName)
        .get();

      hijosKRSnap.forEach(hijo => {
        batch.update(hijo.ref, { "Objetivo Padre": okrNewName });
      });

      // B3) Si es OKR delegado: sincronizar con su KR origen (IdRegistroPadre)
      if (isDelegado) {
        const krOrigenId = oldMain["IdRegistroPadre"];
        const krRef = tasksCol.doc(krOrigenId);
        const krSnap = await krRef.get();

        if (krSnap.exists) {
          const krData = krSnap.data();
          const krOldName = norm(krData["Nombre Tarea"]);

          // KR origen nuevo nombre = prefijo KR + texto del OKR (sin prefijo OKR)
          const krPrefix = getPrefix(krOldName);       // ej "KR 1.1 "
          const baseFromOKR = stripPrefix(okrNewName); // texto sin "OKR 1 "
          const krNewName = norm(`${krPrefix}${baseFromOKR}`);

          // Actualizar KR origen + recomputo Periodo/Trimestres
          const mergedOrigen = {
            ...krData,
            "Nombre Tarea": krNewName,
            "KR Padre": krNewName
          };
          const extraOrigen = computePeriodoAndTrimestres(mergedOrigen);

          batch.update(krRef, {
            "Nombre Tarea": krNewName,
            "KR Padre": krNewName,
            ...extraOrigen
          });

          // KR Padre del OKR delegado debe ser el nombre nuevo del KR origen
          okrUpdate["KR Padre"] = krNewName;

          // (Opcional) Alinear otros OKR delegados hermanos del mismo KR origen
          const okrHermanos = await tasksCol.where("IdRegistroPadre", "==", krOrigenId).get();
          for (const okrHDoc of okrHermanos.docs) {
            const okrHData = okrHDoc.data();
            const okrHOldName = norm(okrHData["Nombre Tarea"]);
            const okrHPrefix = getPrefix(okrHOldName);
            const okrHNewName = norm(`${okrHPrefix}${baseFromOKR}`);

            const mergedHermano = {
              ...okrHData,
              "Nombre Tarea": okrHNewName,
              "KR Padre": krNewName
            };
            const extraHermano = computePeriodoAndTrimestres(mergedHermano);

            batch.update(okrHDoc.ref, {
              "Nombre Tarea": okrHNewName,
              "KR Padre": krNewName,
              ...extraHermano
            });

            // y sus KRs hijos también
            const hijosDeHermano = await tasksCol
              .where("Tipo", "==", "KR")
              .where("Objetivo Padre", "==", okrHOldName)
              .get();

            hijosDeHermano.forEach(h => {
              batch.update(h.ref, { "Objetivo Padre": okrHNewName });
            });
          }
        }
      }

      // B4) Finalmente actualizar OKR principal + recomputo Periodo/Trimestres
      const mergedMain = { ...oldMain, ...okrUpdate, "Nombre Tarea": okrNewName };
      const extraMain = computePeriodoAndTrimestres(mergedMain);

      batch.update(mainRef, { ...okrUpdate, ...extraMain });

      await batch.commit();
      return res.json({ success: true });
    }

    return res.status(400).json({ error: "Tipo de tarea inválido" });

  } catch (err) {
    console.error("Error update-task:", err);
    return res.status(500).json({ error: err.message });
  }
});

// POST: Eliminar Tarea
app.post('/api/delete-task', async (req, res) => {
  const { taskId } = req.body;
  try {
    await db.collection('tasks').doc(taskId).delete();
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/tasks/all', async (req, res) => {
  try {
    const snapshot = await db.collection('tasks').get();
    const tasks = snapshot.docs.map(doc => doc.data());
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = 3001;
app.listen(PORT, () => console.log(`Servidor Firestore activo en puerto ${PORT}`));