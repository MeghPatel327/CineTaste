import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getFilmIndustry(movieData: {
  production_countries?: any[];
  production_companies?: any[];
  origin_country?: string[];
  original_language?: string;
} | string): string {
  let lang = "";
  
  if (typeof movieData === "string") {
    lang = movieData;
  } else {
    lang = movieData?.original_language || "";

    const countryMapping: Record<string, string> = {
      US: "Hollywood",
      KR: "Korean Cinema",
      JP: "Japanese Cinema",
      CN: "Chinese Cinema",
      HK: "Hong Kong Cinema",
      FR: "French Cinema",
      GB: "British Cinema",
      ES: "Spanish Cinema",
      IT: "Italian Cinema",
      DE: "German Cinema",
    };

    const getIndustryForCountry = (country: string, language: string) => {
      if (country === "US") return "Hollywood";
      if (country === "IN") {
        const langMap: Record<string, string> = {
          hi: "Bollywood",
          te: "Tollywood",
          ta: "Kollywood",
          ml: "Mollywood",
        };
        return langMap[language?.toLowerCase()] || "Indian Cinema";
      }
      return countryMapping[country];
    };

    // 1. Production Countries
    if (movieData?.production_countries?.length) {
      for (const pc of movieData.production_countries) {
        const industry = getIndustryForCountry(pc.iso_3166_1, lang);
        if (industry) return industry;
      }
    }

    // 2. Production Companies
    if (movieData?.production_companies?.length) {
      for (const pc of movieData.production_companies) {
        if (pc.origin_country) {
          const industry = getIndustryForCountry(pc.origin_country, lang);
          if (industry) return industry;
        }
      }
    }

    // 3. Origin Country
    if (movieData?.origin_country?.length) {
      for (const oc of movieData.origin_country) {
        const industry = getIndustryForCountry(oc, lang);
        if (industry) return industry;
      }
    }
  }

  // 4. Fallback to Original Language
  const langMapping: Record<string, string> = {
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
  
  return langMapping[lang?.toLowerCase()] || "International Cinema";
}
