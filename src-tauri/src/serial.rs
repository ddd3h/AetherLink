use std::{io::Read, sync::{Arc, Mutex, atomic::{AtomicBool, Ordering}}, thread, time::Duration};
use serde::{Serialize, Deserialize};
use tauri::{AppHandle, Emitter, State};

pub struct SerialState {
  reader: Mutex<Option<ReaderHandle>>,
}

impl SerialState {
  pub fn new() -> Self { Self { reader: Mutex::new(None) } }
}

struct ReaderHandle { stop: Arc<AtomicBool>, join: Option<thread::JoinHandle<()>> }

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PortInfo {
  pub id: String,
  pub name: String,
  pub manufacturer: Option<String>,
  pub vid: Option<u16>,
  pub pid: Option<u16>,
}

#[tauri::command]
pub fn list_ports() -> Result<Vec<PortInfo>, String> {
  let ports = serialport::available_ports().map_err(|e| e.to_string())?;
  let out = ports.into_iter().map(|p| {
    let (vid, pid, manufacturer) = match p.port_type {
      serialport::SerialPortType::UsbPort(info) => (Some(info.vid), Some(info.pid), info.manufacturer),
      _ => (None, None, None),
    };
    PortInfo { id: p.port_name.clone(), name: p.port_name, manufacturer, vid, pid }
  }).collect();
  Ok(out)
}

#[tauri::command]
pub fn connect(app: AppHandle, state: State<SerialState>, port_id: String, baud: u32) -> Result<(), String> {
  // stop previous
  disconnect_inner(&state);
  let stop = Arc::new(AtomicBool::new(false));
  let stop_c = stop.clone();
  let app_c = app.clone();

  let handle = thread::spawn(move || {
    let mut port = match serialport::new(&port_id, baud).timeout(Duration::from_millis(300)).open() {
      Ok(p) => p,
      Err(e) => { let _ = app_c.emit("status", StatusEvent{ level:"error".into(), message: format!("open error: {}", e)}); return; }
    };
    let mut buf = [0u8; 1024];
    let mut acc: Vec<u8> = Vec::with_capacity(2048);
    loop {
      if stop_c.load(Ordering::Relaxed) { break; }
      match port.read(&mut buf) {
        Ok(n) if n>0 => {
          acc.extend_from_slice(&buf[..n]);
          while let Some(pos) = acc.iter().position(|&b| b == b'\n') {
            let mut line = acc.drain(..=pos).collect::<Vec<u8>>();
            if let Some(b) = line.last() { if *b == b'\n' { line.pop(); } }
            if let Some(b) = line.last() { if *b == b'\r' { line.pop(); } }
            let s = String::from_utf8_lossy(&line).to_string();
            let _ = app_c.emit("raw_line", &s);
          }
        }
        _ => { /* ignore timeouts */ }
      }
    }
  });

  *state.reader.lock().unwrap() = Some(ReaderHandle { stop, join: Some(handle) });
  Ok(())
}

#[tauri::command]
pub fn disconnect(state: State<SerialState>) -> Result<(), String> { disconnect_inner(&state); Ok(()) }

