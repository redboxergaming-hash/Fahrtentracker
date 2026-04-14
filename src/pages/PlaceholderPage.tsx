export default function PlaceholderPage({ title }: { title: string }) {
  return (
    <section className="rounded-xl border border-dashed border-slate-300 bg-white p-6">
      <h2 className="text-2xl font-semibold">{title}</h2>
      <p className="mt-2 text-sm text-slate-600">Planned in next milestones.</p>
    </section>
  );
}
