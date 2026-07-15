/** Maps a source_region string to a CSS custom-property reference. */
const REGION_VAR: Record<string, string> = {
  Africa:          "--rg-africa",
  Asia:            "--rg-asia",
  Europe:          "--rg-europe",
  "North America": "--rg-north-america",
  Oceania:         "--rg-oceania",
  "South America": "--rg-south-america",
};

export const regionColorVar = (region: string): string =>
  REGION_VAR[region] ?? "--ink-3";

export const regionColor = (region: string): string =>
  `hsl(var(${regionColorVar(region)}))`;
