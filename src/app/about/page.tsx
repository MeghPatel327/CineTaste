"use client";

import Image from "next/image";
import Link from "next/link";
import { ExternalLink, Code, User } from "lucide-react";
import { aboutConfig } from "@/config/about";
import { Button } from "@/components/ui/Button";

export default function AboutPage() {
  const { app, developer, features, techStack, stats, acknowledgements, footer } = aboutConfig;

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      {/* Hero Section */}
      <section className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-16">
        <div className="ct-accent-border p-8 md:p-12 flex flex-col-reverse lg:flex-row items-center gap-12">
          <div className="flex-1 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium">
              <span>{app.version}</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              {app.name}
            </h1>
            <p className="text-xl text-muted-foreground font-medium">
              {app.tagline}
            </p>
            <p className="text-base text-sidebar-foreground/80 leading-relaxed max-w-xl">
              {app.description}
            </p>
          </div>
          <div className="flex-1 w-full relative">
            <div className="aspect-[3/2] w-full relative rounded-xl overflow-hidden shadow-2xl ring-1 ring-border">
              <Image
                src="/images/about_banner.jpg"
                alt="CineTaste Cinematic Banner"
                fill
                className="object-cover"
                priority
              />
              {/* Overlay gradient for better blending */}
              <div className="absolute inset-0 bg-gradient-to-t from-background/40 to-transparent" />
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-24">
        
        {/* Why Built Section */}
        <section className="max-w-3xl mx-auto text-center space-y-6">
          <h2 className="text-3xl font-semibold">Why CineTaste?</h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            {app.whyBuilt}
          </p>
        </section>

        {/* Key Features Section */}
        <section className="space-y-10">
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8">
          {/* Tech Stack */}
          <section className="space-y-8">
            <h2 className="text-2xl font-semibold">Technology Stack</h2>
            <div className="grid grid-cols-2 gap-4">
              {techStack.map((tech, index) => (
                <div key={index} className="bg-card border border-border rounded-lg p-4 flex flex-col justify-center ct-shadow-sm">
                  <span className="font-semibold">{tech.name}</span>
                  <span className="text-xs text-muted-foreground mt-1">{tech.role}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Project Stats */}
          <section className="space-y-8">
            <h2 className="text-2xl font-semibold">Project Statistics</h2>
            <div className="grid grid-cols-2 gap-4">
              {stats.map((stat, index) => (
                <div key={index} className="bg-card border border-border rounded-lg p-4 flex flex-col justify-center ct-shadow-sm">
                  <span className="text-xs text-muted-foreground mb-1">{stat.label}</span>
                  <span className="font-semibold text-lg">{stat.value}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Developer & Acknowledgements Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Developer Profile */}
          <section className="bg-card border border-border rounded-xl p-8 space-y-6 ct-shadow-sm">
            <h2 className="text-2xl font-semibold">Developer</h2>
            <div>
              <h3 className="text-xl font-bold">{developer.name}</h3>
              <p className="text-sm text-primary font-medium mb-4">{developer.role}</p>
              <p className="text-muted-foreground text-sm leading-relaxed mb-6">
                {developer.bio}
              </p>
              <div className="flex gap-4">
                <Link href={developer.github} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm" className="gap-2">
                    <Code className="w-4 h-4" /> GitHub
                  </Button>
                </Link>
                <Link href={developer.linkedin} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm" className="gap-2">
                    <User className="w-4 h-4" /> LinkedIn
                  </Button>
                </Link>
              </div>
            </div>
          </section>

          {/* Acknowledgements */}
          <section className="bg-card border border-border rounded-xl p-8 space-y-6 ct-shadow-sm">
            <h2 className="text-2xl font-semibold">Acknowledgements</h2>
            <div className="space-y-4">
              {acknowledgements.map((ack, index) => (
                <div key={index} className="group">
                  <Link href={ack.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold hover:text-primary transition-colors">
                    {ack.name}
                    <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                  <p className="text-sm text-muted-foreground mt-1">{ack.description}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

      </div>

      {/* Footer */}
      <footer className="mt-24 border-t border-border pt-8 pb-12 text-center text-sm text-muted-foreground">
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-2 text-primary font-semibold text-lg mb-2">
            <div className="w-6 h-6 bg-primary/20 rounded flex items-center justify-center">
              <span className="text-primary text-xs">C</span>
            </div>
            {app.name}
          </div>
          <p>{footer.copyright}</p>
          <p>{footer.message}</p>
        </div>
      </footer>
    </div>
  );
}
