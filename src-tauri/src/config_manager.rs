use serde::{Deserialize, Serialize};
use std::fs;
use std::io::BufReader;
use std::io::BufRead;
use std::path::PathBuf;
use tauri::AppHandle;
use tauri::Emitter;
use tauri::Manager;
use std::fs::File;
use std::io::BufReader as StdBufReader;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ProjectMetadata {
    pub path: String,
    pub name: String,
    pub last_opened: u64, // Unix timestamp
    #[serde(default)]
    pub project_type: Option<String>,
    #[serde(default)]
    pub zephyr_version: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct UserConfig {
    pub zephyr_base: Option<String>,
    pub venv_path: Option<String>,
    pub recent_projects: Vec<String>, // Legacy field, keeping for compatibility
    #[serde(default)]
    pub project_history: Vec<ProjectMetadata>,
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

#[tauri::command]
pub fn add_project_to_history(app: AppHandle, path: String, name: Option<String>) -> Result<(), String> {
    let mut config = get_config(app.clone())?;

    // Use provided name or extract from path
    let project_name = name.unwrap_or_else(|| {
        std::path::Path::new(&path)
            .file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_else(|| path.clone())
    });

    // Get current timestamp
    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_err(|e| e.to_string())?
        .as_secs();

    // Create or update project metadata
    let mut updated = false;
    for project in &mut config.project_history {
        if project.path == path {
            project.last_opened = timestamp;
            updated = true;
            break;
        }
    }

    // If not found, add new entry
    if !updated {
        config.project_history.push(ProjectMetadata {
            path: path.clone(),
            name: project_name,
            last_opened: timestamp,
            project_type: None,
            zephyr_version: None,
        });
    }

    // Keep only last 10 projects and sort by last opened (newest first)
    config.project_history.sort_by(|a, b| b.last_opened.cmp(&a.last_opened));
    if config.project_history.len() > 10 {
        config.project_history.truncate(10);
    }

    save_config(app, config)
}

#[tauri::command]
pub fn get_project_history(app: AppHandle) -> Result<Vec<ProjectMetadata>, String> {
    let config = get_config(app)?;
    Ok(config.project_history)
}

#[tauri::command]
pub fn remove_project_from_history(app: AppHandle, path: String) -> Result<(), String> {
    let mut config = get_config(app.clone())?;

    config.project_history.retain(|project| project.path != path);
    save_config(app, config)
}

use std::process::Command;
use std::path::Path;

#[tauri::command]
pub async fn create_project(
    app: AppHandle,
    project_name: String,
    workspace_path: String,
    shallow_clone: bool,
) -> Result<(), String> {
    // First, save the project information to config
    let mut config = get_config(app.clone()).map_err(|e| format!("获取配置失败: {}", e))?;

    // Add project to recent projects and history
    if let Some(pos) = config.recent_projects.iter().position(|x| x == &workspace_path) {
        config.recent_projects.remove(pos);
    }
    config.recent_projects.insert(0, workspace_path.clone());

    // Ensure project history is up to date
    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_err(|e| e.to_string())?
        .as_secs();

    let mut updated = false;
    for project in &mut config.project_history {
        if project.path == workspace_path {
            project.last_opened = timestamp;
            updated = true;
            break;
        }
    }

    if !updated {
        config.project_history.push(ProjectMetadata {
            path: workspace_path.clone(),
            name: project_name.clone(),
            last_opened: timestamp,
            project_type: Some("zephyr".to_string()),
            zephyr_version: None,
        });
    }

    // Keep only last 10 projects and sort by last opened (newest first)
    config.project_history.sort_by(|a, b| b.last_opened.cmp(&a.last_opened));
    if config.project_history.len() > 10 {
        config.project_history.truncate(10);
    }

    save_config(app.clone(), config).map_err(|e| format!("保存配置失败: {}", e))?;

    // Now execute the project creation commands with streaming output
    run_create_project_commands(app, workspace_path, shallow_clone).await
}

use std::process::Stdio;
use std::thread;

fn emit_log(app: &AppHandle, msg: &str) {
    let _ = app.emit("term-data", format!("{}\r\n", msg));
}

async fn run_create_project_commands(
    app: AppHandle,
    workspace_path: String,
    shallow_clone: bool,
) -> Result<(), String> {
    let config = get_config(app.clone()).map_err(|e| format!("获取配置失败: {}", e))?;

    // Check if venv path is configured
    let venv_path = config.venv_path.ok_or("未配置虚拟环境路径".to_string())?;

    // Determine workspace directory and project name
    let workspace_dir = Path::new(&workspace_path);
    let workspace_parent = workspace_dir.parent().ok_or("无效的工作区路径".to_string())?;
    let workspace_name = workspace_dir.file_name()
        .ok_or("无效的工作区路径")?
        .to_str()
        .ok_or("工作区名称包含无效字符")?;

    // Source the virtual environment and run west init
    // On different platforms, the activation command is different
    #[cfg(target_os = "windows")]
    let activate_cmd = format!("{} && ",
        Path::new(&venv_path).join("Scripts").join("activate.bat").to_string_lossy()
    );

    #[cfg(not(target_os = "windows"))]
    let activate_cmd = format!("source {} && ",
        Path::new(&venv_path).join("bin").join("activate").to_string_lossy()
    );

    // Build west init command
    let mut init_cmd = format!(
        "{}west init -m https://github.com/RoboMaster-DLMU-CONE/one-starter --mr main",
        activate_cmd
    );

    if shallow_clone {
        init_cmd.push_str(" --clone-opt=--depth=15");
    }

    init_cmd.push_str(&format!(" {}", workspace_name));

    // Execute west init in the parent directory of the workspace
    emit_log(&app, &format!("正在初始化项目: {}", init_cmd));

    #[cfg(target_os = "windows")]
    let mut init_command = Command::new("cmd");
    #[cfg(target_os = "windows")]
    init_command.args(&["/C", &init_cmd]);

    #[cfg(not(target_os = "windows"))]
    let mut init_command = Command::new("sh");
    #[cfg(not(target_os = "windows"))]
    init_command.arg("-c").arg(&init_cmd);

    init_command.current_dir(workspace_parent);
    init_command.stdout(Stdio::piped());
    init_command.stderr(Stdio::piped());
    init_command.env("TERM", "xterm");

    let mut init_child = init_command.spawn().map_err(|e| format!("启动west init失败: {}", e))?;

    let init_stdout = init_child.stdout.take().ok_or("Failed to open stdout")?;
    let init_stderr = init_child.stderr.take().ok_or("Failed to open stderr")?;

    let app_handle = app.clone();
    thread::spawn(move || {
        let mut reader = BufReader::new(init_stdout);
        let mut buffer = String::new();
        loop {
            match reader.read_line(&mut buffer) {
                Ok(0) => break, // EOF
                Ok(_) => {
                    if buffer.ends_with('\n') || buffer.ends_with('\r') {
                        let _ = app_handle.emit("term-data", buffer.clone());
                        buffer.clear();
                    }
                }
                Err(_) => break,
            }
        }
        // 发送剩余内容（如果没有换行符结尾）
        if !buffer.is_empty() {
            let _ = app_handle.emit("term-data", buffer.clone());
        }
    });

    let app_handle = app.clone();
    thread::spawn(move || {
        let mut reader = BufReader::new(init_stderr);
        let mut buffer = String::new();
        loop {
            match reader.read_line(&mut buffer) {
                Ok(0) => break, // EOF
                Ok(_) => {
                    if buffer.ends_with('\n') || buffer.ends_with('\r') {
                        let _ = app_handle.emit("term-data", buffer.clone());
                        buffer.clear();
                    }
                }
                Err(_) => break,
            }
        }
        // 发送剩余内容（如果没有换行符结尾）
        if !buffer.is_empty() {
            let _ = app_handle.emit("term-data", buffer.clone());
        }
    });

    let init_status = init_child.wait().map_err(|e| format!("等待west init完成失败: {}", e))?;

    if !init_status.success() {
        return Err("west init 失败".to_string());
    }

    // Change to the workspace directory and run west update
    let workspace_full_path = workspace_parent.join(workspace_name);

    let mut update_cmd = format!("{}west update", activate_cmd);
    if shallow_clone {
        update_cmd.push_str(" --fetch-opt=--depth=15");
    }

    emit_log(&app, &format!("正在更新项目: {}", update_cmd));

    #[cfg(target_os = "windows")]
    let mut update_command = Command::new("cmd");
    #[cfg(target_os = "windows")]
    update_command.args(&["/C", &update_cmd]);

    #[cfg(not(target_os = "windows"))]
    let mut update_command = Command::new("sh");
    #[cfg(not(target_os = "windows"))]
    update_command.arg("-c").arg(&update_cmd);

    update_command.current_dir(&workspace_full_path);
    update_command.stdout(Stdio::piped());
    update_command.stderr(Stdio::piped());
    update_command.env("TERM", "xterm");

    let mut update_child = update_command.spawn().map_err(|e| format!("启动west update失败: {}", e))?;

    let update_stdout = update_child.stdout.take().ok_or("Failed to open stdout")?;
    let update_stderr = update_child.stderr.take().ok_or("Failed to open stderr")?;

    let app_handle = app.clone();
    thread::spawn(move || {
        let mut reader = BufReader::new(update_stdout);
        let mut buffer = String::new();
        loop {
            match reader.read_line(&mut buffer) {
                Ok(0) => break, // EOF
                Ok(_) => {
                    if buffer.ends_with('\n') || buffer.ends_with('\r') {
                        let _ = app_handle.emit("term-data", buffer.clone());
                        buffer.clear();
                    }
                }
                Err(_) => break,
            }
        }
        // 发送剩余内容（如果没有换行符结尾）
        if !buffer.is_empty() {
            let _ = app_handle.emit("term-data", buffer.clone());
        }
    });

    let app_handle = app.clone();
    thread::spawn(move || {
        let mut reader = BufReader::new(update_stderr);
        let mut buffer = String::new();
        loop {
            match reader.read_line(&mut buffer) {
                Ok(0) => break, // EOF
                Ok(_) => {
                    if buffer.ends_with('\n') || buffer.ends_with('\r') {
                        let _ = app_handle.emit("term-data", buffer.clone());
                        buffer.clear();
                    }
                }
                Err(_) => break,
            }
        }
        // 发送剩余内容（如果没有换行符结尾）
        if !buffer.is_empty() {
            let _ = app_handle.emit("term-data", buffer.clone());
        }
    });

    let update_status = update_child.wait().map_err(|e| format!("等待west update完成失败: {}", e))?;

    if !update_status.success() {
        return Err("west update 失败".to_string());
    }

    emit_log(&app, "项目创建完成！");
    Ok(())
}

#[tauri::command]
pub fn check_cmake_exists(workspace_path: String) -> Result<bool, String> {
    let cmake_path = std::path::Path::new(&workspace_path).join("app").join("app").join("CMakeLists.txt");
    Ok(cmake_path.exists())
}

#[tauri::command]
pub fn detect_project_name(workspace_path: String) -> Result<String, String> {
    // Look for CMakeLists.txt in app/app/ directory
    let cmake_path = std::path::Path::new(&workspace_path)
        .join("app")
        .join("app")
        .join("CMakeLists.txt");

    if !cmake_path.exists() {
        return Err("CMakeLists.txt not found in app/app/ directory".to_string());
    }

    // Read the file line by line
    let file = File::open(&cmake_path)
        .map_err(|e| format!("Failed to open CMakeLists.txt: {}", e))?;
    let reader = StdBufReader::new(file);

    for line in reader.lines() {
        let line = line.map_err(|e| format!("Error reading line: {}", e))?;

        // Look for project() directive in CMakeLists.txt
        if line.trim().to_lowercase().starts_with("project(") {
            // Extract the project name within parentheses
            let start = line.find('(');
            let end = line.rfind(')');

            if let (Some(start_idx), Some(end_idx)) = (start, end) {
                let content = &line[start_idx + 1..end_idx];
                // Remove the parentheses and get the project name
                let project_name = content.trim();

                // If there are additional parameters after the name, take just the first part
                let name_part = project_name.split_whitespace().next().unwrap_or(project_name);

                return Ok(name_part.to_string());
            }
        }
    }

    Err("No project() directive found in CMakeLists.txt".to_string())
}

#[tauri::command]
pub async fn open_project(
    app: AppHandle,
    workspace_path: String,
    projectName: String,
) -> Result<(), String> {
    // First, save the project information to config
    let mut config = get_config(app.clone()).map_err(|e| format!("获取配置失败: {}", e))?;

    // Add project to recent projects and history
    if let Some(pos) = config.recent_projects.iter().position(|x| x == &workspace_path) {
        config.recent_projects.remove(pos);
    }
    config.recent_projects.insert(0, workspace_path.clone());

    // Ensure project history is up to date
    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_err(|e| e.to_string())?
        .as_secs();

    let mut updated = false;
    for project in &mut config.project_history {
        if project.path == workspace_path {
            project.name = projectName.clone();
            project.last_opened = timestamp;
            updated = true;
            break;
        }
    }

    if !updated {
        config.project_history.push(ProjectMetadata {
            path: workspace_path.clone(),
            name: projectName.clone(),
            last_opened: timestamp,
            project_type: Some("zephyr".to_string()),
            zephyr_version: None,
        });
    }

    // Keep only last 10 projects and sort by last opened (newest first)
    config.project_history.sort_by(|a, b| b.last_opened.cmp(&a.last_opened));
    if config.project_history.len() > 10 {
        config.project_history.truncate(10);
    }

    save_config(app.clone(), config).map_err(|e| format!("保存配置失败: {}", e))?;

    // Set the current project path (this would typically be handled by the frontend)
    // For now, we just confirm the project is added to the history

    Ok(())
}

#[tauri::command]
pub fn delete_project_directory(path: String) -> Result<(), String> {
    use std::fs;
    use std::path::Path;

    let project_path = Path::new(&path);

    if !project_path.exists() {
        return Err("Project path does not exist".to_string());
    }

    // Verify that the path is a directory to prevent accidental deletion of files
    if !project_path.is_dir() {
        return Err("Path is not a directory".to_string());
    }

    // Recursively remove the entire directory and its contents
    fs::remove_dir_all(project_path)
        .map_err(|e| format!("Failed to delete project directory: {}", e))
}

fn get_config_path(app: &AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_config_dir()
        .map(|p| p.join("config.json"))
        .map_err(|e| e.to_string())
}
