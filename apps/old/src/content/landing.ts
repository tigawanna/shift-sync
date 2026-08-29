import { CalendarDays, Clock, MapPin, Sparkles, Users, Zap } from "lucide-react";

export const landingNav = {
  links: [
    { label: "How it works", href: "#capabilities" },
    { label: "Why ShiftSync", href: "#why" },
  ],
} as const;

export const landingAccess = {
  eyebrow: "Get started",
  heading: "Organize your team in one place",
  description:
    "Managers build schedules, staff see their shifts, and everyone stays aligned across locations and time zones.",
  cta: "Sign in",
} as const;

export const landingHero = {
  stats: [
    { label: "4 locations", tone: "neutral" },
    { label: "2 time zones", tone: "red" },
    { label: "Coastal Eats", tone: "green" },
  ],
  title: "Multi-location shift scheduling that stays in sync",
  description:
    "ShiftSync helps restaurant managers build fair schedules, handle time zones, and keep staff informed — without the spreadsheet chaos.",
  primaryCta: "Get started",
  secondaryCta: "See how it works",
} as const;

export const landingCapabilities = {
  heading: "Scheduling built for real restaurant operations",
  description:
    "From multi-location coverage to time-zone-aware shifts, ShiftSync handles the complexity managers face every week.",
  steps: [
    {
      id: "01",
      label: "PLAN",
      icon: CalendarDays,
      title: "Build weekly schedules",
      description:
        "Drag-and-drop shifts across locations, roles, and availability — with conflict detection before you publish.",
    },
    {
      id: "02",
      label: "COORDINATE",
      icon: MapPin,
      title: "Manage four locations",
      description:
        "Coastal Eats spans two time zones. ShiftSync keeps local hours, overlaps, and handoffs clear for every site.",
    },
    {
      id: "03",
      label: "COMMUNICATE",
      icon: Users,
      title: "Keep staff in the loop",
      description:
        "Staff see their shifts, swap requests, and updates in one place — managers approve changes without the group chat spiral.",
    },
  ],
} as const;

export const landingReasons = {
  heading: "Built for managers and staff who move fast",
  description:
    "Restaurant scheduling breaks when tools ignore time zones, part-time availability, and last-minute changes. ShiftSync is designed around those realities.",
  items: [
    {
      icon: Sparkles,
      title: "Multi-location by default",
      description:
        "Four Coastal Eats locations, two time zones — one schedule that respects local context.",
    },
    {
      icon: Clock,
      title: "Time-zone aware",
      description:
        "Shifts display in the right local time for each location, with clear overlap windows for cross-site coordination.",
    },
    {
      icon: Zap,
      title: "Fast for everyone",
      description:
        "Managers publish in minutes. Staff check shifts on any device without digging through messages.",
    },
  ],
} as const;

export const landingCta = {
  title: "Ready to simplify staff scheduling?",
  highlight: "scheduling",
  description:
    "Sign in to start organizing your team — managers plan schedules, staff stay informed.",
  primaryCta: "Get started",
  secondaryCta: "See how it works",
} as const;

export const landingFooter = {
  tagline: "Schedules · locations · teams",
  legal: [
    { label: "Privacy", to: "/privacy" as const },
    { label: "Terms", to: "/terms" as const },
  ],
} as const;
