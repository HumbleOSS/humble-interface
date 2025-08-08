export interface AdItem {
  src: string;
  alt: string;
  href?: string;
}

export const ADS: AdItem[] = [
  {
    src: "/img/ads/ad1.png",
    alt: "Swap on Humble",
    href: "https://www.ibuyvoi.com/",
  },
  {
    src: "/img/ads/ad2.png",
    alt: "Nautilus",
    href: "https://nautilus.sh",
  },
  { src: "/img/ads/ad3.png", alt: "enVoi", href: "https://app.envoi.sh" },
];
