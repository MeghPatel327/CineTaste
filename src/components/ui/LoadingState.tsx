import { BrandLogo } from "@/components/BrandLogo";

export function LoadingState({ message }: { message?: string }) {
  // We ignore the custom message and use the cinematic randomized text from BrandLogo
  return <BrandLogo variant="loading" />;
}
