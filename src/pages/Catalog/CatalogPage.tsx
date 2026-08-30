import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../../api/api';

const types = ['', 'Tinto', 'Branco', 'Rosé', 'Espumante'];

export default function CatalogPage() {
  const [query, setQuery] = useState('');
  const [type, setType] = useState('');
  const {
    data: wines = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['catalog', query, type],
    queryFn: () => api.catalog.list({ q: query, type }),
  });

  return (
    <main>
      <section className="bg-[radial-gradient(circle_at_top,#7f1d35,#4c151c_55%,#351416)] px-5 py-20 text-center text-white">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.35em] text-[#dfbd78]">
          Catálogo VINUM
        </p>
        <h1 className="font-playfair text-5xl font-semibold md:text-6xl">Conheça nossos vinhos</h1>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-white/80">
          Uma seleção para apresentação da origem, características e trajetória de cada rótulo.
        </p>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-12">
        <div className="mb-9 grid gap-4 rounded-2xl border border-[#dec9a6] bg-white p-5 shadow-sm md:grid-cols-[1fr_auto]">
          <input
            className="rounded-xl border border-[#cdbbaf] px-4 py-3 outline-none focus:border-[#851329] focus:ring-2 focus:ring-[#851329]/15"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por nome, uva ou descrição..."
          />
          <div className="flex flex-wrap gap-2">
            {types.map((item) => (
              <button
                key={item || 'Todos'}
                onClick={() => setType(item)}
                className={`rounded-xl px-4 py-3 text-sm transition ${type === item ? 'bg-[#851329] text-white' : 'bg-[#f4ece6] text-[#5b3035] hover:bg-[#eadbd1]'}`}
              >
                {item || 'Todos'}
              </button>
            ))}
          </div>
        </div>

        {isLoading && <p className="py-16 text-center text-[#715f59]">Carregando catálogo...</p>}
        {error && <p className="py-16 text-center text-red-700">Não foi possível carregar os vinhos.</p>}
        {!isLoading && !error && wines.length === 0 && (
          <p className="py-16 text-center text-[#715f59]">Nenhum vinho publicado corresponde aos filtros.</p>
        )}

        <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
          {wines.map((wine) => (
            <article
              key={wine.id}
              className="group overflow-hidden rounded-3xl border border-[#dfd0bd] bg-white shadow-[0_12px_35px_rgba(76,21,28,.08)] transition hover:-translate-y-1 hover:shadow-[0_18px_45px_rgba(76,21,28,.14)]"
            >
              <div className="grid h-72 place-items-center overflow-hidden bg-[radial-gradient(circle,#f2dfc1,#dbc19a)] p-6">
                {wine.imagePath ? (
                  <img className="block h-auto max-h-[230px] w-auto max-w-[170px] object-contain mix-blend-multiply" src={wine.imagePath} alt={wine.name} />
                ) : (
                  <span className="font-playfair text-7xl text-[#851329]/35">V</span>
                )}
              </div>
              <div className="p-6">
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#9a6a2d]">
                  {wine.type}
                </span>
                <h2 className="mt-2 font-playfair text-2xl font-semibold text-[#5b0c1b]">{wine.name}</h2>
                <p className="mt-3 line-clamp-2 text-sm leading-6 text-[#715f59]">{wine.description}</p>
                <div className="mt-5 flex items-center justify-between border-t border-[#eee3d5] pt-4 text-sm">
                  <span>
                    {wine.volumeMl} ml · {wine.alcoholPercentage}% vol
                  </span>
                  <Link
                    className="font-semibold text-[#851329] group-hover:underline"
                    to={`/catalogo/vinhos/${wine.slug}`}
                  >
                    Ver detalhes →
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
