import { useProjectStore } from "@/store/useProjectStore";
import { Link } from "react-router-dom";
import { 
  LayoutDashboard, 
  Package, 
  Settings2, 
  Activity, 
  Settings,
  LogOut
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItemProps {
  icon: React.ElementType;
  label: string;
  subLabel: string;
  active?: boolean;
}

function NavItem({ icon: Icon, label, subLabel, active }: NavItemProps) {
  return (
    <div
      className={cn(
        "group flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 transition-all hover:bg-accent",
        active ? "bg-primary/10 text-primary hover:bg-primary/15" : "text-muted-foreground"
      )}
    >
      <Icon className="h-5 w-5" />
      <div className="flex flex-col leading-none">
        <span className="font-medium">{label}</span>
        <span className="mt-0.5 text-[10px] font-normal opacity-70 uppercase tracking-wider">
          {subLabel}
        </span>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { projectPath } = useProjectStore();

  return (
    <div className="flex h-screen w-full bg-background">
      {/* 侧边栏 */}
      <div className="w-72 border-r bg-card/50 p-4 flex flex-col">
        <div className="mb-8 px-2 pt-2">
          <div className="flex items-center gap-2 font-bold text-xl text-primary">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground">
              O
            </div>
            OneStudio
          </div>
        </div>
        
        <nav className="space-y-1 flex-1">
          <NavItem icon={LayoutDashboard} label="概览" subLabel="Dashboard" active />
          <NavItem icon={Package} label="依赖管理" subLabel="Dependency" />
          <NavItem icon={Settings2} label="配置生成" subLabel="Configurator" />
          <NavItem icon={Activity} label="监控" subLabel="Monitor" />
        </nav>

        <div className="mt-auto border-t pt-4 space-y-1">
          <NavItem icon={Settings} label="设置" subLabel="Settings" />
        </div>
      </div>

      {/* 主要内容区域 */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* 顶部栏 */}
        <header className="flex h-16 items-center justify-between border-b bg-card/50 px-8 backdrop-blur-sm">
          <div className="flex flex-col">
            <h2 className="text-lg font-semibold tracking-tight">MyHeroRobot</h2>
            <span className="text-xs text-muted-foreground font-mono">{projectPath || "未选择路径"}</span>
          </div>
          <div className="flex items-center gap-4">
            <Link 
              to="/" 
              className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-destructive transition-colors"
            >
              <LogOut className="h-4 w-4" />
              关闭项目
            </Link>
          </div>
        </header>

        {/* 内容区域 */}
        <main className="flex-1 overflow-auto p-8">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {/* 示例卡片 - 之后会替换为真实数据 */}
            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="text-sm font-medium text-muted-foreground">总节点数</div>
                <Package className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-2xl font-bold">12</div>
              <p className="text-xs text-muted-foreground mt-1">+2 since last commit</p>
            </div>
            
            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="text-sm font-medium text-muted-foreground">活跃 Topic</div>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-2xl font-bold">48</div>
              <p className="text-xs text-muted-foreground mt-1">1.2kHz total rate</p>
            </div>

            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="text-sm font-medium text-muted-foreground">CPU 负载</div>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-2xl font-bold">32%</div>
              <p className="text-xs text-muted-foreground mt-1">Average load</p>
            </div>
          </div>

          {/* 这里可以放图表占位 */}
          <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-7">
            <div className="col-span-4 rounded-xl border bg-card shadow-sm">
              <div className="p-6">
                <h3 className="font-semibold">系统资源监控</h3>
                <div className="mt-4 h-[300px] flex items-center justify-center border-2 border-dashed rounded-lg bg-muted/20">
                  <span className="text-muted-foreground">Chart Placeholder</span>
                </div>
              </div>
            </div>
            <div className="col-span-3 rounded-xl border bg-card shadow-sm">
              <div className="p-6">
                <h3 className="font-semibold">最近日志</h3>
                <div className="mt-4 h-[300px] flex items-center justify-center border-2 border-dashed rounded-lg bg-muted/20">
                  <span className="text-muted-foreground">Log Placeholder</span>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* 底部状态栏 */}
        <footer className="flex h-8 items-center justify-between border-t bg-card px-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-green-500"></span>
              Git: main
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-yellow-500"></span>
              West: v1.0.0
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span>J-Link: Disconnected</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
