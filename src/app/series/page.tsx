"use client";

import { CategoryBrowseView } from "@/components/CategoryBrowseView";
import { Tv } from "lucide-react";

export default function SeriesPage() {
  return (
    <CategoryBrowseView
      category="series"
      title="TV Series"
      subtitle="Binge-worthy shows, serial storytelling & acclaimed television"
      icon={<Tv className="w-8 h-8 text-purple-400" />}
    />
  );
}
