"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Copy, Wand2, ShieldCheck, ShieldAlert, Terminal, MailX, MailPlus } from "lucide-react";
import { fetchDomains, normalizeDomains, RE_DOMAIN } from "@/lib/domains";


type ApiResponse = Record<string, unknown>;

const RE_NAME = /^[a-z0-9](?:[a-z0-9.]{0,62}[a-z0-9])?$/;

const API_HOST = (process.env.NEXT_PUBLIC_API_HOST ?? "https://mail.haltman.io").trim();
const DOMAINS_URL = `${API_HOST}/domains`;

function isProbablyEmail(v: string) {
  const s = v.trim();
  return s.length <= 254 && s.includes("@") && !s.startsWith("@") && !s.endsWith("@");
}

function clampLower(s: string) {
  return s.trim().toLowerCase();
}

function safeJson(data: unknown) {
  try {
    return JSON.stringify(data, null, 2);
  } catch {
    return String(data);
  }
}

function badgeClasses(kind: "ok" | "bad" | "idle") {
  if (kind === "ok") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
  if (kind === "bad") return "border-rose-500/30 bg-rose-500/10 text-rose-200";
  return "border-white/10 bg-white/5 text-zinc-200";
}

export function SubscribeCard() {
  // subscribe form
  const [name, setName] = React.useState("");
  const [domains, setDomains] = React.useState<string[]>([]);
  const [domain, setDomain] = React.useState("");
  const [to, setTo] = React.useState("");

  // unsubscribe form
  const [alias, setAlias] = React.useState("");

  // ui state
  const [activeTab, setActiveTab] = React.useState<"subscribe" | "unsubscribe" | "curl">("subscribe");
  const [loading, setLoading] = React.useState(false);
  const [ok, setOk] = React.useState<boolean | null>(null);
  const [payload, setPayload] = React.useState<ApiResponse | null>(null);
  const [errorText, setErrorText] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const list = await fetchDomains(DOMAINS_URL);
        if (cancelled) return;

        // fallback opcional: se a API falhar, usa NEXT_PUBLIC_DOMAINS
        const fallbackRaw = process.env.NEXT_PUBLIC_DOMAINS ?? "";
        const fallback = normalizeDomains(fallbackRaw.split(","));

        const finalList = list.length ? list : fallback;

        setDomains(finalList);

        // seta default do select (se ainda não tiver)
        setDomain((cur) => cur || finalList[0] || "");
      } catch {
        if (cancelled) return;
        setDomains([]);
        setDomain("");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);


  const previewHandle = React.useMemo(() => clampLower(name) || "handle", [name]);
  const previewDomain = React.useMemo(() => clampLower(domain) || "domain.tld", [domain]);
  const previewAlias = React.useMemo(() => `${previewHandle}@${previewDomain}`, [previewHandle, previewDomain]);

  const curlSubscribe = React.useMemo(() => {
    const h = clampLower(name) || "{alias_handle}";
    const d = clampLower(domain) || "{alias_domain}";
    const t = to.trim() || "{your_mail}";
    const params = new URLSearchParams({ name: h, domain: d, to: t });
    return `curl '${API_HOST}/forward/subscribe?${params.toString()}'`;
  }, [name, domain, to]);

  const curlUnsubscribe = React.useMemo(() => {
    const a = clampLower(alias) || "{alias_email}";
    const params = new URLSearchParams({ alias: a });
    return `curl '${API_HOST}/forward/unsubscribe?${params.toString()}'`;
  }, [alias]);

  const statusKind: "ok" | "bad" | "idle" =
    ok === null ? "idle" : ok ? "ok" : "bad";

  const statusText =
    ok === null ? "Idle" : ok ? "OK" : "Error";

  async function copy(text: string) {
    await navigator.clipboard.writeText(text);
  }

  function resetResult() {
    setOk(null);
    setPayload(null);
    setErrorText(null);
  }

  function setExampleSubscribe() {
    setName("hacker");
    setDomain(domains[0] ?? "segfault.net");
    setTo("you@proton.me");
  }

  function setExampleUnsub() {
    setAlias("hacker@segfault.net");
  }

  async function doFetch(url: string) {
    setLoading(true);
    try {
      const res = await fetch(url, { method: "GET" });
      const data = (await res.json()) as ApiResponse;
      const success = res.ok && (data as any)?.ok !== false;

      setOk(success);
      setPayload(data);
      if (!success) setErrorText("Request failed. See response below.");
    } catch (err: any) {
      setOk(false);
      setErrorText(`Network error: ${String(err?.message ?? err)}`);
      setPayload({ ok: false, error: "network_error", detail: String(err) });
    } finally {
      setLoading(false);
    }
  }

  async function onSubscribe(e: React.FormEvent) {
    e.preventDefault();
    resetResult();

    const n = clampLower(name);
    const d = clampLower(domain);
    const t = to.trim();

    if (!RE_NAME.test(n)) {
      setOk(false);
      setErrorText("Invalid alias handle. Use [a-z0-9.] (1–64), no dot at start/end.");
      return;
    }
    if (!RE_DOMAIN.test(d)) {
      setOk(false);
      setErrorText("Invalid domain.");
      return;
    }
    if (!isProbablyEmail(t)) {
      setOk(false);
      setErrorText("Destination email is required (max 254 chars).");
      return;
    }

    const url = `${API_HOST}/forward/subscribe?${new URLSearchParams({
      name: n,
      domain: d,
      to: t,
    }).toString()}`;

    await doFetch(url);
  }

  async function onUnsubscribe(e: React.FormEvent) {
    e.preventDefault();
    resetResult();

    const a = clampLower(alias);

    if (!isProbablyEmail(a)) {
      setOk(false);
      setErrorText("Alias email is required.");
      return;
    }

    const url = `${API_HOST}/forward/unsubscribe?${new URLSearchParams({ alias: a }).toString()}`;
    await doFetch(url);
  }

  return (
    <Card className="relative overflow-hidden border-white/10 bg-gradient-to-b from-zinc-950 to-zinc-950/60">
      {/* subtle background */}
      <div className="pointer-events-none absolute inset-0 opacity-60">
        <div className="absolute -top-24 left-1/2 h-72 w-[42rem] -translate-x-1/2 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute -bottom-24 left-1/2 h-72 w-[42rem] -translate-x-1/2 rounded-full bg-white/5 blur-3xl" />
      </div>

      <CardHeader className="relative">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1.5">
            <CardTitle className="tracking-tight">
              Mail alias console
            </CardTitle>
            <CardDescription className="text-zinc-400">
              Create or remove aliases with a single request (plus email confirmation on removal).
            </CardDescription>
          </div>

          <div className={`shrink-0 rounded-full border px-3 py-1 text-xs ${badgeClasses(statusKind)}`}>
            <span className="inline-flex items-center gap-2">
              {statusKind === "ok" ? (
                <ShieldCheck className="h-3.5 w-3.5" />
              ) : statusKind === "bad" ? (
                <ShieldAlert className="h-3.5 w-3.5" />
              ) : (
                <Terminal className="h-3.5 w-3.5" />
              )}
              {statusText}
            </span>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs text-zinc-400">Preview alias</p>
              <p className="truncate font-mono text-sm text-zinc-100">
                {previewAlias}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-white/10 bg-white/5 hover:bg-white/10"
                onClick={() => copy(previewAlias)}
                aria-label="Copy preview alias"
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-white/10 bg-white/5 hover:bg-white/10"
                onClick={() => {
                  resetResult();
                  setActiveTab("subscribe");
                  setExampleSubscribe();
                }}
              >
                <Wand2 className="mr-2 h-4 w-4" />
                Fill example
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="relative space-y-6">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="grid w-full grid-cols-3 bg-black/30">
            <TabsTrigger value="subscribe" className="gap-2">
              <MailPlus className="h-4 w-4" />
              Subscribe
            </TabsTrigger>
            <TabsTrigger value="unsubscribe" className="gap-2">
              <MailX className="h-4 w-4" />
              Unsubscribe
            </TabsTrigger>
            <TabsTrigger value="curl" className="gap-2">
              <Terminal className="h-4 w-4" />
              cURL
            </TabsTrigger>
          </TabsList>

          {/* SUBSCRIBE */}
          <TabsContent value="subscribe" className="mt-6">
            <div className="grid gap-6 lg:grid-cols-5">
              <form onSubmit={onSubscribe} className="space-y-5 lg:col-span-3">
                <div className="space-y-2">
                  <Label htmlFor="name">Alias handle</Label>
                  <Input
                    id="name"
                    placeholder="extencil"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoCapitalize="none"
                    spellCheck={false}
                    className="bg-black/30"
                  />
                  <p className="text-xs text-zinc-400">
                    Allowed: <span className="font-mono text-zinc-300">a-z 0-9 .</span> · 1–64 · no dot at start/end
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Alias domain</Label>
                  <Select value={domain} onValueChange={setDomain}>
                    <SelectTrigger className="bg-black/30">
                      <SelectValue placeholder="Select a domain" />
                    </SelectTrigger>
                    <SelectContent>
                      {domains.length ? (
                        domains.map((d) => (
                          <SelectItem key={d} value={d}>
                            {d}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="__none" disabled>
                          No domains available (API /domains failed)
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="to">Destination email</Label>
                  <Input
                    id="to"
                    type="email"
                    placeholder="extencil@proton.me"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    autoCapitalize="none"
                    spellCheck={false}
                    className="bg-black/30"
                  />
                  <p className="text-xs text-zinc-400">Must be a valid email address (max 254 chars).</p>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    type="submit"
                    className="w-full sm:w-auto"
                    disabled={loading || !domains.length}
                  >
                    {loading ? "Sending…" : "Request alias"}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full border-white/10 bg-white/5 hover:bg-white/10 sm:w-auto"
                    onClick={() => copy(curlSubscribe)}
                    disabled={!domains.length}
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Copy subscribe cURL
                  </Button>
                </div>
              </form>

              <div className="space-y-3 lg:col-span-2">
                <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                  <p className="text-sm font-medium text-zinc-200">What you’ll get</p>
                  <Separator className="my-3 bg-white/10" />
                  <ul className="space-y-2 text-sm text-zinc-400">
                    <li>
                      • A new alias like <span className="font-mono text-zinc-200">{previewAlias}</span>
                    </li>
                    <li>• Forwarding to the inbox you control</li>
                  </ul>

                  <div className="mt-4 rounded-lg border border-white/10 bg-black/40 p-3">
                    <p className="text-xs text-zinc-400">Live request</p>
                    <pre className="mt-1 overflow-auto whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed text-zinc-200">
                      {curlSubscribe}
                    </pre>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-white/10 bg-white/5 hover:bg-white/10"
                  onClick={() => {
                    resetResult();
                    setActiveTab("unsubscribe");
                    setExampleUnsub();
                  }}
                >
                  <MailX className="mr-2 h-4 w-4" />
                  Need to remove one instead?
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* UNSUBSCRIBE */}
          <TabsContent value="unsubscribe" className="mt-6">
            <div className="grid gap-6 lg:grid-cols-5">
              <form onSubmit={onUnsubscribe} className="space-y-5 lg:col-span-3">
                <div className="space-y-2">
                  <Label htmlFor="alias">Alias email</Label>
                  <Input
                    id="alias"
                    type="email"
                    placeholder="docs.curl@fwd.haltman.io"
                    value={alias}
                    onChange={(e) => setAlias(e.target.value)}
                    autoCapitalize="none"
                    spellCheck={false}
                    className="bg-black/30"
                  />
                  <p className="text-xs text-zinc-400">
                    The API will send a confirmation email (TTL is usually returned by the API).
                  </p>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                  <Button type="submit" className="w-full sm:w-auto" disabled={loading}>
                    {loading ? "Sending…" : "Request removal"}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full border-white/10 bg-white/5 hover:bg-white/10 sm:w-auto"
                    onClick={() => copy(curlUnsubscribe)}
                    disabled={!alias.trim()}
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Copy unsubscribe cURL
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full border-white/10 bg-white/5 hover:bg-white/10 sm:w-auto"
                    onClick={() => {
                      resetResult();
                      setExampleUnsub();
                    }}
                  >
                    <Wand2 className="mr-2 h-4 w-4" />
                    Fill example
                  </Button>
                </div>
              </form>

              <div className="space-y-3 lg:col-span-2">
                <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                  <p className="text-sm font-medium text-zinc-200">How removal works</p>
                  <Separator className="my-3 bg-white/10" />
                  <ul className="space-y-2 text-sm text-zinc-400">
                    <li>• You request unsubscribe for an alias</li>
                    <li>• The service sends a confirmation email</li>
                    <li>• User confirms following the email instructions</li>
                  </ul>

                  <div className="mt-4 rounded-lg border border-white/10 bg-black/40 p-3">
                    <p className="text-xs text-zinc-400">Live request</p>
                    <pre className="mt-1 overflow-auto whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed text-zinc-200">
                      {curlUnsubscribe}
                    </pre>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-white/10 bg-white/5 hover:bg-white/10"
                  onClick={() => {
                    resetResult();
                    setActiveTab("subscribe");
                  }}
                >
                  <MailPlus className="mr-2 h-4 w-4" />
                  Back to subscribe
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* CURL */}
          <TabsContent value="curl" className="mt-6 space-y-4">
            <div className="rounded-xl border border-white/10 bg-black/30 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-zinc-200">Raw commands</p>
                  <p className="text-xs text-zinc-400">
                    Generated from the current form fields. Copy and run.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-white/10 bg-white/5 hover:bg-white/10"
                    onClick={() => copy(curlSubscribe)}
                    disabled={!domains.length}
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Copy subscribe
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-white/10 bg-white/5 hover:bg-white/10"
                    onClick={() => copy(curlUnsubscribe)}
                    disabled={!alias.trim()}
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Copy unsubscribe
                  </Button>
                </div>
              </div>

              <Separator className="my-4 bg-white/10" />

              <div className="space-y-3">
                <div className="rounded-lg border border-white/10 bg-black/40 p-3">
                  <p className="text-xs text-zinc-400">Subscribe</p>
                  <pre className="mt-1 overflow-auto whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed text-zinc-200">
                    {curlSubscribe}
                  </pre>
                </div>

                <div className="rounded-lg border border-white/10 bg-black/40 p-3">
                  <p className="text-xs text-zinc-400">Unsubscribe</p>
                  <pre className="mt-1 overflow-auto whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed text-zinc-200">
                    {curlUnsubscribe}
                  </pre>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* RESULT */}
        {ok !== null && (
          <Alert variant={ok ? "default" : "destructive"} className="border-white/10 bg-black/30">
            <AlertTitle className="flex items-center gap-2">
              {ok ? <ShieldCheck className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />}
              {ok ? "Success" : "Error"}
            </AlertTitle>
            <AlertDescription className="text-zinc-300">
              {ok ? (
                <>
                  The API returned a success response. See the JSON below.
                </>
              ) : (
                <>{errorText ?? "The API returned an error response. See the JSON below."}</>
              )}
            </AlertDescription>
          </Alert>
        )}

        {payload && (
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium text-zinc-200">Response payload</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-white/10 bg-white/5 hover:bg-white/10"
                onClick={() => copy(safeJson(payload))}
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy JSON
              </Button>
            </div>

            <Separator className="my-3 bg-white/10" />

            <pre className="overflow-auto whitespace-pre-wrap break-words font-mono text-xs text-zinc-200">
              {safeJson(payload)}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
