import React from "react";

const TitleMainSection = ({ employeeData }) => {
  return (
    <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

      {/* Titulo */}
      <h2 className="text-lg font-bold text-slate-800 md:text-2xl uppercase border-b border-slate-200 pb-2">
        MIS OBJETIVOS{" "}
        <span className="ml-1 rounded-md bg-blue-100 px-2 py-0.5 text-lg font-semibold text-blue-700 md:ml-2 md:px-3 md:py-1 md:text-2xl">
          {employeeData?.nombreCompleto || "Colaborador"}
        </span>
      </h2>

    </section>
  );
};

export default TitleMainSection;