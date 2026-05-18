"use client";

import Image from "next/image";

interface Props {
  src?: string | null;
  name?: string | null;
  size?: number;       // Tailwind size classes are mapped below
  className?: string;
}

/**
 * Reusable avatar component.
 * Shows the image if `src` is a valid URL, otherwise falls back to a gradient with initials.
 */
export function Avatar({ src, name, size = 10, className = "" }: Props) {
  const initial = name?.[0]?.toUpperCase() ?? "?";

  // Map numeric size to Tailwind classes
  const sizeClasses: Record<number, string> = {
    8:  "h-8 w-8 text-xs",
    10: "h-10 w-10 text-sm",
    12: "h-12 w-12 text-base",
    14: "h-14 w-14 text-lg",
    16: "h-16 w-16 text-2xl",
    20: "h-20 w-20 text-3xl",
    24: "h-24 w-24 text-3xl",
  };

  const sizeClass = sizeClasses[size] ?? sizeClasses[10];

  const hasImage = src && (src.startsWith("http") || src.startsWith("/"));

  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-full ${sizeClass} ${className}`}
    >
      {hasImage ? (
        <Image
          src={src}
          alt={name ?? "Avatar"}
          fill
          className="object-cover"
          unoptimized
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 font-semibold text-white">
          {initial}
        </div>
      )}
    </div>
  );
}
