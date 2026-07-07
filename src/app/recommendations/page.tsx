"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { RecommendationExplanation } from "@/features/recommendations/recommendationEngine";
import { Sparkles } from "lucide-react";

export default function RecommendationsPage() {
  const [recommendations, setRecommendations] = useState<RecommendationExplanation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const fetchRecommendations = async () => {
    try {
      const res = await fetch("/api/recommendations");
      const data = await res.json();
      if (res.ok) setRecommendations(data.data);
      else toast.error("Failed to load recommendations");
    } catch {
      toast.error("Error loading recommendations");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingState message="Analyzing your taste profile..." />;

  return (
    <div className="container mx-auto p-4 max-w-5xl py-8">
      <div className="flex items-center gap-2 mb-8">
        <Sparkles className="w-8 h-8 text-primary" />
        <h1 className="text-3xl font-bold">For You</h1>
      </div>
      
      <p className="text-muted-foreground mb-8 text-lg">
        Based on your unique taste profile, here are deterministic recommendations tailored for you.
      </p>

      {recommendations.length === 0 ? (
        <EmptyState 
          title="Not enough data" 
          description="Rate some movies in your library to get personalized recommendations." 
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {recommendations.map(rec => (
            <div key={rec.movieId} className="bg-card rounded-lg overflow-hidden border border-border flex shadow-sm hover:shadow-md transition">
              <div className="w-1/3 shrink-0">
                {rec.poster_url ? (
                  <img src={rec.poster_url} alt={rec.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-secondary flex items-center justify-center text-xs text-muted-foreground">No Image</div>
                )}
              </div>
              <div className="p-4 flex flex-col justify-between flex-1">
                <div>
                  <h3 className="text-xl font-bold mb-2">{rec.title}</h3>
                  <div className="mb-4">
                    <span className="inline-block bg-primary/20 text-primary px-2 py-1 rounded text-xs font-semibold">
                      Match Score: {rec.score}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Why we recommend this:</p>
                    <ul className="list-disc list-inside text-sm text-muted-foreground">
                      {rec.reasons.map((reason, i) => (
                        <li key={i}>{reason}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
