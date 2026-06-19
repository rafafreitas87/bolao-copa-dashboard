"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";
import { useState } from "react";

type LoadingLinkProps = {
  href: string;
  children: React.ReactNode;
  loadingText?: string;
  className?: string;
};

export function LoadingLink({
  href,
  children,
  loadingText = "Abrindo...",
  className,
}: LoadingLinkProps) {
  const [loading, setLoading] = useState(false);

  return (
    <Link href={href} className={className} onClick={() => setLoading(true)}>
      {loading ? (
        <span className="inline-flex items-center gap-2">
          <Loader2 size={14} className="animate-spin" aria-hidden="true" />
          {loadingText}
        </span>
      ) : (
        children
      )}
    </Link>
  );
}
