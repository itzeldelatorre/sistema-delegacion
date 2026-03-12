import React, { useState, useEffect } from 'react';
import { db } from '../config/firebase';
import { collection, addDoc, updateDoc, doc, getDocs, query, where, deleteDoc, setDoc, writeBatch } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';

// Importación de tus componentes de estilo originales
import TitleMainSectionAdmin from '../components/TitleMainSectionAdmin';
import TablaObjetivos from '../components/TablaObjetivos';
import AgregarTarea from '../components/modals/AgregarTarea';

import ConfirmModal from "../components/modals/ConfirmModal";
import NotificationModal from "../components/modals/NotificationModal";
import { stripNomenclature } from "../utils/nomenclature";

import * as XLSX from "xlsx";

const DashboardAdmin = () => {
    const { employeeData } = useAuth();

    // ESTADOS
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState(null);
    const [allTasks, setAllTasks] = useState([]);
    const [allEmployees, setAllEmployees] = useState([]);
    const [selectedArea, setSelectedArea] = useState(employeeData?.area || 'ESTRATEGIA Y GESTION CORPORATIVA');
    const [loading, setLoading] = useState(true);

    const [confirmOpen, setConfirmOpen] = useState(false);
    const [taskToDelete, setTaskToDelete] = useState(null);

    const [delegationToRemove, setDelegationToRemove] = useState(null);
    const [removeDelegationOpen, setRemoveDelegationOpen] = useState(false);

    const [notification, setNotification] = useState({
        open: false,
        type: "success", // "success" | "error" | "info"
        title: "",
        message: ""
    });

    const openNotification = ({ type = "success", title = "", message = "" }) => {
        setNotification({ open: true, type, title, message });
    };

    const closeNotification = () => {
        setNotification(prev => ({ ...prev, open: false }));
    };

    // 1. Cargar Datos (Tareas y Empleados)
    const fetchData = async () => {
        setLoading(true);
        try {
            // Cargar todos los empleados para el modal
            const empSnap = await getDocs(collection(db, "empleados"));
            setAllEmployees(empSnap.docs.map(d => ({ uid: d.id, ...d.data() })));

            // Cargar tareas del área seleccionada
            const q = query(collection(db, "tasks"), where("area", "==", selectedArea));
            const taskSnap = await getDocs(q);
            setAllTasks(taskSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (error) {
            console.error("Error al cargar datos:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [selectedArea]);

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

            // 1. Tarea Principal (la que estamos creando/editando)
            const mainRef = doc(db, "tasks", docId);
            batch.set(mainRef, {
                ...payload,
                idTarea: docId,
                fechaActualizacion: new Date().toISOString()
            }, { merge: true });

            // 2. LÓGICA DE CASCADA (Solo si estamos editando una tarea existente)
            if (selectedTask?.idTarea) {
                const oldName = selectedTask.nombreTarea;
                const newName = payload.nombreTarea;

                if (oldName !== newName) {
                    // A) Buscar hijos por ID (tareas delegadas que apuntan a este ID como padre)
                    const qHijosPorId = query(collection(db, "tasks"), where("idTareaPadre", "==", docId));
                    const hijosPorIdSnap = await getDocs(qHijosPorId);

                    hijosPorIdSnap.forEach((hijoDoc) => {
                        const hijoData = hijoDoc.data();
                        // Extraer prefijo del hijo (ej: "OKR 3")
                        const prefijoHijo = hijoData.nombreTarea.match(/^(OKR|KR|KPI|Sub-KPI)\s+(\d+(?:\.\d+)*)\b/i)?.[0] || "";
                        // Extraer texto limpio del nuevo nombre (quitando el prefijo del padre)
                        const textoLimpio = stripNomenclature(newName);

                        batch.update(hijoDoc.ref, {
                            krPadre: newName // Actualizamos la referencia al nombre del padre
                        });
                    });

                    // B) Buscar hijos por TEXTO (KRs que pertenecen a un OKR del mismo usuario)
                    const qHijosPorTexto = query(collection(db, "tasks"), where("objetivoPadre", "==", oldName));
                    const hijosPorTextoSnap = await getDocs(qHijosPorTexto);

                    hijosPorTextoSnap.forEach((hijoDoc) => {
                        batch.update(hijoDoc.ref, {
                            objetivoPadre: newName
                        });
                    });
                }
            }

            await batch.commit();
            setIsModalOpen(false);
            setSelectedTask(null);
            fetchData();
        } catch (error) {
            console.error("Error al guardar en cascada:", error);
        }
    };

    // 3. Funciones para la Tabla
    const handleAddChild = (parentTask) => {
        const isKPI = parentTask.tipo === 'KPI' || parentTask.tipo === 'Sub-KPI';

        setSelectedTask({
            tipo: isKPI ? 'Sub-KPI' : 'KR',
            objetivoPadre: parentTask.nombreTarea,
            idTareaPadre: parentTask.id, // doc id
            area: selectedArea,
            unidadMedida: parentTask.unidadMedida,

            // ✅ responsable por defecto heredado
            correoEncargado: parentTask.correoEncargado || '',
            nombreEncargado: parentTask.nombreEncargado || '',
            numeroEmpleadoEncargado: parentTask.numeroEmpleadoEncargado || '',
        });

        setIsModalOpen(true);
    };

    const handleEdit = (task) => {
        setSelectedTask({ ...task, idTarea: task.id });
        setIsModalOpen(true);
    };


    const handleDelete = (task) => {
        console.log("Delete requested:", task);
        setTaskToDelete(task);
        setConfirmOpen(true);
    };

    const downloadExcel = async () => {
        try {
            const snap = await getDocs(collection(db, "tasks"));
            const tasksForExport = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

            if (!tasksForExport || tasksForExport.length === 0) {
                openNotification({
                    type: "info",
                    title: "Sin datos",
                    message: "No hay tareas para exportar."
                });
                return;
            }

            const wb = XLSX.utils.book_new();

            const tasksByArea = tasksForExport.reduce((acc, task) => {
                const area = task.area || "SIN_AREA";
                if (!acc[area]) acc[area] = [];
                acc[area].push(task);
                return acc;
            }, {});

            Object.entries(tasksByArea).forEach(([areaName, areaTasks]) => {
                const rows = areaTasks.map((t) => ({
                    "Nombre Tarea": t.nombreTarea || "",
                    "Tipo": t.tipo || "",
                    "Objetivo Padre": t.objetivoPadre || "",
                    "KR Padre": t.krPadre || "",
                    "ID Tarea": t.idTarea || "",
                    "ID Tarea Padre": t.idTareaPadre || "",
                    "Responsable": t.nombreEncargado || "",
                    "Correo Responsable": t.correoEncargado || "",
                    "Número Empleado": t.numeroEmpleadoEncargado || "",
                    "Área": t.area || "",
                    "Unidad de Medida": t.unidadMedida || "",
                    "Orientación": t.orientacion || "",
                    "Valor Inicial": t.valorInicial ?? "",
                    "Meta Q1": t.metaQ1 ?? "",
                    "Meta Q2": t.metaQ2 ?? "",
                    "Meta Q3": t.metaQ3 ?? "",
                    "Meta Q4": t.metaQ4 ?? "",
                    "Meta Anual": t.metaAnual ?? "",
                    "Periodo": t.periodo || "",
                    "Trimestres Aplicables": t.trimestresAplicables || "",
                    "Fecha Actualización": t.fechaActualizacion || "",
                }));

                const ws = XLSX.utils.json_to_sheet(rows);

                ws["!cols"] = [
                    { wch: 12 }, { wch: 40 }, { wch: 28 }, { wch: 30 }, { wch: 18 },
                    { wch: 28 }, { wch: 18 }, { wch: 14 }, { wch: 12 }, { wch: 10 },
                    { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 12 },
                    { wch: 18 }, { wch: 40 }, { wch: 22 }, { wch: 40 }, { wch: 22 }, { wch: 24 }
                ];

                const safeSheetName = areaName.substring(0, 31).replace(/[\\/?*[\]]/g, "");
                XLSX.utils.book_append_sheet(wb, ws, safeSheetName);
            });

            const today = new Date().toISOString().slice(0, 10);
            XLSX.writeFile(wb, `Reporte_Estrategico_Global_${today}.xlsx`);

            openNotification({
                type: "success",
                title: "Excel generado",
                message: "Se descargó el reporte global correctamente."
            });
        } catch (err) {
            console.error("Error al descargar Excel:", err);
            openNotification({
                type: "error",
                title: "Error",
                message: "No se pudo generar el archivo Excel."
            });
        }
    };

    const handleDelegate = (task) => {
        const rootType = task.tipo === "Sub-KPI" ? "KPI" : "OKR"; // Sub-KPI => KPI, KR => OKR

        setSelectedTask({
            // 1) lo mínimo necesario del origen
            isDelegating: true,
            idTarea: null,                 // nuevo doc
            tipo: rootType,                // fuerza lo que vamos a crear

            // 2) link técnico al origen
            idTareaPadre: task.idTarea,    // KR/Sub-KPI origen

            // 3) referencia humana (para que el modal muestre "Origen:")
            krPadre: task.nombreTarea,     // "KR 1.1 ..." o "KPI 1.1 ..."

            // 4) opcional: si quieres saber “de qué venía” (pero si NO quieres que raíces tengan objetivoPadre, déjalo vacío)
            objetivoPadre: task.objetivoPadre,             // <- recomendado: raíces delegadas SIN objetivoPadre
            // objetivoPadre: task.nombreTarea, // <- alternativa si SÍ quieres guardar el nombre del origen como padre

            // 5) heredar responsable (lo normal al delegar)
            correoEncargado: task.correoEncargado,
            nombreEncargado: task.nombreEncargado,
            numeroEmpleadoEncargado: task.numeroEmpleadoEncargado,

            // 6) heredar configuración útil
            unidadMedida: task.unidadMedida,
            orientacion: task.orientacion,

            // 7) limpiar campos de “contenido” para que sea nuevo
            nombreTarea: task.nombreTarea,               // el modal construye prefijo + descripción
            valorInicial: task.valorInicial ?? "",
            metaQ1: task.metaQ1 ?? "",
            metaQ2: task.metaQ2 ?? "",
            metaQ3: task.metaQ3 ?? "",
            metaQ4: task.metaQ4 ?? "",
            metaAnual: task.metaAnual ?? "",

            // 8) área/periodo
            area: selectedArea,
            periodo: "AF26",
        });

        setIsModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!taskToDelete?.id) return;

        try {
            const batch = writeBatch(db);

            // 1) borrar principal
            const mainRef = doc(db, "tasks", taskToDelete.id);
            batch.delete(mainRef);

            // 2) borrar hijos por idTareaPadre
            const qHijos = query(collection(db, "tasks"), where("idTareaPadre", "==", taskToDelete.id));
            const hijosSnap = await getDocs(qHijos);

            hijosSnap.forEach((d) => batch.delete(d.ref));

            await batch.commit();

            setConfirmOpen(false);
            setTaskToDelete(null);

            openNotification({
                type: "success",
                title: "Eliminado",
                message: `Se eliminó "${taskToDelete.nombreTarea}" y ${hijosSnap.size} dependencias.`
            });

            fetchData();
        } catch (error) {
            console.error("Error eliminando en cascada:", error);
            openNotification({
                type: "error",
                title: "Error",
                message: "No se pudo eliminar el registro."
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

            // borrar el OKR/KPI delegado
            const mainRef = doc(db, "tasks", delegationToRemove.id);
            batch.delete(mainRef);

            // borrar también sus hijos (KRs o Sub-KPIs)
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

            fetchData();
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

            {/* Tu componente original con toda la lógica de botones y selector */}
            <TitleMainSectionAdmin
                area={selectedArea}
                setArea={setSelectedArea}
                downloadExcel={downloadExcel}
                handleOpenNewOKR={() => {
                    setSelectedTask(null);
                    setIsModalOpen(true);
                }}
            />

            {/* Espacio para la Tabla */}
            {loading ? (
                <div className="text-center py-20 text-slate-400 font-medium">
                    Cargando objetivos de {selectedArea}...
                </div>
            ) : (
                <TablaObjetivos
                    tasks={allTasks}
                    empleados={allEmployees}
                    role="admin"
                    onDelegate={handleDelegate}
                    onAddKR={handleAddChild}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onRemoveDelegation={handleRequestRemoveDelegation}
                    hideOwnerHeader={false}
                />
            )}

            {/* Modal de Registro */}
            <AgregarTarea
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setSelectedTask(null);
                }}
                onSave={handleSaveTask}
                initialData={selectedTask}
                allEmployees={allEmployees}
                currentArea={selectedArea}
                allTasks={allTasks}
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

export default DashboardAdmin;