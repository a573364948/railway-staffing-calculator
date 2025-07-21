import type { DynamicTrainData } from "@/types/dynamic-train-data"
import type { HighSpeedStaffingRule, StaffingStandard } from "@/types/staffing-rules"
import { TRAIN_UNITS } from "@/types/dynamic-train-data"

// 导入标准工时常量
const STANDARD_WORK_HOURS = {
  BEIJING: 166.6,    // 北京局标准工时（系统基准）
  GUANGZHOU: 174,    // 广州局标准工时
  DEFAULT: 174       // 默认标准工时
} as const

// 导入预备率常量
const RESERVE_RATES = {
  MAIN_PRODUCTION: {
    DEFAULT: 8       // 默认主要生产预备率
  }
} as const

// 高铁规则匹配结果
export interface HighSpeedRuleMatch {
  rule: HighSpeedStaffingRule
  matchedConditions: string[] // 匹配的条件
}

// 高铁列车定员计算结果
export interface HighSpeedTrainStaffingResult {
  trainData: DynamicTrainData
  matchedRule: HighSpeedRuleMatch | null
  staffing: {
    trainConductor: number        // 显示用的整数值
    trainAttendant: number        // 显示用的整数值
    businessClassAttendant: number // 显示用的整数值
    total: number                 // 显示用的整数值
  }
  // 精确值（用于最终汇总计算）
  exactStaffing: {
    trainConductor: number        // 精确的小数值
    trainAttendant: number        // 精确的小数值
    businessClassAttendant: number // 精确的小数值
    total: number                 // 精确的小数值
  }
  groupCount: number // 调整后的组数
  adjustmentFactor: number // 调整系数
  isMatched: boolean // 是否成功匹配规则
  warnings: string[] // 警告信息
}

// 高铁单位定员汇总结果
export interface HighSpeedUnitStaffingResult {
  unitName: string
  standard: StaffingStandard
  trainResults: HighSpeedTrainStaffingResult[]
  summary: {
    totalTrains: number
    matchedTrains: number
    unmatchedTrains: number
    baseTotalStaff: number    // 基础定员（精确值求和后取整）
    reserveRate: number       // 预备率
    totalStaff: number        // 最终定员（含预备率，精确值计算后取整）
    coverageRate: number      // 规则覆盖率
  }
  unmatchedTrains: {
    trainData: DynamicTrainData
    reason: string
    suggestedAction: string
  }[]
}

// 数据字段提取器
export class DataExtractor {
  // 提取编组信息
  static extractFormation(trainData: DynamicTrainData): string | null {
    const possibleFields = [
      '编组', 'formation', '编组详情', 'Formation',
      '车型', '编组类型', '列车编组', '编组信息',
      '车型编组', '编组配置'
    ]

    for (const field of possibleFields) {
      const value = trainData[field]
      if (value && typeof value === 'string') {
        const trimmedValue = value.trim()
        // 排除空值标识符
        if (trimmedValue && trimmedValue !== '-' && trimmedValue !== '—' &&
            trimmedValue !== 'null' && trimmedValue !== 'NULL' &&
            trimmedValue !== 'undefined' && trimmedValue !== '无' &&
            trimmedValue !== '空' && trimmedValue !== 'N/A' &&
            trimmedValue !== 'n/a' && trimmedValue !== 'NA') {
          return trimmedValue
        }
      }
    }

    return null
  }

  // 提取运行时间（转换为小时）
  static extractRunningTime(trainData: DynamicTrainData): number {
    const possibleFields = ['单程工时', '运行时间', 'runningTime', '工时', '单程运行时间']
    
    for (const field of possibleFields) {
      const timeValue = trainData[field]
      if (!timeValue) continue
      
      // 处理时分格式 "4:28"
      if (typeof timeValue === 'string' && timeValue.includes(':')) {
        const [hours, minutes] = timeValue.split(':').map(Number)
        if (!isNaN(hours) && !isNaN(minutes)) {
          return hours + minutes / 60
        }
      }
      
      // 处理数字格式
      if (typeof timeValue === 'number') {
        return timeValue
      }
      
      // 处理字符串数字
      if (typeof timeValue === 'string') {
        const parsed = parseFloat(timeValue)
        if (!isNaN(parsed)) {
          return parsed
        }
      }
    }
    
    return 0
  }

