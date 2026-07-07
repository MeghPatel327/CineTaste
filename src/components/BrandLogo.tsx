"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import circleLogo from "../../public/branding/circle_logo.png";
import wideLogo from "../../public/branding/wide_logo.png";

const LOADING_MESSAGES = [
  "Loading CineTaste...",
  "Finding your next favorite movie...",
  "Building your recommendations...",
  "Analyzing your movie taste...",
  "Preparing your library...",
  "Rolling the film...",
  "Almost ready...",
];

interface BrandLogoProps {
  variant: "compact" | "full" | "loading";
  className?: string;
  imageClassName?: string;
}

export function BrandLogo({ variant, className, imageClassName }: BrandLogoProps) {
  const [loadingMessage, setLoadingMessage] = useState(LOADING_MESSAGES[0]);

  useEffect(() => {
    if (variant === "loading") {
      const randomMsg = LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)];
      setLoadingMessage(randomMsg);
    }
  }, [variant]);

  if (variant === "compact") {
    return (
      <div className={cn("relative flex items-center justify-center", className)}>
        <Image
          src={circleLogo}
          alt="CineTaste"
          className={cn("w-full h-auto object-contain", imageClassName)}
          priority
        />
      </div>
    );
  }

  if (variant === "full") {
    return (
      <div className={cn("relative flex items-center justify-center", className)}>
        <Image
          src={wideLogo}
          alt="CineTaste Logo"
          className={cn("w-full h-auto object-contain", imageClassName)}
          priority
        />
      </div>
    );
  }

  // Loading variant
  return (
    <div className={cn("flex flex-col items-center justify-center p-8", className)}>
      <div className="relative w-16 h-16 md:w-20 md:h-20 mb-6">
        <Image
          src={circleLogo}
          alt="CineTaste Loading"
          className={cn(
            "w-full h-full object-contain",
            "motion-safe:animate-[spin_2.5s_linear_infinite]", 
            imageClassName
          )}
          priority
        />
      </div>
      <p className="text-muted-foreground animate-pulse font-medium text-center">
        {loadingMessage}
      </p>
    </div>
  );
}
