"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { GlassCard, SingrLogo } from "@singr/ui";

export default function RootPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  const hasRedirected = useRef(false);

  useEffect(() => {
    if (!isPending && !hasRedirected.current) {
      hasRedirected.current = true;
      if (session) {
        router.replace("/dashboard");
      } else {
        router.replace("/login");
      }
    }
  }, [session, isPending, router]);

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <GlassCard className="p-8 max-w-sm w-full text-center">
        <SingrLogo variant="white" className="h-8 w-auto mx-auto mb-4" />
        <p className="text-sm text-[var(--singr-text-secondary)] font-sans">
          Securing session and redirecting you to your portal console...
        </p>
      </GlassCard>
    </main>
  );
}