  // 提取车次号
  static extractTrainNumber(trainData: DynamicTrainData): string {
    const possibleFields = ['车次', 'trainNumber', '列车号', '车次号']
    
    for (const field of possibleFields) {
      const value = trainData[field]
      if (value && typeof value === 'string' && value.trim()) {
        return value.trim()
      }
    }
    
    return 'Unknown'
  }

  // 提取序号
  static extractSequence(trainData: DynamicTrainData): string {
    const possibleFields = ['序号', 'sequence', '编号', 'id', 'index']
    
    for (const field of possibleFields) {
      const value = trainData[field]
      if (value && typeof value === 'string' && value.trim()) {
        return value.trim()
      }
      if (value && typeof value === 'number') {
        return value.toString()
      }
    }
    
    return 'unknown'
  }

  // 提取原始组数
  static extractGroupCount(trainData: DynamicTrainData): number {
    const possibleFields = ['组数', 'groupCount', '配备组数', '每组配备人数']
    
    for (const field of possibleFields) {
      const value = trainData[field]
      if (value) {
        // 尝试从字符串中提取数字
        if (typeof value === 'string') {
          const groupMatch = value.match(/(\d+)组/)
          if (groupMatch) {
            return Number.parseInt(groupMatch[1])
          }
          const parsed = parseFloat(value)
          if (!isNaN(parsed)) {
            return parsed
          }
        }
        if (typeof value === 'number') {
          return value
        }
      }
    }
    
    return 1 // 默认1组
  }

  // 检查列车是否有商务座车厢
  static hasBusinessClass(trainData: DynamicTrainData): boolean {
    const possibleFields = [
      '商务座', '商务座数', '商务座车厢', '商务车厢数', 'businessClass', 
      '商务车', '商务座车', '一等座商务座', 'BC', 'business'
    ]
    
    // 检查明确的商务座字段
    for (const field of possibleFields) {
      const value = trainData[field]
      if (value !== undefined && value !== null) {
        // 如果是数字，检查是否大于0
        if (typeof value === 'number') {
          return value > 0
        }
        // 如果是字符串，尝试解析数字
        if (typeof value === 'string') {
          const trimmedValue = value.trim()
          // 排除空值标识符
          if (trimmedValue === '-' || trimmedValue === '—' ||
              trimmedValue === 'null' || trimmedValue === 'NULL' ||
              trimmedValue === 'undefined' || trimmedValue === '无' ||
              trimmedValue === '空' || trimmedValue === 'N/A' ||
              trimmedValue === 'n/a' || trimmedValue === 'NA' ||
              trimmedValue === '') {
            continue // 跳过空值标识符，继续检查下一个字段
          }

          const num = parseFloat(trimmedValue.replace(/[^\d\.]/g, ''))
          if (!isNaN(num)) {
            return num > 0
          }
          // 检查是否包含表示有商务座的关键词
          const lowerValue = trimmedValue.toLowerCase()
          if (lowerValue.includes('商务') || lowerValue.includes('business')) {
            return !lowerValue.includes('无') && !lowerValue.includes('0')
          }
        }
      }
    }
    
    // 从编组信息中推断（仅当有有效编组信息时）
    const formation = this.extractFormation(trainData)
    if (formation) {
      const lowerFormation = formation.toLowerCase()
      // 某些车型通常有商务座
      if (lowerFormation.includes('crh380') ||
          lowerFormation.includes('crh2') ||
          lowerFormation.includes('长编组') ||
          lowerFormation.includes('16编组')) {
        return true
      }
    }

    // 如果编组信息为空或无效，默认认为没有商务座
    return false
  }

