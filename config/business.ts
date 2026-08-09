/**
 * Единственная точка статического ребрендинга для нового ресторана.
 * Каталог, цены, зоны доставки и режим продаж меняются через /admin.
 * Секреты и платёжные ключи сюда не добавлять.
 */
export const business = {
  name: "Шаверма Воронеж",
  shortName: "Шаверма",
  tagline: "Сочно. Быстро. С огня.",
  description: "Шаурма, бургеры и блюда на мангале с доставкой и самовывозом.",
  phoneDisplay: "8 927 106 16 44",
  phoneHref: "+79271061644",
  email: "",
  city: "Воронеж",
  address: "",
  pickupAddress: "Адрес самовывоза уточнит оператор",
  hoursText: "Ежедневно — часы работы смотрите при оформлении",
  mapUrl: "",
  vkUrl: "",
  telegramUrl: "",
  seoTitle: "Шаверма Воронеж — шаурма и блюда на мангале",
  seoDescription: "Меню, доставка и самовывоз свежей шаурмы, бургеров и блюд на мангале.",
  legalOperatorName: "",
  legalAddress: "",
  logoPath: "/images/shaverma-logo.jpg",
  faviconPath: "/icon.svg",
  ogImagePath: "/opengraph-image",
} as const;
