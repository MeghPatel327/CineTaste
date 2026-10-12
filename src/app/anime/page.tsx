"use client";

import { CategoryBrowseView } from "@/components/CategoryBrowseView";
import { Sparkles } from "lucide-react";

export default function AnimePage() {
  return (
    <CategoryBrowseView
      category="anime"
      title="Anime"
      subtitle="Japanese animation masterpieces, epic series & theatrical cinema"
      icon={<Sparkles className="w-8 h-8 text-emerald-400" />}
    />
  );
}
