/**
 * Full-viewport background image with a dark overlay, rendered behind page
 * content. Used to apply the CMS-configured per-page backgrounds. Renders
 * nothing when no image is set so the default theme shows through.
 */
export function PageBackground({
  image,
  overlay = 0.6,
}: {
  image?: string | null;
  overlay?: number;
}) {
  if (!image) return null;
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${image})` }}
      />
      <div
        className="absolute inset-0 bg-black"
        style={{ opacity: overlay }}
      />
    </div>
  );
}
