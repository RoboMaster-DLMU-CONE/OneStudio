use crate::config_manager;
use serde::{Deserialize, Serialize};
use std::process::Command;
use tauri::AppHandle;

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
pub async fn check_environment(app: AppHandle) -> EnvStatus {
    let config = config_manager::get_config(app).unwrap_or_default();

    // Use configured venv python if available, otherwise system python
    let python_cmd = if let Some(venv) = config.venv_path {
        #[cfg(target_os = "windows")]
        let p = std::path::Path::new(&venv)
            .join("Scripts")
            .join("python.exe");
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
pub async fn check_dependencies() -> EnvReport {
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
pub async fn install_dependencies(app: AppHandle) -> Result<(), String> {
    let report = check_dependencies().await;
    let missing_deps: Vec<&Dependency> = report
        .dependencies
        .iter()
        .filter(|d| !d.installed)
        .collect();

    if missing_deps.is_empty() {
        return Ok(());
    }

    #[cfg(target_os = "linux")]
    {
        install_linux_dependencies(app, &missing_deps).await
    }
    #[cfg(target_os = "windows")]
    {
        install_windows_dependencies(app, &missing_deps).await
    }
    #[cfg(not(any(target_os = "windows", target_os = "linux")))]
    {
        Err("Unsupported operating system".to_string())
    }
}

#[cfg(target_os = "linux")]
async fn install_linux_dependencies(
    _app: AppHandle,
    missing: &[&Dependency],
) -> Result<(), String> {
    // Detect distro
    let release = std::fs::read_to_string("/etc/os-release").unwrap_or_default();
    let is_fedora = release.to_lowercase().contains("fedora");

    let mut packages = Vec::new();

    for dep in missing {
        let pkgs: Option<Vec<&str>> = if is_fedora {
            match dep.name.as_str() {
                "Git" => Some(vec!["git"]),
                "CMake" => Some(vec!["cmake"]),
                "Ninja" => Some(vec!["ninja-build"]),
                "Gperf" => Some(vec!["gperf"]),
                "CCache" => Some(vec!["ccache"]),
                "Dfu-util" => Some(vec!["dfu-util"]),
                "DTC" => Some(vec!["dtc"]),
                "Wget" => Some(vec!["wget"]),
                "Python 3" => Some(vec!["python3"]),
                "XZ Utils" => Some(vec!["xz"]),
                "File" => Some(vec!["file"]),
                "Make" => Some(vec!["make"]),
                "GCC" => Some(vec!["gcc"]),
                "G++" => Some(vec!["gcc-c++"]),
                "python3-dev" => Some(vec!["python3-devel"]),
                "python3-venv" => Some(vec!["python3"]), // Usually in python3 core or python3-libs
                "python3-tk" => Some(vec!["python3-tkinter"]),
                "libsdl2-dev" => Some(vec!["sdl2-compat-devel"]),
                "libmagic1" => Some(vec!["file-libs"]),
                "gcc-multilib" => Some(vec!["glibc-devel.i686"]),
                "g++-multilib" => Some(vec!["libstdc++-devel.i686"]),
                _ => None,
            }
        } else {
            // Ubuntu/Debian
            match dep.name.as_str() {
                "Git" => Some(vec!["git"]),
                "CMake" => Some(vec!["cmake"]),
                "Ninja" => Some(vec!["ninja-build"]),
                "Gperf" => Some(vec!["gperf"]),
                "CCache" => Some(vec!["ccache"]),
                "Dfu-util" => Some(vec!["dfu-util"]),
                "DTC" => Some(vec!["device-tree-compiler"]),
                "Wget" => Some(vec!["wget"]),
                "Python 3" => Some(vec!["python3"]),
                "XZ Utils" => Some(vec!["xz-utils"]),
                "File" => Some(vec!["file"]),
                "Make" => Some(vec!["make"]),
                "GCC" => Some(vec!["gcc"]),
                "G++" => Some(vec!["g++"]),
                "python3-dev" => Some(vec!["python3-dev"]),
                "python3-venv" => Some(vec!["python3-venv"]),
                "python3-tk" => Some(vec!["python3-tk"]),
                "libsdl2-dev" => Some(vec!["libsdl2-dev"]),
                "libmagic1" => Some(vec!["libmagic1"]),
                "gcc-multilib" => Some(vec!["gcc-multilib"]),
                "g++-multilib" => Some(vec!["g++-multilib"]),
                _ => None,
            }
        };

        if let Some(p) = pkgs {
            packages.extend(p.iter().map(|s| s.to_string()));
        }
    }

    if packages.is_empty() {
        return Ok(());
    }

    let cmd = if is_fedora { "dnf" } else { "apt" };
    let mut args = if is_fedora {
        vec!["install", "-y"]
    } else {
        vec!["install", "-y", "--no-install-recommends"]
    };

    let pkg_refs: Vec<&str> = packages.iter().map(|s| s.as_str()).collect();
    args.extend(pkg_refs);

    // Construct the full command string for display
    let full_cmd = format!("sudo {} {}", cmd, args.join(" "));

    // Try to launch a terminal to run the command with sudo
    let terminals = ["gnome-terminal", "konsole", "xfce4-terminal", "xterm"];

    for term in terminals {
        if which::which(term).is_ok() {
            let mut command = Command::new(term);

            match term {
                "gnome-terminal" | "xfce4-terminal" => {
                    command.args(&[
                        "--",
                        "bash",
                        "-c",
                        &format!("{}; echo 'Press Enter to close...'; read", full_cmd),
                    ]);
                }
                "konsole" => {
                    command.args(&[
                        "-e",
                        "bash",
                        "-c",
                        &format!("{}; echo 'Press Enter to close...'; read", full_cmd),
                    ]);
                }
                "xterm" => {
                    command.args(&[
                        "-e",
                        "bash",
                        "-c",
                        &format!("{}; echo 'Press Enter to close...'; read", full_cmd),
                    ]);
                }
                _ => continue,
            }

            return command
                .spawn()
                .map(|_| ())
                .map_err(|e| format!("Failed to launch terminal: {}", e));
        }
    }

    Err("No supported terminal emulator found. Please install dependencies manually.".to_string())
}

#[cfg(target_os = "windows")]
async fn install_windows_dependencies(
    _app: AppHandle,
    missing: &[&Dependency],
) -> Result<(), String> {
    let mut packages = Vec::new();

    for dep in missing {
        let pkg = match dep.name.as_str() {
            "CMake" => Some("Kitware.CMake"),
            "Ninja" => Some("Ninja-build.Ninja"),
            "Gperf" => Some("oss-winget.gperf"),
            "Python 3.12" => Some("Python.Python.3.12"),
            "Git" => Some("Git.Git"),
            "DTC" => Some("oss-winget.dtc"),
            "Wget" => Some("wget"),
            "7-Zip" => Some("7zip.7zip"),
            _ => None,
        };

        if let Some(p) = pkg {
            packages.push(p);
        }
    }

    if packages.is_empty() {
        return Ok(());
    }

    let install_cmds: Vec<String> = packages
        .iter()
        .map(|p| format!("winget install {}", p))
        .collect();

    let install_script = install_cmds.join("; ");

    let ps_command = format!(
        "winget source remove winget; winget source add winget https://mirrors.ustc.edu.cn/winget-source --trust-level trusted; {}; Read-Host 'Press Enter to exit'",
        install_script
    );

    Command::new("powershell")
        .args(&[
            "Start-Process",
            "powershell",
            "-Verb",
            "RunAs",
            "-ArgumentList",
            &format!("\"-NoExit -Command {}\"", ps_command),
        ])
        .spawn()
        .map(|_| ())
        .map_err(|e| format!("Failed to launch PowerShell: {}", e))
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
fn check_shell_dependency(name: &str, cmd: &str) -> Dependency {
    let installed = Command::new("sh")
        .arg("-c")
        .arg(cmd)
        .output()
        .map(|output| output.status.success())
        .unwrap_or(false);

    Dependency {
        name: name.to_string(),
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

    // Libraries / Packages
    // python3-dev: Try dpkg (Debian/Ubuntu) or rpm (Fedora/RHEL)
    deps.push(check_shell_dependency(
        "python3-dev",
        "dpkg -l | grep python3-dev || rpm -qa | grep python3-devel",
    ));

    // python3-venv: Check by running module help
    let venv_installed = check_command("python3", &["-m", "venv", "--help"]);
    deps.push(Dependency {
        name: "python3-venv".to_string(),
        installed: venv_installed,
        version: None,
        critical: true,
    });

    // python3-tk: Try dpkg or rpm
    deps.push(check_shell_dependency(
        "python3-tk",
        "dpkg -l | grep python3-tk || rpm -qa | grep python3-tkinter",
    ));

    // Other libraries
    deps.push(check_shell_dependency(
        "libsdl2-dev",
        "dpkg -l | grep libsdl2-dev || rpm -qa | grep sdl2-compat-devel",
    ));
    deps.push(check_shell_dependency(
        "libmagic1",
        "dpkg -l | grep libmagic1 || rpm -qa | grep file-libs",
    ));
    deps.push(check_shell_dependency(
        "gcc-multilib",
        "dpkg -l | grep gcc-multilib || rpm -qa | grep \"glibc-devel.*i686\"",
    ));
    deps.push(check_shell_dependency(
        "g++-multilib",
        "dpkg -l | grep g++-multilib || rpm -qa | grep \"libstdc++-devel.*i686\"",
    ));

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
