import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/api';
import QueryFeedback from '../../ui/QueryFeedback';
import type { InventoryItem } from '../../types';
import ConsumptionChart from './ConsumptionChart';
import InventoryWineCard from './InventoryWineCard';

function localYear() {
  return new Date().getFullYear();
}

export default function InventoryDashboard() {
  const [year, setYear] = useState(localYear());
  const [message, setMessage] = useState('');
  const qc = useQueryClient();
  const dashboard = useQuery({
    queryKey: ['customer-inventory-dashboard', year],
    queryFn: () => api.customer.inventoryDashboard(year),
  });
  const inventory = useQuery({ queryKey: ['customer-inventory'], queryFn: api.customer.inventory });
  const consume = useMutation({
    mutationFn: ({
      id,
      quantityBottles,
      occurredAt,
    }: {
      id: string;
      quantityBottles: number;
      occurredAt: string;
    }) => api.customer.consume(id, { quantityBottles, occurredAt }),
    onSuccess: async () => {
      setMessage('Consumo registrado e painel atualizado.');
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['customer-inventory'] }),
        qc.invalidateQueries({ queryKey: ['customer-inventory-dashboard'] }),
      ]);
    },
    onError: (error) =>
      setMessage(error instanceof Error ? error.message : 'Não foi possível registrar o consumo.'),
  });
  const items = inventory.data ?? [];

  return (
    <main className="client-section-page mx-auto max-w-6xl px-5 py-10 lg:px-10">
      <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#9a6a2d]">Área do cliente</p>
      <h1 className="mt-2 font-playfair text-4xl text-[#5b0c1b]">Meu estoque</h1>
      <section className="mt-8 rounded-3xl bg-[#5b0c1b] p-8 text-white">
        <h2 className="font-playfair text-3xl">Resumo da minha adega</h2>
        <p className="mt-2 text-white">
          Acompanhe compras, consumo e saldo. Novas garrafas entram por Meus pedidos.
        </p>
        <Link
          className="mt-5 inline-block rounded-xl bg-[#d0a565] px-5 py-3 font-semibold text-[#4c151c]"
          to="/pedidos"
        >
          Registrar nova compra
        </Link>
      </section>

      <QueryFeedback
        loading={dashboard.isPending}
        error={dashboard.error}
        fetching={dashboard.isFetching}
        loadingText="Carregando resumo da adega…"
        retry={() => void dashboard.refetch()}
      />
      {dashboard.data && (
        <>
          <section
            className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
            aria-label="Indicadores da adega"
          >
            {[
              ['Garrafas adquiridas', dashboard.data.totals.acquiredBottles],
              ['Garrafas consumidas', dashboard.data.totals.consumedBottles],
              ['Garrafas disponíveis', dashboard.data.totals.availableBottles],
              ['Rótulos registrados', dashboard.data.totals.labelCount],
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

      <section className="mt-8 rounded-3xl bg-white p-6 shadow-sm md:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#9a6a2d]">Saldo por rótulo</p>
        <h2 className="mt-1 font-playfair text-2xl text-[#5b0c1b]">Garrafas disponíveis</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {items.map((item: InventoryItem) => (
            <InventoryWineCard
              key={item.id}
              item={item}
              pending={consume.isPending}
              onConsume={async (input) => {
                setMessage('');
                try {
                  await consume.mutateAsync({ id: item.id, ...input });
                  return true;
                } catch {
                  return false;
                }
              }}
            />
          ))}
        </div>
        <QueryFeedback
          loading={inventory.isPending}
          error={inventory.error}
          fetching={inventory.isFetching}
          empty={!items.length}
          emptyText="Sua adega está vazia. Registre uma compra para adicionar as primeiras garrafas."
          loadingText="Carregando sua adega…"
          retry={() => void inventory.refetch()}
        />
        {message && (
          <p
            className="mt-4 rounded-xl border border-[#dfd0bd] p-4"
            role={consume.isError ? 'alert' : 'status'}
          >
            {message}
          </p>
        )}
      </section>
    </main>
  );
}
