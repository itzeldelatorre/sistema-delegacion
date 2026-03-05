import { useRef, useState, useEffect, useCallback } from 'react';
import { auth, db } from './config/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { generateNextName } from './utils/nomenclature';
import ConfirmModal from "./components/ConfirmModal";
import NotificationModal from "./components/NotificationModal";
import Login from './components/Login';
import Header from './components/Header';
import TitleMainSection from './components/TitleMainSection/TitleMainSection';
import TitleMainSectionAdmin from './components/TitleMainSection/TitleMainSectionAdmin';
import TablaObjetivos from './components/TablaObjetivos'

import './App.css'

import { X, Target} from 'lucide-react';
import * as XLSX from 'xlsx';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState(null);
  const [employeeData, setEmployeeData] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [allAreaTasks, setAllAreaTasks] = useState([]);
  const [area, setArea] = useState('');
  const [loadingTasks, setLoadingTasks] = useState(false);
  
  const [showNewModal, setShowNewModal] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedKR, setSelectedKR] = useState(null);
  const [targetEmployee, setTargetEmployee] = useState('');

  const [isEditing, setIsEditing] = useState(false);
  const [currentTaskId, setCurrentTaskId] = useState(null);

  const [bossKRs, setBossKRs] = useState([]);

  const [hasExistingDelegation, setHasExistingDelegation] = useState(false);

  const DEFAULT_AREA = 'GESTION DE TALENTO';

  const [notification, setNotification] = useState({
    open: false,
    type: "info",
    title: "",
    message: "",
    autoCloseMs: 2500,
  });

  const notify = useCallback((type, message, title = "", autoCloseMs = 2500) => {
    setNotification({ open: true, type, title, message, autoCloseMs });
  }, []);

  const closeNotification = () =>
  setNotification((prev) => ({ ...prev, open: false }));

  const confirmResolverRef = useRef(null);

  const [confirmState, setConfirmState] = useState({
    open: false,
    title: "",
    message: "",
    confirmText: "Confirmar",
    cancelText: "Cancelar",
    danger: false,
  });

  const askConfirm = useCallback(
    ({ title, message, confirmText, cancelText, danger } = {}) => {
      return new Promise((resolve) => {
        confirmResolverRef.current = resolve;
        setConfirmState({
          open: true,
          title: title || "Confirmar acción",
          message: message || "",
          confirmText: confirmText || "Confirmar",
          cancelText: cancelText || "Cancelar",
          danger: !!danger,
        });
      });
    },
    []
  );

  const closeConfirm = useCallback((result) => {
    setConfirmState((prev) => ({ ...prev, open: false }));
    if (confirmResolverRef.current) {
      confirmResolverRef.current(result);
      confirmResolverRef.current = null;
    }
  }, []);

  const [formData, setFormData] = useState({
    nombre: '', tipo: 'OKR', unidad: 'Porcentaje (%)', orientacion: 'Incremento',
    vInicial: 0, q1: '', q2: '', q3: '', q4: '', anual: '', objetivoPadre: '', krPadre: '', krPadreId: '',
    asignadoEmail: '', asignadoNombre: '', asignadoNumero: ''
  });

  // Función auxiliar para hacer peticiones autenticadas
  const authenticatedFetch = useCallback(async (url, options = {}) => {
    if (!auth.currentUser) return null;

    try {
      // Obtenemos el Token de Firebase (se refresca solo si expiró)
      const token = await auth.currentUser.getIdToken();
      
      const res = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });

      if (res.status === 401 || res.status === 403) {
        console.error("Sesión inválida");
        return null;
      }

      return res.json();
    } catch (err) {
      console.error("Error en la petición autenticada:", err);
      return null;
    }
  }, []);

  // --- CARGA DE DATOS ---
  const fetchTasks = useCallback(async () => {
    if (!user || !area) return;
    
    setLoadingTasks(true);
    try {
      const token = await user.getIdToken(); 

      const res = await fetch(`/api/tasks?area=${encodeURIComponent(area)}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      let data = await res.json();

      setAllAreaTasks(Array.isArray(data) ? data : []);

      // --- LÓGICA DE FILTRADO POR ROL ---
      // Si NO es admin, solo dejamos las tareas donde el correo coincida con el del usuario logueado
      if (role !== 'admin') {
        data = data.filter(task => 
          task['Correo encargado']?.trim().toLowerCase() === user.email?.trim().toLowerCase()
        );
      }

      setTasks(data);
    } catch (err) {
      console.error("Error tareas:", err);
    } finally {
      setLoadingTasks(false);
    }
  }, [area, user, role]);

  // --- LÓGICA DE KR PADRE DINÁMICO ---
  const handleAsignadoChange = (email) => {
    const emp = employees.find(e => e['CorreoElectronicoCorporativo'] === email);
    if (emp) {
      setFormData(prev => ({
        ...prev,
        asignadoEmail: email,
        asignadoNombre: emp['NombreCompleto'],
        asignadoNumero: emp['NumeroEmpleado'] || emp['Numero de Empleado']
      }));

      const jefeNombre = emp['NombreJefe'];
      // Buscamos en todas las tareas cargadas aquellas que pertenezcan al jefe
      const jefeKRs = allAreaTasks.filter(t => 
        t['Nombre encargado']?.trim().toLowerCase() === jefeNombre?.trim().toLowerCase()
      );
      setBossKRs(jefeKRs);
    }
  };

  const handleOpenDelegate = (kr) => {
    setSelectedKR(kr);
    setTargetEmployee("");

    const existingDelegation = allAreaTasks.find(
      (t) => t.Tipo === "OKR" && t.IdRegistroPadre === kr.IdRegistro
    );

    setHasExistingDelegation(!!existingDelegation); // ✅ esto define si fue "reasignar"
    setShowModal(true);
  };

  const handleRemoveDelegation = async () => {
    if (!selectedKR) return;

    const ok = await askConfirm({
      title: "Quitar delegación",
      message: "Se eliminará el OKR delegado y sus KRs hijos. ¿Deseas continuar?",
      confirmText: "Quitar",
      cancelText: "Cancelar",
      danger: true,
    });
    if (!ok) return;

    const r = await authenticatedFetch("/api/delegate/remove", {
      method: "POST",
      body: JSON.stringify({ krId: selectedKR.IdRegistro }),
    });

    if (r?.success) {
      notify("success", "Delegación eliminada correctamente.");
      setShowModal(false);
      fetchTasks();
    }
  };

  const getSubordinates = (bossEmail, allEmployees) => {
    if (!bossEmail || !allEmployees.length) return [];
    const bossAccount = allEmployees.find(emp => 
      emp['CorreoElectronicoCorporativo']?.trim().toLowerCase() === bossEmail.trim().toLowerCase()
    );
    if (!bossAccount) return [];
    const bossName = bossAccount['NombreCompleto'];
    return allEmployees.filter(emp => 
      emp['NombreJefe']?.trim().toLowerCase() === bossName.trim().toLowerCase()
    );
  };

  // --- FUNCION PARA AGREGAR KR DESDE LA TABLA ---
  const handleAddNewKR = (parentObjective) => {
    // Buscamos en la lista de empleados los datos de la persona que ya es responsable del OKR padre
    const responsibleEmail = parentObjective['Correo encargado'];
    const responsibleData = employees.find(
      e => e['CorreoElectronicoCorporativo']?.toLowerCase() === responsibleEmail?.toLowerCase()
    );

    setFormData({
      ...formData,
      tipo: 'KR',
      // ASIGNACIÓN: Usamos los datos del dueño del OKR padre
      asignadoEmail: responsibleEmail,
      asignadoNombre: responsibleData?.['NombreCompleto'] || parentObjective['Nombre encargado'],
      asignadoNumero: responsibleData?.['NumeroEmpleado'] || responsibleData?.['Numero de Empleado'] || parentObjective['Numero de empleado encargado'],
      
      // JERARQUÍA
      objetivoPadre: parentObjective['Nombre Tarea'],
      krPadre: parentObjective['Nombre Tarea'], 
      nombre: ""
    });

    // Importante: Si el responsable del OKR tiene jefe, cargamos los KRs de ese jefe para el selector
    if (responsibleEmail) {
      handleAsignadoChange(responsibleEmail);
    }

    setShowNewModal(true);
  };

  // --- FUNCION PARA ABRIR MODAL CON OPCION OKR PREDEFINIDA ---
  const handleOpenNewOKR = () => {
    setFormData({
      nombre: '', 
      tipo: 'OKR', // <--- Forzamos que sea OKR
      unidad: 'Porcentaje (%)', 
      orientacion: 'Incremento',
      vInicial: 0, q1: '', q2: '', q3: '', q4: '', anual: '', 
      objetivoPadre: '', 
      krPadre: '', 
      asignadoEmail: '', // Limpiamos el responsable para que el admin lo elija
      asignadoNombre: '', 
      asignadoNumero: ''
    });
    setBossKRs([]); // Limpiamos la lista de KRs del jefe
    setShowNewModal(true);
  };

  const submitDelegation = async () => {
    const selectedEmployee = employees.find(e => e['CorreoElectronicoCorporativo'] === targetEmployee);

    if (!selectedEmployee) return;

    // ¿ya existe delegado?
    const existing = allAreaTasks.find(t =>
      t.Tipo === "OKR" && t.IdRegistroPadre === selectedKR.IdRegistro
    );

    if (existing) {
      // Reasignar
      const res = await authenticatedFetch('/api/delegate/assign', {
        method: 'POST',
        body: JSON.stringify({
          krId: selectedKR.IdRegistro,
          targetEmployee: {
            email: targetEmployee,
            nombre: selectedEmployee['NombreCompleto'],
            numero: selectedEmployee['NumeroEmpleado'] || selectedEmployee['Numero de Empleado'],
            departamento: selectedEmployee['Departamento'],
            area: selectedEmployee['Area'] || area
          }
        })
      });

      if (res?.success) {
        notify("success", "Delegación reasignada correctamente.");
        setShowModal(false);
        fetchTasks();
      }
      return;
    }
    
    // 1. LOGICA DE NOMENCLATURA:
    // Filtramos las tareas del colaborador DESTINO para que parta de SU última numeración
    const collaboratorTasks = allAreaTasks.filter(t =>
      (t['Correo encargado'] || '').trim().toLowerCase() === targetEmployee.trim().toLowerCase()
    );
    
    const nextName = generateNextName(
      collaboratorTasks, // Pasamos solo las tareas del subordinado
      'OKR', 
      selectedKR['Nombre Tarea'], 
      targetEmployee 
    );

    const newTask = {
      "Nombre Tarea": `${nextName} ${selectedKR['Nombre Tarea'].replace(/^KR \d+\.\d+(\.\d+)? /, '')}`,
      "Objetivo Padre": selectedKR['Objetivo Padre'],
      "KR Padre": selectedKR['Nombre Tarea'],
      "Numero de empleado encargado": selectedEmployee['NumeroEmpleado'] || selectedEmployee['Numero de Empleado'],
      "Nombre encargado": selectedEmployee['NombreCompleto'],
      "Correo encargado": targetEmployee,
      "Tipo": "OKR",
      "Periodo": "AF26",
      "Unidad de Medida": selectedKR['Unidad de Medida'],
      "Orientación": selectedKR['Orientación'],
      "Valor Inicial": selectedKR['Valor Inicial'] || 0,
      "Meta Q1": selectedKR['Meta Q1'],
      "Meta Q2": selectedKR['Meta Q2'],
      "Meta Q3": selectedKR['Meta Q3'],
      "Meta Q4": selectedKR['Meta Q4'],
      "Meta Anual": selectedKR['Meta Anual'],
      "Departamento": selectedEmployee['Departamento'],
      "Area": selectedEmployee['Area'] || area,
      "IdRegistro": `ID-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      "IdRegistroPadre": selectedKR['IdRegistro'] || '',
      "Cálcular Valor Global": "NO" // El hijo nace en NO
    };

    const data = await authenticatedFetch('/api/delegate', {
      method: 'POST',
      body: JSON.stringify({ 
        area, 
        newTask, 
        updateParent: selectedKR['IdRegistro'],
        calcValue: "SI" 
      })
    });

    if (data && data.success) {
      notify("success", "Delegación realizada con éxito.");
      setShowModal(false);
      fetchTasks();
    }
  };

  const handleSaveNewRecord = async () => {
    if (!formData.nombre || !formData.asignadoEmail) {
      notify("warning", "Faltan campos obligatorios.");
      return;
    }

    if (isEditing) {
      const originalTask = tasks.find(t => t['IdRegistro'] === currentTaskId);
  
      // Expresión regular mejorada para capturar OKR X o KR X.X
      const prefixMatch = originalTask['Nombre Tarea'].match(/^(OKR|KR)\s+\d+(\.\d+)*\s+/);
      const prefix = prefixMatch ? prefixMatch[0] : "";

      const updatedFields = {
        "Nombre Tarea": `${prefix}${formData.nombre}`, // Mantiene el número, cambia el texto
        "Unidad de Medida": formData.unidad,
        "Orientación": formData.orientacion,
        "Valor Inicial": formData.vInicial,
        "Meta Q1": formData.q1,
        "Meta Q2": formData.q2,
        "Meta Q3": formData.q3,
        "Meta Q4": formData.q4,
        "Meta Anual": formData.anual,
      };

      console.log("Enviando actualización:", { taskId: currentTaskId, fields: updatedFields });

      const res = await authenticatedFetch('/api/update-task', {
        method: 'POST',
        body: JSON.stringify({ 
          taskId: currentTaskId, // Asegúrate de que currentTaskId tenga el valor del IdRegistro
          updatedFields: updatedFields 
        })
      });

      if (res?.success) {
        setShowNewModal(false);
        setIsEditing(false);
        fetchTasks();
      }
    } else {
      
      // 1. Primero generamos el prefijo (Ej: KR 1.1)
      const nextName = generateNextName(allAreaTasks, formData.tipo, formData.objetivoPadre, formData.asignadoEmail);
      
      // 2. Definimos nombreFinal para poder usarlo en las propiedades de abajo
      const nombreFinal = `${nextName} ${formData.nombre}`;
      
      const newTask = {
        "Nombre Tarea": nombreFinal,
        "Objetivo Padre": formData.objetivoPadre || "",
        "KR Padre": formData.tipo === 'KR' ? nombreFinal : (formData.krPadre || ""),
        "Numero de empleado encargado": formData.asignadoNumero,
        "Nombre encargado": formData.asignadoNombre,
        "Correo encargado": formData.asignadoEmail,
        "Tipo": formData.tipo,
        "Periodo": "AF26",
        "Unidad de Medida": formData.unidad,
        "Orientación": formData.orientacion,
        "Valor Inicial": formData.vInicial || 0,
        "Meta Q1": formData.q1, 
        "Meta Q2": formData.q2, 
        "Meta Q3": formData.q3, 
        "Meta Q4": formData.q4,
        "Meta Anual": formData.anual,
        "Departamento": area, 
        "Area": area,
        "IdRegistro": `ID-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        "Cálcular Valor Global": "NO"
      };

      // BIEN: Usa tu función que ya inyecta el token
      const response = await authenticatedFetch('/api/delegate', {
        method: 'POST',
        body: JSON.stringify({ 
          newTask: newTask, // Enviamos el objeto que construimos arriba
          updateParent: formData.krPadreId || "",
          calcValue: "SI"
        })
      });

      if (response && response.success) {
        notify("success", "Registro creado correctamente.");
        setShowNewModal(false);
        fetchTasks();
      }
    }
  };

  const handleEditClick = (task) => {
    setIsEditing(true);
    setCurrentTaskId(task['IdRegistro']);
    
    // Limpiamos el nombre del prefijo para que el usuario edite solo el texto
    const rawName = task['Nombre Tarea'] || "";
    const nameWithoutPrefix = rawName.replace(/^(OKR|KR)\s+\d+(\.\d+)*\s+/, '');

    setFormData({
      nombre: nameWithoutPrefix,
      tipo: task['Tipo'],
      unidad: task['Unidad de Medida'],
      orientacion: task['Orientación'],
      vInicial: task['Valor Inicial'] || 0,
      q1: task['Meta Q1'] || '',
      q2: task['Meta Q2'] || '',
      q3: task['Meta Q3'] || '',
      q4: task['Meta Q4'] || '',
      anual: task['Meta Anual'] || '',
      asignadoEmail: task['Correo encargado'],
      asignadoNombre: task['Nombre encargado'],
      asignadoNumero: task['Numero de empleado encargado'],
      krPadre: task['KR Padre'],
      objetivoPadre: task['Objetivo Padre']
    });
    setShowNewModal(true);
  };
  
  const handleDeleteTask = async (taskId) => {
    const ok = await askConfirm({
      title: "Eliminar registro",
      message: "Esta acción no se puede deshacer. ¿Deseas continuar?",
      confirmText: "Eliminar",
      cancelText: "Cancelar",
      danger: true,
    });
    if (!ok) return;

    const res = await authenticatedFetch('/api/delete-task', {
      method: 'POST',
      body: JSON.stringify({ taskId }) // Solo enviamos el ID
    });
    if (res?.success) {
      notify("success", "Registro eliminado correctamente.");
      fetchTasks();
    }
  };

  const isBoss = useCallback(() => {
    // Si no hay usuario o empleados cargados, no puede ser jefe
    if (!user || !employees || employees.length === 0) return false;
    
    const userEmailClean = user.email?.trim().toLowerCase();
    
    // 1. Buscamos los datos del usuario logueado en la lista de empleados
    const myEmployeeData = employees.find(e => 
      e['CorreoElectronicoCorporativo']?.trim().toLowerCase() === userEmailClean
    );
    
    // Si el usuario no existe en la tabla de empleados, no es jefe
    if (!myEmployeeData || !myEmployeeData['NombreCompleto']) return false;

    const myName = myEmployeeData['NombreCompleto'].trim().toLowerCase();

    // 2. Verificamos si alguien lo tiene registrado como jefe
    return employees.some(e => 
      e['NombreJefe']?.trim().toLowerCase() === myName
    );
  }, [user, employees]);

  const downloadExcel = useCallback(async () => {
    try {
        // Obtenemos TODAS las tareas de Firestore sin filtro de área para el reporte global
        // Si prefieres solo las de la vista actual, usa la variable 'tasks'
        const token = await auth.currentUser.getIdToken();
        const res = await fetch('/api/tasks/all', { // Crearemos este endpoint o usaremos uno global
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const allTasks = await res.json();

        if (!allTasks || allTasks.length === 0) {
          notify("info", "No hay datos para exportar.");
          return;
        }

        // Crear un nuevo libro de trabajo (Workbook)
        const wb = XLSX.utils.book_new();

        // Agrupar tareas por Departamento
        const tasksByDept = allTasks.reduce((acc, task) => {
            const dept = task.Departamento || task.Area || 'SIN DEPARTAMENTO';
            if (!acc[dept]) acc[dept] = [];
            acc[dept].push(task);
            return acc;
        }, {});

        // Crear una hoja por cada departamento
        Object.entries(tasksByDept).forEach(([deptName, deptTasks]) => {
            // Limpiar el nombre del departamento (máximo 31 caracteres para Excel)
            const sheetName = deptName.substring(0, 31).replace(/[\\/?*[\]]/g, '');

             // 👇 Normalizamos campos para Excel (arrays -> string)
            const deptTasksForExcel = deptTasks.map(t => ({
              ...t,
              // si viene como array ["Q2","Q3"] => "Q2,Q3"
              "Trimestres Aplicables": Array.isArray(t["Trimestres Aplicables"])
                ? t["Trimestres Aplicables"].join(",")
                : (t["Trimestres Aplicables"] ?? ""),
            }));
            
            // Convertir JSON a Hoja (Worksheet)
            const ws = XLSX.utils.json_to_sheet(deptTasksForExcel);
            
            // Añadir la hoja al libro
            XLSX.utils.book_append_sheet(wb, ws, sheetName);
        });

        // Descargar el archivo
        XLSX.writeFile(wb, `Reporte_Estrategico_${new Date().toLocaleDateString()}.xlsx`);
    } catch (err) {
        console.error("Error al descargar Excel:", err);
        notify("warning", "Error al genererar el archivo Excel.");
    }
  }, []);

  useEffect(() => {
    const loadEmployees = async () => {
      if (!user) return;
      const data = await authenticatedFetch('/api/employees');

      if (!Array.isArray(data)) return;

      setEmployees(data);

      // Buscar al usuario logueado en el listado
      const myEmail = user.email?.trim().toLowerCase();
      const me = data.find(e =>
        e['CorreoElectronicoCorporativo']?.trim().toLowerCase() === myEmail
      );

      // Area/Departamento del usuario, o fallback
      const myArea = (me?.['Departamento'] || "").trim();

      setArea(myArea || DEFAULT_AREA);
      setEmployeeData(me || null); // opcional: ya de paso seteas employeeData aquí
    };
    loadEmployees();
  }, [user, authenticatedFetch]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        try {
          const userRef = doc(db, "usuarios", currentUser.uid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            const userData = userSnap.data();
            setRole(userData.role || userData.rol);
            if (employees.length > 0 && userData.numeroEmpleado) {
              const emp = employees.find(e => 
                String(e['NumeroEmpleado'] || e['Numero de Empleado']) === String(userData.numeroEmpleado)
              );
              setEmployeeData(emp);
            }
          }
        } catch (err) { console.error("Error rol:", err); }
      } else {
        setUser(null); 
        setRole(null); 
        setEmployeeData(null); 
        setTasks([]);
        setAllAreaTasks([]);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [employees]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  if (loading) return <div className="h-screen flex items-center justify-center">Cargando sesión...</div>;
  if (!user) return <Login onLoginSuccess={(u) => setUser(u)} />;

  return (
    <div style={{ width: '100%', minHeight: '100vh', display: 'flex', flexDirection: 'column' }} className="bg-slate-50 font-['Inter']">
      
      {/* HEADER */}
      <Header user={user} auth={auth} />

      {/* CONTENIDO PRINCIPAL */}
      <main className="container flex-1 py-6">
        {role === "admin" ? (
          <TitleMainSectionAdmin
            area={area}
            setArea={setArea}
            downloadExcel={downloadExcel}
            handleOpenNewOKR={handleOpenNewOKR}
          />
        ) : (
          <TitleMainSection area={area} />
        )}

        {loadingTasks ? (
           <div style={{ textAlign: 'center', padding: '40px' }}>Cargando datos...</div>
        ) : (
           <TablaObjetivos
            tasks={tasks}
            empleados={employees}
            onDelegate={handleOpenDelegate}
            onRemoveDelegation={async (kr) => {
              const ok = await askConfirm({
                title: "Quitar delegación",
                message: "Se eliminara el OKR delegado. ¿Deseas continuar?",
                confirmText: "Eliminar",
                cancelText: "Cancelar",
                danger: true,
              });
              if (!ok) return;
              const r = await authenticatedFetch('/api/delegate/remove', {
                method: 'POST',
                body: JSON.stringify({ krId: kr.IdRegistro })
              });
              if (r?.success) {
                 notify("success", "Delegación eliminada.");
                fetchTasks();
              }
            }}
            onAddKR={handleAddNewKR}
            onEdit={handleEditClick}
            onDelete={handleDeleteTask}
            role={role}
            canDelegate={isBoss()}
          />
        )}
      </main>

      {/* MODAL NUEVO REGISTRO */}
      {showNewModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '24px', width: '100%', maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto' }} className="shadow-2xl">
            
            <div style={{ padding: '24px 32px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, backgroundColor: 'white' }}>
              <div className="flex items-center gap-3">
                <div style={{ backgroundColor: '#10b981', padding: '8px', borderRadius: '8px' }}><Target className="w-5 h-5 text-white" /></div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 'bold' }}>
                  {isEditing ? 'Editar Registro' : 'Nuevo Registro'}
                </h3>
              </div>
              <X style={{ cursor: 'pointer', color: '#64748b' }} onClick={() => setShowNewModal(false)} />
            </div>

            <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* ASIGNACIÓN Y PADRE */}
              {role === 'admin' ? (
                <div style={{ backgroundColor: '#f0f9ff', padding: '24px', borderRadius: '16px', border: '1px solid #e0f2fe', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="space-y-2">
                      <label style={{ fontSize: '10px', fontWeight: 'bold', color: '#0369a1', textTransform: 'uppercase' }}>Responsable</label>
                      <select 
                          value={formData.asignadoEmail} 
                          onChange={(e) => handleAsignadoChange(e.target.value)}
                          style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                          disabled={isEditing}
                      >
                          <option value="">-- Seleccionar --</option>
                          {/* Filtramos la lista de empleados antes por Departamento seleccionado */}
                          {employees
                            .filter(emp => {
                              // Ajustamos los nombres de las columnas según tu Google Sheet
                              const empArea = emp['Area'] || emp['Departamento'];
                              return empArea === area;
                            })
                            .map((emp, i) => (
                              <option key={i} value={emp['CorreoElectronicoCorporativo']}>
                                {emp.NombreCompleto}
                              </option>
                            ))
                          }
                      </select>
                  </div>
                  <div className="space-y-2">
                      <label style={{ fontSize: '10px', fontWeight: 'bold', color: '#0369a1', textTransform: 'uppercase' }}>KR Padre (Jefe)</label>
                      <select 
                          value={formData.krPadre} 
                          onChange={(e) => {
                              const sel = bossKRs.find(k => k['Nombre Tarea'] === e.target.value);
                              setFormData({...formData, krPadre: e.target.value, krPadreId: sel ? sel['IdRegistro'] : '', objetivoPadre: sel ? sel['Objetivo Padre'] : ''});
                          }}
                          style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                      >
                          <option value="">-- Objetivo Raíz --</option>
                          {bossKRs.map((kr, i) => <option key={i} value={kr['Nombre Tarea']}>{kr['Nombre Tarea']}</option>)}
                      </select>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Responsable (Tú)</label>
                    <div className="p-2 text-sm font-medium text-slate-700">{user.email}</div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Vinculado al Objetivo</label>
                    <div className="p-2 text-sm font-medium text-slate-700">{formData.krPadre}</div>
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>Tipo</label>
                  <select style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }} value={formData.tipo} onChange={e => setFormData({...formData, tipo: e.target.value})}  disabled={isEditing}>
                    <option value="OKR">OKR</option>
                    <option value="KR">KR</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>
                    Nombre Objetivo {isEditing && "(Sin prefijo)"}
                  </label>
                  <input 
                    type="text" 
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }} 
                    value={formData.nombre} // Agregamos el value
                    onChange={e => setFormData({...formData, nombre: e.target.value})} 
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>Unidad</label>
                  <select style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }} onChange={e => setFormData({...formData, unidad: e.target.value})}>
                    <option value="Porcentaje (%)">Porcentaje (%)</option>
                    <option value="Número (#)">Número (#)</option>
                    <option value="Moneda (MXN $)">Moneda (MXN $)</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>Orientación</label>
                  <select style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }} onChange={e => setFormData({...formData, orientacion: e.target.value})}>
                    <option value="Incremento">Incremento</option>
                    <option value="Decremento">Decremento</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px' }}>
                {['vInicial', 'q1', 'q2', 'q3', 'q4'].map(m => (
                  <div key={m}>
                    <label style={{ display: 'block', fontSize: '10px', textAlign: 'center', fontWeight: 'bold' }}>{m.toUpperCase()}</label>
                    <input 
                      type="number" 
                      style={{ width: '100%', padding: '8px', textAlign: 'center', borderRadius: '6px', border: '1px solid #e2e8f0' }} 
                      value={formData[m]} // <--- AGREGA ESTO
                      onChange={e => setFormData({...formData, [m]: e.target.value})} 
                    />
                  </div>
                ))}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#059669' }}>Meta Anual Definitiva</label>
                <input 
                  type="number" 
                  style={{ width: '100%', padding: '16px', fontSize: '1.2rem', fontWeight: 'bold', borderRadius: '12px', border: '2px solid #10b981', backgroundColor: '#ecfdf5' }} 
                  value={formData.anual} // <--- AGREGA ESTO
                  onChange={e => setFormData({...formData, anual: e.target.value})} 
                />
              </div>
            </div>

            <div style={{ padding: '24px 32px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button onClick={() => { setShowNewModal(false); setIsEditing(false);}} style={{ background: 'none', border: 'none', color: '#64748b', fontWeight: 'bold', cursor: 'pointer' }}>Descartar</button>
              <button 
                onClick={handleSaveNewRecord} 
                style={{ 
                  backgroundColor: '#2563eb', // Azul sólido
                  color: '#ffffff',           // Blanco puro
                  border: 'none', 
                  padding: '12px 32px', 
                  borderRadius: '12px', 
                  fontWeight: 'bold', 
                  cursor: 'pointer',
                  boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.2)' 
                }}
              >
                {isEditing ? 'Actualizar Cambios' : 'Guardar en Sistema'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DELEGACIÓN */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)' }}>
           <div style={{ backgroundColor: 'white', borderRadius: '24px', padding: '32px', width: '100%', maxWidth: '450px' }}>
              <h3 style={{ marginTop: 0, fontWeight: "bold" }}>
                {hasExistingDelegation ? "Reasignar delegación" : "Delegar KR"}
              </h3>
              <p style={{ fontSize: "14px", color: "#64748b" }}>
                {hasExistingDelegation ? "Selecciona a quién reasignar:" : "Selecciona el colaborador para delegar:"}{" "}
                <strong>{selectedKR?.["Nombre Tarea"]}</strong>
              </p>
              <select 
                style={{ width: '100%', padding: '12px', borderRadius: '8px', margin: '20px 0' }}
                onChange={e => setTargetEmployee(e.target.value)}
              >
                 <option value="">-- Elige un colaborador --</option>
                 {getSubordinates(selectedKR?.['Correo encargado'], employees).map((emp, i) => (
                    <option key={i} value={emp['CorreoElectronicoCorporativo']}>{emp.NombreCompleto}</option>
                 ))}
              </select>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                {/* Izquierda: acción destructiva solo si ya existe delegación */}
                {hasExistingDelegation && (
                  <button
                    onClick={handleRemoveDelegation}
                    style={{
                      backgroundColor: "#fee2e2",
                      color: "#b91c1c",
                      border: "1px solid #fecaca",
                      padding: "10px 14px",
                      borderRadius: "8px",
                      fontWeight: "bold",
                      cursor: "pointer",
                    }}
                  >
                    Quitar Delegación
                  </button>
                )}

                {/* Derecha: acciones normales */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                  <button
                    onClick={() => setShowModal(false)}
                    style={{ background: 'none', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}
                  >
                    Cancelar
                  </button>

                  <button
                    onClick={submitDelegation}
                    disabled={!targetEmployee}
                    style={{
                      backgroundColor: targetEmployee ? '#2563eb' : '#cbd5e1',
                      color: 'white',
                      border: 'none',
                      padding: '10px 20px',
                      borderRadius: '8px',
                      fontWeight: 'bold',
                      cursor: targetEmployee ? 'pointer' : 'not-allowed'
                    }}
                  >
                    Confirmar
                  </button>
                </div>
              </div>
           </div>
        </div>
      )}

      <ConfirmModal
        open={confirmState.open}
        title={confirmState.title}
        message={confirmState.message}
        confirmText={confirmState.confirmText}
        cancelText={confirmState.cancelText}
        danger={confirmState.danger}
        onCancel={() => closeConfirm(false)}
        onConfirm={() => closeConfirm(true)}
      />

      <NotificationModal
        open={notification.open}
        type={notification.type}
        title={notification.title}
        message={notification.message}
        autoCloseMs={notification.autoCloseMs}
        onClose={closeNotification}
      />
    </div>
  );
}

export default App;