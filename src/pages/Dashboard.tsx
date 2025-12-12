import { useProjectStore } from "@/store/useProjectStore";
import { Link } from "react-router-dom";

export default function Dashboard() {
  const { projectPath } = useProjectStore();

  return (
    <div className="flex h-screen w-full">
      {/* 侧边栏占位符 */}
      <div className="w-64 border-r bg-muted/40 p-4">
        <div className="mb-6 font-bold">OneStudio</div>
        <nav className="space-y-2">
          <div className="rounded-md bg-primary/10 p-2 text-primary">概览 (Dashboard)</div>
          <div className="p-2 text-muted-foreground">依赖管理 (Dependency)</div>
          <div className="p-2 text-muted-foreground">配置生成 (Configurator)</div>
          <div className="p-2 text-muted-foreground">构建与烧录 (Build & Flash)</div>
          <div className="p-2 text-muted-foreground">监控 (Monitor)</div>
          <div className="p-2 text-muted-foreground">设置 (Settings)</div>
        </nav>
      </div>

      {/* 主要内容区域 */}
      <div className="flex flex-1 flex-col">
        {/* 顶部栏 */}
        <header className="flex h-14 items-center justify-between border-b px-6">
          <div className="font-medium">{projectPath || "未选择项目"}</div>
          <div className="flex items-center gap-4">
            <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
              关闭项目
            </Link>
          </div>
        </header>

        {/* 内容区域 */}
        <main className="flex-1 p-6">
          <h1 className="text-2xl font-bold">欢迎来到工作区</h1>
          <p className="text-muted-foreground">请从侧边栏选择一个工具开始。</p>
        </main>

        {/* 底部状态栏 */}
        <footer className="flex h-8 items-center justify-between border-t bg-muted/40 px-4 text-xs text-muted-foreground">
          <div>Git: main</div>
          <div>未连接</div>
        </footer>
      </div>
    </div>
  );
}
