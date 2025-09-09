import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, CheckCircle2, Shield, Sparkles, Workflow, FileSpreadsheet, Share2, MicVocal, Camera, TerminalSquare } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export const dynamic = 'force-static';

export default function LandingPage() {
  return (
    <main className="relative min-h-dvh">
      <Hero />
      <LogosBelt />
      <Features />
      <HowItWorks />
      <Preview />
      <FAQ />
      <Footer />
    </main>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-24 left-1/2 h-[40rem] w-[40rem] -translate-x-1/2 rounded-full bg-gradient-to-b from-blue-400/30 via-primary/20 to-transparent blur-3xl" />
        <div className="absolute -bottom-28 right-1/3 h-[28rem] w-[28rem] rounded-full bg-gradient-to-tr from-sky-300/25 via-indigo-400/15 to-transparent blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl px-6 pb-12 pt-16 sm:pt-24">
        <nav className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Image src="/icon.svg" alt="Oh Fix It" width={28} height={28} className="size-7" />
            <span className="text-base font-semibold">Oh Fix It</span>
          </div>
          <div className="hidden items-center gap-2 md:flex">
            <Link href="#features" className="text-sm text-muted-foreground hover:text-foreground">Features</Link>
            <Link href="#how" className="text-sm text-muted-foreground hover:text-foreground">How it works</Link>
            <Link href="https://github.com/maveryjr/sparka-base-ohfixit" className="text-sm text-muted-foreground hover:text-foreground" target="_blank" rel="noreferrer">GitHub</Link>
            <Link href="/login" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}>Log in</Link>
            <Link href="/register" className={cn(buttonVariants({ size: 'sm' }))}>Create account</Link>
          </div>
        </nav>

        <div className="mx-auto mt-16 max-w-3xl text-center sm:mt-20">
          <div className="inline-flex items-center gap-2 rounded-full border bg-background/50 px-3 py-1 text-xs text-muted-foreground shadow-sm backdrop-blur">
            <Shield className="size-3.5" />
            Screen‑aware, consent‑first tech helper
          </div>
          <h1 className="mt-6 text-balance text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl">
            See it. Diagnose it. Fix it — safely.
          </h1>
          <p className="mt-5 text-pretty text-base leading-7 text-muted-foreground sm:text-lg">
            Oh Fix It helps you resolve computer issues with step‑by‑step guidance and
            optional automated actions. Nothing runs without your approval, and every action is auditable.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/" className={cn(buttonVariants({ size: 'lg' }), 'group')}
              title="Open the app">
              Open the App
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link href="#features" className={cn(buttonVariants({ variant: 'outline', size: 'lg' }))}>
              Explore features
            </Link>
          </div>
        </div>

        <div className="mx-auto mt-14 max-w-5xl rounded-xl border bg-card/70 p-2 shadow-sm backdrop-blur">
          <div className="rounded-lg border bg-muted/30 p-2">
            <Image
              src="/images/demo-thumbnail.png"
              width={1400}
              height={800}
              alt="Oh Fix It demo"
              className="h-auto w-full rounded-md border object-cover shadow-sm"
              priority
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function LogosBelt() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-10">
      <div className="grid grid-cols-2 items-center justify-items-center gap-6 rounded-xl border bg-card px-6 py-6 text-muted-foreground shadow-sm sm:grid-cols-3 md:grid-cols-6">
        <Badge icon={Shield} label="Consent‑first" />
        <Badge icon={Sparkles} label="AI powered" />
        <Badge icon={Workflow} label="Playbooks" />
        <Badge icon={Camera} label="Screen aware" />
        <Badge icon={TerminalSquare} label="Rollback" />
        <Badge icon={Share2} label="Shareable" />
      </div>
    </section>
  );
}

function Badge({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <div className="flex items-center gap-2 text-xs sm:text-sm">
      <Icon className="size-4 text-foreground/70" />
      <span>{label}</span>
    </div>
  );
}

function Features() {
  return (
    <section id="features" className="mx-auto max-w-7xl px-6 py-16 sm:py-20">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Built for real‑world fixes</h2>
        <p className="mt-3 text-muted-foreground">
          From quick wins to guided walkthroughs, Oh Fix It keeps you in control and moves fast.
        </p>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <FeatureCard
          icon={Camera}
          title="Screen‑aware context"
          description="Capture and redact screenshots. The assistant sees what you see—safely."
        />
        <FeatureCard
          icon={FileSpreadsheet}
          title="Health scan"
          description="Run device and network checks, then get a scored summary with recommended next steps."
        />
        <FeatureCard
          icon={Workflow}
          title="Fixlets & playbooks"
          description="Create step‑by‑step solutions you can share and re‑use with audit history."
        />
        <FeatureCard
          icon={Shield}
          title="Consent‑first automation"
          description="Preview every action. Approve, execute, and rollback—allowlisted and JWT‑gated."
        />
        <FeatureCard
          icon={MicVocal}
          title="Voice & explainers"
          description="Ask by voice and get clear, human explanations with pause‑and‑resume replies."
        />
        <FeatureCard
          icon={Share2}
          title="Shareable solutions"
          description="Publish and share Fixlets with one link. Help someone else fix it faster."
        />
      </div>
    </section>
  );
}

