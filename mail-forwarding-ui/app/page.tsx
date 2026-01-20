import { SiteHeader } from "@/components/site-header";
import { SubscribeCard } from "@/components/subscribe-card";
import Link from "next/link";
import { Separator } from "@/components/ui/separator";

export default function Page() {
  return (
    <>
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-4 py-10">
        <section className="mx-auto max-w-3xl space-y-4">
          <h1 className="text-3xl font-semibold tracking-tight">
            Free Mail Forwarding
          </h1>

          <p className="text-muted-foreground">
            Create an alias like{" "}
            <span className="font-mono text-foreground">&lt;handle&gt;@&lt;domain&gt;</span>{" "}
            and forward to an inbox you control.
          </p>

          <div className="text-sm text-muted-foreground">
            <span className="mr-2">Reference:</span>
            <Link
              href="https://www.thc.org/mail/"
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-4"
            >
              https://www.thc.org/mail/
            </Link>
          </div>

          <div className="text-sm text-muted-foreground">
            Short thanks to{" "}
            <Link
              href="https://github.com/Lou-Cipher"
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-4"
            >
              Lou-Cipher
            </Link>{" "}
            for the original Perl implementation.
          </div>

          <Separator className="my-6" />

          <SubscribeCard />
        </section>

        <footer className="mt-12 text-center text-xs text-muted-foreground">
          Made in Brazil 🇧🇷
        </footer>
      </main>
    </>
  );
}
