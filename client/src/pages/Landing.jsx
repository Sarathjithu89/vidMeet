import { Link } from "react-router-dom";
import { useUser } from "@clerk/react";
import {
  ArrowRightIcon,
  CalendarClockIcon,
  CheckIcon,
  HistoryIcon,
  MessageSquareTextIcon,
  MicIcon,
  PhoneOffIcon,
  ShieldCheckIcon,
  SparklesIcon,
  UserIcon,
  VideoIcon,
  VideoOffIcon,
  ZapIcon,
} from "lucide-react";

const features = [
  {
    icon: VideoIcon,
    title: "Crystal-clear video",
    description:
      "Peer-to-peer WebRTC calls keep latency low and quality high, with automatic audio-only fallback.",
  },
  {
    icon: MessageSquareTextIcon,
    title: "Chat that stays on record",
    description:
      "Every message is stored with the meeting so you can revisit decisions long after the call ends.",
  },
  {
    icon: HistoryIcon,
    title: "Meeting history",
    description:
      "Browse past sessions, participant logs and full chat transcripts from a single dashboard.",
  },
  {
    icon: ShieldCheckIcon,
    title: "Private by design",
    description:
      "Signed-in access, encrypted peer connections and host-only meeting controls keep rooms secure.",
  },
];

const steps = [
  {
    number: "01",
    title: "Create a room",
    description: "Sign in and start an instant meeting with one click.",
    icon: ZapIcon,
  },
  {
    number: "02",
    title: "Share the link",
    description: "Send the invite link to anyone you want on the call.",
    icon: UserIcon,
  },
  {
    number: "03",
    title: "Meet and review",
    description: "Talk, chat and later replay the transcript from Sessions.",
    icon: CalendarClockIcon,
  },
];

