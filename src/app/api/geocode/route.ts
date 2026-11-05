// Copied from the main Free NYC app (nextjs-hello-world/src/app/api/geocode/route.ts).
// The proxy already limits this route to superadmins.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Roughly the center of NYC, and a bounding box covering all five boroughs.
const NYC_LAT = 40.75;
const NYC_LON = -73.97;
const NYC_BBOX = "-74.26,40.49,-73.68,40.92"; // minLon,minLat,maxLon,maxLat

type PhotonFeature = {
  properties: {
    name?: string;
    street?: string;
    housenumber?: string;
    locality?: string;
    district?: string;
    city?: string;
    state?: string;
  };
  geometry: {
    coordinates: [number, number]; // [lon, lat]
  };
};

function formatDisplayName(props: PhotonFeature["properties"]): string {
  const parts: string[] = [];

  if (props.name) {
    parts.push(props.name);
  } else if (props.street) {
    parts.push(
      props.housenumber ? `${props.housenumber} ${props.street}` : props.street
    );
  }

  const area = props.locality ?? props.district ?? props.city;
  if (area && area !== props.name) parts.push(area);
  if (props.city && props.city !== area) parts.push(props.city);
  if (props.state) parts.push(props.state);

  return parts.filter(Boolean).join(", ");
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();

  if (!q || q.length < 3) {
    return NextResponse.json({ results: [] });
  }

  // Photon (komoot.io): a free, no-API-key geocoder built on OpenStreetMap
  // data, purpose-built for type-ahead/partial-word search (unlike plain
  // Nominatim, which mostly expects whole-word queries).
  const url = new URL("https://photon.komoot.io/api/");
  url.searchParams.set("q", q);
  url.searchParams.set("limit", "5");
  url.searchParams.set("lat", String(NYC_LAT));
  url.searchParams.set("lon", String(NYC_LON));
  url.searchParams.set("bbox", NYC_BBOX);

  const res = await fetch(url.toString());

  if (!res.ok) {
    return NextResponse.json({ results: [] }, { status: 502 });
  }

  const data = await res.json();
  const results = (data.features as PhotonFeature[])
    .map((feature) => ({
      displayName: formatDisplayName(feature.properties),
      lat: feature.geometry.coordinates[1],
      lon: feature.geometry.coordinates[0],
    }))
    .filter((r) => r.displayName.length > 0);

  return NextResponse.json({ results });
}
