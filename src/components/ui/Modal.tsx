"use client";

import { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
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

/**
 * Base modal with animated open / close.
 *
 * Open:  backdrop fade-in + content scale 0.97 → 1
 * Close: content scale 1 → 0.97 + backdrop fade-out, then unmount
 */
export function Modal({ isOpen, onClose, title, children, maxWidth = "max-w-2xl" }: ModalProps) {
  // `mounted` controls whether the DOM node exists
  const [mounted, setMounted] = useState(false);
  // `visible` drives the CSS animation class (open vs closing)
  const [visible, setVisible] = useState(false);

  // Open
  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      // Allow a paint tick so the enter animation fires
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true));
      });
    } else {
      setVisible(false);
      // Wait for the exit animation to finish before unmounting
    }
  }, [isOpen]);

  // Lock body scroll
  useEffect(() => {
    if (mounted) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [mounted]);

  const handleBackdropAnimationEnd = useCallback(
    (e: React.AnimationEvent<HTMLDivElement>) => {
      // Unmount after the backdrop's exit animation finishes
      if (!visible && e.animationName.includes("backdropExit")) {
        setMounted(false);
      }
    },
    [visible]
  );

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center md:p-4 lg:p-6">
      {/* Backdrop */}
      <div
        className={cn(
          "absolute inset-0 bg-black/80 backdrop-blur-sm",
          visible ? "modal-backdrop-enter" : "modal-backdrop-exit"
        )}
        onClick={onClose}
        onAnimationEnd={handleBackdropAnimationEnd}
      />

      {/* Modal panel */}
      <div
        className={cn(
          "relative w-full bg-card",
          "md:border md:border-border",
          "h-full md:h-auto rounded-none md:rounded-xl",
          "shadow-2xl flex flex-col",
          "max-h-[100vh] md:max-h-[90vh] overflow-hidden",
          maxWidth,
          visible ? "modal-enter" : "modal-exit"
        )}
      >
        <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
          <h2 className="text-xl font-bold line-clamp-1 pr-4">{title}</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="shrink-0 rounded-full h-8 w-8 p-0"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
