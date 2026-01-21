"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Github, Info, ExternalLink, BookOpen } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";

export function SiteHeader() {
  const [host, setHost] = React.useState("");

  React.useEffect(() => {
    setHost(window.location.hostname);
  }, []);

  const isOfficial = host === "forward.haltman.io" || host.endsWith(".haltman.io");
  const brand = host ? host : "haltman.io";

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-black/40 backdrop-blur">
      <div className="relative mx-auto max-w-6xl px-4">
        {/* subtle glow like the card */}
        <div className="pointer-events-none absolute inset-0 opacity-60">
          <div className="absolute -top-10 left-1/2 h-16 w-[34rem] -translate-x-1/2 rounded-full bg-white/5 blur-2xl" />
        </div>

        <div className="relative flex h-14 items-center justify-between">
          {/* Left: super minimal brand */}
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-200 hover:bg-white/10"
            aria-label="Home"
          >
            <span className="font-mono text-[11px] text-zinc-300">{brand}</span>

            {isOfficial && (
              <>
                <span className="text-zinc-500">/</span>
                <span className="text-[11px] text-zinc-300">mail-forwarding</span>
              </>
            )}
          </Link>


          {/* Right: actions */}
          <div className="flex items-center gap-2">
            {/* Docs */}
            <Button
              asChild
              variant="ghost"
              size="icon"
              aria-label="Documentation"
              className="h-8 w-8 border border-transparent hover:border-white/10 hover:bg-white/5"
            >
              <Link
                href="https://docs.haltman.io/knowledge-base/get-started"
                target="_blank"
                rel="noreferrer"
              >
                <BookOpen className="h-5 w-5 text-zinc-200" />
              </Link>
            </Button>

            {/* GitHub */}
            <Button
              asChild
              variant="ghost"
              size="icon"
              aria-label="GitHub"
              className="h-8 w-8 border border-transparent hover:border-white/10 hover:bg-white/5"
            >
            
              <Link
                href="https://github.com/haltman-io/mail-forwarding"
                target="_blank"
                rel="noreferrer"
              >
                <Github className="h-5 w-5 text-zinc-200" />
              </Link>
            </Button>
            {/* Credits / Reference popup */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 border-white/10 bg-white/5 px-2.5 text-zinc-200 hover:bg-white/10"
                  aria-label="About / Credits"
                >
                  <Info className="h-4 w-4" />
                </Button>
              </PopoverTrigger>

              <PopoverContent
                align="end"
                className="w-[320px] border-white/10 bg-black/70 p-3 text-zinc-200 backdrop-blur"
              >
                <div className="space-y-2">
                  <div>
                    <p className="text-xs font-medium text-zinc-100">About</p>
                    <p className="text-xs text-zinc-400">
                      Minimal mail alias forwarding UI.
                    </p>
                    {host && !isOfficial && (
                      <p className="text-xs text-zinc-400">
                        Powered by{" "}
                        <Link
                          href="https://forward.haltman.io"
                          target="_blank"
                          rel="noreferrer"
                          className="underline underline-offset-4 hover:text-zinc-200"
                        >
                          forward.haltman.io
                        </Link>
                      </p>
                    )}

                  </div>

                  <Separator className="bg-white/10" />

                  <div className="space-y-1">
                    <p className="text-xs text-zinc-400">
                      Reference (legacy):
                    </p>
                    <Link
                      href="https://www.thc.org/mail/"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 text-xs text-zinc-200 underline underline-offset-4 hover:text-zinc-100"
                    >
                      https://www.thc.org/mail/
                      <ExternalLink className="h-3.5 w-3.5 text-zinc-400" />
                    </Link>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs text-zinc-400">Credits:</p>
                    <p className="text-xs text-zinc-200">
                      Thanks to <span className="font-medium">Lou-Cipher</span> for the original Perl implementation.
                    </p>
                  </div>

                  <Separator className="bg-white/10" />

                  <div className="flex items-center justify-between">
                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-zinc-300">
                      Minimal • Fast • Anti-abuse
                    </span>

                    <Link
                      href="https://www.haltman.io/"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-zinc-400 underline underline-offset-4 hover:text-zinc-200"
                    >
                      haltman.io
                    </Link>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>
    </header>
  );
}
