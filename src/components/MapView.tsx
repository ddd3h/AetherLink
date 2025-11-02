// MapLibre view: shows current position and track（styleロード完了を待ってから操作する安全版）
import React from "react";
import maplibregl, { Map, GeoJSONSource, LngLatLike } from "maplibre-gl";
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
  const theme = useStore((s) => s.config.theme);

  const mapRef = React.useRef<Map | null>(null);
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const lastCoordsRef = React.useRef<[number, number] | null>(null);

  /** スタイル読み込み後にソース/レイヤを用意する */
  const ensureSourcesAndLayers = React.useCallback((map: Map) => {
    // pos 点
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
  }, []);

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

      // current
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

      // 自動追従
      if (autoFollow && coords.length) {
        const latest = coords[coords.length - 1];
        const prev = lastCoordsRef.current;
        lastCoordsRef.current = latest;
        if (!prev || prev[0] !== latest[0] || prev[1] !== latest[1]) {
          map.easeTo({ center: latest as any, duration: 500 });
        }
      }
    });
  }, [series, autoFollow, ensureSourcesAndLayers, whenStyleReady]);

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

  return (
    <div className="relative h-full min-h-[300px]" aria-label="map">
      <div
        ref={containerRef}
        className="absolute inset-0 w-full h-full rounded-2xl overflow-hidden"
      />
    </div>
  );
}
