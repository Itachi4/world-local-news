import { GLOBE_HOTSPOTS, getCountryByCode } from "@/lib/countryMap";
import { regionColor } from "@/lib/regionColor";
import Globe from "react-globe.gl";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

interface InteractiveGlobeViewProps {
  selectedRegion: string;
  selectedCountry: string;
  articles: any[];
  loading?: boolean;
  onSelectCountry: (countryCode: string, regionName: string) => void;
  fullscreen?: boolean;
  onExit?: () => void;
}

export function InteractiveGlobeView({
  selectedRegion,
  selectedCountry,
  articles,
  loading = false,
  onSelectCountry,
  fullscreen = false,
  onExit,
}: InteractiveGlobeViewProps) {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [globeWidth, setGlobeWidth] = useState(680);
  const [globeHeight, setGlobeHeight] = useState(460);
  const globeRef = useRef<any>(null);
  const globeContainerRef = useRef<HTMLDivElement | null>(null);
  const cameraInitializedRef = useRef(false);

  const selectedCountryMeta = selectedCountry !== "all" ? getCountryByCode(selectedCountry) : null;

  const visibleHotspots = GLOBE_HOTSPOTS.filter(
    (hotspot) => selectedRegion === "all" || hotspot.region === selectedRegion,
  );

  // Phong material with specular water map — reflective oceans.
  const globeMaterial = useMemo(() => {
    const mat = new THREE.MeshPhongMaterial();
    mat.bumpScale = 10;
    new THREE.TextureLoader().load(
      "https://unpkg.com/three-globe/example/img/earth-water.png",
      (texture) => {
        mat.specularMap = texture;
        mat.specular = new THREE.Color(0x226688);
        mat.shininess = 20;
      }
    );
    return mat;
  }, []);

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
      const el = globeContainerRef.current;
      const width = el?.clientWidth || window.innerWidth || 680;
      const height = fullscreen
        ? (el?.clientHeight || window.innerHeight || 768)
        : Math.max(380, Math.min(560, Math.round(width * 0.66)));
      setGlobeWidth(width);
      setGlobeHeight(height);
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    if (globeContainerRef.current) observer.observe(globeContainerRef.current);
    return () => observer.disconnect();
  }, [fullscreen]);

  useEffect(() => {
    if (!globeRef.current) return;
    const controls = globeRef.current.controls();
    controls.autoRotate = false;
    controls.autoRotateSpeed = 0;
    controls.enablePan = false;
    controls.enableZoom = true;
    controls.minDistance = 110;
    controls.maxDistance = 450;

    try { globeRef.current.renderer().setPixelRatio(window.devicePixelRatio); } catch (_) {/* not ready */}

    if (!cameraInitializedRef.current) {
      cameraInitializedRef.current = true;
      globeRef.current.pointOfView({ lat: 18, lng: 12, altitude: 2.1 }, 0);
    }
  }, [globeWidth, globeHeight]);

  useEffect(() => {
    if (!globeRef.current || selectedCountry === "all") return;
    const hotspot = GLOBE_HOTSPOTS.find((item) => item.code === selectedCountry);
    if (!hotspot) return;
    globeRef.current.pointOfView({ lat: hotspot.lat, lng: hotspot.lng, altitude: 1.55 }, 900);
  }, [selectedCountry]);

  if (!fullscreen) {
    // Compact inline mode — simple card layout, no slide-in panel
    return (
      <section
        style={{
          borderRadius: 12,
          border: "1px solid hsl(var(--border))",
          overflow: "hidden",
          background: "radial-gradient(circle at 60% 35%, rgba(59,130,246,.18), rgba(2,6,23,.98) 62%)",
        }}
      >
        <div
          ref={globeContainerRef}
          style={{ position: "relative", overflow: "hidden" }}
        >
          <div style={{ display: "flex", justifyContent: "center", paddingTop: 8 }}>
            <Globe
              ref={globeRef}
              width={globeWidth}
              height={globeHeight}
              backgroundColor="rgba(0,0,0,0)"
              globeImageUrl="https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
              bumpImageUrl="https://unpkg.com/three-globe/example/img/earth-topology.png"
              globeMaterial={globeMaterial}
              atmosphereColor="lightskyblue"
              atmosphereAltitude={0.25}
              pointsData={visibleHotspots}
              pointLat={(d: any) => d.lat}
              pointLng={(d: any) => d.lng}
              pointAltitude={(d: any) => (d.code === selectedCountry ? 0.03 : 0.016)}
              pointColor={(d: any) => (d.code === selectedCountry ? "#fef08a" : "#6ee7b7")}
              pointRadius={0.55}
              pointLabel={(d: any) => d.name}
              onPointClick={(d: any) => {
                onSelectCountry(d.code, d.region);
                setIsPanelOpen(true);
              }}
              labelsData={visibleHotspots}
              labelLat={(d: any) => d.lat}
              labelLng={(d: any) => d.lng}
              labelText={(d: any) => d.name}
              labelSize={1.8}
              labelDotRadius={0}
              labelColor={(d: any) => (d.code === selectedCountry ? "rgba(254,240,138,1)" : "rgba(255,255,255,0.9)")}
              labelResolution={3}
              labelAltitude={0.03}
            />
          </div>
        </div>
      </section>
    );
  }

  // ── Fullscreen mode ────────────────────────────────────────────────────────
  const rColor = selectedCountryMeta
    ? regionColor(selectedCountryMeta.region ?? "")
    : "hsl(var(--primary))";

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 60,
        background: "radial-gradient(120% 90% at 50% 30%, #15203a 0%, #0a0e1a 55%, #05060c 100%)",
        overflow: "hidden",
      }}
    >
      {/* Top overlay — logo + exit */}
      <div
        style={{
          position: "absolute", top: 0, left: 0, right: 0, zIndex: 7,
          pointerEvents: "none",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "20px 28px",
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 9 }}>
          <span style={{ width: 10, height: 10, background: "hsl(var(--primary))", display: "inline-block" }} />
          <span style={{ fontFamily: "'Newsreader', serif", fontWeight: 600, fontSize: 21, color: "#fff" }}>
            Snew<span style={{ color: "hsl(var(--primary))" }}>.</span>
          </span>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9.5, letterSpacing: ".2em", color: "rgba(255,255,255,.45)", textTransform: "uppercase" }}>
            Globe&nbsp;View
          </span>
        </div>
        {onExit && (
          <button
            onClick={onExit}
            style={{
              pointerEvents: "auto",
              display: "flex", alignItems: "center", gap: 9,
              height: 40, padding: "0 18px",
              border: "1px solid rgba(255,255,255,.25)",
              background: "rgba(255,255,255,.08)",
              backdropFilter: "blur(8px)",
              color: "#fff",
              borderRadius: 4,
              fontFamily: "inherit", fontSize: 14, fontWeight: 600,
              cursor: "pointer",
            }}
            aria-label="Exit globe view"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
            Exit globe view
          </button>
        )}
      </div>

      {/* Globe canvas */}
      <div
        ref={globeContainerRef}
        style={{ position: "absolute", inset: 0, zIndex: 1 }}
      >
        <Globe
          ref={globeRef}
          width={globeWidth}
          height={globeHeight}
          backgroundColor="rgba(0,0,0,0)"
          globeImageUrl="https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
          bumpImageUrl="https://unpkg.com/three-globe/example/img/earth-topology.png"
          globeMaterial={globeMaterial}
          atmosphereColor="lightskyblue"
          atmosphereAltitude={0.25}
          pointsData={visibleHotspots}
          pointLat={(d: any) => d.lat}
          pointLng={(d: any) => d.lng}
          pointAltitude={(d: any) => (d.code === selectedCountry ? 0.03 : 0.016)}
          pointColor={(d: any) => (d.code === selectedCountry ? "#fef08a" : "#6ee7b7")}
          pointRadius={0.55}
          pointLabel={(d: any) => d.name}
          onPointClick={(d: any) => {
            onSelectCountry(d.code, d.region);
            setIsPanelOpen(true);
          }}
          labelsData={visibleHotspots}
          labelLat={(d: any) => d.lat}
          labelLng={(d: any) => d.lng}
          labelText={(d: any) => d.name}
          labelSize={1.8}
          labelDotRadius={0}
          labelColor={(d: any) => (d.code === selectedCountry ? "rgba(254,240,138,1)" : "rgba(255,255,255,0.9)")}
          labelResolution={3}
          labelAltitude={0.03}
        />
      </div>

      {/* Vignette */}
      <div
        style={{
          position: "absolute", inset: 0, zIndex: 2, pointerEvents: "none",
          boxShadow: "inset 0 0 200px 40px rgba(3,5,12,.7)",
        }}
      />

      {/* Loading overlay */}
      {loading && (
        <div
          style={{
            position: "absolute", inset: 0, display: "grid", placeItems: "center",
            zIndex: 3, pointerEvents: "none",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 30, height: 30,
                border: "2.5px solid rgba(255,255,255,.2)",
                borderTopColor: "#7aa0ff",
                borderRadius: "50%",
                animation: "sn-spin .8s linear infinite",
              }}
            />
            <div
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 12, letterSpacing: ".05em",
                color: "rgba(255,255,255,.6)",
              }}
            >
              Rendering globe…
            </div>
          </div>
        </div>
      )}

      {/* Bottom-left caption */}
      <div
        style={{
          position: "absolute", left: 28, bottom: 26, zIndex: 5,
          fontFamily: "'IBM Plex Mono', monospace", fontSize: 11,
          color: "rgba(255,255,255,.5)", lineHeight: 1.7,
          pointerEvents: "none",
        }}
      >
        <div style={{ color: "#fff", fontSize: 12, marginBottom: 4 }}>
          {GLOBE_HOTSPOTS.length} countries · 6 regions live
        </div>
        <div>Click a hotspot to read that country's wire</div>
      </div>

      {/* Right slide-in country panel */}
      {selectedCountry !== "all" && isPanelOpen && (
        <div
          style={{
            position: "absolute", top: 0, right: 0, bottom: 0, width: 430,
            background: "hsl(var(--background))",
            color: "hsl(var(--foreground))",
            boxShadow: "-20px 0 50px rgba(0,0,0,.45)",
            display: "flex", flexDirection: "column",
            animation: "sn-up .25s ease both",
            zIndex: 20,
          }}
        >
          {/* Panel header */}
          <div
            style={{
              padding: "22px 24px 18px",
              borderBottom: "1px solid hsl(var(--border))",
              display: "flex", alignItems: "flex-start",
              justifyContent: "space-between", gap: 12,
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 7 }}>
                {selectedCountryMeta?.region && (
                  <span
                    style={{
                      fontSize: 11, fontWeight: 600, padding: "2px 8px",
                      borderRadius: 2,
                      background: rColor + "22",
                      color: rColor,
                      fontFamily: "'IBM Plex Mono', monospace",
                    }}
                  >
                    {selectedCountryMeta.region}
                  </span>
                )}
                <span
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 11, color: "hsl(var(--muted-foreground))",
                  }}
                >
                  {headlineItems.length} headline{headlineItems.length !== 1 ? "s" : ""}
                </span>
              </div>
              <h3
                style={{
                  fontFamily: "'Newsreader', serif",
                  fontWeight: 600, fontSize: 27, margin: 0,
                  letterSpacing: "-.01em",
                  color: "hsl(var(--foreground))",
                }}
              >
                {selectedCountryMeta?.name ?? selectedCountry}
              </h3>
            </div>
            <button
              onClick={() => setIsPanelOpen(false)}
              style={{
                width: 32, height: 32, display: "grid", placeItems: "center",
                border: "1px solid hsl(var(--border))",
                background: "hsl(var(--card))",
                color: "hsl(var(--foreground))",
                borderRadius: 3, cursor: "pointer", flexShrink: 0,
              }}
              aria-label="Close country panel"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Panel body */}
          <div style={{ flex: 1, overflowY: "auto", padding: "6px 24px 30px" }}>
            {loading ? (
              <div
                style={{
                  display: "flex", flexDirection: "column", alignItems: "center",
                  justifyContent: "center", padding: "80px 0", gap: 16,
                }}
              >
                <div
                  style={{
                    width: 30, height: 30,
                    border: "2.5px solid hsl(var(--border))",
                    borderTopColor: "hsl(var(--primary))",
                    borderRadius: "50%",
                    animation: "sn-spin .8s linear infinite",
                  }}
                />
                <div
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 12, color: "hsl(var(--muted-foreground))",
                  }}
                >
                  Loading {selectedCountryMeta?.name ?? selectedCountry} wire…
                </div>
              </div>
            ) : headlineItems.length === 0 ? (
              <p
                style={{
                  fontSize: 14, color: "hsl(var(--muted-foreground))",
                  padding: "40px 0", textAlign: "center",
                }}
              >
                No headlines available for this country yet. Try another country or fetch fresh headlines.
              </p>
            ) : (
              headlineItems.map((article: any) => (
                <a
                  key={article.id}
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "block",
                    padding: "16px 0",
                    borderBottom: "1px solid hsl(var(--border))",
                    textDecoration: "none",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
                    {article.category && (
                      <span
                        style={{
                          fontFamily: "'IBM Plex Mono', monospace",
                          fontSize: 10, color: "hsl(var(--accent-ink))",
                          textTransform: "uppercase",
                        }}
                      >
                        {article.category}
                      </span>
                    )}
                    <span
                      style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: 10, color: "hsl(var(--muted-foreground))",
                      }}
                    >
                      · {new Date(article.published_at).toLocaleDateString()}
                    </span>
                  </div>
                  <h4
                    style={{
                      fontFamily: "'Newsreader', serif",
                      fontWeight: 600, fontSize: 18,
                      lineHeight: 1.2, margin: "0 0 6px",
                      color: "hsl(var(--foreground))",
                    }}
                  >
                    {article.title}
                  </h4>
                  <div style={{ fontSize: 12.5, color: "hsl(var(--muted-foreground))" }}>
                    <span style={{ fontWeight: 600, color: "hsl(var(--foreground))" }}>
                      {article.source_name}
                    </span>
                    {" · "}
                    {new Date(article.published_at).toLocaleString()}
                  </div>
                </a>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default InteractiveGlobeView;
