import { MainLoader } from "@/components/wrappers/MainLoader";

/** Single full-route pending entry — use for `pendingComponent` and Suspense fallbacks. */
export function RouterPendingComponent() {
  return <MainLoader className="w-full" />;
}
