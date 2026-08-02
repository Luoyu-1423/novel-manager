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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![save_file, open_folder, platform])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
