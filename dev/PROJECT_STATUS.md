# プロジェクト機能サマリ（現状）

このドキュメントは、フロントだけで完結している機能／バックエンド（Tauri）まで実装済みの機能／今後のTODOを簡潔にまとめたものです。

## 搭載済み（バックエンド連携あり）
- UARTシリアル（Tauri/Rust）
  - `list_ports`: ポート一覧（id/name/manufacturer/vid/pid）
  - `connect` / `disconnect`: 選択ポート/ボーレートで接続し、1行ASCIIを `raw_line` でemit
  - `start_autodetect`: ポート×ボーレート候補を短時間スキャンし、区切り/列/値レンジから `delimiter` と `CsvMapping[]` を推定。最良候補を `status(kind=autodetect)` でemit
- ログ（Tauri側CSVファイル）
  - 一覧/再生/リネーム/削除（Replayタブから操作可能）
- UI側イベント購読
  - `raw_line`: 受信ASCIIをUI側でパース（CSVマッピングに基づき `parseCsvLine`）→ 描画フォールバック
  - `telemetry`: そのままZustandへ `append`（debug=ON時は無視してデモ優先）

## フロントエンドのみ（スタンドアロン）
- CSVマッピングUI
  - 列→キー/型/単位/visual(map/chart/label/hidden) の設定
  - キーの追加/削除（t/lat/lon保護）
  - UART live: `raw_line` ライブ表示（debug=ONはデモ行、OFFは実UART）
- Dashboard動的描画
  - visual=chart: 個別グラフ自動生成（unitsはY軸に表示）
  - visual=label: カード
  - map: lat/lon軌跡＋最新点、現在地マーカー＋精度円＋自分の軌跡
- タイル（UI）
  - タイルURLプリセット、BBOXピッカー（DL UI）。Tauri側でのDL実行・進捗emitは実装済
- Replay（UI）
  - CSVインポート/エクスポート
  - アプリ内簡易DB（localStorage）: 記録停止時のCSV保存、Replayでの再生/改名/削除
- デバッグモード
  - ON: デモ（mockStream/raw行）でUI更新
  - OFF: 実UARTのみ（非Tauriでは更新しない）

## TODO / Task
- 自動判定のUI統合
  - `status(kind=autodetect)` の候補を通知→ワンクリック適用（port/baud/delimiter/mapping）→ `connect` 実行
  - 成功/失敗/候補のUX整備（トースト/ダイアログ）
- UART受信の堅牢化
  - ポート切断や占有時の自動リトライ方針、タイムアウト/バッファ制御
- カスタムキーのTelemetry拡張
  - Coreのpayloadを任意キー対応に拡張 or UI側パース統一の設計判断
  - Dashboardへカスタムキーを動的追加（ラベル/グラフ）
- タイルDLのUX
  - 進捗バー、IndexedDBへの保存/キャッシュ最適化、ダイアログ連携
- 設定の永続化
  - Core側への `delimiter/header/mapping` の確実な同期（UI→Coreの双方向）
- テスト/品質
  - UART受信/マッピング/描画のE2E・結合テスト
  - 型・例外・アクセシビリティ（フォーカス/aria）

## バックエンド/フロントエンドの分離に関する課題（Clean-up TODO）
- 重複パース（UIとCore）
  - 現状: Coreはraw_line emit、UIで`parseCsvLine`フォールバック、場合によりCoreからtelemetryもemitできる形が残る。
  - 方針: いずれかに統一（推奨: Coreはraw_line専任 + UIで確定パース or Coreが完全パースしてUIは描画のみ）。
  - TODO: 採用方針を決め、未使用経路の削除（telemetry or フォールバックの片方）。
- 設定の単一責務
  - 現状: delimiter/header/mapping が UIとCoreに重複保持。Syncがデバウンスのみで保証弱い。
  - TODO: `get_config/set_config`を介した双方向同期を確立し、起動時ロード/変更時保存を統一。
- 記録経路の二重化
  - 現状: TopBarでTauriのファイル記録と、UIの簡易DB(localStorage)記録を同時実行。
  - 方針: どちらをデフォルトにするか決定（推奨: 本番はTauriファイル、DBは開発/一時記録用）。
  - TODO: トグル/設定で切替、UIへの明示表示。重複保存の抑止。
- タイルDLの責務分割
  - 現状: UIにBBOXピッカー/URL入力、CoreでDL/進捗emit。UI側の進捗/キャンセル/再試行のUXは未統合。
  - TODO: プロトコル定義（開始/進捗/完了/エラー）とUIコンポーネントの整理、保存先の合意（IndexedDB/FS）。
- Replayのソース混在
  - 現状: Tauriの実ファイルとlocalStorageのDBログを一つのUIで扱う。
  - TODO: ソース切替UI（フィルタ/タブ）を設け、操作（改名/削除）ポリシーを明確化。
- Debugモードの影響範囲
  - 現状: Debug=ONでUI側モック/デモが優先、Coreイベント無視。箇所によって条件分岐が点在。
  - TODO: 中央管理（store）で方針を定義し、購読・記録・Replay等の分岐をユーティリティに集約。

---
更新日: 自動生成（dev/PROJECT_STATUS.md）