  // 提取商务座车厢数量
  static extractBusinessClassCount(trainData: DynamicTrainData): number {
    const possibleFields = [
      '商务座数', '商务座车厢', '商务车厢数', '商务座车厢数',
      'businessClassCount', 'businessClass', 'BC数量'
    ]
    
    for (const field of possibleFields) {
      const value = trainData[field]
      if (value !== undefined && value !== null) {
        if (typeof value === 'number') {
          return Math.max(0, value)
        }
        if (typeof value === 'string') {
          const trimmedValue = value.trim()
          // 排除空值标识符
          if (trimmedValue === '-' || trimmedValue === '—' ||
              trimmedValue === 'null' || trimmedValue === 'NULL' ||
              trimmedValue === 'undefined' || trimmedValue === '无' ||
              trimmedValue === '空' || trimmedValue === 'N/A' ||
              trimmedValue === 'n/a' || trimmedValue === 'NA' ||
              trimmedValue === '') {
            continue // 跳过空值标识符
          }

          const num = parseFloat(trimmedValue.replace(/[^\d\.]/g, ''))
          if (!isNaN(num)) {
            return Math.max(0, num)
          }
        }
      }
    }
    
    // 如果有商务座但没有明确数量，根据编组推断
    if (this.hasBusinessClass(trainData)) {
      const formation = this.extractFormation(trainData)
      if (formation) {
        // 根据常见编组配置推断商务座车厢数
        if (formation.includes('16编组') || formation.includes('长编组')) {
          return 1 // 长编组通常有1节商务座车厢
        }
        if (formation.includes('8编组') || formation.includes('短编组')) {
          return 1 // 短编组也可能有商务座
        }
      }
      return 1 // 默认1节
    }
    
    return 0 // 没有商务座
  }
}

// 高铁规则引擎
export class HighSpeedRuleEngine {
  private standard: StaffingStandard
  private rules: HighSpeedStaffingRule[]

  constructor(standard: StaffingStandard) {
    this.standard = standard
    this.rules = standard.highSpeedRules || []
  }

  // 匹配单趟列车的规则 - 使用完全匹配（忽略大小写）
  matchRule(trainData: DynamicTrainData): HighSpeedRuleMatch | null {
    if (this.rules.length === 0) return null

    const formation = DataExtractor.extractFormation(trainData)
    const runningTime = DataExtractor.extractRunningTime(trainData)

    if (!formation) return null

    console.log(`🔍 高铁规则完全匹配: 编组=${formation}, 运行时间=${runningTime}小时`)

    // 使用完全匹配逻辑，找到第一个完全匹配的规则就返回
    for (const rule of this.rules) {
      const match = this.evaluateRule(rule, formation, runningTime)
      if (match) {
        console.log(`✅ 找到完全匹配规则: ${rule.name}`)
        return match
      }
    }

    console.log(`⚠️ 未找到完全匹配的规则`)
    return null
  }

  // 评估单个规则的匹配情况 - 完全匹配模式
  private evaluateRule(
    rule: HighSpeedStaffingRule,
    formation: string,
    runningTime: number
  ): HighSpeedRuleMatch | null {
    const matchedConditions: string[] = []

    // 检查编组完全匹配
    const formationMatch = this.checkFormationMatch(rule, formation)
    if (!formationMatch.isMatch) return null // 编组不匹配，直接返回null

    matchedConditions.push(...formationMatch.conditions)

    // 检查时间限制完全匹配
    const timeMatch = this.checkTimeMatch(rule, runningTime)
    if (!timeMatch.isMatch) return null // 时间不匹配，直接返回null

    matchedConditions.push(...timeMatch.conditions)

    // 所有条件都完全匹配，返回结果
    return {
      rule,
      matchedConditions
    }
  }

