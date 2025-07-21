"use client"

import { useState } from "react"
import { TrainDataProvider } from "@/contexts/train-data-context"
import { StaffingRulesProvider } from "@/contexts/staffing-rules-context"
import { ThemeProvider, useTheme } from "@/contexts/theme-context"
import { SidebarNavigation, type PageType } from "@/components/sidebar-navigation"
import { PageContainer } from "@/components/page-container"
import { ImportPage } from "@/components/import-page"
import { DisplayPage } from "@/components/display-page"
import { StaffingPage } from "@/components/staffing-page"
import { StaffingRulesConfig } from "@/components/staffing-rules-config"
import { DataStatistics } from "@/components/data-statistics"
import MultiStandardComparison from "@/components/multi-standard-comparison"
import { SystemSettings } from "@/components/system-settings"


function AppContent() {
  const [currentPage, setCurrentPage] = useState<PageType>("import")

  const pageDetails: { [key in PageType]: { title: string; description: string } } = {
    import: { title: "数据导入", description: "上传并解析您的列车数据文件" },
    display: { title: "数据预览", description: "查看和验证已导入的列车数据" },
    staffing: { title: "人员配备计算", description: "根据规则计算所需人员" },
    rules: { title: "配备规则配置", description: "自定义不同车型的乘务配备规则" },
    statistics: { title: "数据统计", description: "按路局统计定员情况，分析规则差异" },
    comparison: { title: "多标准对比", description: "同时使用多个局标准进行定员对比分析" },
    analytics: { title: "数据分析", description: "统计图表分析功能即将推出" },
    settings: { title: "系统设置", description: "配置和偏好设置功能即将推出" },
  }

  const renderCurrentPage = () => {
    const { title, description } = pageDetails[currentPage]

    switch (currentPage) {
      case "import":
        return (
          <PageContainer title={title} description={description}>
            <ImportPage />
          </PageContainer>
        )
      case "display":
        return (
          <PageContainer title={title} description={description}>
            <DisplayPage />
          </PageContainer>
        )
      case "staffing":
        return (
          <PageContainer title={title} description={description}>
            <StaffingPage />
          </PageContainer>
        )
      case "analytics":
        return (
          <PageContainer title={title} description={description}>
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <p>功能即将推出</p>
              </div>
            </div>
          </PageContainer>
        )
      case "rules":
        return (
          <PageContainer title={title} description={description}>
            <StaffingRulesConfig />
          </PageContainer>
        )
      case "statistics":
        return (
          <PageContainer title={title} description={description}>
            <DataStatistics />
          </PageContainer>
        )
      case "comparison":
        return (
          <PageContainer title={title} description={description}>
            <MultiStandardComparison />
          </PageContainer>
        )
      case "settings":
        return <SystemSettings />
      default:
        return (
          <PageContainer title={pageDetails.import.title} description={pageDetails.import.description}>
            <ImportPage />
          </PageContainer>
        )
    }
  }



  return (
    <TrainDataProvider>
      <StaffingRulesProvider>
        <div className="min-h-screen h-screen flex bg-theme-background">
          {/* 侧边栏 */}
          <SidebarNavigation currentPage={currentPage} onPageChange={setCurrentPage} />

          {/* 主内容区域 */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <main className="flex-1 overflow-auto bg-theme-surface">
              {renderCurrentPage()}
            </main>
          </div>
        </div>
      </StaffingRulesProvider>
    </TrainDataProvider>
  )
}

export default function Home() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  )
}
