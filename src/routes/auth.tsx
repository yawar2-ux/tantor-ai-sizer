import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PageHeader } from "@/components/ui/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in | Tantor Gen AI Sizer" },
      { name: "description", content: "Sign in to save, share and compare Tantor sizing scenarios." },
      { property: "og:title", content: "Sign in | Tantor Gen AI Sizer" },
      { property: "og:description", content: "Presales access to saved Tantor sizing scenarios." },
    ],
  }),
  component: AuthPage,
});

const field =
  "w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-rose focus:ring-2 focus:ring-rose/25";

function AuthPage() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      if (mode === "in") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/scenarios" });
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/scenarios` },
        });
        if (error) throw error;
        setMsg("Account created. If confirmation is on, check your inbox, otherwise sign in now.");
        setMode("in");
      }
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  if (user) {
    return (
      <div className="max-w-md">
        <PageHeader eyebrow="Account" title="Signed in" intro={user.email ?? undefined} />
        <div className="flex gap-3">
          <button
            className="rounded-md bg-brand px-4 py-2 text-sm text-brand-foreground"
            onClick={() => navigate({ to: "/scenarios" })}
          >
            Saved scenarios
          </button>
          <button className="rounded-md border border-border px-4 py-2 text-sm" onClick={() => signOut()}>
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md">
      <PageHeader
        eyebrow="Account"
        title={mode === "in" ? "Sign in" : "Create account"}
        intro="Email access for the Translab presales team. Saved scenarios are private to your account."
      />
      <form onSubmit={submit} className="space-y-4 rounded-xl border border-border bg-surface p-5">
        <div>
          <label className="mb-1 block text-xs uppercase tracking-wider text-muted-foreground">Email</label>
          <input className={field} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs uppercase tracking-wider text-muted-foreground">Password</label>
          <input
            className={field}
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {msg && <p className="text-sm text-rose">{msg}</p>}
        <button
          disabled={busy}
          className="w-full rounded-md bg-rose px-4 py-2 text-sm font-semibold text-rose-foreground disabled:opacity-60"
        >
          {busy ? "Working…" : mode === "in" ? "Sign in" : "Create account"}
        </button>
        <button
          type="button"
          className="w-full text-xs text-muted-foreground underline"
          onClick={() => setMode(mode === "in" ? "up" : "in")}
        >
          {mode === "in" ? "No account yet? Create one" : "Already have an account? Sign in"}
        </button>
      </form>
    </div>
  );
}
