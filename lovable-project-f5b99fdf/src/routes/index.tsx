import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { motion, useInView, useScroll, useTransform, useSpring, animate } from "motion/react";
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
} from "lucide-react";

import heroSinger from "@/assets/hero-singer.jpg";
import event1 from "@/assets/event-1.jpg";
import event2 from "@/assets/event-2.jpg";
import event3 from "@/assets/event-3.jpg";
import event4 from "@/assets/event-4.jpg";
import event5 from "@/assets/event-5.jpg";
import event6 from "@/assets/event-6.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PULSR — Book Live Events, Festivals & Gigs in India" },
      {
        name: "description",
        content:
          "PULSR is the ticketing app for live music. Discover festivals, garba nights, raves and gigs across 100+ cities and grab tickets in seconds.",
      },
      { property: "og:title", content: "PULSR — Book Live Events, Festivals & Gigs in India" },
      {
        property: "og:description",
        content:
          "Discover festivals, garba nights, raves and gigs across 100+ cities and grab tickets in seconds on PULSR.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const nav = [
  { label: "Home", icon: "🏠" },
  { label: "Near Event", icon: "📍" },
  { label: "Calendar", icon: "🗓️" },
  { label: "Your Ticket", icon: "🎟️" },
  { label: "My Profile", icon: "🧑‍🎤" },
];

const categories = ["All", "Festivals", "Garba", "Raves", "Comedy", "College", "Wellness"];

