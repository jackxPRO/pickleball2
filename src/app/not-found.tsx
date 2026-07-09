import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <p className="font-display text-7xl font-extrabold gold-text">404</p>
      <h1 className="mt-4 font-display text-2xl font-bold text-white">
        Page not found
      </h1>
      <p className="mt-2 max-w-sm text-white/60">
        The page you&apos;re looking for doesn&apos;t exist or has moved.
      </p>
      <Link href="/" className="btn-gold mt-6">
        Back home
      </Link>
    </div>
  );
}
