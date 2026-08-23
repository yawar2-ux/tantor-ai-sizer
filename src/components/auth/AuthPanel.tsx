import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

import tantorLogo from "/tantor-logo-reversed.svg";

const DOMAIN_MESSAGE = "Registration is limited to translab.io email addresses";

const field =
  "w-full rounded-md border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/40 outline-none focus:border-rose focus:ring-2 focus:ring-rose/40";
const label = "mb-1 block font-heading text-[11px] uppercase tracking-wider text-white/60";

function friendlySignUpError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("translab.io") || m.includes("database error saving new user") || m.includes("check_violation")) {
    return DOMAIN_MESSAGE;
  }
  return message;
}

/** Brand sign in and registration panel. Shown instead of the sizer when signed out. */
export function AuthPanel() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    setOk(null);
    try {
      if (mode === "in") {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
      } else {
        if (!email.trim().toLowerCase().endsWith("@translab.io")) {
          setMsg(DOMAIN_MESSAGE);
          setBusy(false);
          return;
        }
        const { error } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: {
            data: { full_name: fullName.trim() },
            emailRedirectTo: `${window.location.origin}/`,
          },
        });
        if (error) throw error;
        setOk("Request received. An administrator will review your account.");
        setMode("in");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong.";
      setMsg(mode === "up" ? friendlySignUpError(message) : message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md rounded-2xl bg-[#3D145F] p-8 shadow-xl">
        <img src={tantorLogo} alt="Tantor" className="mb-6 h-9 w-[150px] object-contain" />
        <h1 className="font-heading text-2xl font-semibold text-white">
          {mode === "in" ? "Sign in" : "Create account"}
        </h1>
        <p className="mt-2 text-sm text-white/70">Size a Tantor on-premise governed AI deployment</p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          {mode === "up" && (
            <div>
              <label className={label} htmlFor="full-name">
                Full name
              </label>
              <input
                id="full-name"
                className={field}
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Priya Sharma"
              />
            </div>
          )}
          <div>
            <label className={label} htmlFor="email">
              Work email
            </label>
            <input
              id="email"
              className={field}
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@translab.io"
            />
          </div>
          <div>
            <label className={label} htmlFor="password">
              Password
            </label>
            <input
              id="password"
              className={field}
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {msg && <p className="rounded-md bg-white/10 px-3 py-2 text-sm text-rose">{msg}</p>}
          {ok && <p className="rounded-md bg-white/10 px-3 py-2 text-sm text-white">{ok}</p>}

          <button
            disabled={busy}
            className="w-full rounded-lg bg-rose px-4 py-2.5 font-heading text-sm font-semibold text-rose-foreground transition-opacity disabled:opacity-60"
          >
            {busy ? "Working…" : mode === "in" ? "Sign in" : "Request access"}
          </button>

          <button
            type="button"
            className="w-full text-xs text-white/60 underline"
            onClick={() => {
              setMode(mode === "in" ? "up" : "in");
              setMsg(null);
              setOk(null);
            }}
          >
            {mode === "in" ? "No account yet? Request access" : "Already have an account? Sign in"}
          </button>
        </form>

        <p className="mt-6 text-[11px] leading-relaxed text-white/45">
          Internal presales tool for Translab Technologies. New accounts stay locked until an administrator approves
          them.
        </p>
      </div>
    </div>
  );
}
