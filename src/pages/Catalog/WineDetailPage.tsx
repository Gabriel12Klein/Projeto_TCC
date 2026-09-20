import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../api/api';

export default function WineDetailPage() {
  const { slug = '' } = useParams();
  const [openQrCode, setOpenQrCode] = useState<string | null>(null);
  const {
    data: wine,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['catalog-wine', slug],
    queryFn: () => api.catalog.detail(slug),
    enabled: Boolean(slug),
  });

  if (isLoading)
    return <main className="mx-auto min-h-[60vh] max-w-7xl px-5 py-16">Carregando vinho...</main>;
  if (error || !wine)
    return (
      <main className="mx-auto min-h-[60vh] max-w-7xl px-5 py-16">
        <p>Vinho não encontrado.</p>
        <Link className="mt-4 inline-block text-[#851329]" to="/catalogo">
          ← Voltar ao catálogo
        </Link>
      </main>
    );

  const image = wine.imagePath;
  return (
    <main className="mx-auto max-w-7xl px-5 py-12">
      <Link className="text-sm font-semibold text-[#851329]" to="/catalogo">
        ← Voltar ao catálogo
      </Link>
      <section className="mt-7 grid overflow-hidden rounded-3xl border border-[#dfd0bd] bg-white shadow-xl lg:grid-cols-2">
        <div className="grid min-h-[420px] place-items-center overflow-hidden bg-[radial-gradient(circle,#f2dfc1,#cfae79)] p-8">
          {image ? (
            <img
              className="block h-auto max-h-[560px] w-auto max-w-[80%] object-contain mix-blend-multiply"
              src={image}
              alt={wine.name}
            />
          ) : (
            <span className="font-playfair text-9xl text-[#851329]/35">V</span>
          )}
        </div>
        <div className="p-8 lg:p-12">
          <span className="text-sm font-bold uppercase tracking-[0.25em] text-[#9a6a2d]">{wine.type}</span>
          <h1 className="mt-3 font-playfair text-5xl font-semibold text-[#5b0c1b]">{wine.name}</h1>
          <p className="mt-6 leading-7 text-[#66534f]">{wine.description}</p>
          <dl className="mt-8 grid grid-cols-2 gap-5 border-y border-[#eee3d5] py-6 text-sm">
            <div>
              <dt className="font-bold text-[#5b0c1b]">Uvas</dt>
              <dd className="mt-1 text-[#715f59]">{wine.grapes}</dd>
            </div>
            <div>
              <dt className="font-bold text-[#5b0c1b]">Volume</dt>
              <dd className="mt-1 text-[#715f59]">{wine.volumeMl} ml</dd>
            </div>
            <div>
              <dt className="font-bold text-[#5b0c1b]">Teor alcoólico</dt>
              <dd className="mt-1 text-[#715f59]">{wine.alcoholPercentage}% vol</dd>
            </div>
            <div>
              <dt className="font-bold text-[#5b0c1b]">Origem</dt>
              <dd className="mt-1 text-[#715f59]">
                {wine.winery ? `${wine.winery.name} · ${wine.winery.city}/${wine.winery.state}` : 'VINUM'}
              </dd>
            </div>
          </dl>
        </div>
      </section>

      {(wine.characteristics || wine.aromas || wine.tastingNotes || wine.pairing) && (
        <section className="mt-10">
          <h2 className="font-playfair text-3xl font-semibold text-[#5b0c1b]">Descrição do vinho</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {[
              ['Características', wine.characteristics],
              ['Aromas', wine.aromas],
              ['Notas de degustação', wine.tastingNotes],
              ['Harmonização', wine.pairing],
            ]
              .filter(([, value]) => value)
              .map(([label, value]) => (
                <article key={label} className="rounded-2xl border border-[#dfd0bd] bg-white p-5 shadow-sm">
                  <h3 className="font-semibold text-[#5b0c1b]">{label}</h3>
                  <p className="mt-2 whitespace-pre-line text-sm leading-6 text-[#715f59]">{value}</p>
                </article>
              ))}
          </div>
        </section>
      )}

      <section className="mt-10">
        <h2 className="font-playfair text-3xl font-semibold text-[#5b0c1b]">Safras e procedência</h2>
        {wine.vintages.length === 0 ? (
          <p className="mt-4 text-[#715f59]">Nenhuma safra publicada para este vinho.</p>
        ) : (
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            {wine.vintages.map((vintage) => {
              const selectedBatch = vintage.batches.find((batch) => batch.code === openQrCode);
              return (
              <div key={vintage.id} className={selectedBatch ? 'md:col-span-2 md:grid md:grid-cols-[minmax(0,1fr)_minmax(260px,0.75fr)] md:gap-5' : ''}>
              <article className="rounded-2xl border border-[#dfd0bd] bg-white p-6">
                <h3 className="font-playfair text-2xl text-[#851329]">Safra {vintage.year}</h3>
                <p className="mt-2 text-sm text-[#715f59]">
                  {vintage.identifier} · {vintage.status}
                </p>
                <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="font-semibold text-[#5b0c1b]">Uvas da safra</dt>
                    <dd className="mt-1 text-[#715f59]">{vintage.grapes.join(', ') || 'Não informado'}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-[#5b0c1b]">Fornecedor / origem</dt>
                    <dd className="mt-1 text-[#715f59]">{vintage.supplier || 'Não informado'}</dd>
                  </div>
                </dl>
                {vintage.observations && (
                  <p className="mt-4 text-sm leading-6 text-[#66534f]">{vintage.observations}</p>
                )}
                {vintage.batches.map((batch) => (
                  <div key={batch.code} className="mt-4 rounded-xl bg-[#f7f2eb] p-4 text-sm">
                    <strong className="block text-[#5b0c1b]">Lote {batch.code}</strong>
                    <div className="mt-2 grid gap-2 text-[#715f59] sm:grid-cols-2">
                      <span>Quantidade: {batch.quantityLiters} litros</span>
                      <span>Status: {batch.status}</span>
                      <span>
                        Produção: {new Date(`${batch.productionDate}T00:00:00`).toLocaleDateString('pt-BR')}
                      </span>
                      <span>
                        Registro: {batch.registrationDate ? new Date(`${batch.registrationDate}T00:00:00`).toLocaleDateString('pt-BR') : 'Aguardando registro'}
                      </span>
                      <span className="sm:col-span-2">
                        Uvas utilizadas: {batch.grapes.join(', ') || 'Não informado'}
                      </span>
                    </div>
                    {batch.qrCodePath && (
                      <div className="mt-4">
                        <button
                          type="button"
                          className="rounded-md border border-[#851329] px-3 py-1.5 font-semibold text-[#851329] transition hover:bg-[#851329] hover:text-white"
                          onClick={() => setOpenQrCode((current) => (current === batch.code ? null : batch.code))}
                          aria-expanded={openQrCode === batch.code}
                        >
                          {openQrCode === batch.code ? 'Fechar QR Code' : 'Abrir QR Code'}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </article>
              {selectedBatch?.qrCodePath && (
                <aside className="mt-5 flex min-h-[260px] flex-col items-center justify-center rounded-2xl border border-[#dfd0bd] bg-[#fffdf9] p-6 text-center md:mt-0">
                  <h4 className="font-semibold text-[#5b0c1b]">QR Code do lote {selectedBatch.code}</h4>
                  <img className="mt-4 h-56 w-56 object-contain" src={selectedBatch.qrCodePath} alt={`QR Code do lote ${selectedBatch.code}`} />
                  <span className="mt-3 text-xs text-[#715f59]">Aponte a câmera para consultar este lote.</span>
                </aside>
              )}
              </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
