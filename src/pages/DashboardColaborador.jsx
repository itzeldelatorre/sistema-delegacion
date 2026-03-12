import React, { useState, useEffect, useMemo } from "react";
import { db } from "../config/firebase";
import { collection, query, where, doc, getDocs, writeBatch } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";

import TitleMainSection from "../components/TitleMainSection";
import TablaObjetivos from "../components/TablaObjetivos";
import AgregarTarea from "../components/modals/AgregarTarea";
import ConfirmModal from "../components/modals/ConfirmModal";
import NotificationModal from "../components/modals/NotificationModal";

const DashboardColaborador = () => {
  const { userData, employeeData } = useAuth();

  const [tasks, setTasks] = useState([]);
  const [allEmployees, setAllEmployees] = useState([]);
  const [subordinates, setSubordinates] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);

  const [delegationToRemove, setDelegationToRemove] = useState(null);
  const [removeDelegationOpen, setRemoveDelegationOpen] = useState(false);

  const [notification, setNotification] = useState({
    open: false,
    type: "success",
    title: "",
    message: "",
  });

  const isJefe = userData?.rol === "jefe";
  const isColaborador = userData?.rol === "colaborador";

  const openNotification = ({ type = "success", title = "", message = "" }) => {
    setNotification({ open: true, type, title, message });
  };

  const closeNotification = () => {
    setNotification((prev) => ({ ...prev, open: false }));
  };

  const visibleEmails = useMemo(() => {
    const ownEmail = userData?.email ? [userData.email.toLowerCase()] : [];

    if (!isJefe) return ownEmail;

    const subordinateEmails = subordinates
      .map((emp) => (emp.correoCorporativo || "").toLowerCase())
      .filter(Boolean);

    return [...new Set([...ownEmail, ...subordinateEmails])];
  }, [userData, subordinates, isJefe]);

  const fetchData = async () => {
    if (!userData?.email) return;

    setLoading(true);
    try {
      const empSnap = await getDocs(collection(db, "empleados"));
      const employees = empSnap.docs.map((d) => ({ uid: d.id, ...d.data() }));
      setAllEmployees(employees);

      let subs = [];
      let emailsToQuery = [userData.email.toLowerCase()];

      if (isJefe && userData?.numeroEmpleado) {
        const qSubs = query(
          collection(db, "empleados"),
          where("numeroEmpleadoJefe", "==", userData.numeroEmpleado)
        );
        const subsSnap = await getDocs(qSubs);

        subs = subsSnap.docs.map((d) => ({ uid: d.id, ...d.data() }));
        setSubordinates(subs);

        const subordinateEmails = subs
          .map((emp) => (emp.correoCorporativo || "").toLowerCase())
          .filter(Boolean);

        emailsToQuery = [...new Set([userData.email.toLowerCase(), ...subordinateEmails])];
      } else {
        setSubordinates([]);
      }

      let loadedTasks = [];

      if (isJefe && emailsToQuery.length > 0) {
        const qTasks = query(
          collection(db, "tasks"),
          where("correoEncargado", "in", emailsToQuery)
        );
        const taskSnap = await getDocs(qTasks);
        loadedTasks = taskSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      } else {
        const qTasks = query(
          collection(db, "tasks"),
          where("correoEncargado", "==", userData.email.toLowerCase())
        );
        const taskSnap = await getDocs(qTasks);
        loadedTasks = taskSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      }

      setTasks(loadedTasks);
    } catch (error) {
      console.error("Error al cargar tareas:", error);
      openNotification({
        type: "error",
        title: "Error",
        message: "No se pudieron cargar las tareas.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [userData?.email, userData?.numeroEmpleado, isJefe]);

  // ========= PERMISOS =========
  const canCreateRoot = isJefe;
  const canDelegate = isJefe;

  const canEditTask = (task) => {
    if (isJefe) return true;
    if (isColaborador) return task.tipo === "KR" || task.tipo === "Sub-KPI";
    return false;
  };

  const canDeleteTask = (task) => {
    if (isJefe) return true;
    if (isColaborador) return task.tipo === "KR" || task.tipo === "Sub-KPI";
    return false;
  };

  const canAddChildTo = (parentTask) => {
    if (isJefe) return true;

    if (isColaborador) {
      return parentTask.tipo === "OKR" || parentTask.tipo === "KPI";
    }

    return false;
  };

  // ========= MODAL NUEVO =========
  const handleOpenNew = () => {
    if (!canCreateRoot) return;

    setSelectedTask(null);
    setIsModalOpen(true);
  };

  const handleAddChild = (parentTask) => {
    if (!canAddChildTo(parentTask)) return;

    const isKPI = parentTask.tipo === "KPI" || parentTask.tipo === "Sub-KPI";

    setSelectedTask({
      tipo: isKPI ? "Sub-KPI" : "KR",
      objetivoPadre: parentTask.nombreTarea,
      idTareaPadre: parentTask.id,
      area: employeeData?.area || "",
      unidadMedida: parentTask.unidadMedida,

      correoEncargado: parentTask.correoEncargado || userData?.email || "",
      nombreEncargado: parentTask.nombreEncargado || "",
      numeroEmpleadoEncargado: parentTask.numeroEmpleadoEncargado || userData?.numeroEmpleado || "",
    });

    setIsModalOpen(true);
  };

  const handleEdit = (task) => {
    if (!canEditTask(task)) return;

    setSelectedTask({ ...task, idTarea: task.id });
    setIsModalOpen(true);
  };

  const handleDelegate = (task) => {
    if (!canDelegate) return;

    const rootType = task.tipo === "Sub-KPI" ? "KPI" : "OKR";

    setSelectedTask({
      isDelegating: true,
      idTarea: null,
      tipo: rootType,

      idTareaPadre: task.idTarea,
      objetivoPadre: task.objetivoPadre || "",
      krPadre: task.nombreTarea,

      correoEncargado: task.correoEncargado,
      nombreEncargado: task.nombreEncargado,
      numeroEmpleadoEncargado: task.numeroEmpleadoEncargado,

      unidadMedida: task.unidadMedida,
      orientacion: task.orientacion,

      nombreTarea: task.nombreTarea,
      valorInicial: task.valorInicial ?? "",
      metaQ1: task.metaQ1 ?? "",
      metaQ2: task.metaQ2 ?? "",
      metaQ3: task.metaQ3 ?? "",
      metaQ4: task.metaQ4 ?? "",
      metaAnual: task.metaAnual ?? "",

      area: employeeData?.area || "",
      periodo: "AF26",
    });

    setIsModalOpen(true);
  };

  const handleSaveTask = async (datosFinales) => {
    try {
      const batch = writeBatch(db);
      const docId = datosFinales.idDocumento;
      const { idDocumento, ...payload } = datosFinales;

      if (selectedTask?.isDelegating && payload.idTareaPadre) {
        const delegatedType = payload.tipo;

        const qExistingDelegations = query(
          collection(db, "tasks"),
          where("idTareaPadre", "==", payload.idTareaPadre),
          where("tipo", "==", delegatedType)
        );

        const existingDelegationsSnap = await getDocs(qExistingDelegations);

        const existingDelegations = existingDelegationsSnap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((d) => d.id !== docId);

        if (existingDelegations.length >= 3) {
          openNotification({
            type: "error",
            title: "Límite alcanzado",
            message: "Este registro ya tiene 3 delegaciones activas."
          });
          return;
        }

        const alreadyAssignedToSameEmployee = existingDelegations.some(
          (d) => d.numeroEmpleadoEncargado === payload.numeroEmpleadoEncargado
        );

        if (alreadyAssignedToSameEmployee) {
          openNotification({
            type: "error",
            title: "Delegación duplicada",
            message: "Este registro ya fue delegado a ese colaborador."
          });
          return;
        }
      }

      const mainRef = doc(db, "tasks", docId);
      batch.set(
        mainRef,
        {
          ...payload,
          idTarea: docId,
          fechaActualizacion: new Date().toISOString(),
        },
        { merge: true }
      );

      if (selectedTask?.idTarea) {
        const oldName = selectedTask.nombreTarea;
        const newName = payload.nombreTarea;

        if (oldName !== newName) {
          const qHijosPorId = query(
            collection(db, "tasks"),
            where("idTareaPadre", "==", docId)
          );
          const hijosPorIdSnap = await getDocs(qHijosPorId);

          hijosPorIdSnap.forEach((hijoDoc) => {
            batch.update(hijoDoc.ref, {
              krPadre: newName,
            });
          });

          const qHijosPorTexto = query(
            collection(db, "tasks"),
            where("objetivoPadre", "==", oldName)
          );
          const hijosPorTextoSnap = await getDocs(qHijosPorTexto);

          hijosPorTextoSnap.forEach((hijoDoc) => {
            batch.update(hijoDoc.ref, {
              objetivoPadre: newName,
            });
          });
        }
      }

      await batch.commit();

      setIsModalOpen(false);
      setSelectedTask(null);
      await fetchData();

      openNotification({
        type: "success",
        title: "Guardado",
        message: "El registro se guardó correctamente.",
      });
    } catch (error) {
      console.error("Error al guardar:", error);
      openNotification({
        type: "error",
        title: "Error",
        message: "No se pudo guardar el registro.",
      });
    }
  };

  const handleDelete = (task) => {
    if (!canDeleteTask(task)) return;

    setTaskToDelete(task);
    setConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!taskToDelete?.id) return;

    try {
      const batch = writeBatch(db);

      batch.delete(doc(db, "tasks", taskToDelete.id));

      const qHijos = query(
        collection(db, "tasks"),
        where("idTareaPadre", "==", taskToDelete.id)
      );
      const hijosSnap = await getDocs(qHijos);

      hijosSnap.forEach((d) => batch.delete(d.ref));

      await batch.commit();

      setConfirmOpen(false);
      setTaskToDelete(null);
      await fetchData();

      openNotification({
        type: "success",
        title: "Eliminado",
        message: `Se eliminó "${taskToDelete.nombreTarea}" y ${hijosSnap.size} dependencias.`,
      });
    } catch (error) {
      console.error("Error eliminando:", error);
      openNotification({
        type: "error",
        title: "Error",
        message: "No se pudo eliminar el registro.",
      });
    }
  };

  const handleRequestRemoveDelegation = (delegatedTask) => {
    setDelegationToRemove(delegatedTask);
    setRemoveDelegationOpen(true);
  };

  const confirmRemoveDelegation = async () => {
    if (!delegationToRemove?.id) return;

    try {
      const batch = writeBatch(db);

      const mainRef = doc(db, "tasks", delegationToRemove.id);
      batch.delete(mainRef);

      const qChildren = query(
        collection(db, "tasks"),
        where("idTareaPadre", "==", delegationToRemove.idTarea)
      );

      const childrenSnap = await getDocs(qChildren);

      childrenSnap.forEach((childDoc) => {
        batch.delete(childDoc.ref);
      });

      await batch.commit();

      setRemoveDelegationOpen(false);
      setDelegationToRemove(null);

      openNotification({
        type: "success",
        title: "Delegación eliminada",
        message: `Se quitó la delegación de "${delegationToRemove.nombreEncargado}".`
      });

      await fetchData();
    } catch (error) {
      console.error("Error al quitar delegación:", error);
      openNotification({
        type: "error",
        title: "Error",
        message: "No se pudo quitar la delegación."
      });
    }
  };

  return (
    <div className="container mx-auto py-6 px-4">
      <TitleMainSection
        employeeData={employeeData}
        handleOpenNewOKR={handleOpenNew}
        canCreateRoot={canCreateRoot}
      />

      {loading ? (
        <div className="text-center py-10 text-slate-500">
          Cargando tareas...
        </div>
      ) : (
        
        <TablaObjetivos
          tasks={tasks}
          empleados={allEmployees}
          role={userData?.rol}
          canDelegate={canDelegate}
          onDelegate={handleDelegate}
          onAddKR={handleAddChild}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onRemoveDelegation={handleRequestRemoveDelegation}
          hideOwnerHeader={userData?.rol === "colaborador"}
        />
      )}

      <AgregarTarea
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedTask(null);
        }}
        onSave={handleSaveTask}
        initialData={selectedTask}
        allEmployees={allEmployees}
        currentArea={employeeData?.area || ""}
        allTasks={tasks}
        employeeData={employeeData}
      />

      <ConfirmModal
        open={confirmOpen}
        title="Confirmar eliminación"
        message={`¿Seguro que quieres eliminar "${taskToDelete?.nombreTarea || ""}"? Esta acción no se puede deshacer.`}
        confirmText="Sí, eliminar"
        cancelText="Cancelar"
        onCancel={() => {
          setConfirmOpen(false);
          setTaskToDelete(null);
        }}
        onConfirm={confirmDelete}
      />

      <ConfirmModal
        open={removeDelegationOpen}
        title="Quitar delegación"
        message={`¿Seguro que quieres quitar la delegación de "${delegationToRemove?.nombreEncargado || ""}"? También se eliminarán sus dependencias.`}
        confirmText="Sí, quitar"
        cancelText="Cancelar"
        onCancel={() => {
          setRemoveDelegationOpen(false);
          setDelegationToRemove(null);
        }}
        onConfirm={confirmRemoveDelegation}
      />

      <NotificationModal
        open={notification.open}
        type={notification.type}
        title={notification.title}
        message={notification.message}
        onClose={closeNotification}
      />
    </div>
  );
};

export default DashboardColaborador;