"use client";

import dynamic from "next/dynamic";

const SprueApp = dynamic(() => import("@/components/SprueApp"), {
  ssr: false,
  loading: () => (
    <div className="flex h-dvh items-center justify-center bg-foundry text-mute">
      Opening the foundry…
    </div>
  ),
});

export default function Page() {
  return <SprueApp />;
}
