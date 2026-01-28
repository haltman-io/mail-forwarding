"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Copy, Wand2, ShieldCheck, ShieldAlert, Terminal, MailX, MailPlus, KeyRound } from "lucide-react";
import { fetchDomains, normalizeDomains, RE_DOMAIN } from "@/lib/domains";
import { toast } from "sonner";


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

  // confirmation dialog
  const [confirmDialogOpen, setConfirmDialogOpen] = React.useState(false);
  const [confirmCloseOpen, setConfirmCloseOpen] = React.useState(false);
  const [confirmCode, setConfirmCode] = React.useState("");
  const [confirmIntent, setConfirmIntent] = React.useState<"subscribe" | "unsubscribe" | null>(null);
  const [confirmLoading, setConfirmLoading] = React.useState(false);
  const [confirmErrorText, setConfirmErrorText] = React.useState<string | null>(null);
  const confirmCloseBypass = React.useRef(false);

  // api token dialog
  const [apiDialogOpen, setApiDialogOpen] = React.useState(false);
  const [apiEmail, setApiEmail] = React.useState("");
  const [apiDays, setApiDays] = React.useState("30");
  const [tokenLoading, setTokenLoading] = React.useState(false);
  const [tokenOk, setTokenOk] = React.useState<boolean | null>(null);
  const [tokenPayload, setTokenPayload] = React.useState<ApiResponse | null>(null);
  const [tokenErrorText, setTokenErrorText] = React.useState<string | null>(null);
  const [showApiSafety, setShowApiSafety] = React.useState(false);

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

  React.useEffect(() => {
    try {
      const dismissed = window.localStorage.getItem("mf_api_token_safety_hidden");
      setShowApiSafety(dismissed !== "1");
    } catch {
      setShowApiSafety(true);
    }
  }, []);

  React.useEffect(() => {
    if (!apiDialogOpen) return;
    setTokenOk(null);
    setTokenPayload(null);
    setTokenErrorText(null);
  }, [apiDialogOpen]);


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

  function resetTokenResult() {
    setTokenOk(null);
    setTokenPayload(null);
    setTokenErrorText(null);
  }

  function openConfirmDialog(intent: "subscribe" | "unsubscribe") {
    confirmCloseBypass.current = false;
    setConfirmIntent(intent);
    setConfirmCode("");
    setConfirmErrorText(null);
    setConfirmCloseOpen(false);
    setConfirmLoading(false);
    setConfirmDialogOpen(true);
  }

  function closeConfirmDialog() {
    confirmCloseBypass.current = true;
    setConfirmDialogOpen(false);
    setConfirmCloseOpen(false);
    setConfirmCode("");
    setConfirmErrorText(null);
    setConfirmLoading(false);
    setConfirmIntent(null);
  }

  function requestConfirmClose() {
    setConfirmCloseOpen(true);
  }

  function dismissApiSafety() {
    setShowApiSafety(false);
    try {
      window.localStorage.setItem("mf_api_token_safety_hidden", "1");
    } catch {
      // ignore storage errors
    }
  }

  function setExampleSubscribe() {
    setName("hacker");
    setDomain(domains[0] ?? "segfault.net");
    setTo("you@proton.me");
  }

  function setExampleUnsub() {
    setAlias("hacker@segfault.net");
  }

  async function doFetch(url: string, intent?: "subscribe" | "unsubscribe") {
    setLoading(true);
    try {
      const res = await fetch(url, { method: "GET" });
      const data = (await res.json()) as ApiResponse;
      const success = res.ok && (data as any)?.ok !== false;

      setOk(success);
      setPayload(data);
      if (success && intent) {
        openConfirmDialog(intent);
      } else if (!success) {
        setErrorText("Request failed. See response below.");
      }
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

    await doFetch(url, "subscribe");
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
    await doFetch(url, "unsubscribe");
  }

  async function onCreateToken(e: React.FormEvent) {
    e.preventDefault();
    resetTokenResult();

    const email = apiEmail.trim();
    const days = Number.parseInt(apiDays, 10);

    if (!isProbablyEmail(email)) {
      setTokenOk(false);
      setTokenErrorText("Valid email is required.");
      return;
    }

    if (!Number.isFinite(days) || days < 1 || days > 90) {
      setTokenOk(false);
      setTokenErrorText("Validity days must be between 1 and 90.");
      return;
    }

    setTokenLoading(true);
    try {
      const res = await fetch(`${API_HOST}/api/credentials/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, days }),
      });
      const data = (await res.json()) as ApiResponse;
      const success = res.ok && (data as any)?.ok !== false;

      setTokenOk(success);
      setTokenPayload(data);
      if (!success) setTokenErrorText("Request failed. See response below.");
    } catch (err: any) {
      setTokenOk(false);
      setTokenErrorText(`Network error: ${String(err?.message ?? err)}`);
      setTokenPayload({ ok: false, error: "network_error", detail: String(err) });
    } finally {
      setTokenLoading(false);
    }
  }

  async function onConfirmCode(e: React.FormEvent) {
    e.preventDefault();
    setConfirmErrorText(null);

    const token = confirmCode;
    if (token.length < 12 || token.length > 64) {
      setConfirmErrorText("Confirmation code must be 12–64 characters.");
      return;
    }

    setConfirmLoading(true);
    try {
      const res = await fetch(
        `${API_HOST}/forward/confirm?${new URLSearchParams({ token }).toString()}`,
        { method: "GET" }
      );
      const data = (await res.json()) as ApiResponse;
      const invalid = (data as any)?.ok === false && (data as any)?.error === "invalid_or_expired";
      const confirmed = (data as any)?.ok === true && (data as any)?.confirmed === true;

      if (invalid) {
        setConfirmErrorText("Code is invalid or expired. Please try again.");
        toast.error("Invalid code", {
          description: "The confirmation code is invalid or expired.",
        });
        return;
      }

      if (!res.ok && !confirmed) {
        setConfirmErrorText("Request failed. Please try again.");
        return;
      }

      if (confirmed) {
        const intent = typeof (data as any)?.intent === "string"
          ? ((data as any)?.intent as "subscribe" | "unsubscribe")
          : confirmIntent;
        const created = (data as any)?.created === true;
        const address = typeof (data as any)?.address === "string" ? (data as any)?.address : "";

        closeConfirmDialog();

        const title = created || intent !== "unsubscribe" ? "Alias confirmed" : "Removal confirmed";
        const description =
          created
            ? `Alias ${address ? address + " " : ""}created successfully.`
            : "Alias removal confirmed successfully.";

        toast.success(title, { description });
        return;
      }

      setConfirmErrorText("The API returned an unexpected response. Please try again.");
    } catch (err: any) {
      setConfirmErrorText(`Network error: ${String(err?.message ?? err)}`);
    } finally {
      setConfirmLoading(false);
    }
  }

  return (
    <Card className="relative overflow-hidden border-white/10 bg-gradient-to-b from-zinc-950 to-zinc-950/60">
      {/* subtle background */}
      <div className="pointer-events-none absolute inset-0 opacity-60">
        <div className="absolute -top-24 left-1/2 h-72 w-[42rem] -translate-x-1/2 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute -bottom-24 left-1/2 h-72 w-[42rem] -translate-x-1/2 rounded-full bg-white/5 blur-3xl" />
      </div>

      <Dialog
        open={confirmDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            if (confirmCloseBypass.current) {
              confirmCloseBypass.current = false;
              return;
            }
            requestConfirmClose();
            return;
          }
          confirmCloseBypass.current = false;
          setConfirmDialogOpen(true);
        }}
      >
        <DialogContent
          className="border-white/10 bg-zinc-950/95"
          onEscapeKeyDown={(event) => {
            event.preventDefault();
            requestConfirmClose();
          }}
          onInteractOutside={(event) => {
            event.preventDefault();
            requestConfirmClose();
          }}
        >
          <DialogHeader>
            <DialogTitle>Confirm email code</DialogTitle>
            <DialogDescription>
              We sent a confirmation code to your email. Paste it below to finish.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={onConfirmCode} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="confirm-code">Confirmation code</Label>
              <Input
                id="confirm-code"
                placeholder="Paste confirmation code"
                value={confirmCode}
                onChange={(e) => {
                  setConfirmCode(e.target.value);
                  if (confirmErrorText) setConfirmErrorText(null);
                }}
                autoCapitalize="none"
                spellCheck={false}
                maxLength={64}
                className="bg-black/30"
              />
              <p className="text-xs text-zinc-400">Code length: 12–64 characters.</p>
            </div>

            {confirmErrorText && (
              <Alert variant="destructive" className="border-white/10 bg-black/30">
                <AlertTitle>Confirmation failed</AlertTitle>
                <AlertDescription className="text-zinc-300">
                  {confirmErrorText}
                </AlertDescription>
              </Alert>
            )}

            <DialogFooter className="sm:justify-end">
              <Button type="submit" disabled={confirmLoading}>
                {confirmLoading ? "Confirming…" : "Confirm code"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmCloseOpen} onOpenChange={setConfirmCloseOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Close confirmation?</AlertDialogTitle>
            <AlertDialogDescription>
              If you close now, your confirmation progress may be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction onClick={closeConfirmDialog}>
              Close anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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

          <div className="flex items-center gap-2">
            <Dialog open={apiDialogOpen} onOpenChange={setApiDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-white/10 bg-white/5 hover:bg-white/10"
                  title="Create a free token to automate alias management via API."
                  aria-label="Create a free token to automate alias management via API."
                >
                  <KeyRound className="mr-2 h-4 w-4" />
                  Get API Token
                </Button>
              </DialogTrigger>

              <DialogContent className="border-white/10 bg-zinc-950/95">
                <DialogHeader>
                  <DialogTitle>Free API Token</DialogTitle>
                  <DialogDescription>
                    A token lets you create aliases for your own email without re-verifying ownership each time.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border border-white/10 bg-black/30 p-3">
                      <p className="text-xs uppercase tracking-wide text-zinc-500">❌ Without API</p>
                      <p className="mt-2 text-sm text-zinc-300">
                        You need to verify your email for each new alias address you create.
                      </p>
                    </div>
                    <div className="rounded-lg border border-white/10 bg-black/30 p-3">
                      <p className="text-xs uppercase tracking-wide text-zinc-500">✅ With API</p>
                      <ul className="mt-2 space-y-1 text-sm text-zinc-300">
                        <li>You need to verify your email for 1 time only.</li>
                        <li>All your aliases will be created without email address confirmation.</li>
                      </ul>
                    </div>
                  </div>

                  {showApiSafety && (
                    <Alert className="border-white/10 bg-black/30">
                      <AlertTitle className="flex items-center gap-2">
                        <ShieldAlert className="h-4 w-4" />
                        Security note
                      </AlertTitle>
                      <AlertDescription className="flex flex-col gap-3 text-zinc-300">
                        <span>
                          Never share your API token. Anyone with it can create aliases for your inbox.
                        </span>
                        <div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="border-white/10 bg-white/5 hover:bg-white/10"
                            onClick={dismissApiSafety}
                          >
                            Got it
                          </Button>
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}

                  <form onSubmit={onCreateToken} className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="api-email">Email</Label>
                        <Input
                          id="api-email"
                          type="email"
                          placeholder="you@proton.me"
                          value={apiEmail}
                          onChange={(e) => setApiEmail(e.target.value)}
                          autoCapitalize="none"
                          spellCheck={false}
                          className="bg-black/30"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="api-days">Token validity (days)</Label>
                        <Input
                          id="api-days"
                          type="number"
                          min={1}
                          max={90}
                          placeholder="30"
                          value={apiDays}
                          onChange={(e) => setApiDays(e.target.value)}
                          className="bg-black/30"
                        />
                        <p className="text-xs text-zinc-400">Choose 1–90 days.</p>
                      </div>
                    </div>

                    <DialogFooter className="flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-xs text-zinc-400">
                        We’ll email a one-time confirmation link (15 min) to view the token.
                      </p>
                      <Button type="submit" disabled={tokenLoading}>
                        {tokenLoading ? "Generating…" : "Generate token"}
                      </Button>
                    </DialogFooter>
                  </form>

                  {tokenOk !== null && (
                    <Alert variant={tokenOk ? "default" : "destructive"} className="border-white/10 bg-black/30">
                      <AlertTitle className="flex items-center gap-2">
                        {tokenOk ? <ShieldCheck className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />}
                        {tokenOk ? "Check your email" : "Error"}
                      </AlertTitle>
                      <AlertDescription className="text-zinc-300">
                        {tokenOk ? (
                          <>
                            We sent a confirmation link to your email. Open it within 15 minutes to reveal the token.
                          </>
                        ) : (
                          <>{tokenErrorText ?? "The API returned an error response. See the JSON below."}</>
                        )}
                      </AlertDescription>
                    </Alert>
                  )}

                  {tokenPayload && (
                    <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-medium text-zinc-200">Response payload</p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="border-white/10 bg-white/5 hover:bg-white/10"
                          onClick={() => copy(safeJson(tokenPayload))}
                        >
                          <Copy className="mr-2 h-4 w-4" />
                          Copy JSON
                        </Button>
                      </div>

                      <Separator className="my-3 bg-white/10" />

                      <pre className="overflow-auto whitespace-pre-wrap break-words font-mono text-xs text-zinc-200">
                        {safeJson(tokenPayload)}
                      </pre>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>

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
