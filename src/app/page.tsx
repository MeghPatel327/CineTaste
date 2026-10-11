import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Film } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 text-center">
      <div className="bg-primary/10 p-4 rounded-full mb-6">
        <Film className="w-12 h-12 text-primary" />
      </div>
      <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-4">
        CineTaste
      </h1>
      <p className="text-xl text-muted-foreground mb-8 max-w-lg">
        A Personal Movie & Series Companion That Learns Your Taste. No social feeds, just deterministic recommendations tailored to you.
      </p>
      
      <div className="flex gap-4">
        <Link href="/login">
          <Button size="lg">Sign In</Button>
        </Link>
        <Link href="/register">
          <Button variant="outline" size="lg">Create Account</Button>
        </Link>
      </div>
    </div>
  );
}
