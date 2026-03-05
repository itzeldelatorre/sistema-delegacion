// src/api/sheetService.js

const TASKS_SHEET_ID = import.meta.env.VITE_GOOGLE_SHEET_ID_TASKS;
const EMPLOYEES_SHEET_ID = import.meta.env.VITE_GOOGLE_SHEET_ID_EMPLOYEES;

// Obtener todos los empleados para el sistema de delegación
export const fetchEmployees = async () => {
  const response = await fetch(`/api/employees`);
  return await response.json();
};

// Obtener tareas filtradas por área
export const fetchTasksByArea = async (areaName) => {
  try {
    // Le enviamos al servidor qué área queremos consultar
    const response = await fetch(`/api/tasks?area=${areaName}`);
    const rawData = await response.json();
    return transformData(rawData); 
  } catch (error) {
    console.error(`Error al obtener tareas del área ${areaName}:`, error);
    return [];
  }
};