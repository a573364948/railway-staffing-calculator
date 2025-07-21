// 定员规则相关类型定义

export type RailwayBureau = "beijing" | "guangzhou" | "shanghai" | "jinan" | "shenyang" | "wuhan" | "zhengzhou" | "chengdu" | "custom"

export const RAILWAY_BUREAUS = {
  beijing: "北京局",
  guangzhou: "广州局", 
  shanghai: "上海局",
  jinan: "济南局",
  shenyang: "沈阳局",
  wuhan: "武汉局",
  zhengzhou: "郑州局",
  chengdu: "成都局",
  custom: "自定义"
} as const

// 基础定员标准
export interface StaffingStandard {
  id: string
  name: string // 标准名称，如"北京局标准"
  bureau: RailwayBureau
  standardWorkHours: number // 标准工时，如166.6
  description?: string
  createdAt: Date
  updatedAt: Date
  
  // 预备率配置
  reserveRates: {
    // 按客运段分别设置主要生产组预备率
    mainProduction: {
      beijing: number      // 北京客运段预备率，如8%
      shijiazhuang: number // 石家庄客运段预备率，如8%
      tianjin: number      // 天津客运段预备率，如8%
    }
    otherProduction: number // 其余生产预备率（全局统一），如6%
  }
  
  // 三大类定员规则
  highSpeedRules: HighSpeedStaffingRule[]
  conventionalRules: ConventionalStaffingRule[]
  otherProductionRules: OtherProductionRule[]
}

// 高铁定员规则
export interface HighSpeedStaffingRule {
  id: string
  name: string // 规则名称，如"短编组"
  description?: string
  
  // 匹配条件
  conditions: {
    trainType?: string[] // 车型，如["CR200J", "CRH380D"]
    formation?: string[] // 编组，如["短编组", "8编组"]
    runningTime?: {
      min?: number // 最小运行时间(小时)
      max?: number // 最大运行时间(小时)
    }
    specialType?: string[] // 特殊类型，如["动卧", "商务座"]
  }
  
  // 人员配置
  staffing: {
    trainConductor: number // 列车长
    trainAttendant: number // 列车员
    businessClassAttendant?: number // 商务座服务员
    diningService?: number // 餐服人员
    [otherRole: string]: number | undefined // 其他角色
  }
}

// 普速定员规则
export interface ConventionalStaffingRule {
  id: string
  name: string // 规则名称，如"K快车-4小时以内"
  description?: string

  // 匹配条件
  conditions: {
    // 运行时间范围（可选，如果不设置则适用于所有时间范围）
    runningTimeRange?: 'under4' | '4to12' | '12to24' | 'over24'

    // 列车类型（基于编组字段）
    trainTypes: string[] // ['国际联运', '正常列车']

    // 行李员配置
    baggageStaffWhenHasBaggage?: number // 有行李车时配备的行李员人数，默认为0

    // 特殊属性
    isInternational?: boolean // 是否国际联运
    hasRestaurant?: boolean   // 是否有餐车
  }

  // 人员配置
  staffing: {
    trainConductor: number // 列车长

    // 列车员配置（按车型）
    trainAttendants: {
      seatCar: { // 座车
        ratio: string // 如"1人1车"、"2人1车"
        minStaff: number
      }
      softSleeper: { // 软卧车
        ratio: string
        minStaff: number
      }
      hardSleeper: { // 硬卧车
        ratio: string
        minStaff: number
      }
    }

    // 其他岗位
    translator: number       // 翻译（国际联运专用）
    trainOperator: number    // 运转车长

    // 额外人员配置
    additionalStaff?: {
      broadcaster?: number     // 额外广播员人数（0表示由列车员兼任）
      trainDutyOfficer?: number // 额外列车值班员人数（0表示由列车员兼任）
    }

    // 行李员配置（当有行李车时）
    baggageStaffConfig?: {
      enabled: boolean         // 是否启用行李员配置
      staffPerTrain: number    // 每列车配备的行李员总数
    }

    // 餐车人员配置（当有餐车时）
    diningCarStaff?: {
      enabled: boolean         // 是否启用餐车人员配置
      rules: {
        under24h: number      // 运行时间24小时以内的人员数量
        over24h: number       // 运行时间24小时以上的人员数量
      }
    }

    // 售货人员配置（当没有餐车时）
    salesStaff?: {
      enabled: boolean         // 是否启用售货人员配置
      staffPerGroup: number    // 没有餐车时每组配备的售货人员数量
    }
  }

