// BboxPicker: small MapLibre map to visually select a bounding box
import React from 'react';
import maplibregl, { Map, GeoJSONSource } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

type Bbox = { north: number; south: number; east: number; west: number };

export default function BboxPicker({ bbox, onChange, tiles }: { bbox: Bbox; onChange: (b: Bbox) => void; tiles: string }) {
  const mapRef = React.useRef<Map | null>(null);
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const drawingRef = React.useRef<null | [number, number]>(null);

  React.useEffect(() => {
    if (mapRef.current || !containerRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: { version: 8, sources: {}, layers: [{ id: 'bg', type: 'background', paint: { 'background-color': '#f6f7fb' } }] } as any,
      center: [139.76, 35.68],
      zoom: 6,
      attributionControl: false,
    });
    mapRef.current = map;
    map.on('load', () => {
      if (tiles) {
        map.addSource('tiles', { type: 'raster', tiles: [tiles], tileSize: 256 } as any);
        map.addLayer({ id: 'tiles-layer', type: 'raster', source: 'tiles' } as any);
      }
      map.addSource('bbox', { type: 'geojson', data: emptyFeature() });
      map.addLayer({ id: 'bbox-fill', type: 'fill', source: 'bbox', paint: { 'fill-color': '#60a5fa', 'fill-opacity': 0.2 } });
      map.addLayer({ id: 'bbox-line', type: 'line', source: 'bbox', paint: { 'line-color': '#3b82f6', 'line-width': 2 } });
      drawFromState();
    });

    const ro = new ResizeObserver(() => map.resize());
    ro.observe(containerRef.current);

    // Drag to draw
    map.on('mousedown', (e) => {
      drawingRef.current = [e.lngLat.lng, e.lngLat.lat];
      map.getCanvas().style.cursor = 'crosshair';
    });
    map.on('mousemove', (e) => {
      const start = drawingRef.current;
      if (!start) return;
      const west = Math.min(start[0], e.lngLat.lng);
      const east = Math.max(start[0], e.lngLat.lng);
      const south = Math.min(start[1], e.lngLat.lat);
      const north = Math.max(start[1], e.lngLat.lat);
      setBboxOnMap({ north, south, east, west });
    });
    map.on('mouseup', (e) => {
      const start = drawingRef.current;
      drawingRef.current = null;
      map.getCanvas().style.cursor = '';
      if (!start) return;
      const west = Math.min(start[0], e.lngLat.lng);
      const east = Math.max(start[0], e.lngLat.lng);
      const south = Math.min(start[1], e.lngLat.lat);
      const north = Math.max(start[1], e.lngLat.lat);
      onChange({ north, south, east, west });
    });

    return () => { ro.disconnect(); map.remove(); mapRef.current = null; };
  }, [tiles]);

  function emptyFeature() {
    return { type: 'FeatureCollection', features: [] } as any;
  }

  function polyFromBbox(b: Bbox) {
    const c = [
      [b.west, b.south],
      [b.west, b.north],
      [b.east, b.north],
      [b.east, b.south],
      [b.west, b.south],
    ];
    return { type: 'FeatureCollection', features: [{ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [c] } }] } as any;
  }

  function setBboxOnMap(b: Bbox) {
    const map = mapRef.current;
    if (!map) return;
    const src = map.getSource('bbox') as GeoJSONSource | undefined;
    src?.setData(polyFromBbox(b));
  }

  function drawFromState() {
    if (!bbox) return;
    setBboxOnMap(bbox);
  }

  React.useEffect(() => { drawFromState(); }, [bbox]);

  return (
    <div className="relative w-full h-56 rounded-2xl overflow-hidden border">
      <div ref={containerRef} className="absolute inset-0" />
      <div className="absolute bottom-2 right-2 z-10 flex gap-2">
        <button
          className="px-2 py-1 text-xs rounded bg-white/80 dark:bg-black/50 border"
          onClick={() => {
            const map = mapRef.current; if (!map) return; const b = map.getBounds();
            onChange({ north: b.getNorth(), south: b.getSouth(), east: b.getEast(), west: b.getWest() });
          }}
        >
          現在の表示範囲を使用
        </button>
      </div>
    </div>
  );
}