  // 检查编组匹配 - 使用完全匹配（忽略大小写）
  private checkFormationMatch(rule: HighSpeedStaffingRule, formation: string) {
    // 编组必须完全匹配（忽略大小写）
    const formationConditions = rule.conditions.formation || []
    const formationLower = formation.toLowerCase().trim()

    const isMatch = formationConditions.some(condition =>
      formationLower === condition.toLowerCase().trim()
    )

    return {
      isMatch,
      conditions: isMatch ? [`编组完全匹配: ${formation}`] : []
    }
  }

  // 检查时间限制匹配
  private checkTimeMatch(rule: HighSpeedStaffingRule, runningTime: number) {
    const timeCondition = rule.conditions.runningTime

    // 如果规则没有时间限制，则匹配（优先级最高）
    if (!timeCondition || (!timeCondition.min && !timeCondition.max)) {
      return {
        isMatch: true,
        conditions: ['时间: 不限制(优先)']
      }
    }

    let isMatch = true
    const conditions: string[] = []

    // 检查最小时间
    if (timeCondition.min !== undefined) {
      if (runningTime >= timeCondition.min) {
        conditions.push(`时间 >= ${timeCondition.min}小时`)
      } else {
        isMatch = false
      }
    }

    // 检查最大时间
    if (timeCondition.max !== undefined) {
      if (runningTime <= timeCondition.max) {
        conditions.push(`时间 <= ${timeCondition.max}小时`)
      } else {
        isMatch = false
      }
    }

    return { isMatch, conditions }
  }