const Landing = () => {
  const { isLoaded, isSignedIn } = useUser();

  const primaryTo = isSignedIn ? "/dashboard" : "/register";
  const primaryLabel = isSignedIn ? "Open dashboard" : "Get started free";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans overflow-x-hidden">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-1.5">
            <img src="/logo.svg" alt="VidMeet logo" className="size-7" />
            <span className="text-2xl font-medium tracking-tight text-slate-900">
              VidMeet<span className="text-primary">.</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
            <a href="#features" className="transition-colors hover:text-slate-900">
              Features
            </a>
            <a href="#how-it-works" className="transition-colors hover:text-slate-900">
              How it works
            </a>
            <Link to="/pricing" className="transition-colors hover:text-slate-900">
              Pricing
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            {isLoaded && !isSignedIn && (
              <Link
                to="/login"
                className="hidden text-sm font-medium text-slate-600 transition-colors hover:text-slate-900 sm:inline-flex"
              >
                Sign in
              </Link>
            )}
            <Link
              to={primaryTo}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-white shadow-md shadow-primary/20 transition-all hover:bg-primary-hover"
            >
              {isSignedIn ? "Dashboard" : "Get started"}
              <ArrowRightIcon className="size-4" />
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute -left-40 -top-40 size-96 rounded-full bg-primary/10 blur-3xl" />
          <div className="pointer-events-none absolute -right-32 top-24 size-80 rounded-full bg-indigo-300/30 blur-3xl" />

          <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-6 pb-20 pt-16 lg:grid-cols-2 lg:pb-28 lg:pt-24">
            <div className="space-y-7">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3.5 py-1.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200">
                <SparklesIcon className="size-4 text-primary" />
                Built for teams, friends and classrooms
              </span>

              <h1 className="max-w-xl text-balance text-4xl font-medium leading-tight tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
                Video meetings that feel{" "}
                <span className="text-primary">face to face</span>.
              </h1>

              <p className="max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
                Start a call in seconds, share the link and collaborate with
                low-latency video, live chat and a searchable meeting history.
                No downloads required.
              </p>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link
                  to={primaryTo}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-7 py-3.5 text-sm font-medium text-white shadow-lg shadow-primary/25 transition-all hover:bg-primary-hover"
                >
                  {primaryLabel}
                  <ArrowRightIcon className="size-4" />
                </Link>
                <a
                  href="#how-it-works"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-300 bg-white/70 px-7 py-3.5 text-sm font-medium text-slate-800 transition-all hover:border-slate-400 hover:bg-white"
                >
                  See how it works
                </a>
              </div>

              <ul className="flex flex-wrap gap-x-6 gap-y-2 pt-1 text-sm text-slate-600">
                {["Free to start", "No downloads", "Encrypted peer-to-peer"].map(
                  (item) => (
                    <li key={item} className="flex items-center gap-2">
                      <span className="flex size-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                        <CheckIcon className="size-3.5" />
                      </span>
                      {item}
                    </li>
                  ),
                )}
              </ul>
            </div>

            {/* Product preview */}
            <div className="relative mx-auto w-full max-w-lg">
              <div className="absolute -inset-4 rounded-[2rem] bg-primary/10 blur-2xl" />
              <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-slate-300/50">
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      Design sync
                    </p>
                    <p className="text-xs text-slate-500">xkh-yel-ghe</p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                    <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
                    Live
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 bg-slate-100/70 p-3">
                  {[
                    { name: "Ava", gradient: "from-indigo-400 to-blue-500", mic: true },
                    { name: "Noah", gradient: "from-amber-400 to-orange-500", mic: true },
                    { name: "Mia", gradient: "from-emerald-400 to-teal-500", mic: false },
                    { name: "Leo", gradient: "from-slate-500 to-slate-700", mic: true, camOff: true },
                  ].map((person) => (
                    <div
                      key={person.name}
                      className={`relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br ${person.gradient}`}
                    >
                      {person.camOff ? (
                        <div className="flex flex-col items-center gap-2 text-white/90">
                          <div className="flex size-12 items-center justify-center rounded-full bg-white/15 ring-2 ring-white/30">
                            <VideoOffIcon className="size-5" />
                          </div>
                          <span className="text-[10px] font-medium">Camera off</span>
                        </div>
                      ) : (
                        <span className="text-3xl font-semibold text-white/90">
                          {person.name.charAt(0)}
                        </span>
                      )}
                      <span className="absolute bottom-2 left-2 inline-flex items-center gap-1.5 rounded-lg bg-slate-900/60 px-2 py-1 text-[10px] font-medium text-white backdrop-blur">
                        {person.name}
                        {person.mic ? (
                          <MicIcon className="size-3" />
                        ) : (
                          <VideoOffIcon className="size-3 text-rose-300" />
                        )}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-center gap-2.5 border-t border-slate-100 px-5 py-4">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                    <MicIcon className="size-4" />
                  </span>
                  <span className="flex size-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                    <VideoIcon className="size-4" />
                  </span>
                  <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-white shadow-md shadow-primary/25">
                    <MessageSquareTextIcon className="size-4" />
                  </span>
                  <span className="flex size-10 items-center justify-center rounded-xl bg-red-600 text-white">
                    <PhoneOffIcon className="size-4" />
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="border-y border-slate-200 bg-white py-20">
          <div className="mx-auto max-w-7xl px-6">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                Everything in one place
              </p>
              <h2 className="mt-3 text-3xl font-medium tracking-tight text-slate-900 sm:text-4xl">
                Built for real conversations
              </h2>
              <p className="mt-4 text-base leading-relaxed text-slate-600">
                Simple enough for a quick catch-up, complete enough for a
                weekly team sync.
              </p>
            </div>

            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-3xl border border-slate-200 bg-slate-50/70 p-6 transition-all hover:-translate-y-1 hover:border-primary-border hover:bg-white hover:shadow-lg hover:shadow-slate-200/70"
                >
                  <span className="flex size-11 items-center justify-center rounded-2xl bg-primary-light text-primary">
                    <feature.icon className="size-5" />
                  </span>
                  <h3 className="mt-5 text-base font-semibold text-slate-900">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="py-20">
          <div className="mx-auto max-w-7xl px-6">
            <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                  Three steps
                </p>
                <h2 className="mt-3 text-3xl font-medium tracking-tight text-slate-900 sm:text-4xl">
                  From link to meeting in under a minute
                </h2>
                <p className="mt-4 max-w-lg text-base leading-relaxed text-slate-600">
                  Create a room, share the invite and you are in. Every call is
                  saved to your session history automatically.
                </p>
                <Link
                  to={primaryTo}
                  className="mt-7 inline-flex items-center gap-2 rounded-full bg-slate-900 px-6 py-3 text-sm font-medium text-white transition-all hover:bg-slate-800"
                >
                  Start your first meeting
                  <ArrowRightIcon className="size-4" />
                </Link>
              </div>

              <div className="space-y-4">
                {steps.map((step) => (
                  <div
                    key={step.number}
                    className="flex items-start gap-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
                  >
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary-light text-primary">
                      <step.icon className="size-5" />
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-primary">
                          {step.number}
                        </span>
                        <h3 className="text-base font-semibold text-slate-900">
                          {step.title}
                        </h3>
                      </div>
                      <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                        {step.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="px-6 pb-20">
          <div className="mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-slate-900 px-8 py-14 text-center shadow-2xl shadow-slate-400/30 sm:px-14">
            <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-white/10 text-white">
              <VideoIcon className="size-6" />
            </div>
            <h2 className="mx-auto mt-6 max-w-2xl text-3xl font-medium tracking-tight text-white sm:text-4xl">
              Your next meeting is one click away
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-slate-300 sm:text-base">
              Create a free account and start hosting video meetings today.
              Upgrade any time for longer sessions and larger rooms.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                to={primaryTo}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-medium text-slate-900 transition-all hover:bg-slate-100"
              >
                {isSignedIn ? "Open dashboard" : "Create free account"}
                <ArrowRightIcon className="size-4" />
              </Link>
              <Link
                to="/pricing"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/25 px-7 py-3.5 text-sm font-medium text-white transition-all hover:bg-white/10"
              >
                View pricing
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row">
          <Link to="/" className="flex items-center gap-1.5">
            <img src="/logo.svg" alt="VidMeet logo" className="size-6" />
            <span className="text-lg font-medium tracking-tight text-slate-900">
              VidMeet<span className="text-primary">.</span>
            </span>
          </Link>
          <p className="text-xs text-slate-500">
            2026 VidMeet. All rights reserved.
          </p>
          <div className="flex items-center gap-5 text-xs font-medium text-slate-600">
            <a href="#features" className="transition-colors hover:text-slate-900">
              Features
            </a>
            <Link to="/pricing" className="transition-colors hover:text-slate-900">
              Pricing
            </Link>
            <Link to="/login" className="transition-colors hover:text-slate-900">
              Sign in
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
