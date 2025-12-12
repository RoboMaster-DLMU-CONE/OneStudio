import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { Button } from "@/components/ui/button";
import { open } from '@tauri-apps/plugin-shell';
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Switch } from "@/components/ui/switch";
import { useProjectStore } from "@/store/useProjectStore";
import { CheckCircle2, XCircle, AlertCircle, RefreshCw, FolderOpen, Terminal as TerminalIcon, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import Terminal from "@/components/terminal/Terminal";
import { toast } from "sonner";

export default function Onboarding({ onComplete }: { onComplete: () => void }) {
  const { envReport, setEnvReport, config, setConfig, setEnvStatus } = useProjectStore();
  const [activeTab, setActiveTab] = useState<"check" | "setup">("check");
  const [checking, setChecking] = useState(false);
  const [zephyrPath, setZephyrPath] = useState(config.zephyr_base || "");
  const [venvPath, setVenvPath] = useState(config.venv_path || "");

  // Installation state
  const [installing, setInstalling] = useState(false);
  const [installPath, setInstallPath] = useState("");
  const [sdkInstallPath, setSdkInstallPath] = useState("");
  const [shadowClone, setShadowClone] = useState(false);
  const [showTerminal, setShowTerminal] = useState(false);

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

      // Update environment status after config changes
      const status = await invoke<any>("check_environment");
      setEnvStatus(status);

      onComplete();
    } catch (e) {
      console.error("Failed to save config", e);
    }
  };

  const handlePickZephyrPath = async () => {
    const selected = await openDialog({
      directory: true,
      multiple: false,
      title: "选择 Zephyr SDK 路径"
    });
    if (selected) {
      setZephyrPath(selected as string);
    }
  };

  const handlePickVenvPath = async () => {
    const selected = await openDialog({
      directory: true,
      multiple: false,
      title: "选择 Python 虚拟环境路径"
    });
    if (selected) {
      setVenvPath(selected as string);
    }
  };

  const handlePickInstallPath = async () => {
    const selected = await openDialog({
      directory: true,
      multiple: false,
      title: "选择 Zephyr 安装位置 (空文件夹)"
    });
    if (selected) {
      setInstallPath(selected as string);
    }
  };

  const handlePickSdkInstallPath = async () => {
    const selected = await openDialog({
      directory: true,
      multiple: false,
      title: "选择 SDK 安装位置"
    });
    if (selected) {
      setSdkInstallPath(selected as string);
    }
  };

  const handleInstallZephyr = async () => {
    if (!installPath) {
      toast.error("请选择安装路径");
      return;
    }
    setInstalling(true);
    setShowTerminal(true);
    try {
      await invoke("install_zephyr", {
        installPath,
        sdkPath: sdkInstallPath || null,
        shadowClone
      });
      toast.success("安装完成！请手动配置路径。");
      // Auto-fill paths if successful
      setZephyrPath(installPath + "/zephyr");
      setVenvPath(installPath + "/.venv");
    } catch (e) {
      toast.error("安装失败: " + e);
    } finally {
      setInstalling(false);
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
            <div className="flex justify-start mb-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => open("https://bing.com.cn")}
              >
                下载速度缓慢?
                <ExternalLink className="ml-2 h-3 w-3" />
              </Button>
            </div>
            <TabsContent value="check" className="mt-0 space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">检测到的系统: {envReport?.os || "Unknown"}</h3>
                <div className="flex gap-2">
                  {!envReport?.all_satisfied && (
                    <Button variant="default" size="sm" onClick={async () => {
                      try {
                        await invoke("install_dependencies");
                        toast.info("已启动安装程序。请在弹出的终端窗口中完成安装，然后点击“重新检测”。");
                      } catch (e) {
                        toast.error("启动安装失败: " + e);
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
                    Zephyr Base 路径 (SDK)
                  </label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="/path/to/zephyrproject/zephyr"
                      value={zephyrPath}
                      onChange={(e) => setZephyrPath(e.target.value)}
                    />
                    <Button variant="outline" size="icon" onClick={handlePickZephyrPath}>
                      <FolderOpen className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-[0.8rem] text-muted-foreground">
                    指向一个sdk文件夹的路径。比如：/home/wf/zephyr-sdk-0.17.4
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
                    <Button variant="outline" size="icon" onClick={handlePickVenvPath}>
                      <FolderOpen className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-[0.8rem] text-muted-foreground">
                      Zephyr 项目使用的 Python 虚拟环境路径。
                    </p>
                    <a
                      href="https://bing.com.cn"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[0.8rem] text-muted-foreground hover:text-foreground flex items-center gap-1"
                      onClick={(e) => {
                        e.preventDefault();
                        open("https://bing.com.cn");
                      }}
                    >
                      找不到.venv文件夹？
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              </div>

              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="zephyr-install" className="border-0 w-full">
                  <AccordionTrigger className="w-full">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-blue-400" />
                      <span className="text-blue-800 dark:text-blue-200">还没有安装 Zephyr?</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="w-full">
                    <div className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 mt-3 w-full rounded-md p-4 border">
                      <div className="text-blue-700 dark:text-blue-300">
                        <p className="mb-3">
                          如果您是第一次使用，我们可以帮助您自动下载并配置 Zephyr SDK 和依赖项。
                        </p>

                        <div className="mt-4 space-y-3 rounded-md bg-background/50 p-3 border border-blue-200 dark:border-blue-800 w-full">
                          <div className="space-y-1">
                            <label className="text-xs font-medium">安装位置 (Zephyr Project)</label>
                            <div className="flex gap-2">
                              <Input
                                className="h-8 text-xs flex-grow"
                                placeholder="选择空文件夹..."
                                value={installPath}
                                onChange={(e) => setInstallPath(e.target.value)}
                              />
                              <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={handlePickInstallPath}>
                                <FolderOpen className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-medium">SDK 安装位置 (可选)</label>
                            <div className="flex gap-2">
                              <Input
                                className="h-8 text-xs flex-grow"
                                placeholder="默认位置..."
                                value={sdkInstallPath}
                                onChange={(e) => setSdkInstallPath(e.target.value)}
                              />
                              <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={handlePickSdkInstallPath}>
                                <FolderOpen className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2 mt-2">
                            <Switch
                              id="shadow-clone"
                              checked={shadowClone}
                              onCheckedChange={setShadowClone}
                            />
                            <label
                              htmlFor="shadow-clone"
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                              使用浅克隆 (减少下载大小)
                            </label>
                          </div>
                          <Button
                            variant="secondary"
                            size="sm"
                            className="w-full mt-2"
                            onClick={handleInstallZephyr}
                            disabled={installing}
                          >
                            {installing ? <RefreshCw className="mr-2 h-3 w-3 animate-spin" /> : <TerminalIcon className="mr-2 h-3 w-3" />}
                            {installing ? "安装中..." : "开始安装 Zephyr"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              {showTerminal && (
                <div className="h-48 w-full overflow-hidden rounded-md border bg-black mt-4">
                  <Terminal />
                </div>
              )}

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
