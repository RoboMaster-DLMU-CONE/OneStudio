import { create } from 'zustand';

interface ProjectState {
  projectPath: string | null;
  setProjectPath: (path: string | null) => void;
  envStatus: {
    git: boolean;
    python: boolean;
    west: boolean;
    sdk: boolean;
  };
  setEnvStatus: (status: Partial<ProjectState['envStatus']>) => void;
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
}));