  // 特殊说明
  notes?: string[]

  bureauId: string
  createdAt: Date
}

// 其余生产规则
export interface OtherProductionRule {
  id: string
  name: string // 规则名称，如"安全调度"
  description?: string
  
  // 配置方式
  configType: "percentage" | "fixed" | "formula" | "segmented_percentage"
  
  // 配置值
  config: {
    // 现有配置（保持兼容）
    percentage?: number // 按比例，如5%
    fixedCount?: number // 固定人数
    formula?: string // 计算公式
    baseOn?: "mainProduction" | "totalProduction" // 基于什么计算
    
    // 新增：分段配置
    segments?: {
      highSpeed?: {
        percentage: number // 高铁定员比例
        minValue?: number  // 最小值（可选）
        maxValue?: number  // 最大值（可选）
      }
      conventional?: {
        percentage: number // 普速定员比例
        minValue?: number  // 最小值（可选）
        maxValue?: number  // 最大值（可选）
      }
    }
    
    // 新增：计算模式
    calculationMode?: "sum" | "average" | "weighted"
  }
  
  // 具体岗位配置
  positions?: {
    [positionName: string]: number // 岗位名称: 人数
  }
}

// 规则匹配结果
export interface RuleMatchResult {
  rule: HighSpeedStaffingRule | ConventionalStaffingRule
  matchedConditions: string[] // 匹配的条件
}

// 定员计算结果
export interface StaffingCalculationResult {
  id: string
  standardId: string
  standardName: string
  calculatedAt: Date
  
  // 计算参数
  parameters: {
    selectedUnits: string[]
    selectedTypes: ("highSpeed" | "conventional" | "otherProduction")[]
    baseWorkHours: number
  }
  
  // 按单位的计算结果
  unitResults: {
    [unitName: string]: UnitStaffingResult
  }
  
  // 总体汇总
  totalSummary: StaffingSummary
}

export interface UnitStaffingResult {
  unitName: string
  
  // 详细计算结果
  highSpeedStaffing: DetailedStaffingItem[]
  conventionalStaffing: DetailedStaffingItem[]
  otherProductionStaffing: OtherProductionStaffingItem[]
  
  // 单位汇总
  unitSummary: StaffingSummary
}

export interface DetailedStaffingItem {
  // 原始数据信息
  originalData: {
    id: string
    sequence: number
    trainNumber: string
    trainType: string
    formation: string
    runningSection: string
    originalGroupCount: number
    [key: string]: any
  }
  
  // 匹配的规则
  appliedRule: HighSpeedStaffingRule | ConventionalStaffingRule
  
  // 调整后的配备组数
  adjustedGroupCount: number
  adjustmentFactor: number
  
  // 计算出的人员需求
  staffingRequirement: {
    trainConductor: number
    trainAttendant: number
    [otherRole: string]: number
  }
  
  // 总人数
  totalStaff: number
}

export interface OtherProductionStaffingItem {
  ruleName: string
  configType: string
  baseValue: number
  calculatedValue: number
  positions: {
    [positionName: string]: number
  }
}

export interface StaffingSummary {
  // 按类别汇总
  highSpeedTotal: number
  conventionalTotal: number
  otherProductionTotal: number
  
  // 按角色汇总
  roleBreakdown: {
    [roleName: string]: number
  }
  
  // 总计
  grandTotal: number
  
  // 对比信息
  comparison?: {
    originalTotal: number
    adjustedTotal: number
    difference: number
    percentageChange: number
  }
}
