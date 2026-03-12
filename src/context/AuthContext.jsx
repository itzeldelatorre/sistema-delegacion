import { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../config/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { getApp } from "firebase/app";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [role, setRole] = useState(null);
  const [employeeData, setEmployeeData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      // ... dentro de onAuthStateChanged ...
      if (firebaseUser) {
        setUser(firebaseUser);
        try {
          const userRef = doc(db, "usuarios", firebaseUser.uid);
          const userSnap = await getDoc(userRef);

          if (userSnap.exists()) {
            const uData = userSnap.data();
            setUserData(uData);
            setRole(uData.rol);

            if (uData.numeroEmpleado) {
              // Convertimos a string y limpiamos espacios
              const empId = String(uData.numeroEmpleado).trim();
              const empRef = doc(db, "empleados", empId);

              try {
                const token = await firebaseUser.getIdToken(true);
                
                const empSnap = await getDoc(empRef);
                if (empSnap.exists()) {
                  setEmployeeData(empSnap.data());
                } else {
                  console.error("Error al obtener los datos.");
                }
              } catch (err) {
                // Si llega aquí con las reglas nuevas, es un problema de red o de inicialización
                console.error("Error al acceder a la colección empleados:", err);
              }
            }
          }
        } catch (error) {
          console.error("Error cargando usuario:", error);
        }
      } else {
        // Limpiar estados al cerrar sesión
        setUser(null);
        setUserData(null);
        setRole(null);
        setEmployeeData(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const value = {
    user,
    userData,
    role,
    employeeData,
    loading,
    isAdmin: role === 'admin'
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe usarse dentro de un AuthProvider");
  }
  return context;
}