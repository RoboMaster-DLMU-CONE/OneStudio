import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useProjectStore } from "@/store/useProjectStore";
import { CheckCircle2, XCircle, AlertCircle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Onboarding({ onComplete }: { onComplete: () => void }) {
  const { envReport, setEnvReport, config, setConfig } = useProjectStore();
  const [activeTab, setActiveTab] = useState<"check" | "setup">("check");
  const [checking, setChecking] = useState(false);
  const [zephyrPath, setZephyrPath] = useState(config.zephyr_base || "");
  const [venvPath, setVenvPath] = useState(config.venv_path || "");

  const runCheck = async () => {
    setChecking(true);
    try {
      const report = await invoke<any>("check_dependencies");
      setEnvReport(report);
    } catch (e) {
      console.error(e);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    runCheck();
  }, []);

  const handleSaveConfig = async () => {
    try {
      if (zephyrPath) await invoke("set_zephyr_path", { path: zephyrPath });
      if (venvPath) await invoke("set_venv_path", { path: venvPath });

      // Refresh config
      const newConfig = await invoke<any>("get_config");
      setConfig(newConfig);
      onComplete();
    } catch (e) {
      console.error("Failed to save config", e);
    }
  };

  return (
    <div className="w-full max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-primary">欢迎使用 OneStudio</h1>
        <p className="mt-2 text-muted-foreground">让我们先检查一下您的开发环境。</p>
      </div>

      <Card>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
          <CardHeader className="pb-0">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="check">1. 系统依赖检查</TabsTrigger>
              <TabsTrigger value="setup">2. Zephyr 环境配置</TabsTrigger>
            </TabsList>
          </CardHeader>

          <CardContent className="pt-6 min-h-[400px]">
            <TabsContent value="check" className="mt-0 space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">检测到的系统: {envReport?.os || "Unknown"}</h3>
                <div className="flex gap-2">
                  {!envReport?.all_satisfied && (
                    <Button variant="default" size="sm" onClick={async () => {
                      try {
                        await invoke("install_dependencies");
                        // Wait a bit for user to complete installation in terminal
                        // In reality, we can't easily know when the external terminal closes without more complex logic.
                        // For now, user has to manually click "Refresh" after they are done.
                        alert("已启动安装程序。请在弹出的终端窗口中完成安装，然后点击“重新检测”。");
                      } catch (e) {
                        alert("启动安装失败: " + e);
                      }
                    }}>
                      一键安装缺失依赖
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={runCheck} disabled={checking}>
                    <RefreshCw className={cn("mr-2 h-4 w-4", checking && "animate-spin")} />
                    重新检测
                  </Button>
                </div>
              </div>

              <ScrollArea className="h-[300px] rounded-md border p-4">
                <div className="grid gap-3">
                  {envReport?.dependencies.map((dep) => (
                    <div key={dep.name} className="flex items-center justify-between rounded-lg border p-3 bg-background/50">
                      <div className="flex items-center gap-3">
                        {dep.installed ? (
                          <CheckCircle2 className="h-5 w-5 shrink-0 text-green-500" />
                        ) : (
                          <XCircle className="h-5 w-5 shrink-0 text-destructive" />
                        )}
                        <div>
                          <div className="font-medium">{dep.name}</div>
                          {dep.version && <div className="text-xs text-muted-foreground">{dep.version}</div>}
                        </div>
                      </div>
                      {!dep.installed && dep.critical && (
                        <Badge variant="destructive">必须安装</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <div className="mt-6 flex justify-end">
                <Button onClick={() => setActiveTab("setup")}>
                  下一步: 配置 Zephyr
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="setup" className="mt-0 space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Zephyr SDK 路径
                  </label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="/path/to/zephyr-sdk-0.17.4"
                      value={zephyrPath}
                      onChange={(e) => setZephyrPath(e.target.value)}
                    />
                  </div>
                  <p className="text-[0.8rem] text-muted-foreground">
                    指向Zephyr SDK的路径
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Python Virtual Environment (venv)
                  </label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="/path/to/zephyrproject/.venv"
                      value={venvPath}
                      onChange={(e) => setVenvPath(e.target.value)}
                    />
                  </div>
                  <p className="text-[0.8rem] text-muted-foreground">
                    Zephyr 项目使用的 Python 虚拟环境路径。
                  </p>
                </div>
              </div>

              <Alert className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
                <AlertCircle className="h-4 w-4 text-blue-400" />
                <AlertTitle className="text-blue-800 dark:text-blue-200">还没有安装 Zephyr?</AlertTitle>
                <AlertDescription className="text-blue-700 dark:text-blue-300 mt-2">
                  <p className="mb-3">
                    如果您是第一次使用，我们可以帮助您自动下载并配置 Zephyr SDK 和依赖项。
                  </p>
                  <Button variant="secondary" size="sm" onClick={() => alert("此功能将在后续版本开放")}>
                    安装 Zephyr (开发中)
                  </Button>
                </AlertDescription>
              </Alert>

              <div className="flex justify-between pt-4">
                <Button variant="ghost" onClick={() => setActiveTab("check")}>
                  上一步
                </Button>
                <Button onClick={handleSaveConfig}>
                  完成配置并进入
                </Button>
              </div>
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>
    </div>
  );
}
