"use client";

import { useState } from "react";
import { Modal } from "./ui/Modal";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { Star } from "lucide-react";
import { toast } from "sonner";

interface RatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (rating: number) => Promise<void>;
  title?: string;
}

export function RatingModal({ isOpen, onClose, onSubmit, title = "Rate this Movie" }: RatingModalProps) {
  const [rating, setRating] = useState<string>("0");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numRating = parseFloat(rating);
    if (isNaN(numRating) || numRating < 0 || numRating > 10) {
      toast.error("Please enter a valid rating between 0 and 10.");
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(numRating);
      onClose();
    } catch (error) {
      toast.error("Failed to submit rating.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="max-w-md">
      <div className="flex flex-col items-center text-center">
        <Star className="w-12 h-12 text-yellow-500 mb-4" />
        <p className="text-muted-foreground mb-6">
          To mark this as completed, please provide your personal rating. Your rating helps improve your future recommendations.
        </p>

        <form onSubmit={handleSubmit} className="w-full">
          <div className="flex items-center justify-center gap-4 mb-6">
            <span className="font-bold text-xl">Score:</span>
            <Input 
              type="number" 
              min="0" 
              max="10" 
              step="0.1"
              value={rating} 
              onChange={e => setRating(e.target.value)} 
              className="w-24 text-center text-lg font-bold"
              required
            />
            <span className="text-muted-foreground">/ 10</span>
          </div>

          <div className="flex gap-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button type="submit" className="flex-1" disabled={submitting}>
              {submitting ? "Saving..." : "Save & Complete"}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
