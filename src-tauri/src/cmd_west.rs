use std::io::{BufRead, BufReader};
use std::path::Path;
use std::process::{Command, Stdio};
use std::thread;
use tauri::{AppHandle, Emitter};

#[tauri::command]
pub async fn run_west_command(args: Vec<String>, cwd: Option<String>) -> Result<String, String> {
    let mut command = Command::new("west");
    command.args(&args);

    if let Some(path) = cwd {
        command.current_dir(Path::new(&path));
    }

    // TODO: In the future, we might want to stream output instead of waiting for it.
    // For now, we capture output.
    let output = command.output().map_err(|e| e.to_string())?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        let stdout = String::from_utf8_lossy(&output.stdout).to_string();
        Err(format!(
            "Command failed:\nStdout: {}\nStderr: {}",
            stdout, stderr
        ))
    }
}

#[tauri::command]
pub async fn run_west_stream(
    app: AppHandle,
    args: Vec<String>,
    cwd: Option<String>,
) -> Result<(), String> {
    let mut command = Command::new("west");
    command.args(&args);

    if let Some(path) = cwd {
        command.current_dir(Path::new(&path));
    }

    command.stdout(Stdio::piped());
    command.stderr(Stdio::piped());

    let mut child = command.spawn().map_err(|e| e.to_string())?;

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
        Err("Command failed".to_string())
    }
}

#[tauri::command]
pub async fn west_init(url: String, path: String) -> Result<String, String> {
    // west init -m <url> <path>
    let args = vec!["init".to_string(), "-m".to_string(), url, path];

    run_west_command(args, None).await
}