  // 计算单趟列车定员
  calculateTrainStaffing(trainData: DynamicTrainData): HighSpeedTrainStaffingResult {
    const trainNumber = trainData.车次 || trainData.trainNumber || "未知车次"
    console.log(`🚂 开始计算列车定员: ${trainNumber}`)

    // 详细记录商务座检测过程
    const formation = DataExtractor.extractFormation(trainData)

    console.log(`📊 ${trainNumber} 商务座检测详情:`)
    console.log(`   编组信息: "${formation}"`)

    const matchedRule = this.matchRule(trainData)
    const originalGroupCount = DataExtractor.extractGroupCount(trainData)
    const warnings: string[] = []

    if (!matchedRule) {
      console.log(`❌ ${trainNumber} 未找到匹配的定员规则`)
      return {
        trainData,
        matchedRule: null,
        staffing: { trainConductor: 0, trainAttendant: 0, businessClassAttendant: 0, total: 0 },
        exactStaffing: { trainConductor: 0, trainAttendant: 0, businessClassAttendant: 0, total: 0 },
        groupCount: originalGroupCount,
        adjustmentFactor: 1,
        isMatched: false,
        warnings: ['未找到匹配的定员规则']
      }
    }

    // 计算调整系数（基于标准工时）
    const adjustmentFactor = this.calculateAdjustmentFactor()
    const adjustedGroupCount = originalGroupCount * adjustmentFactor

    // 计算定员人数 - 修复精度问题并动态调整商务座服务员配置
    const ruleStaffing = matchedRule.rule.staffing
    
    // 检查列车是否实际有商务座车厢
    const hasBusinessClass = DataExtractor.hasBusinessClass(trainData)
    const businessClassCount = DataExtractor.extractBusinessClassCount(trainData)
    
    // 根据实际商务座情况调整商务座服务员配置
    let adjustedBusinessClassAttendant = 0
    console.log(`🔧 ${trainNumber} 商务座服务员调整逻辑:`)
    console.log(`   规则配置商务座服务员: ${ruleStaffing.businessClassAttendant || 0}`)
    console.log(`   是否有商务座: ${hasBusinessClass}`)
    console.log(`   商务座车厢数: ${businessClassCount}`)
    console.log(`   检测条件: hasBusinessClass=${hasBusinessClass}, businessClassCount=${businessClassCount}`)

    if (hasBusinessClass && businessClassCount > 0) {
      // 如果有商务座车厢，使用规则配置的商务座服务员数量
      adjustedBusinessClassAttendant = ruleStaffing.businessClassAttendant || 0
      console.log(`   ✅ 配置商务座服务员: ${adjustedBusinessClassAttendant}人`)
      // 可以根据商务座车厢数量进一步调整，例如：每个商务座车厢配置一定比例的服务员
      // adjustedBusinessClassAttendant = Math.max(1, Math.ceil(businessClassCount * (ruleStaffing.businessClassAttendant || 1)))
    } else {
      // 如果没有商务座车厢，商务座服务员数量为0
      adjustedBusinessClassAttendant = 0
      console.log(`   ❌ 取消商务座服务员配置`)
      if ((ruleStaffing.businessClassAttendant || 0) > 0) {
        warnings.push(`该列车无商务座车厢，已取消商务座服务员配置`)
      }
    }
    
    // 先计算总的标准定员（使用调整后的商务座服务员数量）
    const totalStandardStaff = ruleStaffing.trainConductor + ruleStaffing.trainAttendant + adjustedBusinessClassAttendant

    // 计算精确的定员数量（保留小数）
    const exactTotalStaff = totalStandardStaff * adjustedGroupCount

    // 按比例分配到各岗位（精确值）
    const trainConductorRatio = totalStandardStaff > 0 ? ruleStaffing.trainConductor / totalStandardStaff : 0
    const trainAttendantRatio = totalStandardStaff > 0 ? ruleStaffing.trainAttendant / totalStandardStaff : 0
    const businessClassRatio = totalStandardStaff > 0 ? adjustedBusinessClassAttendant / totalStandardStaff : 0

    // 精确值分配
    const exactTrainConductorStaff = exactTotalStaff * trainConductorRatio
    const exactTrainAttendantStaff = exactTotalStaff * trainAttendantRatio
    const exactBusinessClassStaff = exactTotalStaff * businessClassRatio

    // 显示用的整数值（向上取整）
    const displayTotalStaff = Math.ceil(exactTotalStaff)
    let displayTrainConductorStaff = Math.round(displayTotalStaff * trainConductorRatio)
    let displayTrainAttendantStaff = Math.round(displayTotalStaff * trainAttendantRatio)
    let displayBusinessClassStaff = Math.round(displayTotalStaff * businessClassRatio)

    // 调整显示值确保总数精确
    const allocatedTotal = displayTrainConductorStaff + displayTrainAttendantStaff + displayBusinessClassStaff
    const difference = displayTotalStaff - allocatedTotal

    // 将差值分配给人数最多的岗位
    if (difference !== 0) {
      if (displayTrainAttendantStaff >= displayTrainConductorStaff && displayTrainAttendantStaff >= displayBusinessClassStaff) {
        displayTrainAttendantStaff += difference
      } else if (displayTrainConductorStaff >= displayBusinessClassStaff) {
        displayTrainConductorStaff += difference
      } else {
        displayBusinessClassStaff += difference
      }
    }
    
    // 显示用的整数值
    const staffing = {
      trainConductor: Math.max(0, displayTrainConductorStaff),
      trainAttendant: Math.max(0, displayTrainAttendantStaff),
      businessClassAttendant: Math.max(0, displayBusinessClassStaff),
      total: displayTotalStaff
    }

    // 精确值（用于最终汇总）
    const exactStaffing = {
      trainConductor: Math.max(0, exactTrainConductorStaff),
      trainAttendant: Math.max(0, exactTrainAttendantStaff),
      businessClassAttendant: Math.max(0, exactBusinessClassStaff),
      total: exactTotalStaff
    }

    // 添加警告信息
    if (adjustmentFactor !== 1) {
      warnings.push(`组数已调整: ${originalGroupCount} → ${adjustedGroupCount.toFixed(2)} (系数: ${adjustmentFactor.toFixed(3)})`)
    }

    return {
      trainData,
      matchedRule,
      staffing,
      exactStaffing,
      groupCount: adjustedGroupCount,
      adjustmentFactor,
      isMatched: true,
      warnings
    }
  }

