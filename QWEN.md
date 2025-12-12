# OneStudio Project Documentation

## Project Overview

OneStudio is a GUI Helper for the RoboMaster embedded framework, built as a cross-platform desktop application using the Tauri ecosystem. The application combines React/TypeScript frontend with Rust backend to provide an integrated development environment for embedded systems.

**Primary Technologies:**
- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, shadcn/ui
- **Backend:** Rust with Tauri 2.x, Tauri CLI
- **UI Components:** Radix UI primitives, Lucide React icons
- **State Management:** Zustand
- **Routing:** React Router DOM
- **Terminal Integration:** xterm.js

The project aims to simplify environment setup for embedded development, manage dependencies, integrate with IDEs, provide low-code tools for C++ development, and offer real-time debugging capabilities.

## Project Architecture

The application follows a typical Tauri structure with:

- `src/` - React/TypeScript frontend source code
- `src-tauri/` - Rust backend source code
- `public/` - Static assets
- Configuration files for Vite, TypeScript, and Tauri

The project implements a multi-page application with routing to separate views for launching projects, managing dashboards, and handling dependencies.

## Building and Running

### Prerequisites
- Bun (recommended) or Node.js
- Rust (for Tauri backend)

### Development Commands
- `bun run dev` - Start the development server (Vite)
- `bun run build` - Build the production application
- `bun run tauri` - Access Tauri CLI commands
- `bun run preview` - Preview the built application

### Tauri-Specific Commands
- `bun run tauri dev` - Run the Tauri application in development mode
- `bun run tauri build` - Build the Tauri application for distribution

### Development Setup
1. Install dependencies: `bun install` (or `npm install`)
2. Run in development mode: `bun run tauri dev`

## Development Conventions

### File Structure
- Components are organized in `src/components/` using a layout/structure pattern
- Pages are stored in `src/pages/` for routing
- Utility functions are in `src/lib/`
- UI components follow shadcn/ui patterns
- Absolute imports are configured with `@` alias pointing to `src/`

### Coding Style
- TypeScript is used throughout the frontend
- Tailwind CSS for styling with CSS variables support
- Component naming follows PascalCase for React components
- State management uses Zustand stores
- Asynchronous operations use async/await pattern

### UI Framework
- shadcn/ui components with Radix UI primitives for accessibility
- Tailwind CSS for utility-first styling
- Lucide React icons for consistent iconography
- Dark/light mode support using CSS variables

## Planned Features (Roadmap)

According to the PLAN.md file, the project is planned in several phases:

### Phase 1: The Enabler (Environment & Initialization) - MVP
- Environment setup and project management
- Basic launcher with environment check indicators
- West integration for Zephyr RTOS project management
- Terminal integration for build and command execution

### Phase 2: The Manager (Dependencies & IDE)
- Dependency management interface
- IDE integration for VS Code and CLion
- Configuration file generation

### Phase 3: The Generator (Code Generation)
- Low-code tools for C++ development
- Template-based code generation
- Node and topic configuration interfaces

### Phase 4: The Monitor (Runtime)
- Serial communication for real-time monitoring
- Debugging and visualization tools
- Command center for runtime interaction

## Key Dependencies

### Frontend Dependencies
- React 19 + React DOM for UI rendering
- React Router DOM for client-side routing
- Zustand for state management
- Tailwind CSS for styling
- Radix UI for accessible components
- Lucide React for icons
- xterm.js for terminal emulation

### Backend Dependencies
- Tauri API for system integration
- Tauri plugins for dialog, opener, and shell access
- Rust ecosystem for backend processing

### Development Dependencies
- Tauri CLI for application building and packaging
- TypeScript for type checking
- Vite for bundling and development
- Tailwind CSS plugin for Vite

## Special Notes

The project includes documentation about Zephyr RTOS installation procedures for both Ubuntu and Windows, indicating its focus on embedded development workflows. The application appears to be designed specifically to assist developers working with the RoboMaster embedded framework, which likely uses Zephyr RTOS.

The Tauri configuration allows for native system access through Rust, enabling features like file system operations, process management, and hardware communication that are typically challenging in web applications.