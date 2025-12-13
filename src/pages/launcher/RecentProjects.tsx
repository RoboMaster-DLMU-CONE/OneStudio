import { useProjectStore } from "@/store/useProjectStore";
import { FolderClock, ArrowRight, FolderOpen, Plus, Folder } from "lucide-react";
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
import OpenProjectDialog from "@/components/open-project-dialog";
import { useState } from "react";

export default function RecentProjects() {
  const { config, setProjectPath, setConfig } = useProjectStore();
  const navigate = useNavigate();
  const [openProjectDialogOpen, setOpenProjectDialogOpen] = useState(false);

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
              <button
                key={project.path}
                onClick={() => handleOpen(project.path)}
                className="group flex w-full items-center justify-between rounded-lg border bg-card p-4 text-left transition-all hover:border-primary hover:shadow-sm"
              >
                <div className="flex flex-col overflow-hidden">
                  <span className="truncate font-medium">{project.name}</span>
                  <span className="truncate text-xs text-muted-foreground">{project.path}</span>
                </div>
                <ArrowRight className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" />
              </button>
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
    </>
  );
}
