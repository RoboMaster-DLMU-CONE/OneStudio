import { useProjectStore } from "@/store/useProjectStore";
import { FolderClock, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function RecentProjects() {
  const { config, setProjectPath } = useProjectStore();
  const navigate = useNavigate();

  const handleOpen = (path: string) => {
    setProjectPath(path);
    navigate("/dashboard");
  };

  if (config.recent_projects.length === 0) {
    return (
      <Card className="flex flex-col items-center justify-center border-dashed p-8 text-center text-muted-foreground shadow-none">
        <FolderClock className="mb-4 h-10 w-10 opacity-50" />
        <p>暂无最近打开的项目</p>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      <h3 className="mb-4 text-sm font-medium text-muted-foreground uppercase tracking-wider">最近项目</h3>
      <ScrollArea className="h-[300px]">
        <div className="grid gap-2">
          {config.recent_projects.map((path) => (
            <button
              key={path}
              onClick={() => handleOpen(path)}
              className="group flex w-full items-center justify-between rounded-lg border bg-card p-4 text-left transition-all hover:border-primary hover:shadow-sm"
            >
              <div className="flex flex-col overflow-hidden">
                <span className="truncate font-medium">{path.split(/[/\\]/).pop()}</span>
                <span className="truncate text-xs text-muted-foreground">{path}</span>
              </div>
              <ArrowRight className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" />
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
