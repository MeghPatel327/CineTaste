import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getFilmIndustry(original_language: string): string {
  const mapping: Record<string, string> = {
    en: "Hollywood",
    hi: "Bollywood",
    te: "Tollywood",
    ta: "Kollywood",
    ml: "Mollywood",
    ja: "Japanese Cinema",
    ko: "Korean Cinema",
    zh: "Chinese Cinema",
    fr: "French Cinema",
    es: "Spanish Cinema",
    it: "Italian Cinema",
    de: "German Cinema",
  };
  return mapping[original_language?.toLowerCase()] || "International Cinema";
}
