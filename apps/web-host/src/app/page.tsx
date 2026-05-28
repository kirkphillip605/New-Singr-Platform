"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { GlassCard } from "@singr/ui";

export default function RootPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  useEffect(() => {
    if (!isPending) {
      if (session) {
        router.push("/dashboard");
      } else {
        router.push("/login");
      }
    }
  }, [session, isPending, router]);

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <GlassCard className="p-8 max-w-sm w-full text-center">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-[var(--singr-brand-start)] to-[var(--singr-brand-end)] bg-clip-text text-transparent mb-4" style={{
          background: "var(--singr-brand-gradient)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent"
        }}>
          🎤 Singr Platform
        </h1>
        <p className="text-sm text-[var(--singr-text-secondary)] font-sans">
          Securing session and redirecting you to your portal console...
        </p>
      </GlassCard>
    </main>
  );
}