  // 计算调整系数（基于标准工时）
  private calculateAdjustmentFactor(): number {
    // 调整系数计算：基准标准工时 / 当前标准工时
    // 基准工时使用北京局标准（166.6小时），这是系统的基准标准工时
    const standardWorkHours = this.standard.standardWorkHours
    const baseWorkHours = STANDARD_WORK_HOURS.BEIJING // 系统基准工时（北京局标准）

    if (standardWorkHours && baseWorkHours) {
      return baseWorkHours / standardWorkHours
    }

    return 1 // 默认不调整
  }

  // 获取当前单位的主要生产预备率
  private getReserveRateByUnit(unitName: string): number {
    const unitKey = unitName === TRAIN_UNITS.beijing ? 'beijing' :
                    unitName === TRAIN_UNITS.shijiazhuang ? 'shijiazhuang' :
                    unitName === TRAIN_UNITS.tianjin ? 'tianjin' : 'beijing'

    // console.log('🔍 getReserveRateByUnit 调试信息:', {
    //   unitName,
    //   unitKey,
    //   reserveRates: this.standard.reserveRates,
    //   mainProduction: this.standard.reserveRates?.mainProduction,
    //   specificRate: this.standard.reserveRates?.mainProduction?.[unitKey]
    // })

    // 检查预备率配置是否存在
    if (!this.standard.reserveRates || !this.standard.reserveRates.mainProduction) {
      console.error('预备率配置不存在:', this.standard)
      return RESERVE_RATES.MAIN_PRODUCTION.DEFAULT / 100 // 默认8%
    }

    // 兼容性处理：如果 mainProduction 是数字（旧格式），使用该数字作为所有单位的预备率
    if (typeof this.standard.reserveRates.mainProduction === 'number') {
      console.warn('⚠️ 检测到旧格式的预备率配置，使用统一预备率:', this.standard.reserveRates.mainProduction)
      return this.standard.reserveRates.mainProduction / 100
    }
    
    const rate = this.standard.reserveRates.mainProduction[unitKey]
    if (rate === undefined || rate === null) {
      console.error(`❌ 找不到指定单位的预备率: unitKey="${unitKey}"`,
        'mainProduction配置:', JSON.stringify(this.standard.reserveRates.mainProduction, null, 2))
      return RESERVE_RATES.MAIN_PRODUCTION.DEFAULT / 100 // 默认8%
    }

    // console.log(`✅ 找到预备率: ${unitKey} = ${rate}%`)
    return rate / 100
  }

