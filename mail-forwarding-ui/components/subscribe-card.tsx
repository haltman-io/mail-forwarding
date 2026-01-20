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
import { Copy } from "lucide-react";

type ApiResponse = Record<string, unknown>;

const RE_NAME = /^[a-z0-9](?:[a-z0-9.]{0,62}[a-z0-9])?$/;
const RE_DOMAIN =
  /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

function readDomains(): string[] {
  const raw = process.env.NEXT_PUBLIC_DOMAINS;
  return Array.from(
    new Set(
      raw
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean)
        .filter((d) => RE_DOMAIN.test(d))
    )
  );
}

const API_HOST = (process.env.NEXT_PUBLIC_API_HOST).trim();
const DOMAINS = readDomains();

export function SubscribeCard() {
  const [name, setName] = React.useState("");
  const [domain, setDomain] = React.useState(DOMAINS[0] ?? "");
  const [to, setTo] = React.useState("");

  const [loading, setLoading] = React.useState(false);
  const [ok, setOk] = React.useState<boolean | null>(null);
  const [payload, setPayload] = React.useState<ApiResponse | null>(null);
  const [errorText, setErrorText] = React.useState<string | null>(null);

  const curl = React.useMemo(() => {
    const h = name.trim() || "{alias_handle}";
    const d = (domain || "{alias_domain}").trim();
    const t = to.trim() || "{your_mail}";
    const params = new URLSearchParams({ name: h, domain: d, to: t });
    return `curl '${API_HOST}/forward/subscribe?${params.toString()}'`;
  }, [name, domain, to]);

  async function onCopy() {
    await navigator.clipboard.writeText(curl);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setOk(null);
    setPayload(null);
    setErrorText(null);

    const n = name.trim().toLowerCase();
    const d = domain.trim().toLowerCase();
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
    if (!t) {
      setOk(false);
      setErrorText("Destination email is required.");
      return;
    }

    const url = `${API_HOST}/forward/subscribe?${new URLSearchParams({
      name: n,
      domain: d,
      to: t,
    }).toString()}`;

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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Request an alias</CardTitle>
        <CardDescription>
          Use the web form or copy a ready-to-run cURL command.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <Tabs defaultValue="web">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="web">Web form</TabsTrigger>
            <TabsTrigger value="curl">cURL</TabsTrigger>
          </TabsList>

          <TabsContent value="web" className="mt-6">
            <form onSubmit={onSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="name">Alias handle</Label>
                <Input
                  id="name"
                  placeholder="extencil"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoCapitalize="none"
                  spellCheck={false}
                />
                <p className="text-xs text-muted-foreground">
                  Allowed: <span className="font-mono">a-z 0-9 .</span> · 1–64 · no dot at start/end
                </p>
              </div>

              <div className="space-y-2">
                <Label>Alias domain</Label>
                <Select value={domain} onValueChange={setDomain}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a domain" />
                  </SelectTrigger>
                  <SelectContent>
                    {DOMAINS.length ? (
                      DOMAINS.map((d) => (
                        <SelectItem key={d} value={d}>
                          {d}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="__none" disabled>
                        No domains configured (check NEXT_PUBLIC_DOMAINS)
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
                />
                <p className="text-xs text-muted-foreground">
                  Must be a valid email address (max 254 chars).
                </p>
              </div>

              <Button type="submit" className="w-full" disabled={loading || !DOMAINS.length}>
                {loading ? "Sending…" : "Request alias"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="curl" className="mt-6 space-y-3">
            <p className="text-sm text-muted-foreground">
              This mirrors the exact request sent by the web form.
            </p>

            <div className="rounded-md border p-3">
              <div className="flex items-start justify-between gap-3">
                <pre className="max-w-[calc(100%-44px)] overflow-auto whitespace-pre-wrap break-words font-mono text-sm">
                  {curl}
                </pre>

                <Button variant="outline" size="icon" onClick={onCopy} aria-label="Copy cURL">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <Separator />

            <p className="text-xs text-muted-foreground">
              Tip: fill the form fields to auto-generate a ready-to-run cURL command.
            </p>
          </TabsContent>
        </Tabs>

        {ok !== null && (
          <Alert variant={ok ? "default" : "destructive"}>
            <AlertTitle>{ok ? "Success" : "Error"}</AlertTitle>
            <AlertDescription>
              {ok
                ? "The API returned a success response. See the JSON below."
                : errorText ?? "The API returned an error response. See the JSON below."}
            </AlertDescription>
          </Alert>
        )}

        {payload && (
          <div className="rounded-md border p-3">
            <pre className="overflow-auto whitespace-pre-wrap break-words font-mono text-xs">
              {JSON.stringify(payload, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
