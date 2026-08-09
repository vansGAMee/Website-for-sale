import type { MetadataRoute } from "next";
import { business } from "@business";
export default function manifest(): MetadataRoute.Manifest { return { name: business.name, short_name: business.shortName, description: business.description, start_url: "/", display: "standalone", background_color: "#fdfaf4", theme_color: "#c43b19", lang: "ru", icons: [{ src: business.faviconPath, sizes: "any", type: "image/svg+xml" }] }; }