const events = [
  {
    img: event1,
    title: "Neste x Coldplay",
    sub: "18th Anniversary Live",
    date: "Sat 24 Aug",
    city: "Mumbai",
    price: "₹2,499",
    tag: "Festivals",
  },
  {
    img: event4,
    title: "Kankupagla Garba",
    sub: "Navratri Nights 2026",
    date: "Sat 17 Oct",
    city: "Vadodara",
    price: "₹2,500",
    tag: "Garba",
  },
  {
    img: event2,
    title: "Roland Afterdark",
    sub: "Techno Warehouse Rave",
    date: "Sun 06 Sep",
    city: "Bengaluru",
    price: "₹1,199",
    tag: "Raves",
  },
  {
    img: event5,
    title: "Novato Freshers' Bash",
    sub: "Campus Season Opener",
    date: "Sat 29 Aug",
    city: "Mumbai",
    price: "₹999",
    tag: "College",
  },
  {
    img: event3,
    title: "Basement Sessions",
    sub: "Indie Club Night Vol.9",
    date: "Fri 19 Sep",
    city: "Delhi",
    price: "₹899",
    tag: "Festivals",
  },
  {
    img: event6,
    title: "Drum Circle",
    sub: "Sunset Rhythm Ritual",
    date: "Sun 06 Sep",
    city: "Kolkata",
    price: "₹1,200",
    tag: "Wellness",
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
      onUpdate: (v) => setVal(Math.round(v)),
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

function Index() {
  const [open, setOpen] = useState(false);
  const [cat, setCat] = useState("All");
  const heroRef = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll();
  const bar = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.3 });

  const { scrollYProgress: heroProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroY = useTransform(heroProgress, [0, 1], ["0%", "18%"]);
  const heroFade = useTransform(heroProgress, [0, 1], [1, 0.35]);

  const list = cat === "All" ? events : events.filter((e) => e.tag === cat);

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
          <a href="#" className="flex min-w-0 items-center gap-2">
            <span className="spin-slow text-xl leading-none text-accent">✳</span>
            <span className="font-display text-2xl tracking-wider">PULSR</span>
          </a>

          <nav className="hidden items-center gap-8 text-sm font-medium text-muted-foreground md:flex">
            {nav.slice(0, 4).map((n) => (
              <a key={n.label} href="#events" className="transition-colors hover:text-foreground">
                {n.label}
              </a>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            <button
              aria-label="Search"
              className="hidden size-10 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:text-foreground sm:flex"
            >
              <Search className="size-4" />
            </button>
            <button
              aria-label="Notifications"
              className="hidden size-10 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:text-foreground sm:flex"
            >
              <Bell className="size-4" />
            </button>
            <motion.button
              aria-label="Open menu"
              whileTap={{ scale: 0.9 }}
              onClick={() => setOpen(true)}
              className="flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground md:hidden"
            >
              <Menu className="size-5" />
            </motion.button>
            <a
              href="#events"
              className="bg-hot hidden rounded-full px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.03] md:inline-flex"
            >
              Get tickets
            </a>
          </div>
        </div>
      </header>

      {/* MOBILE OVERLAY MENU */}
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-[80] bg-background/95 backdrop-blur-md md:hidden"
        >
          <div className="flex items-center justify-between px-5 py-4">
            <span className="font-display text-2xl tracking-wider text-muted-foreground">PULSR</span>
            <button
              aria-label="Close menu"
              onClick={() => setOpen(false)}
              className="flex size-10 items-center justify-center rounded-full border border-border"
            >
              <X className="size-5" />
            </button>
          </div>
          <ul className="mt-6 space-y-2 px-4">
            {nav.map((n, i) => (
              <motion.li
                key={n.label}
                initial={{ opacity: 0, x: -24 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 * i, ease: [0.22, 1, 0.36, 1] }}
              >
                <a
                  href="#events"
                  onClick={() => setOpen(false)}
                  className={`flex items-center justify-between rounded-2xl px-4 py-4 ${
                    i === 0 ? "bg-primary text-primary-foreground" : "border-b border-border"
                  }`}
                >
                  <span className="flex items-center gap-3 font-display text-2xl tracking-wide">
                    <span className="text-xl">{n.icon}</span>
                    {n.label}
                  </span>
                  <ArrowUpRight className="size-6" />
                </a>
              </motion.li>
            ))}
          </ul>
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
            <motion.span
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-3 py-1.5 text-[0.7rem] font-semibold tracking-widest text-accent uppercase"
            >
              <span className="size-1.5 animate-ping rounded-full bg-accent" />
              Indometal Festival · 2026
            </motion.span>

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
              One app for every gig, rave and festival across 100+ Indian cities. Real seats,
              instant QR tickets, zero scalpers.
            </motion.p>

            <div className="mt-6 flex flex-wrap items-center gap-2 md:gap-3">
              <span className="bg-acid rounded-full px-4 py-2 text-xs font-bold text-accent-foreground md:text-sm">
                12 – 15 June
              </span>
              <span className="rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground md:text-sm">
                18:30 – 23:30 IST
              </span>
              <span className="flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-xs text-muted-foreground md:text-sm">
                <MapPin className="size-4" /> Jakarta, Indonesia
              </span>
            </div>

            <div className="mt-7 flex items-center gap-4">
              <motion.a
                whileTap={{ scale: 0.95 }}
                href="#events"
                className="glow-pink bg-hot inline-flex items-center gap-2 rounded-full px-6 py-3.5 font-display text-lg tracking-wide text-primary-foreground uppercase md:px-7 md:py-4 md:text-xl"
              >
                Book now <ArrowUpRight className="size-5" />
              </motion.a>
              <motion.span
                animate={{ rotate: [-8, 6, -8] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                className="flex size-[4.5rem] items-center justify-center rounded-full bg-flame text-center font-display text-lg leading-none text-flame-foreground md:size-20 md:text-xl"
              >
                30%
                <br />
                OFF
              </motion.span>
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
                "Indometal Festival",
                "Bring me the Horizon",
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
            <a
              href="#events"
              className="hidden items-center gap-2 rounded-full border border-border px-5 py-3 text-sm font-semibold transition-colors hover:border-accent hover:text-accent sm:inline-flex"
            >
              See all events <ArrowRight className="size-4" />
            </a>
          </div>
        </Reveal>

        {/* CATEGORY CHIPS — horizontal scroll on mobile */}
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

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((e, i) => (
            <motion.article
              key={e.title}
              layout
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.5, delay: (i % 3) * 0.08, ease: [0.22, 1, 0.36, 1] }}
              whileTap={{ scale: 0.98 }}
              className="group relative overflow-hidden rounded-3xl border border-border bg-card p-3 transition-colors hover:border-primary/60"
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
                  <h3 className="truncate font-display text-2xl leading-none tracking-wide uppercase">
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
          ))}
        </div>

        <a
          href="#events"
          className="mt-6 flex items-center justify-center gap-2 rounded-full border border-border py-3.5 text-sm font-semibold sm:hidden"
        >
          View all events <ArrowRight className="size-4" />
        </a>
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
                  <p className="text-xs text-muted-foreground">14 events · from ₹499</p>
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
                <a
                  href="#events"
                  className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-3 text-sm font-semibold text-background"
                >
                  <Smartphone className="size-4" /> Get the app
                </a>
                <a
                  href="#events"
                  className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-3 text-sm font-semibold text-muted-foreground"
                >
                  Ready to party smarter?
                </a>
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
            { n: "02", t: "Seamless purchase", d: "Live seat maps, group carts and price alerts." },
            { n: "03", t: "Get sorted", d: "Wallet QR that works offline. No queue, no stress." },
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
              href="#events"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-accent px-6 py-3.5 font-display text-lg tracking-wide text-accent-foreground uppercase"
            >
              List event <ArrowUpRight className="size-5" />
            </a>
          </div>
        </Reveal>
      </section>

      {/* CTA */}
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
            <form
              onSubmit={(ev) => ev.preventDefault()}
              className="mx-auto mt-7 flex max-w-md flex-col gap-3 sm:flex-row"
            >
              <label className="sr-only" htmlFor="email">
                Email address
              </label>
              <input
                id="email"
                type="email"
                required
                placeholder="you@email.com"
                className="w-full rounded-full bg-background px-5 py-4 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-accent"
              />
              <motion.button
                whileTap={{ scale: 0.96 }}
                type="submit"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-background px-6 py-4 font-display text-lg tracking-wide text-foreground uppercase"
              >
                <Ticket className="size-5 text-accent" /> Join
              </motion.button>
            </form>
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
          {[
            { h: "Customers", l: ["Find your tickets", "Contact us", "Apps"] },
            { h: "Organisers", l: ["List your event", "Business app", "Scanner app"] },
          ].map((c) => (
            <div key={c.h}>
              <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                {c.h}
              </p>
              <ul className="mt-3 space-y-2 text-sm">
                {c.l.map((x) => (
                  <li key={x}>
                    <a href="#events" className="transition-colors hover:text-accent">
                      {x}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
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
          { icon: Home, label: "Home" },
          { icon: Compass, label: "Near" },
          { icon: CalendarDays, label: "Dates" },
          { icon: Ticket, label: "Tickets" },
          { icon: User, label: "You" },
        ].map((t, i) => (
          <a
            key={t.label}
            href="#events"
            className={`flex flex-1 flex-col items-center gap-0.5 rounded-full py-2 text-[0.6rem] font-semibold tracking-wide uppercase ${
              i === 0 ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            }`}
          >
            <t.icon className="size-4" />
            {t.label}
          </a>
        ))}
      </motion.nav>
    </div>
  );
}
