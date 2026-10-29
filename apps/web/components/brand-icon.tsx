import {
  siElevenlabs,
  siFacebook,
  siGithub,
  siGooglemaps,
  siGooglesheets,
  siInstagram,
  siReddit,
  siTiktok,
  siWhatsapp,
  siX,
  siYoutube,
  type SimpleIcon,
} from "simple-icons";

// Official brand marks from simple-icons (CC0), rendered monochrome via currentColor.
const icons = {
  github: siGithub,
  googlemaps: siGooglemaps,
  googlesheets: siGooglesheets,
  instagram: siInstagram,
  reddit: siReddit,
  x: siX,
  elevenlabs: siElevenlabs,
  whatsapp: siWhatsapp,
  facebook: siFacebook,
  tiktok: siTiktok,
  youtube: siYoutube,
} satisfies Record<string, SimpleIcon>;

export type BrandName = keyof typeof icons;

export function BrandIcon({ name, className = "size-5", colored }: { name: BrandName; className?: string; colored?: boolean }) {
  const icon = icons[name];
  return (
    <svg
      role="img"
      viewBox="0 0 24 24"
      fill={colored ? `#${icon.hex}` : "currentColor"}
      className={className}
      aria-label={icon.title}
    >
      <path d={icon.path} />
    </svg>
  );
}
