use std::io::{BufRead, BufReader};
use std::path::Path;
use std::process::{Command, Stdio};
use std::thread;
use tauri::{AppHandle, Emitter};

fn setup_pip_source(app: &AppHandle, install_path: &str, venv_python: &str) -> Result<(), String> {
    // First, upgrade pip with the USTC mirror
    emit_log(app, "Upgrading pip with USTC source...");
    run_command_stream(
        app,
        venv_python,
        &[
            "-m",
            "pip",
            "install",
            "-i",
            "https://mirrors.ustc.edu.cn/pypi/simple",
            "pip",
            "-U",
        ],
        Some(install_path),
    )?;

    // Configure pip to use USTC mirror permanently in this venv
    emit_log(app, "Setting pip config to USTC source...");
    run_command_stream(
        app,
        venv_python,
        &[
            "-m",
            "pip",
            "config",
            "set",
            "global.index-url",
            "https://mirrors.ustc.edu.cn/pypi/simple",
        ],
        Some(install_path),
    )?;

    Ok(())
}

#[tauri::command]
pub async fn install_zephyr(
    app: AppHandle,
    install_path: String,
    sdk_path: Option<String>,
    shadow_clone: bool,
) -> Result<(), String> {
    let path = Path::new(&install_path);
    if !path.exists() {
        std::fs::create_dir_all(path).map_err(|e| e.to_string())?;
    }

    // 1. Create venv
    emit_log(&app, "Creating virtual environment...");
    #[cfg(target_os = "windows")]
    let python_cmd = "python";
    #[cfg(not(target_os = "windows"))]
    let python_cmd = "python3";

    run_command_stream(
        &app,
        python_cmd,
        &["-m", "venv", ".venv"],
        Some(&install_path),
    )?;

    // Resolve venv python path
    #[cfg(target_os = "windows")]
    let venv_python = path.join(".venv").join("Scripts").join("python.exe");
    #[cfg(not(target_os = "windows"))]
    let venv_python = path.join(".venv").join("bin").join("python");

    let venv_python_str = venv_python.to_string_lossy().to_string();

    // 2. Configure pip source before installing packages
    emit_log(&app, "Configuring pip source to USTC mirror...");
    setup_pip_source(&app, &install_path, &venv_python_str)?;

    // 3. Install west
    emit_log(&app, "Installing west...");
    run_command_stream(
        &app,
        &venv_python_str,
        &["-m", "pip", "install", "west"],
        Some(&install_path),
    )?;

    // 3. West init
    emit_log(&app, "Initializing west workspace...");
    // Note: west init expects the directory to be empty or not exist if we don't pass a path.
    // But we are already inside the directory.
    // If the directory is empty (except .venv), we can run `west init .`
    // However, `west init` might complain if .venv exists.
    // Standard flow is `west init zephyrproject`.
    // Since we created .venv inside `install_path`, `west init .` might fail if it checks for emptiness.
    // Let's try `west init .` and see. If it fails, we might need to create venv outside or ignore.
    // Actually, standard guide says:
    // python3 -m venv ~/zephyrproject/.venv
    // source ~/zephyrproject/.venv/bin/activate
    // west init ~/zephyrproject
    // This implies west init can handle existing directory if it's the target?
    // "west init [directory]"
    // If directory exists, it must be empty.
    // But we just put .venv in it.
    // Workaround: `west init . --force`? No force option.
    // Maybe we should run west init FIRST, then create venv?
    // But we need west installed in venv to run west init?
    // No, we can install west in global python, or use a temp venv?
    // Wait, the guide says:
    // 1. Create venv in ~/zephyrproject/.venv
    // 2. Activate
    // 3. pip install west (inside venv)
    // 4. west init ~/zephyrproject
    // This works because west init detects it's already in the target dir?
    // Or maybe west init allows .venv?
    // Let's try running `west init .` using the venv's west.
    // The venv's west executable is in .venv/bin/west or .venv/Scripts/west.exe

    #[cfg(target_os = "windows")]
    let venv_west = path.join(".venv").join("Scripts").join("west.exe");
    #[cfg(not(target_os = "windows"))]
    let venv_west = path.join(".venv").join("bin").join("west");
    let venv_west_str = venv_west.to_string_lossy().to_string();

    // 4. West init
    let mut init_args = vec!["init", "."];
    if shadow_clone {
        init_args.push("--clone-opt=--filter=blob:none");
    }
    run_command_stream(&app, &venv_west_str, &init_args, Some(&install_path))?;

    // 5. West update
    emit_log(&app, "Updating west modules (this may take a while)...");
    let mut update_args = vec!["update"];
    if shadow_clone {
        update_args.push("--fetch-opt=--filter=blob:none");
    }
    run_command_stream(&app, &venv_west_str, &update_args, Some(&install_path))?;

    // 5. Zephyr export
    emit_log(&app, "Exporting Zephyr CMake package...");
    run_command_stream(
        &app,
        &venv_west_str,
        &["zephyr-export"],
        Some(&install_path),
    )?;

    // 6. Install python dependencies
    emit_log(&app, "Installing Python dependencies...");
    run_command_stream(
        &app,
        &venv_west_str,
        &["packages", "pip", "--install"],
        Some(&install_path),
    )?;

    // 7. SDK Install
    // If sdk_path is provided, we might want to use it.
    // `west sdk install` has flags:
    // -b BASE (Base directory to SDK install)
    // -d DIR (SDK install destination directory)
    emit_log(&app, "Installing Zephyr SDK...");
    let mut sdk_args = vec!["sdk", "install"];
    if let Some(ref s) = sdk_path {
        sdk_args.push("-d");
        sdk_args.push(s);
    }

    // We need to run this inside zephyrproject/zephyr usually?
    // Guide says: cd ~/zephyrproject/zephyr; west sdk install
    let zephyr_repo_path = path.join("zephyr");
    let zephyr_repo_path_str = zephyr_repo_path.to_string_lossy().to_string();

    run_command_stream(&app, &venv_west_str, &sdk_args, Some(&zephyr_repo_path_str))?;

    emit_log(&app, "Zephyr installation complete!");
    Ok(())
}

