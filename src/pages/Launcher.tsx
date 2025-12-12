import { Button } from "@/components/ui/button";
import { useProjectStore } from "@/store/useProjectStore";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Plus, FolderOpen, Settings, ExternalLink } from "lucide-react";
import { open } from '@tauri-apps/plugin-shell';
import Onboarding from "./launcher/Onboarding";
import RecentProjects from "./launcher/RecentProjects";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export default function Launcher() {
  const navigate = useNavigate();
  const { config, setConfig, setProjectPath, envStatus, setEnvStatus } = useProjectStore();
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const cfg = await invoke<any>("get_config");
        setConfig(cfg);

        // Check if we need onboarding
        // If no zephyr path is set AND no recent projects, assume new user
        if (!cfg.zephyr_base && cfg.recent_projects.length === 0) {
          setShowOnboarding(true);
        } else {
          // Run a quick env check for the badges
          const status = await invoke<any>("check_environment");
          setEnvStatus(status);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const handleOpenProject = () => {
    // TODO: Implement file picker
    console.log("打开项目被点击");
    const mockPath = "/home/user/projects/MyHeroRobot";
    setProjectPath(mockPath);

    // Add to recent (using legacy function for compatibility)
    invoke("add_recent_project", { path: mockPath }).then(() => {
      // Refresh config not strictly needed if we navigate away, but good practice
    });

    // Add to project history with extended metadata
    invoke("add_project_to_history", { path: mockPath, name: undefined }).then(() => {
      // Refresh config to update project history
      invoke("get_config").then((newConfig: any) => {
        setConfig(newConfig);
      });
    });

    navigate("/dashboard");
  };

  if (loading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  if (showOnboarding) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-8">
        <Onboarding onComplete={() => setShowOnboarding(false)} />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background md:flex-row">
      {/* Left Panel: Projects */}
      <div className="flex flex-col flex-1 p-6 md:p-12">
        <div className="mb-8 md:mb-12">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-primary">OneStudio</h1>
          <p className="mt-2 text-muted-foreground">RoboMaster 嵌入式开发环境</p>
        </div>

        {/* Only show the buttons if there are existing project history */}
        {((config.project_history && config.project_history.length > 0) || config.recent_projects.length > 0) && (
          <div className="mb-6 md:mb-8 flex flex-col sm:flex-row gap-3 md:gap-4">
            <Button size="lg" className="gap-2" onClick={() => navigate("/new-project")}>
              <Plus className="h-5 w-5" />
              新建项目
            </Button>
            <Button variant="outline" size="lg" className="gap-2" onClick={handleOpenProject}>
              <FolderOpen className="h-5 w-5" />
              打开项目
            </Button>
          </div>
        )}

        <div className="flex-1">
          <RecentProjects />
        </div>
      </div>

      {/* Right Panel: Environment Status */}
      <div className="flex flex-col border-t md:border-t-0 md:border-l bg-muted/10 p-6 md:p-8 w-full md:w-80 flex-shrink-0">
        <div className="mb-4 md:mb-6 flex items-center justify-between">
          <h3 className="font-semibold">环境状态</h3>
          <Button variant="ghost" size="icon" onClick={() => setShowOnboarding(true)}>
            <Settings className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-3">
          <StatusItem label="Git" active={envStatus.git} />
          <StatusItem label="Python" active={envStatus.python} />
          <StatusItem label="West" active={envStatus.west} />
          <StatusItem label="Zephyr SDK" active={envStatus.sdk} />
        </div>

        <div className="mt-auto space-y-3 pt-4 md:pt-0">
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start"
            onClick={() => open("https://bing.com.cn")}
          >
            下载速度缓慢?
            <ExternalLink className="ml-2 h-3 w-3" />
          </Button>
          <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-medium">当前配置</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 text-xs text-muted-foreground space-y-2">
              <Separator className="mb-2" />
              <div className="flex justify-between">
                <span className="font-semibold">SDK:</span>
                <span>{config.zephyr_base ? "已配置" : "未配置"}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">Venv:</span>
                <span>{config.venv_path ? "已配置" : "未配置"}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StatusItem({ label, active }: { label: string; active: boolean }) {
  return (
    <Card className="shadow-sm">
      <CardContent className="flex items-center justify-between pl-3 py-1">
        <span className="text-sm font-medium">{label}</span>
        <Badge variant={active ? "default" : "destructive"} className={active ? "bg-green-500 hover:bg-green-600" : ""}>
          {active ? "正常" : "异常"}
        </Badge>
      </CardContent>
    </Card>
  );
}
