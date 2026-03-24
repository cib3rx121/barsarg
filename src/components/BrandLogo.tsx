import Image from "next/image";
import fs from "node:fs";
import path from "node:path";

const brandDir = path.join(process.cwd(), "public", "brand");

type Resolved = {
  src: string;
  /** Largura de referência (aspect ratio preservado com object-contain) */
  w: number;
  h: number;
  unoptimized: boolean;
};

export function hasBrandLogo(): boolean {
  return resolveBrandLogoSync() !== null;
}

function resolveBrandLogoSync(): Resolved | null {
  if (fs.existsSync(path.join(brandDir, "logo.svg"))) {
    return {
      src: "/brand/logo.svg",
      w: 256,
      h: 256,
      unoptimized: true,
    };
  }
  if (fs.existsSync(path.join(brandDir, "logo.webp"))) {
    return { src: "/brand/logo.webp", w: 256, h: 256, unoptimized: false };
  }
  if (fs.existsSync(path.join(brandDir, "logo.png"))) {
    return { src: "/brand/logo.png", w: 256, h: 256, unoptimized: false };
  }
  return null;
}

type BrandLogoProps = {
  /** Lado do quadrado de visualização (px) */
  size?: number;
  className?: string;
  priority?: boolean;
};

/**
 * Mostra o logótipo se existir em public/brand/logo.svg | logo.webp | logo.png
 * (ordem de preferência). Caso contrário não renderiza nada.
 */
export function BrandLogo({
  size = 48,
  className = "",
  priority = false,
}: BrandLogoProps) {
  const logo = resolveBrandLogoSync();
  if (!logo) return null;

  return (
    <Image
      src={logo.src}
      alt="Bar de Sargentos"
      width={size}
      height={size}
      className={`object-contain ${className}`.trim()}
      priority={priority}
      unoptimized={logo.unoptimized}
      sizes={`${size}px`}
    />
  );
}
