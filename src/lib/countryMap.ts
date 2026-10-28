export type RegionOption = {
  value: string;
  label: string;
};

export type CountryOption = {
  code: string;
  name: string;
  region: string;
};

export type GlobeHotspot = CountryOption & {
  lat: number;
  lng: number;
};

export const REGION_OPTIONS: RegionOption[] = [
  { value: "all", label: "All Regions" },
  { value: "Africa", label: "Africa" },
  { value: "Asia", label: "Asia" },
  { value: "Europe", label: "Europe" },
  { value: "North America", label: "North America" },
  { value: "Oceania", label: "Oceania" },
  { value: "South America", label: "South America" },
];

export const COUNTRIES_BY_REGION: Record<string, { code: string; name: string }[]> = {
  Africa: [
    { code: "ZA", name: "South Africa" },
    { code: "NG", name: "Nigeria" },
    { code: "EG", name: "Egypt" },
    { code: "KE", name: "Kenya" },
    { code: "GH", name: "Ghana" },
    { code: "MA", name: "Morocco" },
    { code: "ET", name: "Ethiopia" },
    { code: "TZ", name: "Tanzania" },
    { code: "DZ", name: "Algeria" },
    { code: "SN", name: "Senegal" },
    { code: "UG", name: "Uganda" },
    { code: "ZW", name: "Zimbabwe" },
  ],
  Asia: [
    { code: "IN", name: "India" },
    { code: "CN", name: "China" },
    { code: "JP", name: "Japan" },
    { code: "SG", name: "Singapore" },
    { code: "SA", name: "Saudi Arabia" },
    { code: "KR", name: "South Korea" },
    { code: "PK", name: "Pakistan" },
    { code: "NP", name: "Nepal" },
    { code: "IR", name: "Iran" },
    { code: "SY", name: "Syria" },
    { code: "BD", name: "Bangladesh" },
    { code: "IL", name: "Israel" },
    { code: "LK", name: "Sri Lanka" },
    { code: "AF", name: "Afghanistan" },
    { code: "QA", name: "Qatar" },
    { code: "JO", name: "Jordan" },
    { code: "OM", name: "Oman" },
    { code: "YE", name: "Yemen" },
    { code: "AE", name: "United Arab Emirates" },
    { code: "TR", name: "Turkey" },
    { code: "ID", name: "Indonesia" },
    { code: "PH", name: "Philippines" },
    { code: "VN", name: "Vietnam" },
    { code: "TH", name: "Thailand" },
    { code: "MY", name: "Malaysia" },
  ],
  Europe: [
    { code: "GB", name: "United Kingdom" },
    { code: "FR", name: "France" },
    { code: "DE", name: "Germany" },
    { code: "IT", name: "Italy" },
    { code: "ES", name: "Spain" },
    { code: "NL", name: "Netherlands" },
    { code: "SE", name: "Sweden" },
    { code: "PL", name: "Poland" },
    { code: "IE", name: "Ireland" },
    { code: "RU", name: "Russia" },
    { code: "UA", name: "Ukraine" },
    { code: "PT", name: "Portugal" },
    { code: "GR", name: "Greece" },
    { code: "NO", name: "Norway" },
    { code: "CH", name: "Switzerland" },
    { code: "BE", name: "Belgium" },
    { code: "AT", name: "Austria" },
  ],
  "North America": [
    { code: "US", name: "United States" },
    { code: "CA", name: "Canada" },
    { code: "MX", name: "Mexico" },
    { code: "CU", name: "Cuba" },
    { code: "JM", name: "Jamaica" },
  ],
  Oceania: [
    { code: "AU", name: "Australia" },
    { code: "NZ", name: "New Zealand" },
    { code: "FJ", name: "Fiji" },
    { code: "PG", name: "Papua New Guinea" },
  ],
  "South America": [
    { code: "BR", name: "Brazil" },
    { code: "AR", name: "Argentina" },
    { code: "CO", name: "Colombia" },
    { code: "CL", name: "Chile" },
    { code: "PE", name: "Peru" },
    { code: "VE", name: "Venezuela" },
    { code: "EC", name: "Ecuador" },
    { code: "UY", name: "Uruguay" },
    { code: "BO", name: "Bolivia" },
    { code: "PY", name: "Paraguay" },
  ],
};

