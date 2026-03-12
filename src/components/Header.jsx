import React from "react";
import { LogOut } from "lucide-react";
import { signOut } from "firebase/auth";
import { auth } from "../config/firebase";
import { useAuth } from "../context/AuthContext";

const Header = () => {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full bg-slate-900 shadow-lg">
      <div className="container mx-auto flex h-[70px] items-center justify-between px-4">
        {/* Logo + Título */}
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-white p-2">
            <img src="/icon.png" alt="Logo" className="h-8 w-8" />
          </div>
          <h1 className="m-0 text-xl font-bold text-white sm:text-2xl">
            Delegación de Objetivos
          </h1>
        </div>

        {/* Usuario + Logout */}
        <div className="flex items-center gap-4 sm:gap-6">
          <div className="hidden flex-col items-end md:flex">
            <span className="text-[10px] uppercase text-slate-400">Usuario</span>
            <span className="text-sm font-medium text-white">{user?.email}</span>
          </div>

          <button
            onClick={() => signOut(auth)}
            className="flex items-center gap-2 rounded-lg bg-slate-700 px-3 py-2 text-white hover:bg-slate-600 transition-colors"
            type="button"
          >
            <LogOut className="h-5 w-5 text-white" />
            <span className="hidden md:inline font-bold">Cerrar sesión</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;