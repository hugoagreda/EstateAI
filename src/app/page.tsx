import { Chat } from "@/components/Chat";
import {
  Header,
  HowItWorks,
  DataSources,
  Footer,
} from "@/components/Layout";
import { CHUNKS, ZONAS } from "@/lib/chunks";

export default function Page() {
  const counts = {
    pisos: CHUNKS.filter(
      (c) => c.metadata.categoria === "inmueble",
    ).length,

    barrios: CHUNKS.filter(
      (c) => c.metadata.categoria === "barrio",
    ).length,

    faqs: CHUNKS.filter(
      (c) => c.metadata.categoria === "faq",
    ).length,
  };

  return (
    <div className="min-h-screen bg-bg">
      <Header />

      <main className="mx-auto max-w-[1480px] px-6 py-7 lg:px-7">
        <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_450px]">
          {/* CHAT */}
          <section>
            <Chat />
          </section>

          {/* SIDEBAR */}
          <aside className="space-y-4">
            <HowItWorks />

            <DataSources
              zonas={ZONAS}
              counts={counts}
            />
          </aside>
        </div>
      </main>

      <Footer />
    </div>
  );
}