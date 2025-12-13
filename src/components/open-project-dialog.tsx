import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FolderOpen, FileSearch, Save, Folder } from "lucide-react";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";

interface OpenProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProjectOpened?: () => void;
}

export default function OpenProjectDialog({ open, onOpenChange, onProjectOpened }: OpenProjectDialogProps) {
  const [workspacePath, setWorkspacePath] = useState("");
  const [projectName, setProjectName] = useState("");
  const [autoDetectedName, setAutoDetectedName] = useState("");
  const [isDetecting, setIsDetecting] = useState(false);
  const [isOpening, setIsOpening] = useState(false);

  // Function to detect project name from CMakeLists.txt
  const detectProjectName = async () => {
    if (!workspacePath) {
      toast.error("请先选择工作区路径");
      return;
    }

    setIsDetecting(true);
    try {
      const detectedName = await invoke<string>("detect_project_name", { workspacePath });
      if (detectedName) {
        setAutoDetectedName(detectedName);
        setProjectName(detectedName); // Set as default
        toast.success(`检测到项目名称: ${detectedName}`);
      } else {
        toast.info("未在 CMakeLists.txt 中找到项目名称，使用文件夹名称作为默认值");
        const folderName = workspacePath.split(/[/\\]/).pop() || "Untitled";
        setAutoDetectedName(folderName);
        setProjectName(folderName);
      }
    } catch (error) {
      console.error("检测项目名称时出错:", error);
      toast.error("检测项目名称失败: " + (error as Error).message);
      // Fallback to folder name
      const folderName = workspacePath.split(/[/\\]/).pop() || "Untitled";
      setAutoDetectedName(folderName);
      setProjectName(folderName);
    } finally {
      setIsDetecting(false);
    }
  };

  // Auto-detect when workspace path changes (if it contains CMakeLists.txt)
  useEffect(() => {
    if (workspacePath) {
      const checkForCMakeLists = async () => {
        try {
          const hasCMake = await invoke<boolean>("check_cmake_exists", { workspacePath });
          if (hasCMake) {
            detectProjectName();
          } else {
            // Fallback to folder name if no CMakeLists.txt exists
            const folderName = workspacePath.split(/[/\\]/).pop() || "Untitled";
            setAutoDetectedName(folderName);
            setProjectName(folderName);
          }
        } catch (error) {
          console.error("检查 CMakeLists.txt 时出错:", error);
          // Fallback to folder name
          const folderName = workspacePath.split(/[/\\]/).pop() || "Untitled";
          setAutoDetectedName(folderName);
          setProjectName(folderName);
        }
      };
      checkForCMakeLists();
    }
  }, [workspacePath]);

  const handleSelectWorkspace = async () => {
    const selected = await openDialog({
      directory: true,
      multiple: false,
      title: "选择 Zephyr 工作区路径"
    });

    if (selected) {
      setWorkspacePath(selected as string);
    }
  };

  const handleOpenProject = async () => {
    if (!workspacePath) {
      toast.error("请选择工作区路径");
      return;
    }

    if (!projectName.trim()) {
      toast.error("请输入项目名称");
      return;
    }

    setIsOpening(true);
    try {
      // Call the backend to open the project and save to config
      await invoke("open_project", {
        workspacePath,
        projectName: projectName.trim()
      });

      toast.success("项目打开成功！");
      onProjectOpened?.(); // Trigger the callback to refresh UI
      onOpenChange(false); // Close the dialog
    } catch (error) {
      console.error("打开项目时出错:", error);
      toast.error("打开项目失败: " + (error as Error).message);
    } finally {
      setIsOpening(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>打开项目</DialogTitle>
          <DialogDescription>
            选择一个现有的 Zephyr 工作区
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="workspace-path">Zephyr 工作区路径</Label>
            <div className="flex gap-2">
              <Input
                id="workspace-path"
                placeholder="选择工作区目录..."
                value={workspacePath}
                readOnly
                className="flex-grow"
                title="应包含 app/app/CMakeLists.txt 文件"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={handleSelectWorkspace}
                disabled={isDetecting || isOpening}
              >
                <FolderOpen className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              选择包含 app/app/CMakeLists.txt 的工作区目录
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="project-name">项目名称</Label>
            </div>
            <div className="flex gap-2">
              <Input
                id="project-name"
                placeholder="输入项目名称..."
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                disabled={isDetecting || isOpening}
              />
              <Button
                variant="outline"
                size="icon"
                onClick={detectProjectName}
                disabled={!workspacePath || isDetecting || isOpening}
                title="自动检测项目名称"
              >
                <FileSearch className="h-4 w-4" />
              </Button>
            </div>
            {autoDetectedName && (
              <p className="text-xs text-muted-foreground">
                检测到项目名称: <span className="font-mono">{autoDetectedName}</span>
              </p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={isOpening}
            >
              取消
            </Button>
            <Button
              className="flex-1 gap-2"
              onClick={handleOpenProject}
              disabled={!workspacePath || !projectName.trim() || isDetecting || isOpening}
            >
              {isOpening ? (
                <>
                  <Save className="h-4 w-4 animate-spin" />
                  正在打开...
                </>
              ) : (
                <>
                  <Folder className="h-4 w-4" />
                  打开项目
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
