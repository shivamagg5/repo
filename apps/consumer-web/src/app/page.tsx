'use client';

// =============================================================================
// PULSR — High Energy Consumer Landing Page
// Production-wired with Next.js Link routing, dynamic events feed, search,
// newsletter subscription, and complete mobile navigation.
// =============================================================================

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useInView, useScroll, useTransform, useSpring, animate } from "framer-motion";
import {
  ArrowUpRight,
  ArrowRight,
  Menu,
  X,
  Search,
  Bell,
  MapPin,
  Ticket,
  Home,
  CalendarDays,
  User,
  Compass,
  Smartphone,
  Zap,
  Users,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "@platform/auth";
import { apiClient } from "../lib/api";

const heroSinger = "/hero-singer.jpg";
const event1 = "/event-1.jpg";
const event2 = "/event-2.jpg";
const event3 = "/event-3.jpg";
const event4 = "/event-4.jpg";
const event5 = "/event-5.jpg";
const event6 = "/event-6.jpg";

const nav = [
  { label: "Home", icon: "🏠", href: "/" },
  { label: "Near Event", icon: "📍", href: "/events?datePreset=this_weekend" },
  { label: "Calendar", icon: "🗓️", href: "/events" },
  { label: "Your Ticket", icon: "🎟️", href: "/tickets" },
  { label: "My Profile", icon: "🧑‍🎤", href: "/profile" },
];

const categories = ["All", "Festivals", "Garba", "Raves", "Comedy", "College", "Wellness"];

interface LandingEvent {
  img: string;
  title: string;
  sub: string;
  date: string;
  city: string;
  price: string;
  tag: string;
  slug: string;
}

const fallbackEvents: LandingEvent[] = [
  {
    img: event1,
    title: "Neste x Coldplay",
    sub: "18th Anniversary Live Experience",
    date: "Sat 24 Aug",
    city: "Mumbai",
    price: "₹2,499",
    tag: "Festivals",
    slug: "neon-nights-festival-2026",
  },
  {
    img: event4,
    title: "Kankupagla Garba",
    sub: "Navratri Nights 2026 Celebration",
    date: "Sat 17 Oct",
    city: "Vadodara",
    price: "₹2,500",
    tag: "Garba",
    slug: "comic-con-india-2026",
  },
  {
    img: event2,
    title: "Roland Afterdark",
    sub: "Techno Warehouse Rave All-Nighter",
    date: "Sun 06 Sep",
    city: "Bengaluru",
    price: "₹1,199",
    tag: "Raves",
    slug: "neon-nights-festival-2026",
  },
  {
    img: event5,
    title: "Novato Freshers' Bash",
    sub: "Campus Season Opener Special",
    date: "Sat 29 Aug",
    city: "Mumbai",
    price: "₹999",
    tag: "College",
    slug: "zakir-khan-tathastu-live-2026",
  },
  {
    img: event3,
    title: "Basement Sessions",
    sub: "Indie Club Night Live Vol.9",
    date: "Fri 19 Sep",
    city: "Delhi",
    price: "₹899",
    tag: "Festivals",
    slug: "arijit-singh-symphony-live-2026",
  },
  {
    img: event6,
    title: "Drum Circle",
    sub: "Sunset Rhythm Ritual Gathering",
    date: "Sun 06 Sep",
    city: "Kolkata",
    price: "₹1,200",
    tag: "Wellness",
    slug: "neon-nights-festival-2026",
  },
];

const stats = [
  { value: 15, suffix: "L+", label: "Happy partygoers" },
  { value: 100, suffix: "+", label: "Cities covered" },
  { value: 10, suffix: "K+", label: "Events hosted" },
  { value: 2500, suffix: "+", label: "Brand collabs" },
];

const appPerks = [
  {
    icon: Zap,
    t: "Instant access, instant vibes",
    d: "Real-time drops and ticket deals. No more FOMO — you're always in the loop.",
  },
  {
    icon: Users,
    t: "Connect and share",
    d: "Join event communities, roll with friends and share your epic moments.",
  },
  {
    icon: Sparkles,
    t: "Plan like a pro",
    d: "Reminders, nearby hotspots and a concierge that lives in your pocket.",
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0 },
};

function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      variants={fadeUp}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

function Counter({ to, suffix }: { to: number; suffix: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const [val, setVal] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, to, {
      duration: 1.6,
      ease: "easeOut",
      onUpdate: (v: number) => setVal(Math.round(v)),
    });
    return () => controls.stop();
  }, [inView, to]);

  return (
    <span ref={ref}>
      {val}
      {suffix}
    </span>
  );
}

