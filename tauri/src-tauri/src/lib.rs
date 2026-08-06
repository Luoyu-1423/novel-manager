#[tauri::command]
async fn save_file(content: String, filename: String, window: tauri::Window) -> Result<serde_json::Value, String> {
    use tauri_plugin_dialog::DialogExt;
    
    let (tx, rx) = std::sync::mpsc::channel();
    
    window.dialog().file()
        .set_title("导出文件")
        .set_file_name(&filename)
        .add_filter("文本文件", &["txt"])
        .add_filter("所有文件", &["*"])
        .save_file(move |path| {
            let _ = tx.send(path);
        });
    
    match rx.recv() {
        Ok(Some(file_path)) => {
            let path_str = file_path.to_string();
            if path_str.is_empty() {
                return Ok(serde_json::json!({
                    "success": false,
                    "message": "无效路径"
                }));
            }
            match std::fs::write(&path_str, &content) {
                Ok(_) => Ok(serde_json::json!({
                    "success": true,
                    "path": path_str
                })),
                Err(e) => Ok(serde_json::json!({
                    "success": false,
                    "message": e.to_string()
                })),
            }
        }
        Ok(None) => Ok(serde_json::json!({
            "success": false,
            "message": "用户取消保存"
        })),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
async fn open_folder(file_path: String) -> serde_json::Value {
    let path = std::path::Path::new(&file_path);
    if path.exists() {
        #[cfg(target_os = "windows")]
        {
            let _ = std::process::Command::new("explorer")
                .args(["/select,", &file_path])
                .spawn();
        }
        #[cfg(not(target_os = "windows"))]
        {
            let _ = std::process::Command::new("xdg-open")
                .arg(path.parent().unwrap_or(path))
                .spawn();
        }
        serde_json::json!({ "success": true })
    } else {
        serde_json::json!({
            "success": false,
            "message": "文件不存在"
        })
    }
}

#[tauri::command]
fn platform() -> String {
    std::env::consts::OS.to_string()
}

// ==================== 文件日志（自动生成到程序目录 logs/） ====================

/// 日志目录：程序可执行文件所在目录下的 logs/
fn log_dir() -> std::path::PathBuf {
    let exe = std::env::current_exe().unwrap_or_default();
    let base = exe.parent().unwrap_or(std::path::Path::new("."));
    base.join("logs")
}

fn ensure_log_dir() -> std::path::PathBuf {
    let dir = log_dir();
    let _ = std::fs::create_dir_all(&dir);
    dir
}

/// JS 侧日志同步追加写入 logs/novel_manager.log（自动生成日志文件）
#[tauri::command]
fn write_log(content: String) -> Result<(), String> {
    use std::io::Write;
    let dir = ensure_log_dir();
    let path = dir.join("novel_manager.log");
    let mut file = std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(&path)
        .map_err(|e| e.to_string())?;
    file.write_all(content.as_bytes()).map_err(|e| e.to_string())?;
    file.write_all(b"\n").map_err(|e| e.to_string())?;
    Ok(())
}

/// 返回日志文件路径（前端展示/定位用）
#[tauri::command]
fn log_file_path() -> String {
    ensure_log_dir().join("novel_manager.log").to_string_lossy().to_string()
}

fn now_ts() -> String {
    match std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH) {
        Ok(d) => format!("{}", d.as_secs()),
        Err(_) => "0".to_string(),
    }
}

/// 安装 panic hook：Rust 侧任何崩溃都会自动写入 logs/crash.log
fn install_panic_hook() {
    std::panic::set_hook(Box::new(|info| {
        use std::io::Write;
        let msg = format!("[{}] PANIC: {}\n", now_ts(), info);
        let dir = log_dir();
        if std::fs::create_dir_all(&dir).is_ok() {
            let path = dir.join("crash.log");
            let _ = std::fs::OpenOptions::new()
                .create(true)
                .append(true)
                .open(&path)
                .and_then(|mut f| f.write_all(msg.as_bytes()));
        }
    }));
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    install_panic_hook();
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![save_file, open_folder, platform, write_log, log_file_path])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