  // 计算单位高铁定员汇总 - 修复序号分组问题
  calculateUnitStaffing(highSpeedTrains: DynamicTrainData[], unitName: string = '北京客运段'): HighSpeedUnitStaffingResult {
    // 按序号分组，每个序号组只计算一次
    const groupedBySequence = highSpeedTrains.reduce((acc, train) => {
      const sequence = DataExtractor.extractSequence(train)
      if (!acc[sequence]) {
        acc[sequence] = []
      }
      acc[sequence].push(train)
      return acc
    }, {} as Record<string, DynamicTrainData[]>)

    // 为每个序号组选择代表性数据（第一条记录）进行计算
    const representativeTrains = Object.values(groupedBySequence).map(group => group[0])
    
    // 对代表性数据进行定员计算
    const trainResults = representativeTrains.map(train => this.calculateTrainStaffing(train))
    
    const matchedTrains = trainResults.filter(result => result.isMatched)
    const unmatchedTrains = trainResults
      .filter(result => !result.isMatched)
      .map(result => ({
        trainData: result.trainData,
        reason: result.warnings[0] || '未知原因',
        suggestedAction: this.getSuggestedAction(result.trainData)
      }))

    // 使用精确值计算基础定员和预备率
    const exactBaseTotalStaff = matchedTrains.reduce((sum, result) => sum + result.exactStaffing.total, 0)
    const reserveRate = this.getReserveRateByUnit(unitName)

    // 基础定员取整（精确值求和后取整）
    const baseTotalStaff = Math.ceil(exactBaseTotalStaff)

    // 最终定员：使用精确值计算预备率，最后取整
    const exactTotalWithReserve = exactBaseTotalStaff * (1 + reserveRate)
    const totalStaff = Math.ceil(exactTotalWithReserve)

    const totalGroups = Object.keys(groupedBySequence).length
    const coverageRate = totalGroups > 0 ? (matchedTrains.length / totalGroups) * 100 : 100

    console.log(`📊 高铁定员汇总计算:`)
    console.log(`   精确基础定员: ${exactBaseTotalStaff.toFixed(2)}人`)
    console.log(`   基础定员(取整): ${baseTotalStaff}人`)
    console.log(`   预备率: ${(reserveRate * 100).toFixed(1)}%`)
    console.log(`   精确总定员: ${exactTotalWithReserve.toFixed(2)}人`)
    console.log(`   最终定员(取整): ${totalStaff}人`)

    return {
      unitName: this.standard.name,
      standard: this.standard,
      trainResults,
      summary: {
        totalTrains: totalGroups, // 使用序号组数而不是原始数据条数
        matchedTrains: matchedTrains.length,
        unmatchedTrains: unmatchedTrains.length,
        baseTotalStaff, // 基础定员（精确值求和后取整）
        reserveRate, // 预备率
        totalStaff, // 最终定员（精确值计算预备率后取整）
        coverageRate
      },
      unmatchedTrains
    }
  }

  // 生成建议操作
  private getSuggestedAction(trainData: DynamicTrainData): string {
    const formation = DataExtractor.extractFormation(trainData)
    const runningTime = DataExtractor.extractRunningTime(trainData)
    
    if (!formation) {
      return '请检查列车编组信息是否完整'
    }
    
    const timeCategory = runningTime < 12 ? '12小时以下' : '12小时以上'
    return `建议为 "${formation}" 编组配置 "${timeCategory}" 的定员规则`
  }

  // 获取规则覆盖分析 - 基于序号分组
  getUnmatchedAnalysis(highSpeedTrains: DynamicTrainData[]) {
    // 按序号分组
    const groupedBySequence = highSpeedTrains.reduce((acc, train) => {
      const sequence = DataExtractor.extractSequence(train)
      if (!acc[sequence]) {
        acc[sequence] = []
      }
      acc[sequence].push(train)
      return acc
    }, {} as Record<string, DynamicTrainData[]>)

    // 获取代表性数据
    const representativeTrains = Object.values(groupedBySequence).map(group => group[0])
    
    // 找出未匹配的列车组
    const unmatchedTrains = representativeTrains.filter(train => !this.matchRule(train))
    
    const formationStats: Record<string, number> = {}
    const timeStats: Record<string, number> = {}
    
    unmatchedTrains.forEach(train => {
      const formation = DataExtractor.extractFormation(train) || '未知编组'
      const runningTime = DataExtractor.extractRunningTime(train)
      const timeCategory = runningTime < 12 ? '12小时以下' : '12小时以上'
      
      formationStats[formation] = (formationStats[formation] || 0) + 1
      timeStats[timeCategory] = (timeStats[timeCategory] || 0) + 1
    })
    
    return {
      unmatchedCount: unmatchedTrains.length,
      byFormation: formationStats,
      byTimeCategory: timeStats,
      samples: unmatchedTrains.slice(0, 5).map(train => ({
        trainNumber: DataExtractor.extractTrainNumber(train),
        formation: DataExtractor.extractFormation(train),
        runningTime: DataExtractor.extractRunningTime(train)
      }))
    }
  }
}