fn emit_log(app: &AppHandle, msg: &str) {
    let _ = app.emit("term-data", format!("{}\r\n", msg));
}

fn run_command_stream(
    app: &AppHandle,
    cmd: &str,
    args: &[&str],
    cwd: Option<&str>,
) -> Result<(), String> {
    let mut command = Command::new(cmd);
    command.args(args);

    if let Some(path) = cwd {
        command.current_dir(Path::new(path));
    }

    // Inject environment variables to "activate" venv for subprocesses if needed
    // Especially PATH.
    // But since we call absolute path to python/west, it should be fine for the main process.
    // However, `west update` might call git, and `west packages pip --install` calls pip.
    // We should probably prepend venv/bin to PATH.
    if let Some(path) = cwd {
        let venv_bin = if cfg!(windows) {
            Path::new(path).join(".venv").join("Scripts")
        } else {
            Path::new(path).join(".venv").join("bin")
        };

        if let Ok(path_var) = std::env::var("PATH") {
            let new_path = format!(
                "{}{}{}",
                venv_bin.to_string_lossy(),
                if cfg!(windows) { ";" } else { ":" },
                path_var
            );
            command.env("PATH", new_path);
        }
        // Also set VIRTUAL_ENV
        command.env(
            "VIRTUAL_ENV",
            Path::new(path).join(".venv").to_string_lossy().to_string(),
        );
    }

    command.stdout(Stdio::piped());
    command.stderr(Stdio::piped());

    // On Windows, we need to hide the console window if we are not using a terminal emulator
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        command.creation_flags(CREATE_NO_WINDOW);
    }

    let mut child = command
        .spawn()
        .map_err(|e| format!("Failed to spawn {}: {}", cmd, e))?;

    let stdout = child.stdout.take().ok_or("Failed to open stdout")?;
    let stderr = child.stderr.take().ok_or("Failed to open stderr")?;

    let app_handle = app.clone();
    thread::spawn(move || {
        let reader = BufReader::new(stdout);
        for line in reader.lines() {
            if let Ok(l) = line {
                let _ = app_handle.emit("term-data", format!("{}\r\n", l));
            }
        }
    });

    let app_handle = app.clone();
    thread::spawn(move || {
        let reader = BufReader::new(stderr);
        for line in reader.lines() {
            if let Ok(l) = line {
                let _ = app_handle.emit("term-data", format!("{}\r\n", l));
            }
        }
    });

    let status = child.wait().map_err(|e| e.to_string())?;

    if status.success() {
        Ok(())
    } else {
        Err(format!("Command {} failed with status {}", cmd, status))
    }
}
