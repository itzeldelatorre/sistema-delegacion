import { Target, Users } from "lucide-react";

export default function HomeColaborador({
  tasks,
  onOpenNewTask,
  employeeData,
  user
}) {
  const mias = tasks.filter(t => t.encargadoEmail === user?.email || t["Correo encargado"] === user?.email);
  // Si ya migras bien a Firestore: t.encargadoUid === user.uid

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Mis Objetivos</h2>
          <p className="text-slate-500 text-sm">
            Bienvenido, {employeeData?.nombreCompleto}. Aquí ves tus objetivos y (si aplica) tu equipo.
          </p>
        </div>

        <button
          onClick={onOpenNewTask}
          className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-200"
        >
          <Target size={18} /> Nuevo Objetivo
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Stat label="Mi área" value={employeeData?.area || "—"} />
        <Stat label="Mis objetivos" value={String(mias.length)} />
        <Stat label="Departamento" value={employeeData?.departamento || "—"} icon={<Users />} />
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-5">
        <h3 className="font-bold text-slate-800">Tip</h3>
        <p className="text-sm text-slate-500 mt-1">
          Para que “equipo” funcione perfecto, guarda en tareas el <b>jefeUid</b> y el <b>encargadoUid</b>.
        </p>
      </div>
    </div>
  );
}

function Stat({ label, value, icon }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center gap-4">
      {icon ? <div className="text-blue-600">{icon}</div> : null}
      <div>
        <p className="text-xs font-bold text-slate-400 uppercase">{label}</p>
        <p className="text-lg font-black text-slate-800">{value}</p>
      </div>
    </div>
  );
}