fn disconnect_inner(state: &State<SerialState>) {
  if let Some(mut r) = state.reader.lock().unwrap().take() {
    r.stop.store(true, Ordering::Relaxed);
    if let Some(j) = r.join.take() { let _ = j.join(); }
  }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct StatusEvent { level: String, message: String }

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CsvMapping { pub index: usize, pub key: String, pub r#type: String, pub units: Option<String>, pub visual: String }

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AutodetectResult {
  pub port: Option<String>,
  pub baud: Option<u32>,
  pub delimiter: char,
  pub mapping: Vec<CsvMapping>,
  pub score: f64,
}

#[tauri::command]
pub fn start_autodetect(app: AppHandle) -> Result<AutodetectResult, String> {
  let bauds = [115200u32, 57600, 38400, 9600];
  let mut best: Option<AutodetectResult> = None;
  let ports = serialport::available_ports().map_err(|e| e.to_string())?;
  for p in ports {
    for &baud in &bauds {
      let sample = read_sample(&p.port_name, baud, 1500);
      if let Some(s) = sample {
        let (delim, mapping, score) = score_and_guess(&s);
        if best.as_ref().map(|b| b.score).unwrap_or(0.0) < score {
          best = Some(AutodetectResult { port: Some(p.port_name.clone()), baud: Some(baud), delimiter: delim, mapping, score });
        }
      }
    }
  }
  let res = best.unwrap_or(AutodetectResult{ port: None, baud: None, delimiter: ',', mapping: vec![], score: 0.0 });
  let _ = app.emit("status", serde_json::json!({
    "kind": "autodetect",
    "port": res.port,
    "baud": res.baud,
    "delimiter": res.delimiter,
    "score": res.score,
    "mapping": res.mapping,
  }));
  Ok(res)
}

fn read_sample(port: &str, baud: u32, millis: u64) -> Option<String> {
  if let Ok(mut p) = serialport::new(port, baud).timeout(Duration::from_millis(100)).open() {
    let start = std::time::Instant::now();
    let mut buf = [0u8; 512];
    let mut acc: Vec<u8> = Vec::with_capacity(2048);
    while start.elapsed() < Duration::from_millis(millis) {
      if let Ok(n) = p.read(&mut buf) { if n>0 { acc.extend_from_slice(&buf[..n]); } }
    }
    if !acc.is_empty() { return Some(String::from_utf8_lossy(&acc).to_string()); }
  }
  None
}

fn score_and_guess(sample: &str) -> (char, Vec<CsvMapping>, f64) {
  let delim = if sample.matches('\t').count() > sample.matches(',').count() { '\t' } else if sample.matches(';').count() > sample.matches(',').count() { ';' } else { ',' };
  let mut score = 0.0;
  let mut col_scores: Vec<f64> = vec![];
  let mut lines = sample.lines().filter(|l| !l.trim().is_empty()).take(50);
  let mut rows: Vec<Vec<String>> = vec![];
  for line in lines.by_ref() {
    let parts: Vec<String> = line.trim().split(delim).map(|s| s.trim().to_string()).collect();
    if col_scores.len() < parts.len() { col_scores.resize(parts.len(), 0.0); }
    for (i, s) in parts.iter().enumerate() {
      if let Ok(v) = s.parse::<f64>() {
        // numeric preference
        col_scores[i] += 0.1;
        if (-90.0..=90.0).contains(&v) { col_scores[i] += 0.5; }
        if (-180.0..=180.0).contains(&v) { col_scores[i] += 0.3; }
        if (800.0..=1100.0).contains(&v) { col_scores[i] += 0.5; }
        if (-40.0..=85.0).contains(&v) { col_scores[i] += 0.3; }
        if (-500.0..=12000.0).contains(&v) { col_scores[i] += 0.2; }
      }
    }
    rows.push(parts);
  }
  score = col_scores.iter().sum::<f64>() / (col_scores.len().max(1) as f64);
  // simple mapping guess: pick best lat/lon/pressure/temperature/altitude columns by score ranking
  let mut idxs: Vec<usize> = (0..col_scores.len()).collect();
  idxs.sort_by(|a,b| col_scores[*b].partial_cmp(&col_scores[*a]).unwrap_or(std::cmp::Ordering::Equal));
  let mut mapping: Vec<CsvMapping> = vec![];
  // try to find lat/lon separately by range checks across rows
  let pick = |cond: &dyn Fn(f64)->bool| -> Option<usize> {
    for &i in &idxs {
      let mut ok = 0; let mut total=0;
      for r in rows.iter() {
        if let Some(s) = r.get(i) { if let Ok(v) = s.parse::<f64>() { total+=1; if cond(v) { ok+=1; } } }
      }
      if total>5 && ok as f64 / total as f64 > 0.6 { return Some(i); }
    }
    None
  };
  if let Some(i) = pick(&|v| (-90.0..=90.0).contains(&v)) { mapping.push(CsvMapping{ index:i, key:"lat".into(), r#type:"number".into(), units:None, visual:"map".into() }); }
  if let Some(i) = pick(&|v| (-180.0..=180.0).contains(&v)) { mapping.push(CsvMapping{ index:i, key:"lon".into(), r#type:"number".into(), units:None, visual:"map".into() }); }
  // other fields by score order
  for &i in &idxs {
    if mapping.iter().any(|m| m.index==i) { continue; }
    // guess key by value range majority
    let mut avg: Option<f64> = None;
    let mut cnt=0.0; let mut sum=0.0;
    for r in rows.iter() { if let Some(s)=r.get(i) { if let Ok(v)=s.parse::<f64>() { cnt+=1.0; sum+=v; } } }
    if cnt>0.0 { avg=Some(sum/cnt); }
    let (key, units, visual) = if let Some(a)=avg {
      if (800.0..=1100.0).contains(&a) { ("pressure","hPa","chart") } else if (-40.0..=85.0).contains(&a) { ("temperature","°C","chart") } else if (-500.0..=12000.0).contains(&a) { ("altitude","m","chart") } else { ("value","","chart") }
    } else { ("mode","","label") };
    mapping.push(CsvMapping{ index:i, key: key.into(), r#type:"number".into(), units: if units.is_empty(){None}else{Some(units.into())}, visual: visual.into() });
    if mapping.len()>=6 { break; }
  }
  (delim, mapping, score)
}
