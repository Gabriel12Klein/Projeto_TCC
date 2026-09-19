export default function ClientSectionPage({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <main className="mx-auto max-w-5xl px-5 py-10 lg:px-10">
      <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#9a6a2d]">Área do cliente</p>
      <h1 className="mt-2 font-playfair text-4xl font-semibold text-[#5b0c1b]">{title}</h1>
      <section className="mt-8 rounded-3xl border border-[#dfd0bd] bg-white p-8 text-center shadow-sm md:p-12">
        <p className="font-playfair text-2xl text-[#5b0c1b]">Em breve</p>
        <p className="mx-auto mt-3 max-w-xl leading-7 text-[#715f59]">{description}</p>
      </section>
    </main>
  );
}
