use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::{fs, path::PathBuf, thread};
use tauri::Emitter;
mod serial;

#[tauri::command]
fn list_tile_packs(dir: String) -> Result<Vec<TilePackMeta>, String> {
  let mut out = vec![];
  let base = PathBuf::from(dir.clone());
  if !base.exists() {
    return Ok(out);
  }
  for e in fs::read_dir(&base).map_err(|e| e.to_string())? {
    let e = e.map_err(|e| e.to_string())?;
    if e.file_type().map_err(|e| e.to_string())?.is_dir() {
      let name = e.file_name().to_string_lossy().to_string();
      let path = e.path();
      let manifest = path.join("manifest.json");
      let (zmin, zmax) = if manifest.exists() {
        let txt = fs::read_to_string(&manifest).unwrap_or("{}".into());
        let v: serde_json::Value = serde_json::from_str(&txt).unwrap_or_default();
        (v.get("zmin").and_then(|x| x.as_u64()).unwrap_or(0) as u8, v.get("zmax").and_then(|x| x.as_u64()).unwrap_or(0) as u8)
      } else { (0,0) };
      out.push(TilePackMeta { name, path: path.to_string_lossy().to_string(), zmin, zmax });
    }
  }
  Ok(out)
}

#[tauri::command]
fn delete_tile_pack(path: String) -> Result<(), String> {
  fs::remove_dir_all(PathBuf::from(path)).map_err(|e| e.to_string())
}

#[tauri::command]
fn start_tile_download(app: tauri::AppHandle, name: String, template: String, north: f64, south: f64, east: f64, west: f64, zmin: u8, zmax: u8, dir: String) -> Result<(), String> {
  let base = PathBuf::from(dir).join(&name);
  if let Err(e) = fs::create_dir_all(&base) { return Err(e.to_string()); }
  // write manifest
  let _ = fs::write(base.join("manifest.json"), serde_json::json!({"template": template, "north": north, "south": south, "east": east, "west": west, "zmin": zmin, "zmax": zmax}).to_string());
  thread::spawn(move || {
    let mut total = 0usize;
    for z in zmin..=zmax {
      let (x0,x1,y0,y1) = bbox_to_tile_range(north, south, east, west, z);
      total += ((x1 - x0 + 1) as usize) * ((y1 - y0 + 1) as usize);
    }
    let mut done = 0usize;
    for z in zmin..=zmax {
      let (x0,x1,y0,y1) = bbox_to_tile_range(north, south, east, west, z);
      for x in x0..=x1 {
        for y in y0..=y1 {
          let url = template.replace("{z}", &z.to_string()).replace("{x}", &x.to_string()).replace("{y}", &y.to_string());
          let path = base.join(format!("{}/{}/{}.png", z, x, y));
          if let Some(parent) = path.parent() { let _ = fs::create_dir_all(parent); }
          match reqwest::blocking::get(&url) {
            Ok(resp) => {
              if let Ok(bytes) = resp.bytes() {
                let _ = fs::write(&path, &bytes);
              }
            }
            Err(_) => {}
          }
          done += 1;
          let _ = app.emit("status", StatusEvent { level: "info".into(), message: format!("tile {}/{}", done, total) });
        }
      }
    }
    let _ = app.emit("status", StatusEvent { level: "success".into(), message: format!("tile download done: {}", name) });
  });
  Ok(())
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct StatusEvent { level: String, message: String }

#[derive(Debug, Serialize, Deserialize, Clone)]
struct TilePackMeta { name: String, path: String, zmin: u8, zmax: u8 }

fn bbox_to_tile_range(north: f64, south: f64, east: f64, west: f64, z: u8) -> (u32,u32,u32,u32) {
  let n = lat2tile(north, z);
  let s = lat2tile(south, z);
  let e = lon2tile(east, z);
  let w = lon2tile(west, z);
  let (y0,y1) = if n<s { (n,s) } else { (s,n) };
  let (x0,x1) = if w<e { (w,e) } else { (e,w) };
  (x0,x1,y0,y1)
}
fn lon2tile(lon: f64, z: u8) -> u32 {
  let n = 2f64.powi(z as i32);
  (((lon + 180.0) / 360.0 * n).floor() as i64).clamp(0, (n as i64)-1) as u32
}
fn lat2tile(lat: f64, z: u8) -> u32 {
  let n = 2f64.powi(z as i32);
  let lat_rad = lat.to_radians();
  let y = (1.0 - (lat_rad.tan() + 1.0/lat_rad.cos()).ln() / std::f64::consts::PI) / 2.0 * n;
  (y.floor() as i64).clamp(0, (n as i64)-1) as u32
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(
      tauri_plugin_log::Builder::default()
        .level(log::LevelFilter::Info)
        .build(),
    )
    .manage(serial::SerialState::new())
    .invoke_handler(tauri::generate_handler![list_tile_packs, delete_tile_pack, start_tile_download, rename_log, delete_log, serial::list_ports, serial::connect, serial::disconnect, start_autodetect])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

#[tauri::command]
fn start_autodetect() -> Result<(), String> { Ok(()) }

#[tauri::command]
fn rename_log(old_path: String, new_base_name: String) -> Result<String, String> {
  let old = PathBuf::from(&old_path);
  if !old.exists() { return Err("file not found".into()); }
  let parent = old.parent().ok_or("no parent")?.to_path_buf();
  let mut new_name = new_base_name.clone();
  if !new_name.to_lowercase().ends_with(".csv") { new_name.push_str(".csv"); }
  let new_path = parent.join(new_name);
  fs::rename(&old, &new_path).map_err(|e| e.to_string())?;
  Ok(new_path.to_string_lossy().to_string())
}

#[tauri::command]
fn delete_log(path: String) -> Result<(), String> {
  let p = PathBuf::from(path);
  if !p.exists() { return Err("file not found".into()); }
  fs::remove_file(p).map_err(|e| e.to_string())
}
