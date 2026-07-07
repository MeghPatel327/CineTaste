"use client";

import { useEffect, useState } from "react";
import { Modal } from "./ui/Modal";
import { LoadingState } from "./ui/LoadingState";
import { ErrorState } from "./ui/ErrorState";
import { Button } from "./ui/Button";
import { Star, Clock, Calendar, Globe, ExternalLink, Plus, Edit } from "lucide-react";
import Link from "next/link";
import { getFilmIndustry } from "@/lib/utils"; // Will create this

interface MovieDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  tmdbId: number;
  type?: "movie" | "series";
  onUpdated?: () => void;
}

export function MovieDetailsModal({ isOpen, onClose, tmdbId, type = "movie", onUpdated }: MovieDetailsModalProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (isOpen && tmdbId) {
      fetchDetails();
    } else {
      setData(null);
    }
  }, [isOpen, tmdbId]);

  const fetchDetails = async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(`/api/movies/tmdb/${tmdbId}?type=${type}`);
      if (!res.ok) throw new Error("Failed");
      const json = await res.json();
      setData(json.data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={data?.title || "Movie Details"} maxWidth="max-w-4xl">
      {loading ? (
        <LoadingState message="Loading details..." />
      ) : error || !data ? (
        <ErrorState title="Failed to load" message="Could not fetch movie details." onRetry={fetchDetails} />
      ) : (
        <div className="flex flex-col md:flex-row gap-6">
          <div className="w-full md:w-1/3 shrink-0">
            {data.poster_url ? (
              <img src={data.poster_url} alt={data.title} className="w-full aspect-[2/3] object-cover rounded-lg shadow-md" />
            ) : (
              <div className="w-full aspect-[2/3] bg-secondary rounded-lg flex items-center justify-center">
                <span className="text-muted-foreground">No Poster</span>
              </div>
            )}
            
            <div className="mt-6 flex flex-col gap-2">
              {data.inLibrary ? (
                <Button className="w-full" onClick={() => { window.location.href = `/movies/edit/${data.libraryData?.id}`; onClose(); }}><Edit className="w-4 h-4 mr-2"/> Edit Movie</Button>
              ) : (
                <Button className="w-full" onClick={() => { window.location.href = `/movies/add?tmdbId=${tmdbId}&type=${data.type}`; onClose(); }}><Plus className="w-4 h-4 mr-2"/> Add to Library</Button>
              )}
              {data.inLibrary && data.libraryData?.watch_link && (
                <a href={data.libraryData.watch_link} target="_blank" rel="noreferrer">
                  <Button variant="secondary" className="w-full"><ExternalLink className="w-4 h-4 mr-2" /> Watch Now</Button>
                </a>
              )}
            </div>
          </div>

          <div className="flex-1 flex flex-col gap-4">
            <div>
              <h3 className="text-2xl font-bold">{data.title}</h3>
              <p className="text-muted-foreground text-sm italic">{data.genres}</p>
            </div>

            <div className="flex flex-wrap gap-4 text-sm bg-background p-4 rounded-lg border border-border">
              <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-blue-400" /> {data.release_year}</div>
              <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-green-400" /> {data.runtime} min</div>
              <div className="flex items-center gap-2"><Globe className="w-4 h-4 text-purple-400" /> {getFilmIndustry(data.original_language)}</div>
            </div>

            {data.inLibrary && (
              <div className="flex flex-wrap gap-4 text-sm bg-primary/10 border border-primary/20 p-4 rounded-lg">
                <div className="flex flex-col">
                  <span className="text-muted-foreground text-xs uppercase tracking-wider">Status</span>
                  <span className="font-semibold capitalize text-primary">{data.libraryData.status}</span>
                </div>
                {data.libraryData.status === 'completed' && (
                  <div className="flex flex-col">
                    <span className="text-muted-foreground text-xs uppercase tracking-wider">Your Rating</span>
                    <span className="font-semibold text-yellow-500 flex items-center gap-1"><Star className="w-3 h-3 fill-current" /> {data.libraryData.rating}/10</span>
                  </div>
                )}
                {data.libraryData.status === 'pending' && (
                  <div className="flex flex-col">
                    <span className="text-muted-foreground text-xs uppercase tracking-wider">Watch Order</span>
                    <span className="font-semibold">#{data.libraryData.watch_order_rank}</span>
                  </div>
                )}
              </div>
            )}

            <div>
              <h4 className="font-bold mb-2">Overview</h4>
              <p className="text-muted-foreground leading-relaxed text-sm md:text-base">
                {data.overview || "No overview available."}
              </p>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