function FeatureCard({ icon: Icon, title, description }: { icon: any; title: string; description: string }) {
  return (
    <div className="group relative overflow-hidden rounded-xl border bg-card p-6 shadow-sm transition-colors hover:border-primary/40">
      <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-primary/10 blur-2xl transition-all group-hover:bg-primary/15" />
      <div className="relative">
        <div className="mb-4 inline-flex size-10 items-center justify-center rounded-lg border bg-background shadow-sm">
          <Icon className="size-5 text-primary" />
        </div>
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function HowItWorks() {
  const steps = [
    {
      title: 'Context → Plan',
      desc: 'Share a screenshot or run a health scan. The assistant proposes a simple step‑by‑step plan.'
    },
    {
      title: 'Preview → Approve',
      desc: 'Actions come with explanations, risks, and rollback notes. You decide what runs.'
    },
    {
      title: 'Execute → Verify',
      desc: 'Run safe actions, review results, and keep an audit trail. Share a Fixlet if it helps others.'
    }
  ];

  return (
    <section id="how" className="mx-auto max-w-7xl px-6 py-16">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">How it works</h2>
        <p className="mt-3 text-muted-foreground">Clear steps. Human explanations. Reversible by design.</p>
      </div>

      <ol className="mx-auto mt-10 grid max-w-3xl gap-6">
        {steps.map((s, i) => (
          <li key={s.title} className="relative rounded-xl border bg-card p-5 shadow-sm">
            <div className="absolute left-5 top-5 inline-flex size-7 items-center justify-center rounded-full bg-primary/15 text-primary">
              <span className="text-xs font-semibold">{i + 1}</span>
            </div>
            <div className="pl-12">
              <h3 className="text-base font-semibold">{s.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{s.desc}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="mx-auto mt-8 flex max-w-3xl items-center justify-center gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CheckCircle2 className="size-4 text-green-500" />
          Nothing runs without consent
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CheckCircle2 className="size-4 text-green-500" />
          Every action is auditable
        </div>
      </div>
    </section>
  );
}

function Preview() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-16">
      <div className="grid items-center gap-8 lg:grid-cols-2">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Your AI tech helper</h2>
          <p className="mt-3 text-muted-foreground">
            Multi‑model chat, step‑wise guidance, and consent‑first automation in one place.
            Many features work without an account; sign in to sync history across devices.
          </p>
          <div className="mt-6 flex gap-3">
            <Link href="/" className={cn(buttonVariants({ size: 'lg' }))}>
              Open the App
            </Link>
            <Link href="/register" className={cn(buttonVariants({ variant: 'outline', size: 'lg' }))}>
              Create account
            </Link>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-3 shadow-sm">
          <Image
            src="/opengraph-image.png"
            alt="Oh Fix It preview"
            width={1200}
            height={630}
            className="h-auto w-full rounded-md border object-cover"
          />
        </div>
      </div>
    </section>
  );
}

function FAQ() {
  const faqs = [
    {
      q: 'Is it safe? Does it run things automatically?',
      a: 'Oh Fix It is consent‑first. Nothing executes without your explicit approval. Medium and high‑risk actions are always gated and logged.'
    },
    {
      q: 'Do I need an account?',
      a: 'You can try many features with zero friction. Create an account to sync history, share Fixlets, and enable advanced features.'
    },
    {
      q: 'Is it open source?',
      a: 'Yes. The project is built with Next.js 15, React 19, and the Vercel AI SDK. Explore the code on GitHub.'
    },
  ];

  return (
    <section className="mx-auto max-w-5xl px-6 pb-20">
      <h2 className="text-center text-2xl font-semibold tracking-tight sm:text-3xl">Frequently asked questions</h2>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {faqs.map((f) => (
          <div key={f.q} className="rounded-xl border bg-card p-5 shadow-sm">
            <h3 className="text-base font-semibold">{f.q}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{f.a}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t bg-background/50">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row">
        <div className="flex items-center gap-3">
          <Image src="/icon.svg" alt="Oh Fix It" width={22} height={22} className="size-5" />
          <span className="text-sm text-muted-foreground">© {new Date().getFullYear()} Oh Fix It</span>
        </div>
        <nav className="flex items-center gap-4 text-sm text-muted-foreground">
          <Link href="/login" className="hover:text-foreground">Login</Link>
          <Link href="/register" className="hover:text-foreground">Create account</Link>
          <Link href="https://github.com/maveryjr/sparka-base-ohfixit" target="_blank" rel="noreferrer" className="hover:text-foreground">GitHub</Link>
        </nav>
      </div>
    </footer>
  );
}

