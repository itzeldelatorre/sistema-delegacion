const [role, setRole] = useState(null);
const [employeeData, setEmployeeData] = useState(null);

useEffect(async () => {
  if (user) {
    // 1. Consultar el rol en Firestore
    const userDoc = await getDoc(doc(db, "usuarios", user.uid));
    const userData = userDoc.data();
    setRole(userData.role);

    // 2. Buscar datos extendidos en Google Sheets usando el Numero de Empleado
    const emp = allEmployees.find(e => e['Numero de empleado'] === userData.numeroEmpleado);
    setEmployeeData(emp);
  }
}, [user]);