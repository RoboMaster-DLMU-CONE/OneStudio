use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::AppHandle;
use tauri::Manager;

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct UserConfig {
    pub zephyr_base: Option<String>,
    pub venv_path: Option<String>,
    pub recent_projects: Vec<String>,
}

#[tauri::command]
pub fn get_config(app: AppHandle) -> Result<UserConfig, String> {
    let config_path = get_config_path(&app)?;
    if !config_path.exists() {
        return Ok(UserConfig::default());
    }

    let content = fs::read_to_string(config_path).map_err(|e| e.to_string())?;
    serde_json::from_str(&content).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn save_config(app: AppHandle, config: UserConfig) -> Result<(), String> {
    let config_path = get_config_path(&app)?;
    
    if let Some(parent) = config_path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }

    let content = serde_json::to_string_pretty(&config).map_err(|e| e.to_string())?;
    fs::write(config_path, content).map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
pub fn set_zephyr_path(app: AppHandle, path: String) -> Result<(), String> {
    let mut config = get_config(app.clone())?;
    config.zephyr_base = Some(path);
    save_config(app, config)
}

#[tauri::command]
pub fn set_venv_path(app: AppHandle, path: String) -> Result<(), String> {
    let mut config = get_config(app.clone())?;
    config.venv_path = Some(path);
    save_config(app, config)
}

#[tauri::command]
pub fn add_recent_project(app: AppHandle, path: String) -> Result<(), String> {
    let mut config = get_config(app.clone())?;
    
    // Remove if exists to move to top
    if let Some(pos) = config.recent_projects.iter().position(|x| x == &path) {
        config.recent_projects.remove(pos);
    }
    
    config.recent_projects.insert(0, path);
    
    // Keep only last 10
    if config.recent_projects.len() > 10 {
        config.recent_projects.truncate(10);
    }
    
    save_config(app, config)
}

fn get_config_path(app: &AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_config_dir()
        .map(|p| p.join("config.json"))
        .map_err(|e| e.to_string())
}
