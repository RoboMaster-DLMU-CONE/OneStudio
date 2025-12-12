// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

mod cmd_west;
mod cmd_zephyr;
mod config_manager;
mod env_manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            env_manager::check_environment,
            env_manager::check_dependencies,
            env_manager::install_dependencies,
            cmd_west::run_west_command,
            cmd_west::run_west_stream,
            cmd_west::west_init,
            config_manager::get_config,
            config_manager::save_config,
            config_manager::set_zephyr_path,
            config_manager::set_venv_path,
            config_manager::add_recent_project,
            cmd_zephyr::install_zephyr
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