export const ALL_COUNTRIES: CountryOption[] = Object.entries(COUNTRIES_BY_REGION).flatMap(
  ([region, countries]) => countries.map((country) => ({ ...country, region })),
);

const COUNTRY_LOOKUP: Record<string, CountryOption> = ALL_COUNTRIES.reduce(
  (acc, country) => {
    acc[country.code] = country;
    return acc;
  },
  {} as Record<string, CountryOption>,
);

export const GLOBE_HOTSPOTS: GlobeHotspot[] = [
  { code: "CA", name: "Canada", region: "North America", lat: 56, lng: -106 },
  { code: "US", name: "United States", region: "North America", lat: 37, lng: -95 },
  { code: "MX", name: "Mexico", region: "North America", lat: 23, lng: -102 },
  { code: "CU", name: "Cuba", region: "North America", lat: 22, lng: -79 },
  { code: "JM", name: "Jamaica", region: "North America", lat: 18, lng: -77 },
  { code: "CO", name: "Colombia", region: "South America", lat: 4, lng: -74 },
  { code: "VE", name: "Venezuela", region: "South America", lat: 7, lng: -66 },
  { code: "EC", name: "Ecuador", region: "South America", lat: -1, lng: -78 },
  { code: "PE", name: "Peru", region: "South America", lat: -9, lng: -75 },
  { code: "BR", name: "Brazil", region: "South America", lat: -10, lng: -55 },
  { code: "CL", name: "Chile", region: "South America", lat: -30, lng: -71 },
  { code: "AR", name: "Argentina", region: "South America", lat: -34, lng: -64 },
  { code: "UY", name: "Uruguay", region: "South America", lat: -33, lng: -56 },
  { code: "BO", name: "Bolivia", region: "South America", lat: -17, lng: -65 },
  { code: "PY", name: "Paraguay", region: "South America", lat: -23, lng: -58 },
  { code: "GB", name: "United Kingdom", region: "Europe", lat: 55, lng: -3 },
  { code: "FR", name: "France", region: "Europe", lat: 46, lng: 2 },
  { code: "DE", name: "Germany", region: "Europe", lat: 51, lng: 10 },
  { code: "ES", name: "Spain", region: "Europe", lat: 40, lng: -4 },
  { code: "IT", name: "Italy", region: "Europe", lat: 42, lng: 12 },
  { code: "NL", name: "Netherlands", region: "Europe", lat: 52, lng: 5 },
  { code: "SE", name: "Sweden", region: "Europe", lat: 62, lng: 15 },
  { code: "PL", name: "Poland", region: "Europe", lat: 52, lng: 19 },
  { code: "IE", name: "Ireland", region: "Europe", lat: 53, lng: -8 },
  { code: "RU", name: "Russia", region: "Europe", lat: 60, lng: 90 },
  { code: "UA", name: "Ukraine", region: "Europe", lat: 49, lng: 32 },
  { code: "PT", name: "Portugal", region: "Europe", lat: 39, lng: -8 },
  { code: "GR", name: "Greece", region: "Europe", lat: 39, lng: 22 },
  { code: "NO", name: "Norway", region: "Europe", lat: 61, lng: 9 },
  { code: "CH", name: "Switzerland", region: "Europe", lat: 47, lng: 8 },
  { code: "BE", name: "Belgium", region: "Europe", lat: 50.5, lng: 4.5 },
  { code: "AT", name: "Austria", region: "Europe", lat: 47.5, lng: 14.5 },
  { code: "MA", name: "Morocco", region: "Africa", lat: 31, lng: -7 },
  { code: "EG", name: "Egypt", region: "Africa", lat: 26, lng: 30 },
  { code: "NG", name: "Nigeria", region: "Africa", lat: 9, lng: 8 },
  { code: "GH", name: "Ghana", region: "Africa", lat: 7, lng: -1 },
  { code: "KE", name: "Kenya", region: "Africa", lat: 1, lng: 38 },
  { code: "ET", name: "Ethiopia", region: "Africa", lat: 9, lng: 40 },
  { code: "TZ", name: "Tanzania", region: "Africa", lat: -6, lng: 35 },
  { code: "ZA", name: "South Africa", region: "Africa", lat: -30, lng: 24 },
  { code: "DZ", name: "Algeria", region: "Africa", lat: 28, lng: 3 },
  { code: "SN", name: "Senegal", region: "Africa", lat: 14, lng: -14 },
  { code: "UG", name: "Uganda", region: "Africa", lat: 1, lng: 32 },
  { code: "ZW", name: "Zimbabwe", region: "Africa", lat: -19, lng: 30 },
  { code: "SA", name: "Saudi Arabia", region: "Asia", lat: 24, lng: 45 },
  { code: "AE", name: "United Arab Emirates", region: "Asia", lat: 24, lng: 54 },
  { code: "QA", name: "Qatar", region: "Asia", lat: 25, lng: 51 },
  { code: "OM", name: "Oman", region: "Asia", lat: 21, lng: 57 },
  { code: "JO", name: "Jordan", region: "Asia", lat: 31, lng: 36 },
  { code: "IL", name: "Israel", region: "Asia", lat: 31, lng: 35 },
  { code: "IR", name: "Iran", region: "Asia", lat: 32, lng: 53 },
  { code: "AF", name: "Afghanistan", region: "Asia", lat: 33, lng: 66 },
  { code: "PK", name: "Pakistan", region: "Asia", lat: 30, lng: 70 },
  { code: "IN", name: "India", region: "Asia", lat: 21, lng: 78 },
  { code: "NP", name: "Nepal", region: "Asia", lat: 28, lng: 84 },
  { code: "BD", name: "Bangladesh", region: "Asia", lat: 24, lng: 90 },
  { code: "LK", name: "Sri Lanka", region: "Asia", lat: 7, lng: 81 },
  { code: "CN", name: "China", region: "Asia", lat: 35, lng: 103 },
  { code: "KR", name: "South Korea", region: "Asia", lat: 36, lng: 128 },
  { code: "JP", name: "Japan", region: "Asia", lat: 36, lng: 138 },
  { code: "SG", name: "Singapore", region: "Asia", lat: 1, lng: 104 },
  { code: "TR", name: "Turkey", region: "Asia", lat: 39, lng: 35 },
  { code: "ID", name: "Indonesia", region: "Asia", lat: -2, lng: 118 },
  { code: "PH", name: "Philippines", region: "Asia", lat: 13, lng: 122 },
  { code: "VN", name: "Vietnam", region: "Asia", lat: 16, lng: 107 },
  { code: "TH", name: "Thailand", region: "Asia", lat: 15, lng: 101 },
  { code: "MY", name: "Malaysia", region: "Asia", lat: 4, lng: 102 },
  { code: "AU", name: "Australia", region: "Oceania", lat: -25, lng: 134 },
  { code: "NZ", name: "New Zealand", region: "Oceania", lat: -41, lng: 174 },
  { code: "FJ", name: "Fiji", region: "Oceania", lat: -17, lng: 179 },
  { code: "PG", name: "Papua New Guinea", region: "Oceania", lat: -6, lng: 147 },
];

export function getRegionForCountryCode(countryCode: string): string | null {
  const key = countryCode.toUpperCase();
  return COUNTRY_LOOKUP[key]?.region || null;
}

export function getCountryByCode(countryCode: string): CountryOption | null {
  const key = countryCode.toUpperCase();
  return COUNTRY_LOOKUP[key] || null;
}

