import { useProjectStore } from "@/store/useProjectStore";
import { FolderClock, ArrowRight, FolderOpen, Plus, Folder, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { invoke } from "@tauri-apps/api/core";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import OpenProjectDialog from "@/components/open-project-dialog";
import { useState } from "react";
import { Spinner } from "@/components/ui/spinner";

interface Project {
  path: string;
  name: string;
}

export default function RecentProjects() {
  const { config, setProjectPath, setConfig } = useProjectStore();
  const navigate = useNavigate();
  const [openProjectDialogOpen, setOpenProjectDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [deleteWorkspaceFiles, setDeleteWorkspaceFiles] = useState(false);

  const handleOpen = (path: string) => {
    setProjectPath(path);

    // Update project history when opening a project
    invoke("add_project_to_history", { path, name: undefined }).then(() => {
      // Refresh config to update project history
      invoke("get_config").then((newConfig: any) => {
        setConfig(newConfig);
      });
    });

    navigate("/dashboard");
  };

  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteProject = async () => {
    if (!projectToDelete) return;

    setIsDeleting(true);
    try {
      // Remove the project from history
      await invoke("remove_project_from_history", { path: projectToDelete.path });

      // If the user wants to delete workspace files as well
      if (deleteWorkspaceFiles) {
        await invoke("delete_project_directory", { path: projectToDelete.path });
      }

      // Refresh config to update the UI
      const newConfig = await invoke("get_config");
      setConfig(newConfig as any);

      // Close the dialog and reset state
      setDeleteDialogOpen(false);
      setProjectToDelete(null);
      setDeleteWorkspaceFiles(false);
    } catch (error) {
      console.error("Error deleting project:", error);
      // Consider showing an error notification to the user
    } finally {
      setIsDeleting(false);
    }
  };

  // Use project_history if available, otherwise fall back to recent_projects
  const projectList = config.project_history ?
    config.project_history.map(item => ({ path: item.path, name: item.name })) :
    config.recent_projects.map(path => ({ path, name: path.split(/[/\\]/).pop() || path }));

  // If no project history exists, show empty state with create/open options
  let content;
  if (projectList.length === 0) {
    content = (
      <Empty className="border border-dashed">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <FolderClock />
          </EmptyMedia>
          <EmptyTitle>暂无项目</EmptyTitle>
          <EmptyDescription>
            您还没有创建或打开任何项目。开始创建您的第一个项目或打开已有项目。
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button onClick={() => navigate("/new-project")}>
              <Plus className="w-4 h-4 mr-2" />
              创建项目
            </Button>
            <Button
              variant="outline"
              onClick={() => setOpenProjectDialogOpen(true)}
            >
              <Folder className="w-4 h-4 mr-2" />
              打开项目
            </Button>
          </div>
        </EmptyContent>
      </Empty>
    );
  } else {
    // If project history exists, show the regular list
    content = (
      <div className="space-y-2">
        <h3 className="mb-4 text-sm font-medium text-muted-foreground uppercase tracking-wider">最近项目</h3>
        <ScrollArea className="h-[300px]">
          <div className="grid gap-2">
            {projectList.map((project) => (
              <div
                key={project.path}
                className="group flex w-full items-center justify-between rounded-lg border bg-card p-4 text-left transition-all hover:border-primary hover:shadow-sm"
              >
                <button
                  onClick={() => handleOpen(project.path)}
                  className="flex flex-col overflow-hidden text-left flex-grow text-start"
                >
                  <span className="truncate font-medium">{project.name}</span>
                  <span className="truncate text-xs text-muted-foreground">{project.path}</span>
                </button>
                <div className="flex items-center gap-2">
                  <ArrowRight className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent opening the project when clicking delete
                      // Set project to delete and open confirmation dialog
                      setProjectToDelete(project);
                      setDeleteDialogOpen(true);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    );
  }

  // Render the content and dialog
  return (
    <>
      {content}
      <OpenProjectDialog
        open={openProjectDialogOpen}
        onOpenChange={setOpenProjectDialogOpen}
        onProjectOpened={() => {
          // Refresh the config after project is opened to update recent projects and history
          invoke("get_config").then((newConfig: any) => {
            setConfig(newConfig);
          });
          navigate("/dashboard");
        }}
      />

      {/* Confirmation dialog for deleting project */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除项目</DialogTitle>
            <DialogDescription>
              您确定要删除项目 <span className="font-semibold">{projectToDelete?.name}</span> 吗？
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-start space-x-2 pt-2">
            <Checkbox
              id="delete-workspace"
              checked={deleteWorkspaceFiles}
              onCheckedChange={(checked) => setDeleteWorkspaceFiles(!!checked)}
            />
            <div className="grid gap-1.5 leading-none">
              <label
                htmlFor="delete-workspace"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                删除工作区文件
              </label>
              <p className="text-sm text-muted-foreground">
                同时删除项目目录及其所有文件
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setProjectToDelete(null);
                setDeleteWorkspaceFiles(false);
              }}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteProject}
              disabled={isDeleting}
            >
              {isDeleting && <Spinner className="mr-2" />}
              {isDeleting ? "删除中..." : "确认删除"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
