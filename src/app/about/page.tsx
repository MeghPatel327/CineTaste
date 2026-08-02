"use client";

import Image from "next/image";
import Link from "next/link";
import { ExternalLink, Code, User } from "lucide-react";
import { aboutConfig } from "@/config/about";
import { Button } from "@/components/ui/Button";
import { AppShell } from "@/components/AppShell";

export default function AboutPage() {
  const { app, developer, features, techStack, stats, acknowledgements, footer } = aboutConfig;

  return (
    <AppShell>
      <div className="min-h-screen bg-background text-foreground pb-20 page-enter">
        {/* Hero Section */}
        <section className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-12">
          <div className="ct-accent-border p-8 md:p-16 flex flex-col-reverse lg:flex-row items-center gap-12 min-h-[500px]">
            <div className="flex-1 space-y-8 z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium">
                <span>{app.version}</span>
              </div>
              <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
                {app.name}
              </h1>
              <p className="text-2xl text-muted-foreground font-medium">
                {app.tagline}
              </p>
              <p className="text-lg text-sidebar-foreground/80 leading-relaxed max-w-xl">
                {app.description}
              </p>
            </div>
            <div className="flex-1 w-full relative h-[300px] lg:h-full min-h-[300px] z-10">
              <div className="absolute inset-0 relative rounded-xl overflow-hidden shadow-2xl ring-1 ring-border h-full w-full">
                <Image
                  src="/images/about_banner.jpg"
                  alt="CineTaste Cinematic Banner"
                  fill
                  className="object-cover"
                  priority
                />
                {/* Overlay gradient for better blending */}
                <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent" />
              </div>
            </div>
            {/* Background Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 bg-primary/5 blur-[120px] rounded-full pointer-events-none" />
          </div>
        </section>

        {/* Main Content Container - Reduced Spacing to gap-16 / space-y-16 */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16 mt-4">
          
          {/* Why Built Section */}
          <section className="max-w-3xl mx-auto text-center space-y-6">
            <h2 className="text-3xl font-semibold">Why CineTaste?</h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              {app.whyBuilt}
            </p>
          </section>

          {/* Key Features Section - Wrapped in ct-accent-border */}
          <section className="ct-accent-border p-8 md:p-12 space-y-10">
            <div className="text-center space-y-4">
              <h2 className="text-3xl font-semibold">Key Features</h2>
              <p className="text-muted-foreground">Everything you need to track and discover content.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <div key={index} className="bg-card border border-border rounded-xl p-6 hover:border-primary/50 transition-colors ct-shadow-sm group">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Recommendation Engine Flow */}
          <section className="ct-accent-border p-8 md:p-12 text-center space-y-10">
            <div className="space-y-4 max-w-2xl mx-auto">
              <h2 className="text-3xl font-semibold">The Engine</h2>
              <p className="text-muted-foreground">
                A transparent, deterministic approach to recommendations. We analyze your unique viewing habits across genres, directors, actors, and more.
              </p>
            </div>
            
            {/* Visual Flow */}
            <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8 text-sm font-medium">
              <div className="bg-secondary px-6 py-4 rounded-xl border border-border shadow-sm w-48">
                Your Library & Ratings
              </div>
              <div className="hidden md:block text-primary">→</div>
              <div className="md:hidden text-primary">↓</div>
              <div className="bg-primary/10 text-primary px-6 py-4 rounded-xl border border-primary/20 shadow-sm w-48">
                Taste Profile
              </div>
              <div className="hidden md:block text-primary">→</div>
              <div className="md:hidden text-primary">↓</div>
              <div className="bg-secondary px-6 py-4 rounded-xl border border-border shadow-sm w-48">
                Recommendation Engine
              </div>
              <div className="hidden md:block text-primary">→</div>
              <div className="md:hidden text-primary">↓</div>
              <div className="bg-accent text-accent-foreground px-6 py-4 rounded-xl border border-accent/20 shadow-sm w-48 font-semibold">
                Perfect Matches
              </div>
            </div>
          </section>

          {/* Tech Stack & Stats Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-8">
            {/* Tech Stack - Wrapped in ct-accent-border */}
            <section className="ct-accent-border p-8 md:p-12 space-y-8 flex flex-col">
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold">Technology Stack</h2>
                <p className="text-sm text-muted-foreground">Built with modern web technologies.</p>
              </div>
              <div className="grid grid-cols-2 gap-4 flex-1">
                {techStack.map((tech, index) => {
                  const Icon = tech.icon;
                  return (
                    <div key={index} className="bg-card border border-border rounded-lg p-4 flex items-center gap-3 ct-shadow-sm group hover:border-primary/50 transition-colors">
                      {Icon && (
                        <div className="w-10 h-10 shrink-0 bg-secondary rounded-md flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                          <Icon className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                      )}
                      <div>
                        <div className="font-semibold text-sm group-hover:text-primary transition-colors">{tech.name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{tech.role}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Project Stats - Wrapped in ct-accent-border */}
            <section className="ct-accent-border p-8 md:p-12 space-y-8 flex flex-col">
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold">Project Statistics</h2>
                <p className="text-sm text-muted-foreground">By the numbers.</p>
              </div>
              <div className="grid grid-cols-2 gap-4 flex-1">
                {stats.map((stat, index) => (
                  <div key={index} className="ct-stagger-item bg-card p-4 rounded-xl border border-border shadow-sm flex flex-col items-center justify-center text-center group hover:border-primary/50 transition-colors" style={{ animationDelay: `${index * 50}ms` }}>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1 opacity-80">{stat.label}</p>
                    <p className="text-xl font-bold group-hover:text-primary transition-colors">{stat.value}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Developer & Acknowledgements Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 lg:gap-8">
            {/* Developer Profile - Wrapped in ct-accent-border */}
            <section className="ct-accent-border p-8 md:p-12 space-y-6">
              <h2 className="text-2xl font-semibold">Developer</h2>
              <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
                {developer.avatarUrl ? (
                  <div className="relative w-24 h-24 shrink-0 rounded-full overflow-hidden border-2 border-primary/20 shadow-md">
                    <Image src={developer.avatarUrl} alt={developer.name} fill className="object-cover" />
                  </div>
                ) : (
                  <div className="w-24 h-24 shrink-0 rounded-full bg-secondary flex items-center justify-center border-2 border-border shadow-md">
                    <span className="text-3xl font-bold text-muted-foreground">{developer.name.charAt(0)}</span>
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="text-xl font-bold">{developer.name}</h3>
                  <p className="text-sm text-primary font-medium mb-3">{developer.role}</p>
                  <p className="text-muted-foreground text-sm leading-relaxed mb-6">
                    {developer.bio}
                  </p>
                  <div className="flex gap-4">
                    <Link href={developer.github} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm" className="gap-2 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors">
                        <Code className="w-4 h-4" /> GitHub
                      </Button>
                    </Link>
                    <Link href={developer.linkedin} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm" className="gap-2 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors">
                        <User className="w-4 h-4" /> LinkedIn
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </section>

            {/* Acknowledgements - Wrapped in ct-accent-border */}
            <section className="ct-accent-border p-8 md:p-12 space-y-6">
              <h2 className="text-2xl font-semibold">Acknowledgements</h2>
              <div className="space-y-5">
                {acknowledgements.map((ack, index) => (
                  <div key={index} className="group bg-card/50 p-4 rounded-lg border border-border/50 hover:bg-card hover:border-primary/30 transition-all">
                    <Link href={ack.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 font-semibold hover:text-primary transition-colors text-base">
                      {ack.name}
                      <ExternalLink className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity -translate-y-0.5" />
                    </Link>
                    <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{ack.description}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>

        </div>

        {/* Premium Footer */}
        <footer className="mt-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto border-t border-border/60 pt-12 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary/20 rounded-md flex items-center justify-center ring-1 ring-primary/30">
                <span className="text-primary font-bold text-sm">C</span>
              </div>
              <div>
                <div className="font-semibold text-lg leading-tight">{app.name}</div>
                <div className="text-xs text-muted-foreground">v{app.version}</div>
              </div>
            </div>
            
            <div className="text-sm text-muted-foreground text-center md:text-right space-y-1">
              <p>{footer.copyright}</p>
              <p className="text-primary/80 font-medium">{footer.message}</p>
            </div>
          </div>
        </footer>
      </div>
    </AppShell>
  );
}
