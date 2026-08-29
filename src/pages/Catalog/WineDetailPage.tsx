import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../api/api';

export default function WineDetailPage() {
  const { slug = '' } = useParams();
  const { data: wine, isLoading, error } = useQuery({
    queryKey: ['catalog-wine', slug], queryFn: () => api.catalog.detail(slug), enabled: Boolean(slug),
  });

  if (isLoading) return <main className="mx-auto min-h-[60vh] max-w-7xl px-5 py-16">Carregando vinho...</main>;
  if (error || !wine) return <main className="mx-auto min-h-[60vh] max-w-7xl px-5 py-16"><p>Vinho não encontrado.</p><Link className="mt-4 inline-block text-[#851329]" to="/catalogo">← Voltar ao catálogo</Link></main>;

  const image = wine.images.find((item) => item.isPrimary)?.path ?? wine.imagePath;
  return (
    <main className="mx-auto max-w-7xl px-5 py-12">
      <Link className="text-sm font-semibold text-[#851329]" to="/catalogo">← Voltar ao catálogo</Link>
      <section className="mt-7 grid overflow-hidden rounded-3xl border border-[#dfd0bd] bg-white shadow-xl lg:grid-cols-2">
        <div className="grid min-h-[420px] place-items-center bg-[radial-gradient(circle,#f2dfc1,#cfae79)]">
          {image ? <img className="h-full max-h-[650px] w-full object-cover" src={image} alt={wine.name} /> : <span className="font-playfair text-9xl text-[#851329]/35">V</span>}
        </div>
        <div className="p-8 lg:p-12">
          <span className="text-sm font-bold uppercase tracking-[0.25em] text-[#9a6a2d]">{wine.type}</span>
          <h1 className="mt-3 font-playfair text-5xl font-semibold text-[#5b0c1b]">{wine.name}</h1>
          <p className="mt-6 leading-7 text-[#66534f]">{wine.description}</p>
          <dl className="mt-8 grid grid-cols-2 gap-5 border-y border-[#eee3d5] py-6 text-sm">
            <div><dt className="font-bold text-[#5b0c1b]">Uvas</dt><dd className="mt-1 text-[#715f59]">{wine.grapes}</dd></div>
            <div><dt className="font-bold text-[#5b0c1b]">Volume</dt><dd className="mt-1 text-[#715f59]">{wine.volumeMl} ml</dd></div>
            <div><dt className="font-bold text-[#5b0c1b]">Teor alcoólico</dt><dd className="mt-1 text-[#715f59]">{wine.alcoholPercentage}% vol</dd></div>
            <div><dt className="font-bold text-[#5b0c1b]">Origem</dt><dd className="mt-1 text-[#715f59]">{wine.winery ? `${wine.winery.name} · ${wine.winery.city}/${wine.winery.state}` : 'VINUM'}</dd></div>
          </dl>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-playfair text-3xl font-semibold text-[#5b0c1b]">Safras e procedência</h2>
        {wine.vintages.length === 0 ? <p className="mt-4 text-[#715f59]">Nenhuma safra publicada para este vinho.</p> : <div className="mt-5 grid gap-5 md:grid-cols-2">
          {wine.vintages.map((vintage) => <article key={vintage.id} className="rounded-2xl border border-[#dfd0bd] bg-white p-6">
            <h3 className="font-playfair text-2xl text-[#851329]">Safra {vintage.year}</h3>
            <p className="mt-2 text-sm text-[#715f59]">{vintage.identifier} · {vintage.status}</p>
            {vintage.observations && <p className="mt-4 text-sm leading-6 text-[#66534f]">{vintage.observations}</p>}
            {vintage.batches.map((batch) => <div key={batch.code} className="mt-4 rounded-xl bg-[#f7f2eb] p-4 text-sm"><strong>Lote {batch.code}</strong><span className="ml-2 text-[#715f59]">Produzido em {new Date(`${batch.productionDate}T00:00:00`).toLocaleDateString('pt-BR')}</span></div>)}
          </article>)}
        </div>}
      </section>
    </main>
  );
}
