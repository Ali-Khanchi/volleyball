export default function Section({
  title,
  note,
  children
}: {
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10 sm:mt-12">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
        {note && <p className="text-sm text-sand/60">{note}</p>}
      </div>
      {children}
    </section>
  );
}
