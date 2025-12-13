import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useNavigate } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";
import { Plus, ExternalLink, FolderOpen, Terminal } from "lucide-react";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { open } from '@tauri-apps/plugin-shell';
import { listen } from '@tauri-apps/api/event';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/spinner";

export default function NewProject() {
  const [projectName, setProjectName] = useState("");
  const [workspacePath, setWorkspacePath] = useState("");
  const [shallowClone, setShallowClone] = useState(true);
  const [creating, setCreating] = useState(false);
  const [terminalOutput, setTerminalOutput] = useState<string[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    // 监听终端数据事件
    const unlisten = listen<string>('term-data', (event) => {
      setTerminalOutput(prev => [...prev, event.payload]);
    });

    return () => {
      unlisten.then(unlistener => unlistener());
    };
  }, []);

  const handleSelectWorkspace = async () => {
    const selected = await openDialog({
      directory: true,
      multiple: false,
      title: "选择工作区路径"
    });
    if (selected) {
      setWorkspacePath(selected as string);
    }
  };

  const handleCreateProject = async () => {
    if (!projectName.trim()) {
      toast.error("请输入工程名");
      return;
    }
    if (!workspacePath.trim()) {
      toast.error("请选择工作区路径");
      return;
    }

    setCreating(true);
    setTerminalOutput([]); // 清空之前的输出

    try {
      // 调用后端创建项目
      await invoke("create_project", {
        projectName,
        workspacePath,
        shallowClone
      });

      toast.success("项目创建成功！");
      navigate("/");
    } catch (error) {
      console.error("创建项目失败:", error);
      toast.error(`创建项目失败: ${error}`);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            新建工程
          </CardTitle>
          <CardDescription>
            创建一个新的 one-framework 项目
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="projectName">工程名</Label>
            <Input
              id="projectName"
              placeholder="输入工程名"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              disabled={creating}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="workspacePath">Zephyr 工作区路径</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSelectWorkspace}
                disabled={creating}
              >
                <FolderOpen className="h-4 w-4 mr-2" />
                选择路径
              </Button>
            </div>
            <Input
              id="workspacePath"
              placeholder="选择或输入工作区路径"
              value={workspacePath}
              onChange={(e) => setWorkspacePath(e.target.value)}
              disabled={creating}
            />
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <Switch
              id="shallowClone"
              checked={shallowClone}
              onCheckedChange={setShallowClone}
              disabled={creating}
            />
            <Label htmlFor="shallowClone">使用浅克隆 (减少下载大小)</Label>
          </div>

          <div className="rounded-md border bg-muted p-4 text-sm">
            <div className="font-medium">资源需求:</div>
            <div>预计占用空间: {shallowClone ? '500' : '1500'}MB</div>
            <div>预计下载时间: {shallowClone ? '5' : '15'}分钟</div>
          </div>

          {/* 终端输出区域 */}
          {terminalOutput.length > 0 && (
            <div className="border rounded-md bg-black text-white font-mono text-sm p-4">
              <div className="flex items-center gap-2 mb-2">
                <Terminal className="h-4 w-4" />
                <span className="text-xs font-medium">创建日志</span>
              </div>
              <ScrollArea className="h-40 w-full">
                <div className="whitespace-pre-wrap break-words">
                  {terminalOutput.map((line, index) => (
                    <div key={index}>{line}</div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          <div className="flex justify-between pt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => open("https://bing.com.cn")}
            >
              下载速度缓慢?
              <ExternalLink className="ml-2 h-3 w-3" />
            </Button>

            <div className="space-x-2">
              <Button
                variant="outline"
                onClick={() => navigate("/")}
                disabled={creating}
              >
                取消
              </Button>
              <Button
                onClick={handleCreateProject}
                disabled={creating}
              >
                {creating && <Spinner className="mr-2" />}
                {creating ? "创建中..." : "创建项目"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
