import { Button } from "@/components/ui/button";
import { useProjectStore } from "@/store/useProjectStore";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

export default function Launcher() {
  const navigate = useNavigate();
  const { envStatus, setEnvStatus, setProjectPath } = useProjectStore();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkEnv();
  }, []);

  const checkEnv = async () => {
    try {
      const status = await invoke<{
        git: boolean;
        python: boolean;
        west: boolean;
        sdk: boolean;
      }>("check_environment");
      setEnvStatus(status);
    } catch (error) {
      console.error("Failed to check environment:", error);
    }
  };

  const handleFixEnvironment = async () => {
    setLoading(true);
    try {
      await invoke("fix_environment");
      await checkEnv();
    } catch (error) {
      console.error("Failed to fix environment:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenProject = () => {
    // TODO: 实现文件选择器
    console.log("打开项目被点击");
    setProjectPath("/path/to/project");
    navigate("/dashboard");
  };

  const allGood = Object.values(envStatus).every(Boolean);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-primary">OneStudio</h1>
          <p className="mt-2 text-muted-foreground">RoboMaster 嵌入式开发环境</p>
        </div>

        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">环境检查</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center justify-between rounded-md border p-2">
              <span>Git</span>
              <span>{envStatus.git ? "✅" : "❌"}</span>
            </div>
            <div className="flex items-center justify-between rounded-md border p-2">
              <span>Python</span>
              <span>{envStatus.python ? "✅" : "❌"}</span>
            </div>
            <div className="flex items-center justify-between rounded-md border p-2">
              <span>West</span>
              <span>{envStatus.west ? "✅" : "⚠️"}</span>
            </div>
            <div className="flex items-center justify-between rounded-md border p-2">
              <span>SDK</span>
              <span>{envStatus.sdk ? "✅" : "❌"}</span>
            </div>
          </div>
          
          {!allGood && (
            <Button 
              className="mt-4 w-full" 
              variant="destructive" 
              onClick={handleFixEnvironment}
              disabled={loading}
            >
              {loading ? "修复中..." : "一键修复环境"}
            </Button>
          )}
        </div>

        <div className="space-y-4">
          <Button className="w-full" size="lg" onClick={() => console.log("新建项目")}>
            新建项目
          </Button>
          <Button variant="outline" className="w-full" size="lg" onClick={handleOpenProject}>
            打开项目
          </Button>
        </div>
      </div>
    </div>
  );
}
