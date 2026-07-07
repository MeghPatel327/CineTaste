"use client";

import { useEffect, useState } from "react";
import { Modal } from "./ui/Modal";
import { LoadingState } from "./ui/LoadingState";
import { ErrorState } from "./ui/ErrorState";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { toast } from "sonner";
import { Star, Clock, Calendar, Globe, ExternalLink, Plus, Edit, Play, Loader2, X } from "lucide-react";

// Client-side cache for TMDB details to prevent duplicate fetching in same session
const detailsCache = new Map<string, any>();

interface MovieDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  tmdbId: number;
  type?: "movie" | "series";
  onUpdated?: () => void;
  onNavigate?: (tmdbId: number, type?: "movie" | "series") => void;
}

export function MovieDetailsModal({ isOpen, onClose, tmdbId, type = "movie", onUpdated, onNavigate }: MovieDetailsModalProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [pirateSites, setPirateSites] = useState<any[]>([]);

  // Form State
  const [isAdding, setIsAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"completed" | "pending" | "dropped">("pending");
  const [rating, setRating] = useState(0);
  const [watchOrder, setWatchOrder] = useState(0);
  const [watchLink, setWatchLink] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setIsAdding(false);
      setStatus("pending");
      setRating(0);
      setWatchOrder(0);
      setWatchLink("");
    }
  }, [isOpen]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data) return;
    setSaving(true);
    try {
      const payload = {
        movie_name: data.title || "",
        type: data.type,
        status,
        rating,
        watch_order_rank: watchOrder,
        watch_link: watchLink || null,
        tmdb_id: data.tmdb_id,
        genres: JSON.stringify(data.genres ? data.genres.split(", ").map((g: string) => g.trim()) : []),
        release_year: data.release_year,
        runtime: data.runtime,
        language: data.original_language,
        poster_url: data.poster_url || "",
        overview: data.overview,
      };

      const res = await fetch("/api/movies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (res.ok) {
        toast.success("Added to library");
        setIsAdding(false);
        detailsCache.delete(`${type}_${tmdbId}`);
        fetchDetails(`${type}_${tmdbId}`);
        if (onUpdated) onUpdated();
      } else {
        toast.error(result.message || "Failed to add movie");
      }
    } catch (err) {
      toast.error("Error adding movie");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    fetch("/api/pirate-sites")
      .then(res => res.ok ? res.json() : { data: [] })
      .then(json => setPirateSites(json.data || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (isOpen && tmdbId) {
      const cacheKey = `${type}_${tmdbId}`;
      if (detailsCache.has(cacheKey)) {
        setData(detailsCache.get(cacheKey));
        setLoading(false);
        setError(false);
      } else {
        fetchDetails(cacheKey);
      }
    } else {
      setData(null);
    }
  }, [isOpen, tmdbId]);

  const fetchDetails = async (cacheKey: string) => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(`/api/movies/tmdb/${tmdbId}?type=${type}`);
      if (!res.ok) throw new Error("Failed");
      const json = await res.json();
      detailsCache.set(cacheKey, json.data);
      setData(json.data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={data?.title || "Movie Details"} maxWidth="max-w-5xl">
      {loading ? (
        <LoadingState message="Loading details..." />
      ) : error || !data ? (
        <ErrorState title="Failed to load" message="Could not fetch movie details." onRetry={() => fetchDetails(`${type}_${tmdbId}`)} />
      ) : (
        <div className="flex flex-col gap-8 pb-8">
          
          {/* Hero Section */}
          <div className="relative rounded-t-xl md:rounded-xl overflow-hidden bg-black/90">
            {data.backdrop_url && (
              <div 
                className="absolute inset-0 opacity-40 bg-cover bg-center"
                style={{ backgroundImage: `url(${data.backdrop_url})` }}
              />
            )}
            <div className="relative z-10 p-6 md:p-8 flex flex-col md:flex-row gap-8 items-center md:items-start">
              <div className="w-48 md:w-64 shrink-0">
                {data.poster_url ? (
                  <img src={data.poster_url} alt={data.title} className="w-full aspect-[2/3] object-cover rounded-lg shadow-2xl" />
                ) : (
                  <div className="w-full aspect-[2/3] bg-secondary rounded-lg flex items-center justify-center text-muted-foreground shadow-2xl">No Poster</div>
                )}
              </div>
              
              <div className="flex-1 text-center md:text-left text-white drop-shadow-md">
                <h2 className="text-3xl md:text-5xl font-bold mb-2">{data.title}</h2>
                {data.original_title && data.original_title !== data.title && (
                  <p className="text-white/70 italic mb-4">{data.original_title}</p>
                )}
                
                {data.tagline && <p className="text-lg italic text-white/90 mb-6">"{data.tagline}"</p>}
                
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm font-medium mb-6">
                  <a 
                    href={`https://www.themoviedb.org/${data.type === "series" ? "tv" : "movie"}/${data.tmdb_id}`}
                    target="_blank" 
                    rel="noreferrer"
                    className="flex items-center gap-1 bg-white/20 px-3 py-1 rounded-full hover:bg-white/30 transition text-white"
                    title="View on TMDB"
                  >
                    <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" /> {data.vote_average} ({data.vote_count})
                  </a>
                  <div className="flex items-center gap-1 bg-white/20 px-3 py-1 rounded-full"><Calendar className="w-4 h-4" /> {data.release_year}</div>
                  <div className="flex items-center gap-1 bg-white/20 px-3 py-1 rounded-full"><Clock className="w-4 h-4" /> {data.runtime} min</div>
                  <div className="flex items-center gap-1 bg-white/20 px-3 py-1 rounded-full"><Globe className="w-4 h-4" /> {data.film_industry}</div>
                </div>
                
                <p className="text-white/80 mb-6">{data.genres}</p>
                
                {isAdding ? (
                  <form onSubmit={handleSave} className="bg-black/60 p-4 rounded-xl border border-white/10 space-y-4 animate-in fade-in slide-in-from-top-4 duration-300 w-full max-w-md mx-auto md:mx-0">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-bold text-lg">Add to Library</h4>
                      <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 text-white hover:bg-white/20" onClick={() => setIsAdding(false)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-left">
                      <div>
                        <label className="text-xs font-medium mb-1 block text-white/70">Status</label>
                        <select 
                          className="flex h-9 w-full rounded-md border border-white/20 bg-black/50 px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary text-white"
                          value={status} 
                          onChange={e => setStatus(e.target.value as any)}
                        >
                          <option value="pending">Pending</option>
                          <option value="completed">Completed</option>
                          <option value="dropped">Dropped</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-medium mb-1 block text-white/70">Rating (0-10)</label>
                        <Input type="number" min="0" max="10" value={rating} onChange={e => setRating(parseFloat(e.target.value) || 0)} className="h-9 bg-black/50 border-white/20 text-white" />
                      </div>
                    </div>
                    {status === "pending" && (
                      <div className="text-left">
                        <label className="text-xs font-medium mb-1 block text-white/70">Watch Order Rank</label>
                        <Input type="number" value={watchOrder} onChange={e => setWatchOrder(parseInt(e.target.value) || 0)} className="h-9 bg-black/50 border-white/20 text-white" />
                      </div>
                    )}
                    <div className="text-left">
                      <label className="text-xs font-medium mb-1 block text-white/70">Personal Watch Link (Optional)</label>
                      <Input type="url" placeholder="https://..." value={watchLink} onChange={e => setWatchLink(e.target.value)} className="h-9 bg-black/50 border-white/20 text-white" />
                    </div>
                    <div className="pt-2">
                      <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={saving}>
                        {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                        Save to Library
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="flex flex-wrap justify-center md:justify-start gap-3">
                    {data.inLibrary ? (
                      <Button className="bg-primary hover:bg-primary/90 text-primary-foreground" onClick={() => { window.location.href = `/movies/edit/${data.libraryData?.id}`; onClose(); }}><Edit className="w-4 h-4 mr-2"/> Edit Movie</Button>
                    ) : (
                      <Button className="bg-primary hover:bg-primary/90 text-primary-foreground" onClick={() => setIsAdding(true)}><Plus className="w-4 h-4 mr-2"/> Add to Library</Button>
                    )}
                    {data.inLibrary && data.libraryData?.watch_link && (
                      <a href={data.libraryData.watch_link} target="_blank" rel="noreferrer">
                        <Button variant="secondary" className="bg-white/20 hover:bg-white/30 text-white border-0"><ExternalLink className="w-4 h-4 mr-2" /> Watch Now</Button>
                      </a>
                    )}
                    {pirateSites.map(site => (
                      <a 
                        key={site.id} 
                        href={site.search_url.replace("{query}", encodeURIComponent(data.title))} 
                        target="_blank" 
                        rel="noreferrer"
                      >
                        <Button variant="secondary" className="bg-white/10 hover:bg-white/20 text-white border border-white/20">
                          <Globe className="w-4 h-4 mr-2" /> {site.name}
                        </Button>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 px-4 md:px-0">
            {/* Left Column: Overview, Cast, Trailer */}
            <div className="lg:col-span-2 space-y-8">
              
              <section>
                <h3 className="text-xl font-bold mb-3">Overview</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {data.overview || "No overview available."}
                </p>
              </section>

              {data.cast && data.cast.length > 0 && (
                <section>
                  <h3 className="text-xl font-bold mb-3">Top Cast</h3>
                  <div className="flex gap-4 overflow-x-auto pb-4 snap-x hide-scrollbar">
                    {data.cast.map((c: any) => (
                      <div key={c.id} className="w-32 shrink-0 snap-start">
                        {c.profile_url ? (
                          <img src={c.profile_url} alt={c.name} className="w-full aspect-[2/3] object-cover rounded-lg mb-2 shadow-sm" />
                        ) : (
                          <div className="w-full aspect-[2/3] bg-secondary rounded-lg mb-2 flex items-center justify-center text-xs text-muted-foreground">No Photo</div>
                        )}
                        <p className="font-bold text-sm line-clamp-1">{c.name}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2">{c.character}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {data.trailer_key && (
                <section>
                  <h3 className="text-xl font-bold mb-3 flex items-center gap-2"><Play className="w-5 h-5"/> Official Trailer</h3>
                  <div className="aspect-video w-full rounded-xl overflow-hidden shadow-md">
                    <iframe 
                      src={`https://www.youtube.com/embed/${data.trailer_key}`} 
                      title="YouTube video player" 
                      frameBorder="0" 
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                      allowFullScreen
                      className="w-full h-full"
                    ></iframe>
                  </div>
                </section>
              )}

              {data.similar_movies && data.similar_movies.length > 0 && (
                <section>
                  <h3 className="text-xl font-bold mb-3">Similar Movies</h3>
                  <div className="flex gap-4 overflow-x-auto pb-4 snap-x hide-scrollbar">
                    {data.similar_movies.map((s: any) => (
                      <div 
                        key={s.tmdb_id} 
                        className="w-32 shrink-0 snap-start cursor-pointer group"
                        onClick={() => onNavigate && onNavigate(s.tmdb_id, type)}
                      >
                        {s.poster_url ? (
                          <img src={s.poster_url} alt={s.title} className="w-full aspect-[2/3] object-cover rounded-lg mb-2 shadow-sm group-hover:ring-2 ring-primary transition" />
                        ) : (
                          <div className="w-full aspect-[2/3] bg-secondary rounded-lg mb-2 flex items-center justify-center text-xs text-muted-foreground group-hover:ring-2 ring-primary transition">No Photo</div>
                        )}
                        <p className="font-bold text-sm line-clamp-2 group-hover:text-primary transition">{s.title}</p>
                        <p className="text-xs text-muted-foreground">{s.release_year}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

            </div>

            {/* Right Column: Library Status, Crew, Production */}
            <div className="space-y-6">
              
              {data.inLibrary && (
                <div className="bg-primary/10 border border-primary/20 p-5 rounded-xl space-y-4">
                  <h4 className="font-bold flex items-center gap-2 text-primary"><Star className="w-5 h-5"/> Your Library</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col">
                      <span className="text-muted-foreground text-xs uppercase tracking-wider">Status</span>
                      <span className="font-bold capitalize">{data.libraryData.status}</span>
                    </div>
                    {data.libraryData.status === 'completed' && (
                      <div className="flex flex-col">
                        <span className="text-muted-foreground text-xs uppercase tracking-wider">Your Rating</span>
                        <span className="font-bold text-yellow-500 flex items-center gap-1"><Star className="w-4 h-4 fill-current" /> {data.libraryData.rating}/10</span>
                      </div>
                    )}
                    {data.libraryData.status === 'pending' && (
                      <div className="flex flex-col">
                        <span className="text-muted-foreground text-xs uppercase tracking-wider">Watch Order</span>
                        <span className="font-bold">#{data.libraryData.watch_order_rank}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="bg-card border border-border p-5 rounded-xl space-y-4">
                <h4 className="font-bold">Crew</h4>
                {data.director && (
                  <div>
                    <span className="text-muted-foreground text-xs uppercase block">Director</span>
                    <span className="font-medium">{data.director}</span>
                  </div>
                )}
                {data.writers && data.writers.length > 0 && (
                  <div>
                    <span className="text-muted-foreground text-xs uppercase block">Writers</span>
                    <span className="font-medium">{data.writers.join(", ")}</span>
                  </div>
                )}
              </div>

              {(data.production_companies?.length > 0 || data.production_countries?.length > 0) && (
                <div className="bg-card border border-border p-5 rounded-xl space-y-4">
                  <h4 className="font-bold">Production</h4>
                  {data.production_companies?.length > 0 && (
                    <div>
                      <span className="text-muted-foreground text-xs uppercase block">Companies</span>
                      <span className="font-medium text-sm">{data.production_companies.join(", ")}</span>
                    </div>
                  )}
                  {data.production_countries?.length > 0 && (
                    <div>
                      <span className="text-muted-foreground text-xs uppercase block">Countries</span>
                      <span className="font-medium text-sm">{data.production_countries.join(", ")}</span>
                    </div>
                  )}
                </div>
              )}
              
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
