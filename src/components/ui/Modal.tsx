"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "./Button";
import { cn } from "@/lib/utils";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export function Modal({ isOpen, onClose, title, children, maxWidth = "max-w-2xl" }: ModalProps) {
  const [mounted, setMounted] = useState(isOpen);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      setClosing(false);
      document.body.style.overflow = "hidden";
      return;
    }

    if (mounted) {
      const reducedMotion =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      if (reducedMotion) {
        setMounted(false);
        document.body.style.overflow = "unset";
      } else {
        setClosing(true);
      }
    }
  }, [isOpen, mounted]);

  useEffect(() => {
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  const handlePanelAnimationEnd = (e: React.AnimationEvent) => {
    if (closing && e.animationName.includes("modalExit")) {
      setMounted(false);
      setClosing(false);
      document.body.style.overflow = "unset";
    }
  };

  const requestClose = () => onClose();

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center md:p-4 lg:p-6">
      <div
        className={cn(
          "absolute inset-0 bg-black/70 backdrop-blur-md",
          closing ? "modal-backdrop-exit" : "modal-backdrop-enter"
        )}
        onClick={requestClose}
      />

      <div
        className={cn(
          "relative w-full bg-card md:border md:border-border h-full md:h-auto rounded-none md:rounded-xl ct-shadow-md flex flex-col max-h-[100vh] md:max-h-[90vh] overflow-hidden",
          maxWidth,
          closing ? "modal-exit" : "modal-enter"
        )}
        onAnimationEnd={handlePanelAnimationEnd}
      >
        <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
          <h2 className="text-xl font-bold line-clamp-1 pr-4">{title}</h2>
          <Button variant="ghost" size="sm" onClick={requestClose} className="shrink-0 rounded-full h-8 w-8 p-0">
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