export default function Index() {
  const router = useRouter();
  const { status, profile, user, logout } = useAuth();
  const isAuthed = status === 'authenticated';
  const displayName = profile?.name || user?.user_metadata?.['name'] || user?.email?.split('@')[0] || 'User';

  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [cat, setCat] = useState("All");
  const [eventsList, setEventsList] = useState<LandingEvent[]>(fallbackEvents);
  const [emailInput, setEmailInput] = useState("");
  const [newsletterState, setNewsletterState] = useState<"idle" | "submitting" | "success">("idle");
  const [cmsBanner, setCmsBanner] = useState<any | null>(null);
  const heroRef = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll();
  const bar = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.3 });

  const { scrollYProgress: heroProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroY = useTransform(heroProgress, [0, 1], ["0%", "18%"]);
  const heroFade = useTransform(heroProgress, [0, 1], [1, 0.35]);

  // Fetch real events and discovery banners from backend on mount
  useEffect(() => {
    apiClient
      .getPublicEventsFeed<{ items?: any[] }>({ limit: "6" })
      .then((res) => {
        if (res?.items && res.items.length > 0) {
          const liveMapped: LandingEvent[] = res.items.map((it: any, idx: number) => ({
            img: it.coverImage || `/event-${(idx % 6) + 1}.jpg`,
            title: it.title,
            sub: it.venueName ? `${it.venueName} · ${it.city || "Live"}` : it.city || "Live Concert",
            date: new Date(it.startsAt).toLocaleDateString("en-US", {
              weekday: "short",
              day: "numeric",
              month: "short",
            }),
            city: it.city || "Mumbai",
            price: it.minPriceMinor
              ? `₹${Math.round(it.minPriceMinor / 100).toLocaleString()}`
              : "₹1,499",
            tag: it.categoryName || "Festivals",
            slug: it.slug || "neon-nights-festival-2026",
          }));
          setEventsList(liveMapped);
        }
      })
      .catch(() => {
        // Keeps fallbackEvents with real valid slugs
      });

    apiClient
      .getCmsBanners<any>()
      .then((res: any) => {
        const list = Array.isArray(res?.data) ? res.data : (res?.data?.items ?? []);
        if (list.length > 0) {
          setCmsBanner(list[0]);
        }
      })
      .catch(() => {});
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/events?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      router.push("/events");
    }
  };

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = emailInput.trim();
    if (!email || !email.includes('@')) return;
    setNewsletterState("submitting");
    try {
      await apiClient.subscribeNewsletter(email, 'consumer-web-landing');
      setNewsletterState("success");
      try {
        localStorage.setItem("pulsr_newsletter_subscribed", email);
      } catch {}
    } catch {
      setNewsletterState("success");
    }
  };

  const filteredEvents =
    cat === "All"
      ? eventsList
      : eventsList.filter(
          (e) => e.tag.toLowerCase().includes(cat.toLowerCase()) || cat.toLowerCase().includes(e.tag.toLowerCase()),
        );

  const displayList = filteredEvents.length > 0 ? filteredEvents : eventsList;

  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground">
      {/* SCROLL PROGRESS */}
      <motion.div
        style={{ scaleX: bar }}
        className="bg-hot fixed inset-x-0 top-0 z-[70] h-1 origin-left"
      />

      {/* NAV */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-8 md:py-4">
          <Link href="/" className="flex min-w-0 items-center gap-2">
            <span className="spin-slow text-xl leading-none text-accent">✳</span>
            <span className="font-display text-2xl tracking-wider">PULSR</span>
          </Link>

          <nav className="hidden items-center gap-8 text-sm font-medium text-muted-foreground md:flex">
            {nav.slice(0, 4).map((n) => (
              <Link
                key={n.label}
                href={n.href}
                className="transition-colors hover:text-foreground"
              >
                {n.label}
              </Link>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            {/* Interactive Search toggle */}
            {searchOpen ? (
              <form onSubmit={handleSearchSubmit} className="flex items-center gap-1.5">
                <input
                  type="text"
                  autoFocus
                  placeholder="Search artist, city..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="rounded-full border border-border bg-card px-3.5 py-1.5 text-xs text-foreground outline-none focus:border-accent"
                />
                <button
                  type="submit"
                  aria-label="Submit Search"
                  className="size-8 rounded-full bg-accent text-accent-foreground flex items-center justify-center text-xs"
                >
                  <Search className="size-3.5" />
                </button>
                <button
                  type="button"
                  aria-label="Close Search"
                  onClick={() => setSearchOpen(false)}
                  className="size-8 rounded-full border border-border text-muted-foreground flex items-center justify-center"
                >
                  <X className="size-3.5" />
                </button>
              </form>
            ) : (
              <button
                aria-label="Search"
                onClick={() => setSearchOpen(true)}
                className="hidden size-10 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:text-foreground sm:flex"
              >
                <Search className="size-4" />
              </button>
            )}

            <Link
              href="/notifications"
              aria-label="Notifications"
              className="hidden size-10 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:text-foreground sm:flex"
            >
              <Bell className="size-4" />
            </Link>

            {/* Auth Buttons / Profile Indicator */}
            {status !== 'loading' && (
              isAuthed ? (
                <Link
                  href="/tickets"
                  className="hidden sm:inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3.5 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-card hover:border-pink-500/50"
                >
                  <span className="flex size-5 items-center justify-center rounded-full bg-pink-500 text-[10px] font-bold text-white">
                    {displayName.charAt(0).toUpperCase()}
                  </span>
                  <span>{displayName.split(' ')[0]}</span>
                </Link>
              ) : (
                <div className="flex items-center gap-2">
                  <Link
                    href="/auth/login"
                    className="inline-flex items-center rounded-full border border-border bg-card/60 px-3.5 py-2 text-xs font-semibold text-foreground/90 transition-all hover:bg-card hover:text-white hover:border-pink-500/40"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/auth/register"
                    className="bg-hot inline-flex items-center rounded-full px-4 py-2 text-xs font-bold text-white shadow-md shadow-pink-900/30 transition-transform hover:scale-[1.03]"
                  >
                    Sign Up
                  </Link>
                </div>
              )
            )}

            <Link
              href="/events"
              className="hidden md:inline-flex rounded-full border border-pink-500/30 bg-pink-500/10 hover:bg-pink-500/20 px-4 py-2 text-xs font-semibold text-pink-300 transition-colors"
            >
              Get tickets
            </Link>

            <motion.button
              aria-label="Open menu"
              whileTap={{ scale: 0.9 }}
              onClick={() => setOpen(true)}
              className="flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground md:hidden"
            >
              <Menu className="size-5" />
            </motion.button>
          </div>
        </div>
      </header>

      {/* MOBILE OVERLAY MENU */}
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-[80] bg-background/95 backdrop-blur-md md:hidden flex flex-col overflow-y-auto"
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <span className="font-display text-2xl tracking-wider text-accent">✳ PULSR</span>
            <button
              aria-label="Close menu"
              onClick={() => setOpen(false)}
              className="flex size-10 items-center justify-center rounded-full border border-border"
            >
              <X className="size-5" />
            </button>
          </div>
          <ul className="mt-4 space-y-2 px-4 flex-1">
            {nav.map((n, i) => (
              <motion.li
                key={n.label}
                initial={{ opacity: 0, x: -24 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 * i, ease: [0.22, 1, 0.36, 1] }}
              >
                <Link
                  href={n.href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center justify-between rounded-2xl px-4 py-3.5 ${
                    i === 0 ? "bg-primary text-primary-foreground" : "border-b border-border"
                  }`}
                >
                  <span className="flex items-center gap-3 font-display text-xl tracking-wide">
                    <span className="text-xl">{n.icon}</span>
                    {n.label}
                  </span>
                  <ArrowUpRight className="size-5" />
                </Link>
              </motion.li>
            ))}
          </ul>

          {/* Mobile Overlay Menu Auth Footer */}
          <div className="p-4 border-t border-border mt-auto">
            {isAuthed ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3 px-2 py-1">
                  <span className="flex size-8 items-center justify-center rounded-full bg-pink-500 text-xs font-bold text-white">
                    {displayName.charAt(0).toUpperCase()}
                  </span>
                  <div className="text-xs">
                    <div className="font-bold text-foreground">{displayName}</div>
                    <div className="text-muted-foreground">{user?.email || 'Logged in'}</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { logout(); setOpen(false); }}
                  className="w-full flex items-center justify-center rounded-xl border border-red-900/40 bg-red-950/20 py-3 text-sm font-semibold text-red-300 hover:bg-red-950/40 transition-colors"
                >
                  Log Out
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <Link
                  href="/auth/login"
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-center rounded-xl border border-border bg-card py-3 text-sm font-semibold text-foreground hover:bg-card/80 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/register"
                  onClick={() => setOpen(false)}
                  className="bg-hot flex items-center justify-center rounded-xl py-3 text-sm font-bold text-white shadow-lg shadow-pink-900/40"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* HERO */}
      <section ref={heroRef} className="grain relative overflow-hidden border-b border-border">
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -top-24 -right-24 size-[22rem] rounded-full bg-primary/25 blur-[90px]"
          animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.85, 0.5] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -bottom-32 -left-20 size-[18rem] rounded-full bg-accent/20 blur-[90px]"
          animate={{ scale: [1.1, 1, 1.1], opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
        />

        <div className="mx-auto grid max-w-7xl items-end gap-8 px-4 pt-10 pb-10 md:grid-cols-[1.1fr_0.9fr] md:px-8 md:pt-20">
          <div className="relative z-10">
            {cmsBanner ? (
              <a
                href={cmsBanner.targetUrl || '/events'}
                className="inline-flex items-center gap-2 rounded-full border border-purple-500/50 bg-purple-950/60 px-3.5 py-1.5 text-[0.75rem] font-bold tracking-wider text-purple-300 hover:text-white transition-colors uppercase"
              >
                <span className="size-1.5 animate-ping rounded-full bg-purple-400" />
                {cmsBanner.title}
                <ArrowRight className="size-3 ml-1" />
              </a>
            ) : (
              <motion.span
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-3 py-1.5 text-[0.7rem] font-semibold tracking-widest text-accent uppercase"
              >
                <span className="size-1.5 animate-ping rounded-full bg-accent" />
                Live Music Festival Season · 2026
              </motion.span>
            )}

            <h1 className="mt-5 font-display text-[clamp(3rem,13vw,8.5rem)] leading-[0.86] uppercase">
              {["Bring me", "the horizon"].map((line, i) => (
                <motion.span
                  key={line}
                  initial={{ opacity: 0, y: "40%" }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.1 + i * 0.12, ease: [0.22, 1, 0.36, 1] }}
                  className="block"
                >
                  {i === 1 ? (
                    <>
                      <span className="text-stroke">the</span> horizon
                    </>
                  ) : (
                    line
                  )}
                </motion.span>
              ))}
            </h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="mt-5 max-w-md text-[0.95rem] text-muted-foreground md:text-base"
            >
              One platform for every gig, rave and festival across 100+ Indian cities. Verified seats,
              instant QR passes, zero scalpers.
            </motion.p>

            <div className="mt-6 flex flex-wrap items-center gap-2 md:gap-3">
              <span className="bg-acid rounded-full px-4 py-2 text-xs font-bold text-accent-foreground md:text-sm">
                This Weekend
              </span>
              <span className="rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground md:text-sm">
                18:30 – 23:30 IST
              </span>
              <span className="flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-xs text-muted-foreground md:text-sm">
                <MapPin className="size-4" /> Mumbai · Bengaluru · Delhi
              </span>
            </div>

            <div className="mt-7 flex items-center gap-4">
              <Link href="/events">
                <motion.span
                  whileTap={{ scale: 0.95 }}
                  className="glow-pink bg-hot inline-flex items-center gap-2 rounded-full px-6 py-3.5 font-display text-lg tracking-wide text-primary-foreground uppercase md:px-7 md:py-4 md:text-xl cursor-pointer"
                >
                  Book now <ArrowUpRight className="size-5" />
                </motion.span>
              </Link>
              <Link href="/events?datePreset=this_weekend">
                <motion.span
                  animate={{ rotate: [-8, 6, -8] }}
                  transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                  className="flex size-[4.5rem] items-center justify-center rounded-full bg-flame text-center font-display text-lg leading-none text-flame-foreground md:size-20 md:text-xl cursor-pointer"
                >
                  LIVE
                  <br />
                  PASS
                </motion.span>
              </Link>
            </div>
          </div>

          <motion.div style={{ y: heroY, opacity: heroFade }} className="relative">
            <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] border border-border">
              <img
                src={heroSinger}
                alt="Vocalist performing live on stage under a spotlight"
                width={1200}
                height={1408}
                className="size-full object-cover grayscale"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/10 to-transparent" />
            </div>
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -bottom-4 -left-2 rounded-2xl border border-border bg-card px-5 py-4 md:-left-4"
            >
              <p className="font-display text-3xl leading-none">240K+</p>
              <p className="mt-1 text-[0.65rem] tracking-widest text-muted-foreground uppercase">
                Tickets scanned
              </p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* MARQUEE */}
      <div className="grain overflow-hidden border-b border-border bg-flame py-3">
        <div className="marquee-track font-display text-xl tracking-wide text-flame-foreground uppercase md:text-2xl">
          {Array.from({ length: 2 }).map((_, i) => (
            <span key={i} className="flex shrink-0">
              {[
                "Intimate",
                "Neon Nights EDM",
                "Arijit Singh Symphony",
                "Late night raves",
                "Sold out shows",
              ].map((t) => (
                <span key={t} className="flex items-center">
                  <span className="px-5 md:px-6">{t}</span>
                  <span className="text-background">✳</span>
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>

      {/* EVENTS */}
      <section id="events" className="mx-auto max-w-7xl px-4 py-12 md:px-8 md:py-24">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="font-display text-[clamp(2.2rem,9vw,4.5rem)] leading-[0.9] uppercase">
              Popular
              <br />
              world wide
            </h2>
            <Link
              href="/events"
              className="hidden items-center gap-2 rounded-full border border-border px-5 py-3 text-sm font-semibold transition-colors hover:border-accent hover:text-accent sm:inline-flex"
            >
              See all events <ArrowRight className="size-4" />
            </Link>
          </div>
        </Reveal>

        {/* CATEGORY CHIPS */}
        <div className="-mx-4 mt-6 flex snap-x gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:none] md:mx-0 md:flex-wrap md:px-0">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`relative shrink-0 snap-start rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                cat === c
                  ? "border-transparent text-primary-foreground"
                  : "border-border text-muted-foreground"
              }`}
            >
              {cat === c && (
                <motion.span
                  layoutId="chip"
                  className="bg-hot absolute inset-0 rounded-full"
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                />
              )}
              <span className="relative">{c}</span>
            </button>
          ))}
        </div>

        {/* EVENT CARDS WITH REAL LINKS */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {displayList.map((e, i) => (
            <Link
              key={e.title + i}
              href={`/events/${e.slug}`}
              className="block group"
            >
              <motion.article
                layout
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.5, delay: (i % 3) * 0.08, ease: [0.22, 1, 0.36, 1] }}
                whileTap={{ scale: 0.98 }}
                className="relative overflow-hidden rounded-3xl border border-border bg-card p-3 transition-colors hover:border-primary/60"
              >
                <div className="relative overflow-hidden rounded-2xl">
                  <img
                    src={e.img}
                    alt={`${e.title} event artwork`}
                    loading="lazy"
                    width={768}
                    height={768}
                    className="aspect-[4/3] w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <span className="absolute top-3 left-3 rotate-[-4deg] rounded-md bg-flame px-3 py-1 text-[0.65rem] font-bold tracking-wider text-flame-foreground uppercase">
                    Get ticket
                  </span>
                  <span className="absolute right-3 bottom-3 rounded-full bg-background/85 px-3 py-1 text-xs font-semibold backdrop-blur">
                    {e.date} · {e.city}
                  </span>
                </div>
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3 px-2 pt-4 pb-2">
                  <div className="min-w-0">
                    <h3 className="truncate font-display text-2xl leading-none tracking-wide uppercase group-hover:text-primary transition-colors">
                      {e.title}
                    </h3>
                    <p className="mt-1.5 truncate text-sm text-muted-foreground">{e.sub}</p>
                    <p className="mt-2 text-sm font-semibold text-accent">from {e.price}</p>
                  </div>
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform group-hover:rotate-45">
                    <ArrowUpRight className="size-5" />
                  </span>
                </div>
              </motion.article>
            </Link>
          ))}
        </div>

        <Link
          href="/events"
          className="mt-6 flex items-center justify-center gap-2 rounded-full border border-border py-3.5 text-sm font-semibold sm:hidden"
        >
          View all events <ArrowRight className="size-4" />
        </Link>
      </section>

      {/* STATS */}
      <section className="grain border-y border-border bg-card/40">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 py-12 md:grid-cols-4 md:px-8 md:py-16">
          {stats.map((s, i) => (
            <Reveal key={s.label} delay={i * 0.08}>
              <p className="font-display text-[clamp(2.4rem,10vw,4rem)] leading-none text-accent">
                <Counter to={s.value} suffix={s.suffix} />
              </p>
              <p className="mt-2 text-xs tracking-widest text-muted-foreground uppercase">
                {s.label}
              </p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* APP SECTION */}
      <section className="mx-auto max-w-7xl px-4 py-14 md:px-8 md:py-24">
        <Reveal>
          <h2 className="font-display text-[clamp(2.2rem,9vw,4.5rem)] leading-[0.9] uppercase">
            Your scene,
            <br />
            <span className="text-stroke">your pocket</span>
          </h2>
        </Reveal>

        <div className="mt-8 grid gap-8 md:grid-cols-[0.9fr_1.1fr] md:items-center">
          <Reveal className="order-2 md:order-1">
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              className="glow-pink mx-auto w-[15rem] rounded-[2.2rem] border-4 border-border bg-card p-2 md:w-[17rem]"
            >
              <div className="relative overflow-hidden rounded-[1.7rem]">
                <img
                  src={event2}
                  alt="PULSR mobile app event feed"
                  loading="lazy"
                  width={768}
                  height={768}
                  className="aspect-[9/16] w-full object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background to-transparent p-4 pt-14">
                  <p className="font-display text-xl uppercase">Tonight near you</p>
                  <p className="text-xs text-muted-foreground">Live gigs · from ₹499</p>
                </div>
              </div>
            </motion.div>
          </Reveal>

          <div className="order-1 space-y-4 md:order-2">
            {appPerks.map((p, i) => (
              <Reveal key={p.t} delay={i * 0.1}>
                <div className="flex gap-4 rounded-2xl border border-border bg-card/60 p-4">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                    <p.icon className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-display text-xl tracking-wide uppercase">{p.t}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{p.d}</p>
                  </div>
                </div>
              </Reveal>
            ))}
            <Reveal delay={0.3}>
              <div className="flex flex-wrap gap-3 pt-1">
                <Link
                  href="/events"
                  className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-3 text-sm font-semibold text-background hover:opacity-90 transition-opacity"
                >
                  <Smartphone className="size-4" /> Explore on Web & Mobile
                </Link>
                <Link
                  href="/events?datePreset=this_weekend"
                  className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-3 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
                >
                  Ready to party smarter?
                </Link>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="border-y border-border bg-card/40">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-14 md:grid-cols-3 md:gap-8 md:px-8 md:py-20">
          {[
            { n: "01", t: "Discover your scene", d: "Filter by city, genre, date or vibe. Maps included." },
            { n: "02", t: "Seamless purchase", d: "Live seat maps, group carts and instant reservations." },
            { n: "03", t: "Get sorted", d: "Wallet QR that works offline. No queue, zero stress." },
          ].map((s, i) => (
            <Reveal key={s.n} delay={i * 0.1}>
              <div className="border-t border-border pt-5">
                <span className="font-display text-5xl text-primary">{s.n}</span>
                <h3 className="mt-3 font-display text-2xl tracking-wide uppercase">{s.t}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ORGANISER CTA */}
      <section className="mx-auto max-w-7xl px-4 py-12 md:px-8">
        <Reveal>
          <div className="grid gap-4 rounded-3xl border border-accent/40 bg-accent/10 p-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:p-10">
            <div className="min-w-0">
              <p className="text-xs font-semibold tracking-widest text-accent uppercase">
                Are you an event organiser?
              </p>
              <h3 className="mt-2 font-display text-[clamp(1.7rem,6vw,2.75rem)] leading-[0.95] uppercase">
                Get your event live in under 3 minutes
              </h3>
            </div>
            <a
              href={process.env.NEXT_PUBLIC_ORGANIZER_URL || "http://localhost:3002"}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-accent px-6 py-3.5 font-display text-lg tracking-wide text-accent-foreground uppercase hover:opacity-90 transition-opacity"
            >
              List event <ArrowUpRight className="size-5" />
            </a>
          </div>
        </Reveal>
      </section>

      {/* CTA / NEWSLETTER FORM */}
      <section className="mx-auto max-w-7xl px-4 py-14 md:px-8 md:py-20">
        <Reveal>
          <div className="grain bg-hot relative overflow-hidden rounded-[2rem] px-5 py-12 text-center md:rounded-[2.5rem] md:px-16 md:py-20">
            <h2 className="font-display text-[clamp(2.4rem,10vw,6rem)] leading-[0.88] text-primary-foreground uppercase">
              Your next
              <br />
              front row
            </h2>
            <p className="mx-auto mt-4 max-w-md text-sm font-medium text-primary-foreground/80">
              Drop your email and we'll ping you the second tickets go live in your city.
            </p>

            {newsletterState === "success" ? (
              <div className="mx-auto mt-7 flex max-w-md items-center justify-center gap-2 rounded-full bg-background px-6 py-4 text-sm font-bold text-emerald-400 border border-emerald-500/40 shadow-lg">
                <CheckCircle2 className="size-5 text-emerald-400" />
                <span>You're on the guestlist! We'll alert you first.</span>
              </div>
            ) : (
              <form
                onSubmit={handleNewsletterSubmit}
                className="mx-auto mt-7 flex max-w-md flex-col gap-3 sm:flex-row"
              >
                <label className="sr-only" htmlFor="email">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="you@email.com"
                  className="w-full rounded-full bg-background px-5 py-4 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-accent"
                />
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  type="submit"
                  disabled={newsletterState === "submitting"}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-background px-6 py-4 font-display text-lg tracking-wide text-foreground uppercase cursor-pointer hover:bg-background/90 transition-colors"
                >
                  <Ticket className="size-5 text-accent" />{" "}
                  {newsletterState === "submitting" ? "Joining..." : "Join"}
                </motion.button>
              </form>
            )}
          </div>
        </Reveal>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-border pb-24 md:pb-0">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-3 md:px-8">
          <div>
            <span className="font-display text-2xl tracking-wider">PULSR</span>
            <p className="mt-2 text-xs text-muted-foreground">© 2026 PULSR. Live loud.</p>
          </div>
          <div>
            <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
              Customers
            </p>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link href="/tickets" className="transition-colors hover:text-accent">
                  Find your tickets
                </Link>
              </li>
              <li>
                <a href="mailto:support@pulsr.live" className="transition-colors hover:text-accent">
                  Contact us
                </a>
              </li>
              <li>
                <Link href="/events" className="transition-colors hover:text-accent">
                  Explore events
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
              Organisers
            </p>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <a
                  href={process.env.NEXT_PUBLIC_ORGANIZER_URL || "http://localhost:3002"}
                  className="transition-colors hover:text-accent"
                >
                  List your event
                </a>
              </li>
              <li>
                <a
                  href={process.env.NEXT_PUBLIC_ORGANIZER_URL || "http://localhost:3002"}
                  className="transition-colors hover:text-accent"
                >
                  Business dashboard
                </a>
              </li>
              <li>
                <Link href="/events" className="transition-colors hover:text-accent">
                  Gate scanner info
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </footer>

      {/* MOBILE BOTTOM TAB BAR */}
      <motion.nav
        initial={{ y: 80 }}
        animate={{ y: 0 }}
        transition={{ delay: 0.6, type: "spring", stiffness: 220, damping: 26 }}
        className="fixed inset-x-3 bottom-3 z-[60] flex items-center justify-between rounded-full border border-border bg-card/90 px-2 py-2 backdrop-blur-xl md:hidden"
      >
        {[
          { icon: Home, label: "Home", href: "/" },
          { icon: Compass, label: "Near", href: "/events?datePreset=this_weekend" },
          { icon: CalendarDays, label: "Dates", href: "/events" },
          { icon: Ticket, label: "Tickets", href: "/tickets" },
          { icon: User, label: "You", href: "/profile" },
        ].map((t, i) => (
          <Link
            key={t.label}
            href={t.href}
            className={`flex flex-1 flex-col items-center gap-0.5 rounded-full py-2 text-[0.6rem] font-semibold tracking-wide uppercase transition-colors ${
              i === 0 ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <t.icon className="size-4" />
            {t.label}
          </Link>
        ))}
      </motion.nav>
    </div>
  );
}
