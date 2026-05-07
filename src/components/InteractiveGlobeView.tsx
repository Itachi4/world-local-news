import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GLOBE_HOTSPOTS, getCountryByCode } from "@/lib/countryMap";
import Globe from "react-globe.gl";
import { X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

interface InteractiveGlobeViewProps {
  selectedRegion: string;
  selectedCountry: string;
  articles: any[];
  loading?: boolean;
  onSelectCountry: (countryCode: string, regionName: string) => void;
  fullscreen?: boolean;
}

export function InteractiveGlobeView({
  selectedRegion,
  selectedCountry,
  articles,
  loading = false,
  onSelectCountry,
  fullscreen = false,
}: InteractiveGlobeViewProps) {
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [globeWidth, setGlobeWidth] = useState(680);
  const [globeHeight, setGlobeHeight] = useState(460);
  const globeRef = useRef<any>(null);
  const globeContainerRef = useRef<HTMLDivElement | null>(null);
  const selectedCountryMeta = selectedCountry !== "all" ? getCountryByCode(selectedCountry) : null;
  const visibleHotspots = GLOBE_HOTSPOTS.filter(
    (hotspot) => selectedRegion === "all" || hotspot.region === selectedRegion,
  );
  const headlineItems = useMemo(
    () => (
      selectedCountry === "all"
        ? []
        : articles.filter((article) => article.source_country === selectedCountry)
    ),
    [articles, selectedCountry],
  );

  useEffect(() => {
    const updateSize = () => {
      const width = globeContainerRef.current?.clientWidth || 680;
      setGlobeWidth(width);
      setGlobeHeight(Math.max(380, Math.min(560, Math.round(width * 0.66))));
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    if (globeContainerRef.current) {
      observer.observe(globeContainerRef.current);
    }
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!globeRef.current) return;
    const controls = globeRef.current.controls();
    controls.autoRotate = false;
    controls.autoRotateSpeed = 0;
    controls.enablePan = false;
    controls.minDistance = 140;
    controls.maxDistance = 280;
    globeRef.current.pointOfView({ lat: 18, lng: 12, altitude: 2.1 }, 0);
  }, [globeWidth, globeHeight]);

  useEffect(() => {
    if (!globeRef.current || selectedCountry === "all") return;
    const hotspot = GLOBE_HOTSPOTS.find((item) => item.code === selectedCountry);
    if (!hotspot) return;
    globeRef.current.pointOfView({ lat: hotspot.lat, lng: hotspot.lng, altitude: 1.55 }, 900);
  }, [selectedCountry]);

  return (
    <section className={fullscreen ? "h-screen w-screen bg-black" : "rounded-2xl border bg-card/80 p-4 md:p-6"}>
      <div
        ref={globeContainerRef}
        className={fullscreen
          ? "relative h-screen w-screen overflow-hidden bg-[radial-gradient(circle_at_60%_35%,rgba(59,130,246,0.20),rgba(2,6,23,0.98)_62%),linear-gradient(135deg,#020617,#000)]"
          : "relative overflow-hidden rounded-2xl border border-border/50 bg-[radial-gradient(circle_at_60%_35%,rgba(59,130,246,0.22),rgba(2,6,23,0.98)_58%),linear-gradient(135deg,#020617,#030712)]"}
      >
        <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(circle,rgba(255,255,255,0.65)_1px,transparent_1px)] bg-[size:4px_4px] opacity-10" />
        <div className="relative z-10 flex justify-center py-2 md:py-4">
          <Globe
            ref={globeRef}
            width={globeWidth}
            height={globeHeight}
            backgroundColor="rgba(0,0,0,0)"
            globeImageUrl="https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
            bumpImageUrl="https://unpkg.com/three-globe/example/img/earth-topology.png"
            pointsData={visibleHotspots}
            pointLat={(d: any) => d.lat}
            pointLng={(d: any) => d.lng}
            pointAltitude={(d: any) => (d.code === selectedCountry ? 0.03 : 0.016)}
            pointColor={(d: any) => (d.code === selectedCountry ? "#fef08a" : "#6ee7b7")}
            pointRadius={0.55}
            pointLabel={(d: any) => `${d.name}`}
            onPointClick={(d: any) => {
              onSelectCountry(d.code, d.region);
              setIsPopupOpen(true);
            }}
          />
        </div>

        {selectedCountry !== "all" && isPopupOpen && (
          <Card className="absolute right-2 top-2 z-20 w-[min(420px,95%)] border-primary/30 bg-background/95 shadow-2xl backdrop-blur-sm md:right-5 md:top-5">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-3">
                <CardTitle className="text-base">
                  {selectedCountryMeta ? `${selectedCountryMeta.name} headlines` : "Country headlines"}
                </CardTitle>
                <button
                  type="button"
                  onClick={() => setIsPopupOpen(false)}
                  className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  aria-label="Close headlines popup"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="max-h-[300px] space-y-2 overflow-y-auto pr-1 md:max-h-[360px]">
                {loading ? (
                  <p className="text-sm text-muted-foreground">Loading headlines...</p>
                ) : headlineItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No headlines available for this country yet. Try another country or fetch fresh headlines.
                  </p>
                ) : (
                  headlineItems.map((article) => (
                    <a
                      key={article.id}
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block rounded-lg border border-border/50 bg-background px-3 py-2 text-sm transition-colors hover:border-primary/50 hover:bg-primary/5"
                    >
                      <p className="font-medium leading-snug">{article.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {article.source_name} • {new Date(article.published_at).toLocaleString()}
                      </p>
                    </a>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </section>
  );
}

export default InteractiveGlobeView;

