# Bringing Dynamic OG Images to TanStack Start with Takumi

There’s something magical about Open Graph images.
They’re tiny, silent ambassadors that travel with your links showing up on Twitter, LinkedIn, and Slack to make your content look polished and intentional.

But when I started working with TanStack Start, I noticed something missing:
Where was the “dynamic OG image” experience we’d gotten so used to from Next.js and Vercel?

So, we built it ourselves.
And spoiler: it’s easier than you think.

## The Problem

If you’ve ever used vercel/og, you know how simple it is to generate dynamic images at runtime. You pass a few query parameters, and out pops a beautiful preview with custom text, background, or even user avatars.

That’s not built into TanStack Start. But the good news is that TanStack’s server routes are flexible enough to handle the same use case. We just need the right renderer.

That’s where Takumi comes in, a Rust-powered alternative to Satori (the engine behind vercel/og), with WebAssembly support and blazing performance.
Together, these two tools let us bring dynamic image generation into TanStack’s world, no Node canvas hacks required.

## The Plan

Here’s the simple idea:

Create a server route in TanStack Start that renders a JSX component into an image, using Takumi under the hood.

We can then pass in query parameters (like title, author, or background color), and the route will return a new OG image on the fly.

This is perfect for blog posts, changelogs, or any content-heavy site where every page deserves its own visual identity.

## Installing Takumi

Start by installing Takumi’s core packages:

```bash
bun add @takumi-rs/core @takumi-rs/helpers @takumi-rs/image-response
```

That’s all you need to start generating images.

If you’re deploying to Vercel, there’s one small configuration tweak you’ll need. In your `vite.config.ts`, tell Nitro to include Takumi’s binaries:

```ts
nitro: {
  preset: "vercel",
  externals: {
    traceInclude: [
      "node_modules/@takumi-rs/core",
      "node_modules/@takumi-rs/image-response",
      "node_modules/@takumi-rs/helpers",
      "node_modules/@takumi-rs/core-linux-x64-gnu",
      "node_modules/@takumi-rs/core-linux-arm64-gnu",
      "node_modules/@takumi-rs/core-darwin-arm64",
      "node_modules/@takumi-rs/core-darwin-x64",
    ],
  },
},
```

This ensures the right binary gets shipped with your build, regardless of platform.

## Creating the Server Route

Let’s set up a new route at `src/routes/api/og.tsx`.
This will handle all incoming image requests.

```tsx
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/og")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        // We'll handle the image generation here
      },
    },
  },
});
```

Now you have a live endpoint `/api/og` that can receive query parameters like `?title=Hello+World&author=Guido`.

## Designing the OG Component

At the heart of this system is a simple JSX component.
It defines how your OG image looks:

```tsx
function OgImage({
  title = "Your amazing website.",
  author = "Your name",
}: {
  title: string;
  author: string;
}) {
  return (
    <div
      style={{
        backgroundColor: "#ffffff",
        width: "100%",
        height: "100%",
        padding: "5% 10%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <p
        style={{
          color: "#000000",
          fontSize: "60px",
          fontWeight: "normal",
          paddingTop: "3%",
        }}
      >
        {title}
      </p>
      <div style={{ marginTop: "auto" }}>
        <p
          style={{
            color: "#000000",
            fontSize: "30px",
            fontWeight: "bold",
            marginLeft: "auto",
          }}
        >
          {author}
        </p>
      </div>
    </div>
  );
}
```

It’s minimal and readable, perfect for iteration.
You can swap in Tailwind-style utilities, gradients, or even SVG logos later.

## Generating the Image

Now, let’s bring Takumi into the mix.
Inside our GET handler, we’ll dynamically import Takumi’s `ImageResponse` (so it doesn’t bloat the client bundle) and render our component.

```tsx
export const Route = createFileRoute("/og")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { ImageResponse } = await import("@takumi-rs/image-response");

        const url = new URL(request.url);
        const title = url.searchParams.get("title");
        const author = url.searchParams.get("author");

        return new ImageResponse(<OgImage title={title} author={author} />, {
          width: 1200,
          height: 630,
        });
      },
    },
  },
});
```

Now, when you visit `/og?title=Hello%20World&author=Guido`, you’ll get a fully rendered OG image generated at runtime.

## Adding It to Your Head Tags

To make your OG images visible to crawlers, include your route in the meta tags of each page.

```tsx
// src/routes/__root.tsx
export const Route = createRootRouteWithContext<RouterAppContext>()({
  head: () => ({
    meta: [
      {
        name: "og:image",
        content: "YOUR_URL/og?title=YOUR_TITLE&author=YOUR_AUTHOR",
      },
    ],
  }),
  component: RootDocument,
});
```

Now, when someone shares your link, Twitter or Slack will automatically pull the generated image.

## Scaling It Up

Once you’ve got the basics down, the possibilities open up:

- Generate unique images per blog post using metadata from your CMS.
- Add logos, gradients, or brand patterns for visual consistency.
- Create on-demand visuals for changelogs, documentation, or marketing pages.

Because Takumi is written in Rust, it handles all this with impressive speed and minimal memory use.
It’s modern, efficient, and built for production.

## The Takeaway

Dynamic OG images aren’t just a vanity feature: they’re a small but powerful way to extend your brand and make every link you share feel intentional.

With TanStack Start’s flexibility and Takumi’s performance, you can bring that experience to your own stack without friction or vendor lock-in.

Dynamic, fast, and fully type-safe.
