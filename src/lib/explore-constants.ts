// Copied from the main Free NYC app (nextjs-hello-world/src/lib/explore-constants.ts).
// Keep the two in sync so chain runs use the same choices as real searches.

export const ACTIVITY_TYPES = [
  "Outdoors / nature",
  "Art / museums",
  "Music / performance",
  "Food / markets",
  "History / walking tour",
  "Views / photo spots",
] as const;

export const TIMES_OF_DAY = ["Morning", "Afternoon", "Evening", "Night"] as const;

// The AI must pick one of these for each suggestion so the same area isn't
// split into several groups (e.g. "UWS" vs "Upper West Side").
export const NEIGHBORHOODS = [
  // Manhattan
  "Financial District",
  "Battery Park City",
  "Tribeca",
  "Chinatown",
  "Lower East Side",
  "SoHo",
  "Greenwich Village",
  "West Village",
  "East Village",
  "Chelsea",
  "Flatiron / Gramercy",
  "Midtown",
  "Hell's Kitchen",
  "Upper West Side",
  "Central Park",
  "Upper East Side",
  "Morningside Heights",
  "Harlem",
  "East Harlem",
  "Washington Heights",
  "Inwood",
  "Roosevelt Island",
  "Governors Island",
  // Brooklyn
  "DUMBO",
  "Brooklyn Heights",
  "Downtown Brooklyn",
  "Fort Greene",
  "Williamsburg",
  "Greenpoint",
  "Bushwick",
  "Bedford-Stuyvesant",
  "Crown Heights",
  "Prospect Heights",
  "Park Slope",
  "Prospect Park",
  "Red Hook",
  "Sunset Park",
  "Bay Ridge",
  "Coney Island",
  "Brighton Beach",
  // Queens
  "Long Island City",
  "Astoria",
  "Jackson Heights",
  "Flushing",
  "Flushing Meadows Corona Park",
  "Forest Hills",
  "Rockaway",
  // The Bronx
  "South Bronx",
  "Bronx Park / Fordham",
  "Riverdale",
  "City Island",
  "Pelham Bay",
  // Staten Island
  "St. George",
  // Catch-alls for anything not listed above
  "Elsewhere in Manhattan",
  "Elsewhere in Brooklyn",
  "Elsewhere in Queens",
  "Elsewhere in the Bronx",
  "Elsewhere in Staten Island",
] as const;

// The "Elsewhere in ..." catch-alls aren't useful as something to search for.
export const SEARCHABLE_NEIGHBORHOODS = NEIGHBORHOODS.filter(
  (n) => !n.startsWith("Elsewhere")
);
