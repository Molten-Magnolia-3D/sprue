const SOURCE_ZIP =
  "https://github.com/Molten-Magnolia-3D/sprue/archive/refs/heads/main.zip";
const RELEASES =
  "https://github.com/Molten-Magnolia-3D/sprue/releases";
const TAG_ZIP =
  "https://github.com/Molten-Magnolia-3D/sprue/archive/refs/tags/v1.0.0.zip";

const moulds = [
  {
    name: "Pawn",
    file: "/releases/sprue-pawn-mould.zip",
    note: "Spout meets the cavity. Four alignment keys.",
  },
  {
    name: "Gem",
    file: "/releases/sprue-gem-mould.zip",
    note: "Faceted stone. Spout meets the crown.",
  },
  {
    name: "Bead",
    file: "/releases/sprue-bead-mould.zip",
    note: "Pierced sphere. Core through the hole.",
  },
  {
    name: "Ring",
    file: "/releases/sprue-ring-mould.zip",
    note: "Runner added — the spout would miss the cavity.",
  },
] as const;

export const metadata = {
  title: "Releases · Sprue",
  description: "Download Sprue and the sample moulds, millimetres, both halves.",
};

export default function ReleasesPage() {
  return (
    <main className="min-h-dvh overflow-y-auto bg-foundry text-ink">
      <div className="mx-auto max-w-xl px-5 py-10 pb-[max(2.5rem,env(safe-area-inset-bottom))]">
        <p className="text-[0.68rem] uppercase tracking-[0.22em] text-mute">
          Downloads
        </p>
        <h1 className="font-display text-4xl tracking-tight">Releases</h1>
        <p className="mt-3 text-sm leading-relaxed text-mute">
          Everything for Sprue: the app source, and ready mould zips of both
          STL halves in millimetres. British spelling throughout: mould.
        </p>

        <section className="mt-8 space-y-3">
          <h2 className="text-xs uppercase tracking-[0.16em] text-mute">
            The app
          </h2>
          <DownloadCard
            title="Sprue 1.0.0 source"
            href={TAG_ZIP}
            detail="Next.js, TypeScript, Tailwind, three.js, manifold-3d. Unzip, npm install, npm run dev — port 43123."
          />
          <DownloadCard
            title="Latest main"
            href={SOURCE_ZIP}
            detail="Current source on GitHub main."
          />
          <a
            href={RELEASES}
            className="block text-sm text-copper underline-offset-2 hover:underline"
          >
            GitHub releases page
          </a>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-xs uppercase tracking-[0.16em] text-mute">
            Sample moulds
          </h2>
          <DownloadCard
            title="All four samples"
            href="/releases/sprue-sample-moulds.zip"
            detail="Pawn, gem, bead, and ring. Each zip has lower and upper STL halves."
          />
          {moulds.map((item) => (
            <DownloadCard
              key={item.file}
              title={`${item.name} mould`}
              href={item.file}
              detail={item.note}
            />
          ))}
        </section>

        <p className="mt-10 text-sm">
          <a href="/" className="text-copper underline-offset-2 hover:underline">
            Back to Sprue
          </a>
        </p>
      </div>
    </main>
  );
}

function DownloadCard({
  title,
  href,
  detail,
}: {
  title: string;
  href: string;
  detail: string;
}) {
  return (
    <a
      href={href}
      className="block rounded-xl border border-line bg-panel px-4 py-3 hover:border-copper/60"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-medium">{title}</h3>
        <span className="text-xs uppercase tracking-[0.14em] text-copper">
          Download
        </span>
      </div>
      <p className="mt-1 text-sm text-mute">{detail}</p>
    </a>
  );
}
