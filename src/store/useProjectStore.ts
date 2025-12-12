import { create } from 'zustand';

interface ProjectMetadata {
  path: string;
  name: string;
  last_opened: number; // Unix timestamp
  project_type?: string;
  zephyr_version?: string;
}

interface UserConfig {
  zephyr_base: string | null;
  venv_path: string | null;
  recent_projects: string[]; // Legacy field
  project_history?: ProjectMetadata[]; // New field for extended project history
}

interface Dependency {
  name: string;
  installed: boolean;
  version: string | null;
  critical: boolean;
}

interface EnvReport {
  os: string;
  dependencies: Dependency[];
  all_satisfied: boolean;
}

interface ProjectState {
  projectPath: string | null;
  setProjectPath: (path: string | null) => void;
  
  // Environment Status (Simple)
  envStatus: {
    git: boolean;
    python: boolean;
    west: boolean;
    sdk: boolean;
  };
  setEnvStatus: (status: Partial<ProjectState['envStatus']>) => void;

  // Detailed Config & Report
  config: UserConfig;
  setConfig: (config: UserConfig) => void;
  
  envReport: EnvReport | null;
  setEnvReport: (report: EnvReport) => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  projectPath: null,
  setProjectPath: (path) => set({ projectPath: path }),
  
  envStatus: {
    git: false,
    python: false,
    west: false,
    sdk: false,
  },
  setEnvStatus: (status) =>
    set((state) => ({
      envStatus: { ...state.envStatus, ...status },
    })),

  config: {
    zephyr_base: null,
    venv_path: null,
    recent_projects: [],
  },
  setConfig: (config) => set({ config }),

  envReport: null,
  setEnvReport: (report) => set({ envReport: report }),
}));
