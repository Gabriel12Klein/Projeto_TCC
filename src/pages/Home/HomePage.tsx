import QueryFeedback from '../../ui/QueryFeedback';
import AuthorFooter from '../../ui/AuthorFooter';
import { useEffect, useId, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api, getStoredUser } from '../../api/api';
import logo from '../Login/assets/logo-vinum.png';
import background from '../Login/assets/background-login.png';
import profileIcon from '../../assets/admin/common/profile.png';

export default function HomePage({ onLogout }: { onLogout: () => Promise<void> }) {
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const exiting = useRef(false);
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    if (!profileMenuOpen) return;
    const outside = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setProfileMenuOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setProfileMenuOpen(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [profileMenuOpen]);
  const user = getStoredUser();
  const firstName = user?.name.trim().split(/\s+/)[0] ?? '';
  const {
    data: wines = [],
    isLoading,
    error,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ['public-home-wines'],
    queryFn: () => api.catalog.list(),
  });
  return (
    <div className="min-h-screen bg-[#f7f2eb] text-[#321b1c]">
      <header className="absolute inset-x-0 top-0 z-20">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5">
          <Link to="/" aria-label="Página inicial da VINUM">
            <img className="h-14 w-auto brightness-0 invert" src={logo} alt="VINUM" />
          </Link>
          {user?.role === 'CUSTOMER' ? (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-full border border-[#e0bc72] px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
                aria-expanded={profileMenuOpen}
                ref={trigger}
                aria-controls={menuId}
                aria-label={`Abrir menu de ${firstName}`}
                onClick={() => setProfileMenuOpen((open) => !open)}
              >
                <img
                  className="h-8 w-8 rounded-full object-contain"
                  src={profileIcon}
                  alt=""
                  aria-hidden="true"
                />
                <span>{firstName}</span>
                <svg
                  className="h-4 w-4 shrink-0 self-center"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>
              {profileMenuOpen ? (
                <div
                  className="absolute right-0 mt-2 w-48 rounded-2xl border border-[#e0bc72] bg-[#fffaf4] p-2 text-left shadow-xl"
                  id={menuId}
                >
                  <Link
                    className="block rounded-xl px-4 py-3 text-sm font-semibold text-[#5b0c1b] transition hover:bg-[#f3e4d2]"
                    to="/perfil"

                    onClick={() => setProfileMenuOpen(false)}
                  >
                    Meu perfil
                  </Link>
                  <Link
                    className="block rounded-xl px-4 py-3 text-sm font-semibold text-[#5b0c1b] transition hover:bg-[#f3e4d2]"
                    to="/estoque"

                    onClick={() => setProfileMenuOpen(false)}
                  >
                    Meu estoque
                  </Link>
                  <Link
                    className="block rounded-xl px-4 py-3 text-sm font-semibold text-[#5b0c1b] transition hover:bg-[#f3e4d2]"
                    to="/pedidos"

                    onClick={() => setProfileMenuOpen(false)}
                  >
                    Meus pedidos
                  </Link>
                  <button
                    type="button"
                    className="block w-full rounded-xl px-4 py-3 text-left text-sm font-semibold text-[#5b0c1b] transition hover:bg-[#f3e4d2]"

                    disabled={leaving}
                    onClick={async () => {
                      if (exiting.current) return;
                      exiting.current = true;
                      setLeaving(true);
                      try {
                        await onLogout();
                      } finally {
                        exiting.current = false;
                        setLeaving(false);
                      }
                    }}
                  >
                    {leaving ? 'Saindo…' : 'Sair'}
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <Link
              className="rounded-full border border-[#e0bc72] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
              to="/login"
            >
              Login
            </Link>
          )}
        </div>
      </header>
      <main>
        <section
          className="relative overflow-hidden bg-[#351416] bg-cover bg-center px-5 pb-24 pt-40 text-white"
          style={{
            backgroundImage: `linear-gradient(90deg, rgba(53,20,22,.94), rgba(76,21,28,.67)), url(${background})`,
          }}
        >
          <div className="relative mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1.1fr_.9fr]">
            <div>
              <p className="mb-4 text-sm font-semibold uppercase tracking-[0.35em] text-[#dfbd78]">
                Da origem à taça
              </p>
              <h1 className="max-w-3xl font-playfair text-5xl font-semibold leading-tight md:text-7xl">
                A história de cada vinho começa na terra.
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-white/80">
                Conheça a VINUM, seus rótulos e a trajetória que transforma cada safra em uma experiência
                única.
              </p>
              <a
                className="mt-9 inline-flex rounded-full bg-[#d0a565] px-7 py-3.5 font-semibold text-[#4c151c] transition hover:bg-[#e3c17d]"
                href="#vinhos"
                onClick={(event) => {
                  event.preventDefault();
                  document.getElementById('vinhos')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
              >
                Conheça nossos vinhos
              </a>
            </div>
            <div className="hidden rounded-[2rem] border border-white/20 bg-black/20 p-10 backdrop-blur-sm lg:block">
              <p className="font-playfair text-4xl leading-tight text-[#f5dca4]">
                Qualidade, origem e transparência em cada garrafa.
              </p>
              <div className="mt-8 h-px bg-[#d0a565]/60" />
              <p className="mt-6 text-sm leading-7 text-white/75">
                Acompanhe os produtos da vinícola e descubra os detalhes por trás de cada rótulo.
              </p>
            </div>
          </div>
        </section>
        <section id="vinhos" className="scroll-mt-6 mx-auto max-w-7xl px-5 py-16">
          <div className="mb-10 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#9a6a2d]">Nossa seleção</p>
            <h2 className="mt-3 font-playfair text-4xl font-semibold text-[#5b0c1b] md:text-5xl">
              Vinhos produzidos pela VINUM
            </h2>
            <p className="mx-auto mt-4 max-w-2xl leading-7 text-[#715f59]">
              Explore nossos rótulos e encontre o vinho ideal para cada momento.
            </p>
          </div>
          <QueryFeedback
            loading={isLoading}
            error={error}
            fetching={isFetching}
            empty={wines.length === 0}
            loadingText="Carregando nossos rótulos…"
            emptyText="Em breve, novos rótulos estarão disponíveis."
            retry={() => void refetch()}
          />
          <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
            {wines.slice(0, 6).map((wine) => (
              <article
                key={wine.id}
                className="home-wine-card group overflow-hidden rounded-3xl border border-[#dfd0bd] bg-white shadow-[0_12px_35px_rgba(76,21,28,.08)] transition hover:-translate-y-1 hover:shadow-[0_18px_45px_rgba(76,21,28,.14)]"
              >
                <div className="grid h-72 w-full shrink-0 place-items-center overflow-hidden bg-[radial-gradient(circle,#f2dfc1,#dbc19a)] p-6">
                  {wine.imagePath ? (
                    <img
                      className="block h-auto max-h-[230px] w-auto max-w-[170px] object-contain mix-blend-multiply"
                      src={wine.imagePath}
                      alt={wine.name}
                    />
                  ) : (
                    <span className="font-playfair text-7xl text-[#851329]/35">V</span>
                  )}
                </div>
                <div className="w-full p-6">
                  <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#9a6a2d]">
                    {wine.type}
                  </span>
                  <h3 className="mt-2 font-playfair text-2xl font-semibold text-[#5b0c1b]">{wine.name}</h3>
                  <p className="mt-3 line-clamp-2 text-sm leading-6 text-[#715f59]">{wine.description}</p>
                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#eee3d5] pt-4 text-sm">
                    <span>
                      {wine.volumeMl} ml · {wine.alcoholPercentage}% vol
                    </span>
                    <Link
                      className="whitespace-nowrap font-semibold text-[#851329] group-hover:underline"
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
      <AuthorFooter />
    </div>
  );
}
