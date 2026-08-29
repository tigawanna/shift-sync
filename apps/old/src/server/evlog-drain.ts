import type { DrainContext } from "evlog";

type EvlogDrain = (ctx: DrainContext | DrainContext[]) => Promise<void>;

let drain: EvlogDrain | undefined;

export function createEvlogFsDrain(): ((ctx: DrainContext) => Promise<void>) | undefined {
  if (!import.meta.env.DEV) {
    return undefined;
  }

  return async (ctx) => {
    if (!drain) {
      const { createFsDrain } = await import("evlog/fs");
      drain = createFsDrain({ maxFiles: 7 });
    }

    await drain(ctx);
  };
}
