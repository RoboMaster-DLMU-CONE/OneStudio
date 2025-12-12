# OneStudio Implementation Plan

This document outlines the development roadmap for OneStudio, a GUI Helper for the RoboMaster embedded framework.

## Phase 1: The Enabler (Environment & Initialization) - MVP
**Goal:** Solve environment setup issues and provide basic project management.

### 1.1 Frontend Architecture Setup
- [ ] Set up directory structure (`pages/`, `components/layout/`, `store/`).
- [ ] Configure React Router.
- [ ] Create global Zustand store (`useProjectStore`).
- [ ] Implement basic Layouts:
    - `LauncherLayout` (Centered)
    - `WorkspaceLayout` (Sidebar + Topbar + Content + Statusbar)

### 1.2 Launcher Page (UI)
- [ ] Create `Launcher` page component.
- [ ] Implement "Environment Check" indicators (Git, Python, West, SDK).
- [ ] Implement "Recent Projects" list.
- [ ] Add "Create New Project" and "Open Project" buttons.

### 1.3 Backend: Environment Management (Rust)
- [ ] Implement `env_manager.rs`.
- [ ] Create Tauri commands:
    - `check_environment`: Check for Git, Python, West, SDK.
    - `fix_environment`: Stub for now (or basic implementation).
- [ ] Connect UI indicators to backend status.

### 1.4 Backend: West Integration (Rust)
- [ ] Implement `cmd_west.rs`.
- [ ] Create `run_west_command` wrapper.
- [ ] Implement `west init` functionality.

### 1.5 Workspace: Build & Terminal
- [ ] Create `Dashboard` page.
- [ ] Integrate `xterm.js` for terminal output.
- [ ] Implement "Build" button triggering `west build` via Tauri command.
- [ ] Stream command output to frontend terminal.

---

## Phase 2: The Manager (Dependencies & IDE)
**Goal:** Manage modules and integrate with IDEs.

### 2.1 Dependency Manager (UI)
- [ ] Create `Dependency` page.
- [ ] Implement DataTable for modules.
- [ ] Add "Add Module" and "Update" functionality.

### 2.2 Backend: File System & Config
- [ ] Implement `fs_utils.rs` (or similar) for reading/writing `west.yml`.
- [ ] Implement `west.yml` parsing (using `serde_yaml`).
- [ ] Generate `CMakePresets.json` and `.vscode/` config.

### 2.3 IDE Integration
- [ ] Add "Open in VS Code" / "Open in CLion" buttons.
- [ ] Implement Tauri command to launch external editors.

---

## Phase 3: The Generator (Code Generation)
**Goal:** Low-code tools for C++ development.

### 3.1 Configurator UI
- [ ] Create `Configurator` page with Tabs (Node, Topic, Hardware).
- [ ] Implement "Node Generator" form and preview.
- [ ] Implement "Topic Generator" form.

### 3.2 Backend: Code Generation
- [ ] Implement template engine (Handlebars or similar in Rust).
- [ ] Create commands to generate `.hpp` / `.cpp` files from templates.
- [ ] Implement file writing logic for generated code.

---

## Phase 4: The Monitor (Runtime)
**Goal:** Real-time debugging and monitoring.

### 4.1 Serial Communication (Rust)
- [ ] Add `serialport` dependency.
- [ ] Implement `serial_comm.rs` for async serial reading.
- [ ] Create event system to emit serial data to frontend.

### 4.2 Monitor UI
- [ ] Create `Monitor` page with Grid layout.
- [ ] Implement "Connection Control" (Port, Baudrate).
- [ ] Implement "Node Stats" (CPU Load) visualization using Recharts.
- [ ] Implement "Topic Inspector" (Data visualization).
- [ ] Implement "Command Center" (Send JSON/Binary commands).

---

## Technical Stack Summary
- **Frontend:** React, Vite, Tailwind CSS, shadcn/ui, Zustand, React Router, Recharts, xterm.js.
- **Backend:** Tauri (Rust), serialport, serde_yaml.
