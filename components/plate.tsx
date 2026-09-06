import Image from "next/image";
import { cn } from "@/lib/utils";

// The plate: the one figure component on the landing page.
//
// It is the archetype's amplification. The prose on that route is held to a 68
// character measure, and a plate breaks out of it to the full width of the
// article shell, which is the same max-w-5xl the masthead and the colophon use.
// So the picture is the widest thing on the page and still lines up with the
// brand above it.
//
// unoptimized because the Next image optimizer refuses SVG in production, and
// every asset here is ours, flat, and already a few kilobytes. These are
// illustrations, never brand marks: the one mark in this app is the raster in
// the header in app/layout.tsx and nothing here touches it.

interface Props {
  /** Path under public/illustrations, referenced by URL. */
  src: string;
  /** Real alt text. These carry meaning, so none of them is decorative. */
  alt: string;
  /** The sentence under the hairline. Says what the drawing is claiming. */
  caption: string;
  width: number;
  height: number;
  className?: string;
}

export function Plate({ src, alt, caption, width, height, className }: Props) {
  return (
    <figure className={cn("obiter-plate mt-8", className)}>
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        unoptimized
        className="h-auto w-full border border-border"
      />
      <figcaption className="obiter-plate-caption obiter-measure">{caption}</figcaption>
    </figure>
  );
}
