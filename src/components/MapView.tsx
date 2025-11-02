// MapLibre view: shows current position and track（styleロード完了を待ってから操作する安全版）
import React from "react";
import maplibregl, { Map, GeoJSONSource, LngLatLike, Marker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useStore } from "../store";

/** 最小スタイル（オンラインタイル不要）。背景のみ */
const styleLight: any = {
  version: 8,
  sources: {},
  layers: [{ id: "bg", type: "background", paint: { "background-color": "#f6f7fb" } }],
};
const styleDark: any = {
  version: 8,
  sources: {},
  layers: [{ id: "bg", type: "background", paint: { "background-color": "#0b1020" } }],
};

export default function MapView() {
  const series = useStore((s) => s.series);
  const autoFollow = useStore((s) => s.config.ui.autoFollow);
  const followTarget = useStore((s) => s.config.ui.followTarget ?? 'telemetry');
  const setConfig = useStore((s) => s.setConfig);
  const theme = useStore((s) => s.config.theme);
  const mapCfg = useStore((s) => s.config.map);

  const mapRef = React.useRef<Map | null>(null);
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const lastCoordsRef = React.useRef<[number, number] | null>(null);
  const myPosRef = React.useRef<[number, number] | null>(null);
  const geoWatchId = React.useRef<number | null>(null);
  const myMarkerRef = React.useRef<Marker | null>(null);
  const myTrackRef = React.useRef<[number, number][]>([]);
  const teleMarkerRef = React.useRef<Marker | null>(null);

  /** スタイル読み込み後にソース/レイヤを用意する */
  const ensureSourcesAndLayers = React.useCallback((map: Map) => {
    // raster tiles (online/offline)
    const tilesUrl = mapCfg?.useOffline && mapCfg.activePack
      ? `file://${mapCfg.activePack}/{z}/{x}/{y}.png`
      : (mapCfg?.providerUrl || "");
    if (tilesUrl && !map.getSource("tiles")) {
      map.addSource("tiles", { type: "raster", tiles: [tilesUrl], tileSize: 256 } as any);
      const before = map.getLayer('track-line') ? 'track-line' : undefined;
      // @ts-ignore MapLibre addLayer signature supports beforeId as second arg
      map.addLayer({ id: "tiles-layer", type: "raster", source: "tiles" } as any, before);
    }
    // my location accuracy circle + marker + track
    if (!map.getSource('me-accuracy')) {
      map.addSource('me-accuracy', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addLayer({ id: 'me-accuracy-fill', type: 'fill', source: 'me-accuracy', paint: { 'fill-color': '#22c55e', 'fill-opacity': 0.15 } });
    }
    if (!map.getSource('me-point')) {
      map.addSource('me-point', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addLayer({ id: 'me-point-circle', type: 'circle', source: 'me-point', paint: { 'circle-radius': 5, 'circle-color': '#16a34a', 'circle-stroke-color': '#fff', 'circle-stroke-width': 2 } });
    }
    if (!map.getSource('me-track')) {
      map.addSource('me-track', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addLayer({ id: 'me-track-line', type: 'line', source: 'me-track', paint: { 'line-color': '#22c55e', 'line-width': 2, 'line-opacity': 0.8 } });
    }
    if (!myMarkerRef.current) {
      const el = document.createElement('div');
      el.setAttribute('aria-label', 'my-location');
      el.className = 'rounded-full bg-green-500 ring-2 ring-white dark:ring-black shadow w-3.5 h-3.5';
      myMarkerRef.current = new maplibregl.Marker({ element: el, anchor: 'center' }).setLngLat([139.76, 35.68]).addTo(map);
    }
    if (!teleMarkerRef.current) {
      const el2 = document.createElement('div');
      el2.setAttribute('aria-label', 'telemetry-latest');
      el2.className = 'rounded-full bg-rose-500 ring-2 ring-white dark:ring-black shadow w-3.5 h-3.5';
      teleMarkerRef.current = new maplibregl.Marker({ element: el2, anchor: 'center' }).setLngLat([139.76, 35.68]).addTo(map);
    }
    // pos 点（telemetry）
    if (!map.getSource("current")) {
      map.addSource("current", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: "current-point",
        type: "circle",
        source: "current",
        paint: {
          "circle-radius": 6,
          "circle-color": "#e11d48",
          "circle-stroke-color": "#fff",
          "circle-stroke-width": 2,
        },
      });
    }
    // 軌跡
    if (!map.getSource("track")) {
      map.addSource("track", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: "track-line",
        type: "line",
        source: "track",
        paint: { "line-color": "#0ea5e9", "line-width": 3 },
      });
    }
    // ensure tiles are beneath track line
    if (map.getLayer('tiles-layer') && map.getLayer('track-line')) {
      try { map.moveLayer('tiles-layer', 'track-line'); } catch {}
    }
  }, [mapCfg?.providerUrl, mapCfg?.useOffline, mapCfg?.activePack]);

  /** styleが完全ロードされるのを待つユーティリティ */
  const whenStyleReady = React.useCallback((map: Map, fn: () => void) => {
    if (map.isStyleLoaded()) {
      fn();
      return;
    }
    // style変更直後は styledata → render → idle の順で来ることが多い
    const once = () => {
      map.off("idle", once);
      try {
        fn();
      } catch (e) {
        console.warn("[Map] deferred fn error", e);
      }
    };
    map.on("idle", once);
  }, []);

  // 初期化
  React.useEffect(() => {
    if (mapRef.current || !containerRef.current) return;

    const isDark = document.documentElement.classList.contains("dark");
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: isDark ? styleDark : styleLight,
      center: [139.76, 35.68] as LngLatLike,
      zoom: 9,
      attributionControl: false,
      failIfMajorPerformanceCaveat: false,
    });
    mapRef.current = map;

    // 初回ロード時にレイヤ用意
    map.on("load", () => {
      ensureSourcesAndLayers(map);
      map.resize();
    });

    // WebGLコンテキスト喪失時に落ちないように
    map.on("webglcontextlost", (e) => {
      e.preventDefault();
      // 可能ならリサイズで復旧を促す
      // @ts-ignore
      map.resize();
    });

    // リサイズに追従
    const ro = new ResizeObserver(() => map.resize());
    ro.observe(containerRef.current);
    window.addEventListener("resize", () => map.resize());

    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, [ensureSourcesAndLayers]);

  // 位置更新（seriesが変わるたびに安全に更新）
  React.useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const coords = series
      .filter((s) => s.lat != null && s.lon != null)
      .map((s) => [s.lon!, s.lat!] as [number, number]);

    whenStyleReady(map, () => {
      ensureSourcesAndLayers(map);

      // track
      const track = map.getSource("track") as GeoJSONSource | undefined;
      if (track) {
        const fc =
          coords.length > 1
            ? {
                type: "FeatureCollection",
                features: [
                  {
                    type: "Feature",
                    geometry: { type: "LineString", coordinates: coords },
                    properties: {},
                  },
                ],
              }
            : { type: "FeatureCollection", features: [] };
        track.setData(fc as any);
      }

      // current (telemetry) point
      const current = map.getSource("current") as GeoJSONSource | undefined;
      if (current) {
        const fc =
          coords.length
            ? {
                type: "FeatureCollection",
                features: [
                  {
                    type: "Feature",
                    geometry: { type: "Point", coordinates: coords[coords.length - 1] },
                    properties: {},
                  },
                ],
              }
            : { type: "FeatureCollection", features: [] };
        current.setData(fc as any);
      }
      // telemetry latest marker
      if (coords.length && teleMarkerRef.current) {
        teleMarkerRef.current.setLngLat(coords[coords.length - 1] as any);
      }

      // 自動追従（テレメトリの最新点）
      if (autoFollow && followTarget === 'telemetry' && coords.length) {
        const latest = coords[coords.length - 1];
        const prev = lastCoordsRef.current;
        lastCoordsRef.current = latest;
        if (!prev || prev[0] !== latest[0] || prev[1] !== latest[1]) {
          map.easeTo({ center: latest as any, duration: 500 });
        }
      }
    });
  }, [series, autoFollow, followTarget, ensureSourcesAndLayers, whenStyleReady]);

  // テーマ切替時：styleを差し替えてから元のレイヤを再作成
  React.useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const isDark = document.documentElement.classList.contains("dark");
    map.setStyle(isDark ? styleDark : styleLight);

    // 新style適用完了を待ってからソース/レイヤ再作成
    whenStyleReady(map, () => {
      ensureSourcesAndLayers(map);
      map.resize();
    });
  }, [theme, ensureSourcesAndLayers, whenStyleReady]);

  // Geolocation: watch my current device location
  React.useEffect(() => {
    if (!('geolocation' in navigator)) return;
    geoWatchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        const lng = pos.coords.longitude; const lat = pos.coords.latitude; myPosRef.current = [lng, lat];
        const map = mapRef.current; if (!map) return;
        whenStyleReady(map, () => {
          // accuracy circle as approximate buffer (simple circle via polygon approximation)
          const r = pos.coords.accuracy || 0; // meters
          const poly = circlePolygon([lng, lat], r);
          const acc = map.getSource('me-accuracy') as GeoJSONSource | undefined; acc?.setData(poly as any);
          const meSrc = map.getSource('me-point') as GeoJSONSource | undefined; meSrc?.setData({ type: 'FeatureCollection', features: [{ type: 'Feature', geometry: { type: 'Point', coordinates: [lng, lat] }, properties: {} }] } as any);
          // update marker
          myMarkerRef.current?.setLngLat([lng, lat]);
          // append to my track
          const track = myTrackRef.current;
          const last = track[track.length - 1];
          if (!last || last[0] !== lng || last[1] !== lat) {
            track.push([lng, lat]);
            if (track.length > 5000) track.splice(0, track.length - 5000);
            const line = (map.getSource('me-track') as GeoJSONSource | undefined);
            line?.setData({ type: 'FeatureCollection', features: [{ type: 'Feature', geometry: { type: 'LineString', coordinates: track }, properties: {} }] } as any);
          }
          if (autoFollow && (followTarget === 'me')) {
            map.easeTo({ center: [lng, lat] as any, duration: 400 });
          }
        });
      },
      (err) => { console.warn('geolocation error', err); },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 10000 }
    );
    return () => { if (geoWatchId.current != null) navigator.geolocation.clearWatch(geoWatchId.current); };
  }, [whenStyleReady]);

  function circlePolygon(center: [number, number], radiusMeters: number, points = 48) {
    const [lng, lat] = center;
    const coords: [number, number][] = [];
    const earth = 6378137;
    for (let i = 0; i <= points; i++) {
      const angle = (i / points) * Math.PI * 2;
      const dx = (radiusMeters * Math.cos(angle)) / (earth * Math.cos((lat * Math.PI) / 180));
      const dy = radiusMeters * Math.sin(angle) / earth;
      coords.push([lng + (dx * 180) / Math.PI, lat + (dy * 180) / Math.PI]);
    }
    return { type: 'FeatureCollection', features: [{ type: 'Feature', geometry: { type: 'Polygon', coordinates: [coords] }, properties: {} }] };
  }

  // provider/offline change: replace tiles source/layer
  React.useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const tilesUrl = mapCfg?.useOffline && mapCfg.activePack
      ? `file://${mapCfg.activePack}/{z}/{x}/{y}.png`
      : (mapCfg?.providerUrl || "");
    whenStyleReady(map, () => {
      if (map.getLayer("tiles-layer")) map.removeLayer("tiles-layer");
      if (map.getSource("tiles")) map.removeSource("tiles");
      if (tilesUrl) {
        map.addSource("tiles", { type: "raster", tiles: [tilesUrl], tileSize: 256 } as any);
        const before = map.getLayer('track-line') ? 'track-line' : undefined;
        // @ts-ignore
        map.addLayer({ id: "tiles-layer", type: "raster", source: "tiles" } as any, before);
        if (map.getLayer('track-line')) {
          try { map.moveLayer('tiles-layer', 'track-line'); } catch {}
        }
      }
    });
  }, [mapCfg?.providerUrl, mapCfg?.useOffline, mapCfg?.activePack, whenStyleReady]);

  return (
    <div className="relative h-full min-h-[300px]" aria-label="map">
      <div
        ref={containerRef}
        className="absolute inset-0 w-full h-full rounded-2xl overflow-hidden"
      />
      <div className="absolute right-2 bottom-2 z-10 flex flex-col gap-2">
        <button
          className={"px-3 py-1.5 text-xs rounded-lg border backdrop-blur " + (followTarget==='me' && autoFollow ? 'bg-green-600 text-white' : 'bg-white/80 dark:bg-black/50')}
          onClick={() => {
            const me = myPosRef.current; const map = mapRef.current; 
            setConfig({ ui: { ...useStore.getState().config.ui, autoFollow: true, followTarget: 'me' } });
            if (map && me) map.easeTo({ center: me as any, duration: 400, zoom: Math.max(map.getZoom(), 12) });
          }}
        >
          現在地 追従
        </button>
        <button
          className={"px-3 py-1.5 text-xs rounded-lg border backdrop-blur " + (followTarget==='telemetry' && autoFollow ? 'bg-blue-600 text-white' : 'bg-white/80 dark:bg-black/50')}
          onClick={() => {
            setConfig({ ui: { ...useStore.getState().config.ui, autoFollow: true, followTarget: 'telemetry' } });
          }}
        >
          最新点 追従
        </button>
        <button
          className="px-3 py-1.5 text-xs rounded-lg bg-white/80 dark:bg-black/50 border backdrop-blur"
          onClick={() => setConfig({ ui: { ...useStore.getState().config.ui, autoFollow: false, followTarget: 'none' } })}
        >
          追従 停止
        </button>
      </div>
    </div>
  );
}
