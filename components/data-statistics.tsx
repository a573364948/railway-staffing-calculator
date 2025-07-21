"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { 
  BarChart3, PieChart, Download, RefreshCw, Filter, 
  TrendingUp, Users, Target, AlertCircle, CheckCircle,
  Building, Calculator, Clock, Settings, Play
} from "lucide-react"
import { useStaffingRules } from "@/contexts/staffing-rules-context"
import { useTrainData } from "@/contexts/train-data-context"
import { BureauStaffingTable } from "./data-statistics/bureau-staffing-table"
import { RuleComparisonTable } from "./data-statistics/rule-comparison-table"
import { StaffingChart } from "./data-statistics/staffing-chart"
import { useDataStatistics } from "@/hooks/use-data-statistics"
import type { BureauStaffingStats, ExportConfig } from "@/types/data-statistics"
import * as XLSX from "xlsx"

export function DataStatistics() {
  const { standards, currentStandard } = useStaffingRules()
  const { currentUnit } = useTrainData()
  const [activeTab, setActiveTab] = useState<'staffing' | 'rules'>('staffing')
  const [refreshKey, setRefreshKey] = useState(0)
  const [isExporting, setIsExporting] = useState(false)
  
  // 使用自定义hook获取统计数据
  const {
    bureauStats,
    ruleComparisons,
    chartData,
    syncStatus,
    refreshData,
    calculateAllStaffing
  } = useDataStatistics(refreshKey)

  // 手动刷新数据
  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1)
    refreshData()
  }
  
  // 一键计算所有定员
  const handleCalculateAll = async () => {
    await calculateAllStaffing()
    // 计算完成后刷新数据
    setRefreshKey(prev => prev + 1)
  }

  // 导出功能
  const handleExport = async (config: ExportConfig) => {
    setIsExporting(true)
    try {
      const workbook = XLSX.utils.book_new()
      
      if (config.includeStaffingStats) {
        // 导出定员统计
        const staffingData = [
          ['路局', '客运段', '高铁定员', '普速定员', '其余生产定员', '总定员', '计算状态'],
          ...bureauStats.flatMap(bureau => [
            [bureau.bureauName, '', '', '', '', '', ''],
            ...bureau.units.map(unit => [
              '',
              unit.unitName,
              unit.staffing.highSpeed,
              unit.staffing.conventional,
              unit.staffing.otherProduction,
              unit.staffing.total,
              Object.values(unit.isCalculated).every(Boolean) ? '已完成' : '未完成'
            ]),
            ['小计', '', bureau.totals.highSpeed, bureau.totals.conventional, bureau.totals.otherProduction, bureau.totals.grandTotal, '']
          ])
        ]
        
        const staffingSheet = XLSX.utils.aoa_to_sheet(staffingData)
        XLSX.utils.book_append_sheet(workbook, staffingSheet, "定员统计")
      }
      
      if (config.includeRuleComparison) {
        // 导出规则对比概览
        const ruleData = [
          ['路局', '预备率(北京)', '预备率(石家庄)', '预备率(天津)', '其余生产预备率', '标准工时', '高铁规则数', '普速规则数', '其余生产规则数'],
          ...ruleComparisons.map(rule => [
            rule.bureauName,
            rule.reserveRates.mainProduction.beijing + '%',
            rule.reserveRates.mainProduction.shijiazhuang + '%',
            rule.reserveRates.mainProduction.tianjin + '%',
            rule.reserveRates.otherProduction + '%',
            rule.standardWorkHours + 'h',
            rule.highSpeedRules.totalRules,
            rule.conventionalRules.totalRules,
            rule.otherProductionRules.totalRules
          ])
        ]
        
        const ruleSheet = XLSX.utils.aoa_to_sheet(ruleData)
        XLSX.utils.book_append_sheet(workbook, ruleSheet, "规则对比概览")
        
        // 导出详细的普速规则对比
        const conventionalRulesData = [
          ['路局', '规则名称', '适用条件', '列车长', '硬座配备', '软座配备', '硬卧配备', '软卧配备', '行李员配备']
        ]
        
        ruleComparisons.forEach(bureau => {
          bureau.conventionalRules.detailedRules.forEach(rule => {
            const conditions = []
            if (rule.conditions.runningTime) {
              if (rule.conditions.runningTime.min && rule.conditions.runningTime.max) {
                conditions.push(`${rule.conditions.runningTime.min}-${rule.conditions.runningTime.max}小时`)
              } else if (rule.conditions.runningTime.min) {
                conditions.push(`${rule.conditions.runningTime.min}小时以上`)
              } else if (rule.conditions.runningTime.max) {
                conditions.push(`${rule.conditions.runningTime.max}小时以内`)
              }
            }
            
            const staffing = rule.staffing
            conventionalRulesData.push([
              bureau.bureauName,
              rule.name,
              conditions.join(', ') || '无特殊条件',
              staffing.trainConductor || 0,
              staffing.carStaffing?.hardSeat?.ratio || '无配备',
              staffing.carStaffing?.softSeat?.ratio || '无配备',
              staffing.carStaffing?.hardSleeper?.ratio || '无配备',
              staffing.carStaffing?.softSleeper?.ratio || '无配备',
              staffing.baggageStaff || 0
            ])
          })
        })
        
        const conventionalRulesSheet = XLSX.utils.aoa_to_sheet(conventionalRulesData)
        XLSX.utils.book_append_sheet(workbook, conventionalRulesSheet, "普速规则详细对比")
        
        // 导出详细的高铁规则对比
        const highSpeedRulesData = [
          ['路局', '规则名称', '适用条件', '列车长', '列车员', '商务座乘务员', '餐车乘务员']
        ]
        
        ruleComparisons.forEach(bureau => {
          bureau.highSpeedRules.detailedRules.forEach(rule => {
            const conditions = []
            if (rule.conditions.formation) {
              conditions.push(`编组: ${rule.conditions.formation.join('/')}`)
            }
            if (rule.conditions.runningTime) {
              if (rule.conditions.runningTime.min && rule.conditions.runningTime.max) {
                conditions.push(`${rule.conditions.runningTime.min}-${rule.conditions.runningTime.max}小时`)
              } else if (rule.conditions.runningTime.min) {
                conditions.push(`${rule.conditions.runningTime.min}小时以上`)
              } else if (rule.conditions.runningTime.max) {
                conditions.push(`${rule.conditions.runningTime.max}小时以内`)
              }
            }
            if (rule.conditions.specialType) {
              conditions.push(`特殊类型: ${rule.conditions.specialType.join('/')}`)
            }
            
            const staffing = rule.staffing
            highSpeedRulesData.push([
              bureau.bureauName,
              rule.name,
              conditions.join(', ') || '无特殊条件',
              staffing.trainConductor || 0,
              staffing.trainAttendant || 0,
              staffing.businessClassAttendant || 0,
              staffing.diningService || 0
            ])
          })
        })
        
        const highSpeedRulesSheet = XLSX.utils.aoa_to_sheet(highSpeedRulesData)
        XLSX.utils.book_append_sheet(workbook, highSpeedRulesSheet, "高铁规则详细对比")
        
        // 导出其余生产规则对比
        const otherProductionRulesData = [
          ['路局', '规则名称', '配置类型', '配置参数', '描述']
        ]
        
        ruleComparisons.forEach(bureau => {
          bureau.otherProductionRules.detailedRules.forEach(rule => {
            let configDetails = ''
            if (rule.configType === 'percentage' && rule.config) {
              configDetails = `${rule.config.percentage}% (基于${rule.config.baseOn === 'mainProduction' ? '主要生产' : '其他'})`
            } else if (rule.configType === 'fixed' && rule.config) {
              configDetails = `固定${rule.config.count}人`
            }
            
            otherProductionRulesData.push([
              bureau.bureauName,
              rule.name,
              rule.configType,
              configDetails,
              rule.description
            ])
          })
        })
        
        const otherProductionRulesSheet = XLSX.utils.aoa_to_sheet(otherProductionRulesData)
        XLSX.utils.book_append_sheet(workbook, otherProductionRulesSheet, "其余生产规则对比")
      }
      
      // 导出文件
      const filename = config.filename || `定员统计报告_${new Date().toISOString().split('T')[0]}.xlsx`
      XLSX.writeFile(workbook, filename)
      
    } catch (error) {
      console.error('导出失败:', error)
    } finally {
      setIsExporting(false)
    }
  }

  // 计算总体统计
  const overallStats = useMemo(() => {
    const totalBureaus = bureauStats.length
    const totalUnits = bureauStats.reduce((sum, bureau) => sum + bureau.units.length, 0)
    const completedUnits = bureauStats.reduce((sum, bureau) => 
      sum + bureau.units.filter(unit => 
        Object.values(unit.isCalculated).every(Boolean)
      ).length, 0
    )
    
    const grandTotals = bureauStats.reduce((acc, bureau) => ({
      highSpeed: acc.highSpeed + bureau.totals.highSpeed,
      conventional: acc.conventional + bureau.totals.conventional,
      otherProduction: acc.otherProduction + bureau.totals.otherProduction,
      total: acc.total + bureau.totals.grandTotal
    }), { highSpeed: 0, conventional: 0, otherProduction: 0, total: 0 })
    
    return {
      totalBureaus,
      totalUnits,
      completedUnits,
      completionRate: totalUnits > 0 ? (completedUnits / totalUnits) * 100 : 0,
      grandTotals
    }
  }, [bureauStats])

  return (
    <div className="space-y-6">
      {/* 页面标题和操作栏 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">数据统计</h1>
          <p className="text-muted-foreground">
            按路局统计定员情况，分析规则差异
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            onClick={handleCalculateAll}
            variant="default"
            disabled={syncStatus.isLoading}
            className="bg-green-600 hover:bg-green-700"
          >
            <Play className={`h-4 w-4 mr-1 ${syncStatus.isLoading ? 'animate-spin' : ''}`} />
            {syncStatus.isLoading ? '计算中...' : '一键计算'}
          </Button>
          <Button
            onClick={handleRefresh}
            variant="outline"
            disabled={syncStatus.isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${syncStatus.isLoading ? 'animate-spin' : ''}`} />
            刷新数据
          </Button>
          <Button
            onClick={() => handleExport({
              includeStaffingStats: true,
              includeRuleComparison: true,
              includeCharts: false,
              format: 'xlsx'
            })}
            disabled={isExporting}
          >
            <Download className="h-4 w-4 mr-1" />
            {isExporting ? '导出中...' : '导出报告'}
          </Button>
        </div>
      </div>

      {/* 同步状态提示 */}
      {syncStatus.errors.length > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            数据同步遇到问题：{syncStatus.errors.join(', ')}
          </AlertDescription>
        </Alert>
      )}
      
      {/* 计算提示 */}
      {overallStats.completedUnits === 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            尚未进行定员计算，点击上方的"一键计算"按钮开始计算所有路局的定员数据
          </AlertDescription>
        </Alert>
      )}

      {/* 总体统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Building className="h-8 w-8 mx-auto mb-2 text-blue-600" />
            <div className="text-2xl font-bold">{overallStats.totalBureaus}</div>
            <div className="text-sm text-muted-foreground">路局总数</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="h-8 w-8 mx-auto mb-2 text-green-600" />
            <div className="text-2xl font-bold">{overallStats.totalUnits}</div>
            <div className="text-sm text-muted-foreground">客运段总数</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <Target className="h-8 w-8 mx-auto mb-2 text-purple-600" />
            <div className="text-2xl font-bold">{overallStats.completedUnits}</div>
            <div className="text-sm text-muted-foreground">已完成计算</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <Calculator className="h-8 w-8 mx-auto mb-2 text-orange-600" />
            <div className="text-2xl font-bold">{overallStats.grandTotals.total.toLocaleString()}</div>
            <div className="text-sm text-muted-foreground">总定员人数</div>
          </CardContent>
        </Card>
      </div>

      {/* 完成进度 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5" />
            <span>计算完成度</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>整体完成度</span>
              <span>{overallStats.completedUnits}/{overallStats.totalUnits} ({overallStats.completionRate.toFixed(1)}%)</span>
            </div>
            <Progress value={overallStats.completionRate} className="h-2" />
            <div className="text-xs text-muted-foreground">
              最后更新: {syncStatus.lastSyncTime.toLocaleString()}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 分类统计 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-blue-800">高铁定员</div>
                <div className="text-2xl font-bold text-blue-600">{overallStats.grandTotals.highSpeed.toLocaleString()}</div>
              </div>
              <div className="text-right">
                <div className="text-sm text-muted-foreground">占比</div>
                <div className="text-sm font-medium">
                  {overallStats.grandTotals.total > 0 ? 
                    ((overallStats.grandTotals.highSpeed / overallStats.grandTotals.total) * 100).toFixed(1) : 0}%
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-green-800">普速定员</div>
                <div className="text-2xl font-bold text-green-600">{overallStats.grandTotals.conventional.toLocaleString()}</div>
              </div>
              <div className="text-right">
                <div className="text-sm text-muted-foreground">占比</div>
                <div className="text-sm font-medium">
                  {overallStats.grandTotals.total > 0 ? 
                    ((overallStats.grandTotals.conventional / overallStats.grandTotals.total) * 100).toFixed(1) : 0}%
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-orange-800">其余生产</div>
                <div className="text-2xl font-bold text-orange-600">{overallStats.grandTotals.otherProduction.toLocaleString()}</div>
              </div>
              <div className="text-right">
                <div className="text-sm text-muted-foreground">占比</div>
                <div className="text-sm font-medium">
                  {overallStats.grandTotals.total > 0 ? 
                    ((overallStats.grandTotals.otherProduction / overallStats.grandTotals.total) * 100).toFixed(1) : 0}%
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 主要内容区 */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'staffing' | 'rules')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="staffing" className="flex items-center space-x-2">
            <BarChart3 className="h-4 w-4" />
            <span>定员统计</span>
          </TabsTrigger>
          <TabsTrigger value="rules" className="flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span>规则对比</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="staffing" className="space-y-6">
          <BureauStaffingTable 
            bureauStats={bureauStats}
            onRefresh={handleRefresh}
          />
          <StaffingChart 
            chartData={chartData}
            bureauStats={bureauStats}
          />
        </TabsContent>
        
        <TabsContent value="rules" className="space-y-6">
          <RuleComparisonTable 
            ruleComparisons={ruleComparisons}
            onRefresh={handleRefresh}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}