import { useAuth } from './context/AuthContext';
import Login from './components/Login';
import Header from './components/Header';
import DashboardAdmin from './pages/DashboardAdmin';
import DashboardColaborador from './pages/DashboardColaborador';

function App() {
  const { user, userData, role, loading } = useAuth();

  if (loading) {
    return <div className="h-screen flex items-center justify-center">Cargando sistema...</div>;
  }

  // Si no hay usuario, mostramos el Login
  if (!user) {
    return <Login />;
  }

  // Si hay usuario pero no hay datos en la colección 'usuarios' (error de flujo)
  if (!userData) {
    return <div className="p-10">Error: Perfil no encontrado. Contacta a soporte.</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Header user={user} />
      
      <main className="container mx-auto items-center py-6">
        {role === 'admin' ? <DashboardAdmin /> : <DashboardColaborador />}
      </main>
    </div>
  );
}

export default App;