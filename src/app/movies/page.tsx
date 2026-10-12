"use client";

import { CategoryBrowseView } from "@/components/CategoryBrowseView";
import { Film } from "lucide-react";

export default function MoviesPage() {
  return (
    <CategoryBrowseView
      category="movies"
      title="Movies"
      subtitle="Curated cinema, box office hits & personalized movie recommendations"
      icon={<Film className="w-8 h-8 text-emerald-400" />}
    />
  );
}
