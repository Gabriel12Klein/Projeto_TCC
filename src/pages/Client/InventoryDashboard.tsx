import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/api';
import QueryFeedback from '../../ui/QueryFeedback';
import ConsumptionChart from './ConsumptionChart';

function localYear() {
  return new Date().getFullYear();
}

export default function InventoryDashboard() {
  const [year, setYear] = useState(localYear());
  const dashboard = useQuery({
    queryKey: ['customer-inventory-dashboard', year],
    queryFn: () => api.customer.inventoryDashboard(year),
  });

  return (
    <main className="client-section-page mx-auto max-w-6xl px-5 py-10 lg:px-10">
      <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#9a6a2d]">Área do cliente</p>
      <h1 className="mt-2 font-playfair text-4xl text-[#5b0c1b]">Dashboard</h1>
      <section className="mt-8 rounded-3xl bg-[#5b0c1b] p-8 text-white">
        <h2 className="font-playfair text-3xl">Resumo da minha adega</h2>
        <p className="mt-2">
          Acompanhe seus vinhos desde a entrada na adega até o consumo. Novos vinhos podem ser cadastrados em
          Meus vinhos.
        </p>
        <Link
          className="mt-5 inline-block rounded-xl bg-[#d0a565] px-5 py-3 font-semibold text-[#4c151c]"
          to="/vinhos"
        >
          Registrar um novo vinho
        </Link>
      </section>

      <QueryFeedback
        loading={dashboard.isPending}
        error={dashboard.error}
        fetching={dashboard.isFetching}
        loadingText="Carregando dashboard…"
        retry={() => void dashboard.refetch()}
      />
      {dashboard.data && (
        <>
          <section
            className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
            aria-label="Indicadores da adega"
          >
            {[
              ['Total de garrafas adquiridas', dashboard.data.totals.acquiredBottles],
              ['Total de garrafas disponíveis', dashboard.data.totals.availableBottles],
              ['Total de garrafas abertas', dashboard.data.totals.openedBottles],
              ['Total de garrafas consumidas', dashboard.data.totals.consumedBottles],
            ].map(([label, value]) => (
              <article className="rounded-2xl bg-white p-5 shadow-sm" key={label}>
                <strong className="block text-3xl text-[#5b0c1b]">{value}</strong>
                <span className="mt-1 block text-sm text-[#715f59]">{label}</span>
              </article>
            ))}
          </section>
          <section className="mt-8 rounded-3xl bg-white p-6 shadow-sm md:p-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#9a6a2d]">Histórico real</p>
                <h2 className="mt-1 font-playfair text-2xl text-[#5b0c1b]">Consumo mensal</h2>
              </div>
              <label className="text-sm font-semibold text-[#5b0c1b]">
                Ano
                <select
                  className="ml-2 rounded-lg border border-[#d9cbbd] bg-white px-3 py-2"
                  value={dashboard.data.selectedYear}
                  onChange={(event) => setYear(Number(event.target.value))}
                >
                  {dashboard.data.years.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="mt-5 overflow-x-auto">
              <ConsumptionChart data={dashboard.data.monthlyConsumption} year={dashboard.data.selectedYear} />
            </div>
          </section>
        </>
      )}
    </main>
  );
}
