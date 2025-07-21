// 数据统计页面相关类型定义

import type { StaffingStandard } from "./staffing-rules"

// 单位定员统计数据
export interface UnitStaffingStats {
  unitName: string        // 单位名称（如：北京客运段）
  unitKey: string         // 单位标识（如：beijing）
  staffing: {
    highSpeed: number     // 高铁定员
    conventional: number  // 普速定员
    otherProduction: number // 其余生产定员
    total: number         // 总定员
  }
  isCalculated: {
    highSpeed: boolean
    conventional: boolean
    otherProduction: boolean
  }
  lastUpdated: {
    highSpeed?: Date
    conventional?: Date
    otherProduction?: Date
  }
}

// 路局定员统计数据
export interface BureauStaffingStats {
  bureauId: string        // 路局ID
  bureauName: string      // 路局名称
  standard: StaffingStandard // 定员标准
  units: UnitStaffingStats[] // 各客运段数据
  totals: {
    highSpeed: number     // 高铁总定员
    conventional: number  // 普速总定员
    otherProduction: number // 其余生产总定员
    grandTotal: number    // 全局总定员
  }
  calculationStatus: {
    completed: number     // 已完成计算的单位数
    total: number        // 总单位数
    percentage: number   // 完成百分比
  }
}

// 规则对比数据
export interface RuleComparisonData {
  bureauId: string
  bureauName: string
  
  // 预备率对比
  reserveRates: {
    mainProduction: {
      beijing: number
      shijiazhuang: number
      tianjin: number
    }
    otherProduction: number
  }
  
  // 高铁规则对比
  highSpeedRules: {
    totalRules: number
    ruleTypes: string[]
    keyDifferences: string[]
    detailedRules: Array<{
      name: string
      description: string
      conditions: any
      staffing: any
    }>
  }
  
  // 普速规则对比
  conventionalRules: {
    totalRules: number
    ruleTypes: string[]
    keyDifferences: string[]
    detailedRules: Array<{
      name: string
      description: string
      conditions: any
      staffing: any
    }>
  }
  
  // 其余生产规则对比
  otherProductionRules: {
    totalRules: number
    configTypes: string[]
    keyDifferences: string[]
    detailedRules: Array<{
      name: string
      description: string
      configType: string
      config: any
    }>
  }
  
  // 标准工时
  standardWorkHours: number
}

// 规则差异分析
export interface RuleDifference {
  field: string           // 字段名
  bureauValues: {        // 各局的值
    [bureauId: string]: any
  }
  isDifferent: boolean   // 是否有差异
  description: string    // 差异描述
}

// 统计图表数据
export interface ChartData {
  // 饼图数据
  pieChartData: {
    name: string
    value: number
    color: string
  }[]
  
  // 柱状图数据
  barChartData: {
    bureauName: string
    highSpeed: number
    conventional: number
    otherProduction: number
    total: number
  }[]
  
  // 对比数据
  comparisonData: {
    bureauName: string
    reserveRate: number
    totalRules: number
    standardWorkHours: number
  }[]
}

// 导出配置
export interface ExportConfig {
  includeStaffingStats: boolean
  includeRuleComparison: boolean
  includeCharts: boolean
  format: 'xlsx' | 'csv' | 'pdf'
  filename?: string
}

// 实时同步状态
export interface SyncStatus {
  isLoading: boolean
  lastSyncTime: Date
  errors: string[]
  pendingUpdates: number
}