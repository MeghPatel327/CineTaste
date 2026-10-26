"use client";

import { CategoryBrowseView } from "@/components/CategoryBrowseView";
import { Swords } from "lucide-react";

export default function AnimePage() {
  return (
    <CategoryBrowseView
      category="anime"
      title="Anime"
      subtitle="Japanese animation masterpieces, epic series & theatrical cinema"
      icon={<Swords className="w-8 h-8 text-emerald-400" />}
    />
  );
}
