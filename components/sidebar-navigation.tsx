"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Upload,
  Database,
  BarChart3,
  Settings,
  Building2,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  Users,
  Cog,
  Palette,
  PieChart,
  GitCompare,
} from "lucide-react"
import { useTrainData } from "@/contexts/train-data-context"
import { TRAIN_UNITS } from "@/types/dynamic-train-data"
import { useTheme } from "@/contexts/theme-context"

export type PageType = "import" | "display" | "staffing" | "rules" | "analytics" | "statistics" | "comparison" | "settings"

interface SidebarNavigationProps {
  currentPage: PageType
  onPageChange: (page: PageType) => void
}

export function SidebarNavigation({ currentPage, onPageChange }: SidebarNavigationProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const { getUnitStats, currentUnit } = useTrainData()
  const { currentTheme } = useTheme()

  const unitStats = getUnitStats()
  const totalRecords = unitStats.reduce((sum, stat) => sum + stat.totalCount, 0)
  const currentUnitStats = unitStats.find((stat) => stat.unit === currentUnit)

  const menuItems = [
    {
      id: "import" as PageType,
      label: "数据导入",
      icon: Upload,
      description: "Excel文件导入",
      badge: null,
    },
    {
      id: "display" as PageType,
      label: "数据展示",
      icon: Database,
      description: "运行图数据管理",
      badge: totalRecords > 0 ? totalRecords.toString() : null,
    },
    {
      id: "staffing" as PageType,
      label: "定员测算",
      icon: Users,
      description: "定员人数计算",
      badge: null,
    },
    {
      id: "rules" as PageType,
      label: "规则配置",
      icon: Cog,
      description: "定员标准配置",
      badge: null,
    },
    {
      id: "statistics" as PageType,
      label: "数据统计",
      icon: PieChart,
      description: "路局定员统计",
      badge: null,
    },
    {
      id: "comparison" as PageType,
      label: "多标准对比",
      icon: GitCompare,
      description: "多局标准对比分析",
      badge: null,
    },
    {
      id: "analytics" as PageType,
      label: "数据分析",
      icon: BarChart3,
      description: "统计图表分析",
      badge: "即将推出",
      disabled: true,
    },
    {
      id: "settings" as PageType,
      label: "系统设置",
      icon: Settings,
      description: "数据备份与系统配置",
      badge: null,
      disabled: false,
    },
  ]



  return (
    <div
      className={`h-full bg-theme-surface border-r border-theme transition-all duration-300 ${isCollapsed ? "w-16" : "w-80"}`}
      style={{
        boxShadow: '4px 0 20px rgba(0, 0, 0, 0.08)',
      }}
    >
      {/* 侧边栏头部 */}
      <div
        className="p-6 border-b border-theme"
        style={{
          background: `linear-gradient(135deg, ${currentTheme.colors.primary}, ${currentTheme.colors.secondary})`
        }}
      >
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div>
              <h2 className="text-xl font-bold text-white">客运段定员测算</h2>
              <p className="text-white/80 text-sm mt-1">现代化数据管理系统</p>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 text-white hover:bg-white/20 transition-colors rounded-lg"
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* 当前单位信息 */}
      {!isCollapsed && (
        <div className="p-6 border-b border-theme bg-theme-accent/30">
          <div className="flex items-center space-x-3 mb-4">
            <div
              className="p-2 rounded-xl"
              style={{ backgroundColor: currentTheme.colors.accent }}
            >
              <Building2 className="h-5 w-5" style={{ color: currentTheme.colors.primary }} />
            </div>
            <span className="text-sm font-semibold text-theme-secondary">当前单位</span>
          </div>
          <div className="text-base text-theme-primary font-semibold mb-4">{TRAIN_UNITS[currentUnit]}</div>
          {currentUnitStats && (
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 bg-theme-background rounded-xl shadow-sm border border-theme">
                <div className="text-lg font-bold" style={{ color: currentTheme.colors.primary }}>
                  {currentUnitStats.highSpeedCount}
                </div>
                <div className="text-xs text-theme-muted">高铁</div>
              </div>
              <div className="text-center p-3 bg-theme-background rounded-xl shadow-sm border border-theme">
                <div className="text-lg font-bold" style={{ color: currentTheme.colors.secondary }}>
                  {currentUnitStats.conventionalCount}
                </div>
                <div className="text-xs text-theme-muted">普速</div>
              </div>
              <div className="text-center p-3 bg-theme-background rounded-xl shadow-sm border border-theme">
                <div className="text-lg font-bold text-theme-primary">{currentUnitStats.totalCount}</div>
                <div className="text-xs text-theme-muted">总计</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 导航菜单 */}
      <nav className="p-4">
        <div className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = currentPage === item.id
            const isDisabled = item.disabled

            return (
              <Button
                key={item.id}
                variant="ghost"
                className={`w-full justify-start h-auto p-4 rounded-xl transition-all duration-300 ${
                  isActive
                    ? "text-white shadow-lg"
                    : "hover:bg-theme-accent hover:shadow-md text-theme-primary"
                } ${isDisabled ? "opacity-50 cursor-not-allowed" : ""}`}
                style={isActive ? {
                  background: `linear-gradient(135deg, ${currentTheme.colors.primary}, ${currentTheme.colors.secondary})`
                } : {}}
                onClick={() => !isDisabled && onPageChange(item.id)}
                disabled={isDisabled}
              >
                <div className="flex items-center space-x-4 w-full">
                  <div
                    className={`p-2 rounded-xl transition-all duration-300 ${
                      isActive ? "bg-white/20" : ""
                    }`}
                    style={!isActive ? { backgroundColor: currentTheme.colors.accent } : {}}
                  >
                    <Icon className={`h-5 w-5 ${
                      isActive ? "text-white" : ""
                    }`}
                    style={!isActive ? { color: currentTheme.colors.primary } : {}}
                    />
                  </div>
                  {!isCollapsed && (
                    <div className="flex-1 text-left">
                      <div className="flex items-center justify-between">
                        <span className={`font-semibold ${
                          isActive ? "text-white" : "text-theme-primary"
                        }`}>{item.label}</span>
                        {item.badge && (
                          <Badge
                            variant={isActive ? "secondary" : "outline"}
                            className={`text-xs ${
                              isActive ? "bg-white/20 text-white border-white/30" : "border-theme"
                            }`}
                            style={!isActive ? {
                              backgroundColor: currentTheme.colors.accent,
                              color: currentTheme.colors.primary
                            } : {}}
                          >
                            {item.badge}
                          </Badge>
                        )}
                      </div>
                      <div className={`text-xs mt-1 ${
                        isActive ? "text-white/80" : "text-theme-muted"
                      }`}>{item.description}</div>
                    </div>
                  )}
                </div>
              </Button>
            )
          })}
        </div>
      </nav>


    </div>
  )
}
