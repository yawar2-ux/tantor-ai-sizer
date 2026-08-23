import type { ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { AuthPanel } from "./AuthPanel";

import tantorLogo from "/tantor-logo-reversed.svg";

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md rounded-2xl bg-[#3D145F] p-8 shadow-xl">
        <img src={tantorLogo} alt="Tantor" className="mb-6 h-9 w-[150px] object-contain" />
        <h1 className="font-heading text-2xl font-semibold text-white">{title}</h1>
        <div className="mt-4 space-y-3 text-sm text-white/75">{children}</div>
      </div>
    </div>
  );
}

function SignOutButton({ onSignOut }: { onSignOut: () => void }) {
  return (
    <button
      type="button"
      onClick={onSignOut}
      className="mt-6 rounded-lg bg-rose px-4 py-2.5 font-heading text-sm font-semibold text-rose-foreground"
    >
      Sign out
    </button>
  );
}

const dateFmt = new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "long", year: "numeric" });

/**
 * Nothing from the sizer renders until the visitor is signed in, approved and active.
 * This wraps the whole route tree, so typing a route directly cannot bypass it.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const { user, loading: authLoading, signOut } = useAuth();
  const { profile, loading: profileLoading } = useProfile();

  const done = () => void signOut();

  if (authLoading || (user && profileLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Checking your access…</p>
      </div>
    );
  }

  if (!user) return <AuthPanel />;

  const blocked = profile && (profile.status === "rejected" || !profile.is_active);
  if (blocked) {
    return (
      <Panel title="Access unavailable">
        <p>This account cannot use the sizer. Contact your administrator if you believe this is a mistake.</p>
        <SignOutButton onSignOut={done} />
      </Panel>
    );
  }

  if (!profile || profile.status === "pending") {
    const name = profile?.full_name?.trim() || user.email || "";
    const requested = profile?.requested_at ? dateFmt.format(new Date(profile.requested_at)) : null;
    return (
      <Panel title="Awaiting approval">
        <p className="font-heading text-base text-white">{name}</p>
        {requested && <p className="text-white/60">Registered on {requested}</p>}
        <p>Your request is with the administrator. You will be able to sign in once it is approved.</p>
        <SignOutButton onSignOut={done} />
      </Panel>
    );
  }

  return <>{children}</>;
}
