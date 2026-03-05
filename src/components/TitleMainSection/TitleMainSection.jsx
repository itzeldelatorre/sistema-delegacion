import React from "react";

const TitleMainSection = ({ area }) => {
  return (
    <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-bold text-slate-800 md:text-2xl">{area}</h2>
    </section>
  );
};

export default TitleMainSection;