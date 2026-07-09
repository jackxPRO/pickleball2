"use client";

import { MessageCircle } from "lucide-react";

/** Floating Facebook Messenger button shown on all public pages. */
export function MessengerButton({ link }: { link?: string | null }) {
  if (!link) return null;
  return (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on Messenger"
      className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#00B2FF] to-[#006AFF] shadow-glow transition hover:scale-110"
    >
      <MessageCircle className="h-7 w-7 text-white" fill="white" />
    </a>
  );
}
