import { definePlugin } from "nitro";

export default definePlugin(async (nitroApp) => {
  if (!import.meta.env.DEV) {
    return;
  }

  const { createFsDrain } = await import("evlog/fs");
  nitroApp.hooks.hook(
    "evlog:drain",
    createFsDrain({
      maxFiles: 7,
    }),
  );
});
