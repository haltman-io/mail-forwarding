import { SiteHeader } from "@/components/site-header";
import { SubscribeCard } from "@/components/subscribe-card";

export default function Page() {
  return (
    <>
      <SiteHeader />

      <main className="relative mx-auto max-w-6xl px-4 py-10">
        {/* page-level background echoing the card */}
        <div className="pointer-events-none absolute inset-0 -z-10 opacity-70">
          <div className="absolute left-1/2 top-6 h-64 w-[48rem] -translate-x-1/2 rounded-full bg-white/5 blur-3xl" />
          <div className="absolute left-1/2 bottom-0 h-64 w-[48rem] -translate-x-1/2 rounded-full bg-white/5 blur-3xl" />
        </div>

        <section className="mx-auto max-w-3xl space-y-6">
          <SubscribeCard />

          <footer className="mt-12 text-center text-xs text-zinc-500">
            Made in Brazil 🇧🇷
          </footer>
        </section>
      </main>
    </>
  );y
}