use serde::{Deserialize, Serialize};
use std::process::Command;
use tauri::AppHandle;
use crate::config_manager;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct EnvStatus {
    pub git: bool,
    pub python: bool,
    pub west: bool,
    pub sdk: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Dependency {
    pub name: String,
    pub installed: bool,
    pub version: Option<String>,
    pub critical: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct EnvReport {
    pub os: String,
    pub dependencies: Vec<Dependency>,
    pub all_satisfied: bool,
}

#[tauri::command]
pub fn check_environment(app: AppHandle) -> EnvStatus {
    let config = config_manager::get_config(app).unwrap_or_default();
    
    // Use configured venv python if available, otherwise system python
    let python_cmd = if let Some(venv) = config.venv_path {
        #[cfg(target_os = "windows")]
        let p = std::path::Path::new(&venv).join("Scripts").join("python.exe");
        #[cfg(not(target_os = "windows"))]
        let p = std::path::Path::new(&venv).join("bin").join("python");
        
        if p.exists() {
            p.to_string_lossy().to_string()
        } else {
            "python".to_string()
        }
    } else {
        "python".to_string()
    };

    let git = check_command("git", &["--version"]);
    let python = check_command(&python_cmd, &["--version"]);
    
    // Check west using the resolved python
    let west = check_command(&python_cmd, &["-m", "west", "--version"]);
    
    // Check SDK using configured path or env var
    let sdk = if let Some(base) = config.zephyr_base {
        std::path::Path::new(&base).exists()
    } else {
        std::env::var("ZEPHYR_BASE").is_ok()
    };

    EnvStatus {
        git,
        python,
        west,
        sdk,
    }
}

#[tauri::command]
pub fn check_dependencies() -> EnvReport {
    #[cfg(target_os = "windows")]
    {
        check_windows_dependencies()
    }
    #[cfg(target_os = "linux")]
    {
        check_linux_dependencies()
    }
    #[cfg(not(any(target_os = "windows", target_os = "linux")))]
    {
        EnvReport {
            os: "unsupported".to_string(),
            dependencies: vec![],
            all_satisfied: false,
        }
    }
}

#[tauri::command]
pub async fn fix_environment() -> Result<String, String> {
    // Stub implementation
    // In a real scenario, this would download and install dependencies.
    // Simulating a delay
    std::thread::sleep(std::time::Duration::from_secs(2));
    
    Ok("Environment fixed (Simulation)".to_string())
}

fn check_command(cmd: &str, args: &[&str]) -> bool {
    Command::new(cmd)
        .args(args)
        .output()
        .map(|output| output.status.success())
        .unwrap_or(false)
}

fn check_command_version(cmd: &str, args: &[&str]) -> Option<String> {
    Command::new(cmd)
        .args(args)
        .output()
        .ok()
        .and_then(|output| {
            if output.status.success() {
                Some(String::from_utf8_lossy(&output.stdout).trim().to_string())
            } else {
                None
            }
        })
}

fn check_binary(name: &str, cmd: &str, version_arg: &str) -> Dependency {
    let version = check_command_version(cmd, &[version_arg]);
    Dependency {
        name: name.to_string(),
        installed: version.is_some(),
        version,
        critical: true,
    }
}

#[cfg(target_os = "linux")]
fn check_dpkg(package: &str) -> Dependency {
    let installed = Command::new("dpkg-query")
        .args(&["-W", "-f='${Status}'", package])
        .output()
        .ok()
        .map(|output| String::from_utf8_lossy(&output.stdout).contains("install ok installed"))
        .unwrap_or(false);

    Dependency {
        name: package.to_string(),
        installed,
        version: None,
        critical: true,
    }
}

#[cfg(target_os = "linux")]
fn check_linux_dependencies() -> EnvReport {
    let mut deps = Vec::new();
    
    // Executables
    deps.push(check_binary("Git", "git", "--version"));
    deps.push(check_binary("CMake", "cmake", "--version"));
    deps.push(check_binary("Ninja", "ninja", "--version"));
    deps.push(check_binary("Gperf", "gperf", "--version"));
    deps.push(check_binary("CCache", "ccache", "--version"));
    deps.push(check_binary("Dfu-util", "dfu-util", "--version"));
    deps.push(check_binary("DTC", "dtc", "--version"));
    deps.push(check_binary("Wget", "wget", "--version"));
    deps.push(check_binary("Python 3", "python3", "--version"));
    deps.push(check_binary("XZ Utils", "xz", "--version"));
    deps.push(check_binary("File", "file", "--version"));
    deps.push(check_binary("Make", "make", "--version"));
    deps.push(check_binary("GCC", "gcc", "--version"));
    deps.push(check_binary("G++", "g++", "--version"));

    // Libraries (Debian/Ubuntu specific)
    deps.push(check_dpkg("python3-dev"));
    deps.push(check_dpkg("python3-venv"));
    deps.push(check_dpkg("python3-tk"));
    deps.push(check_dpkg("libsdl2-dev"));
    deps.push(check_dpkg("libmagic1"));
    deps.push(check_dpkg("gcc-multilib"));
    deps.push(check_dpkg("g++-multilib"));

    let all_satisfied = deps.iter().all(|d| d.installed);

    EnvReport {
        os: "linux".to_string(),
        dependencies: deps,
        all_satisfied,
    }
}

#[cfg(target_os = "windows")]
fn check_windows_dependencies() -> EnvReport {
    let mut deps = Vec::new();
    
    // Executables
    deps.push(check_binary("CMake", "cmake", "--version"));
    deps.push(check_binary("Ninja", "ninja", "--version"));
    deps.push(check_binary("Gperf", "gperf", "--version"));
    deps.push(check_binary("Python 3.12", "python", "--version"));
    deps.push(check_binary("Git", "git", "--version"));
    deps.push(check_binary("DTC", "dtc", "--version"));
    deps.push(check_binary("Wget", "wget", "--version"));
    deps.push(check_binary("7-Zip", "7z", "--help")); // 7z usually prints help

    let all_satisfied = deps.iter().all(|d| d.installed);

    EnvReport {
        os: "windows".to_string(),
        dependencies: deps,
        all_satisfied,
    }
}
