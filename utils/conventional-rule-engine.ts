import type { DynamicTrainData } from "@/types/dynamic-train-data"
import type { StaffingStandard } from "@/types/staffing-rules"
import { TRAIN_UNITS } from "@/types/dynamic-train-data"

// 导入预备率常量
const RESERVE_RATES = {
  MAIN_PRODUCTION: {
    DEFAULT: 8       // 默认主要生产预备率
  }
} as const
import type { 
  ConventionalStaffingRule
} from "@/types/staffing-rules"

// 普速列车类型
export type ConventionalTrainType = "直达列车" | "K快车" | "T特快列车" | "Z直达特快" | "国际联运" | "正常列车"

// 运行时间范围
export type RunningTimeRange = "under4" | "4to12" | "12to24" | "over24"

// 普速规则匹配结果
export interface ConventionalRuleMatch {
  rule: ConventionalStaffingRule
  matchConditions: {
    trainType?: boolean
    runningTime?: boolean
    formation?: boolean
  }
}

// 普速列车定员计算结果
export interface ConventionalTrainStaffingResult {
  trainData: DynamicTrainData
  matchedRule: ConventionalRuleMatch | null
  groupCount: number  // 配备组数
  staffing: {
    trainConductor: number
    trainAttendants: {
      seatCar: number
      hardSleeper: number
      softSleeper: number
      diningCar: number
    }
    operationConductor: number
    translator: number
    additionalStaff: {
      broadcaster: number
      trainDutyOfficer: number
    }
    baggageStaff: number
    diningCarStaff: number
    salesStaff: number
    total: number
  }
  // 精确值（用于最终汇总计算）
  exactStaffing: {
    trainConductor: number
    trainAttendants: {
      seatCar: number
      hardSleeper: number
      softSleeper: number
      diningCar: number
    }
    operationConductor: number
    translator: number
    additionalStaff: {
      broadcaster: number
      trainDutyOfficer: number
    }
    baggageStaff: number
    diningCarStaff: number
    salesStaff: number
    total: number
  }
  // 每组人员配置（用于显示每组配置）
  perGroupStaffing: {
    trainConductor: number
    trainAttendants: {
      seatCar: number
      hardSleeper: number
      softSleeper: number
      diningCar: number
    }
    operationConductor: number
    translator: number
    additionalStaff: {
      broadcaster: number
      trainDutyOfficer: number
    }
    baggageStaff: number
    diningCarStaff: number
    salesStaff: number
    total: number
  }
  isMatched: boolean
  warnings: string[]
}

// 普速单位定员汇总结果
export interface ConventionalUnitStaffingResult {
  unitName: string
  standard: StaffingStandard
  trainResults: ConventionalTrainStaffingResult[]
  summary: {
    totalTrains: number
    matchedTrains: number
    unmatchedTrains: number
    baseTotalStaff: number    // 基础定员（精确值求和后取整）
    reserveRate: number       // 预备率
    totalStaff: number        // 最终定员（含预备率，精确值计算后取整）
    coverageRate: number      // 规则覆盖率
    // 新增：人员配置汇总
    staffingBreakdown: {
      trainConductor: number
      trainAttendants: {
        seatCar: number
        hardSleeper: number
        softSleeper: number
        diningCar: number
        total: number
      }
      operationConductor: number
        translator: number
      additionalStaff: {
        broadcaster: number
        trainDutyOfficer: number
        total: number
      }
      baggageStaff: number
      diningCarStaff: number
      salesStaff: number
    }
    // 新增：每组人员配置汇总（用于显示每组配置）
    perGroupBreakdown: {
      trainConductor: number
      trainAttendants: {
        seatCar: number
        hardSleeper: number
        softSleeper: number
        diningCar: number
        total: number
      }
      operationConductor: number
        translator: number
      additionalStaff: {
        broadcaster: number
        trainDutyOfficer: number
        total: number
      }
      baggageStaff: number
      diningCarStaff: number
      salesStaff: number
      totalGroups: number  // 总组数
    }
  }
  unmatchedTrains: ConventionalTrainStaffingResult[]
}

// 数据提取器
export class ConventionalDataExtractor {
  // 提取列车类型
  static extractTrainType(trainData: DynamicTrainData): ConventionalTrainType | null {
    // 优先使用类别字段（普速列车的正确做法）
    const category = trainData['类别'] || trainData['编组类型'] || ""
    const categoryStr = category.toString().toLowerCase()
    
    // 国际联运优先识别
    if (categoryStr.includes('国际联运') || categoryStr.includes('国际')) return "国际联运"
    
    // 按类型识别（基于类别字段）
    if (categoryStr.includes('z直达') || categoryStr.includes('z字头') || categoryStr.includes('z')) return "Z直达特快"
    if (categoryStr.includes('k快车') || categoryStr.includes('k字头') || categoryStr.includes('k')) return "K快车"
    if (categoryStr.includes('t特快') || categoryStr.includes('t字头') || categoryStr.includes('t')) return "T特快列车"
    
    // 备用：从车次号推断
    const trainNumber = trainData.车次 as string
    if (trainNumber) {
      const upperTrainNumber = trainNumber.toUpperCase()
      if (upperTrainNumber.startsWith('Z')) return "Z直达特快" // Z字头识别为Z直达特快
      if (upperTrainNumber.startsWith('K')) return "K快车"
      if (upperTrainNumber.startsWith('T')) return "T特快列车"
    }
    
    // 最后回退：如果是普速列车但无法具体识别类型，默认返回K快车（可以被正常列车规则匹配）
    const trainNumberStr = (trainNumber || "").toString()
    if (trainNumberStr && !trainNumberStr.match(/^[GDC]\d+/) && 
        !categoryStr.includes('高速') && !categoryStr.includes('动车')) {
      console.log(`⚠️ 无法精确识别普速列车类型，默认为K快车: ${trainNumber}`)
      return "K快车"
    }
    
    return null
  }

  // 提取运行时间
  static extractRunningTime(trainData: DynamicTrainData): number {
    // 优先使用单程运行时间字段
    const runningTimeField = trainData.单程运行时间 as string
    if (runningTimeField) {
      const time = parseFloat(runningTimeField)
      if (!isNaN(time)) return time
    }
    
    // 备用：从始发终到时间计算
    const startTime = trainData.始发时间 as string
    const endTime = trainData.终到时间 as string
    if (startTime && endTime) {
      try {
        const [startHour, startMin] = startTime.split(':').map(Number)
        const [endHour, endMin] = endTime.split(':').map(Number)
        
        let hours = endHour - startHour
        let minutes = endMin - startMin
        
        if (minutes < 0) {
          hours -= 1
          minutes += 60
        }
        
        if (hours < 0) {
          hours += 24 // 跨天情况
        }
        
        return hours + minutes / 60
      } catch (error) {
        console.warn('时间解析失败:', { startTime, endTime, error })
      }
    }
    
    return 0
  }

  // 获取时间范围
  static getTimeRange(runningTime: number): RunningTimeRange {
    if (runningTime < 4) return "under4"
    if (runningTime < 12) return "4to12"
    if (runningTime < 24) return "12to24"
    return "over24"
  }

  // 提取编组详情（普速列车从编组详情字段获取，或从独立字段构建）
  static extractFormation(trainData: DynamicTrainData): string {
    // 首先检查是否有独立的车厢类型字段
    const individualFields = ['硬座', '软座', '硬卧', '软卧', '餐车', '行李车', '宿营车']
    const hasIndividualFields = individualFields.some(field => {
      const value = trainData[field]
      return value !== undefined && value !== null && value !== '' && value !== '0' && Number(value) > 0
    })
    
    if (hasIndividualFields) {
      // 从独立字段构建编组详情文本
      const parts: string[] = []
      
      const hardSeat = Number(trainData['硬座'] || 0)
      const softSeat = Number(trainData['软座'] || 0)
      const hardSleeper = Number(trainData['硬卧'] || 0)
      const softSleeper = Number(trainData['软卧'] || 0)
      const diningCar = Number(trainData['餐车'] || 0)
      const baggageCar = Number(trainData['行李车'] || 0)
      const accommodationCar = Number(trainData['宿营车'] || 0)
      
      if (hardSeat > 0) parts.push(`硬座${hardSeat}`)
      if (softSeat > 0) parts.push(`软座${softSeat}`)
      if (hardSleeper > 0) parts.push(`硬卧${hardSleeper}`)
      if (softSleeper > 0) parts.push(`软卧${softSleeper}`)
      if (diningCar > 0) parts.push(`餐车${diningCar}`)
      if (baggageCar > 0) parts.push(`行李车${baggageCar}`)
      if (accommodationCar > 0) parts.push(`宿营车${accommodationCar}`)
      
      const constructedFormation = parts.join('')
      console.log(`🔧 从独立字段构建编组详情: ${constructedFormation}`)
      return constructedFormation
    }
    
    // 备用：使用合并的编组详情字段
    return trainData['编组详情'] as string || trainData.编组详情 as string || ""
  }

  // 解析编组详情
  static parseFormationDetails(formationText: string) {
    const details = {
      seatCarCount: 0,
      hardSleeperCount: 0,
      softSleeperCount: 0,
      diningCarCount: 0,
      baggageCarCount: 0,
      totalCars: 0
    }

    if (!formationText) {
      console.log(`⚠️ 编组详情为空，无法解析车厢信息`)
      return details
    }

    console.log(`🔍 解析编组详情: ${formationText}`)

    // 解析各种车厢类型
    const seatMatch = formationText.match(/座车?(\d+)/i) || formationText.match(/硬座(\d+)/i)
    if (seatMatch) {
      details.seatCarCount = parseInt(seatMatch[1])
      console.log(`   硬座/座车: ${details.seatCarCount}`)
    }

    const hardSleeperMatch = formationText.match(/硬卧(\d+)/i)
    const accommodationMatch = formationText.match(/宿营车(\d+)/i)
    
    const hardSleeperCount = hardSleeperMatch ? parseInt(hardSleeperMatch[1]) : 0
    const accommodationCount = accommodationMatch ? parseInt(accommodationMatch[1]) : 0
    
    details.hardSleeperCount = hardSleeperCount + accommodationCount
    
    if (hardSleeperCount > 0 || accommodationCount > 0) {
      console.log(`   硬卧: ${hardSleeperCount}节 + 宿营车: ${accommodationCount}节 = 总计: ${details.hardSleeperCount}节`)
    }

    const softSleeperMatch = formationText.match(/软卧(\d+)/i)
    if (softSleeperMatch) {
      details.softSleeperCount = parseInt(softSleeperMatch[1])
      console.log(`   软卧: ${details.softSleeperCount}`)
    }

    const diningMatch = formationText.match(/餐车(\d+)/i)
    if (diningMatch) {
      details.diningCarCount = parseInt(diningMatch[1])
      console.log(`   餐车: ${details.diningCarCount}`)
    }

    const baggageMatch = formationText.match(/行李(\d+)/i) || formationText.match(/行李车(\d+)/i)
    if (baggageMatch) {
      details.baggageCarCount = parseInt(baggageMatch[1])
      console.log(`   行李车: ${details.baggageCarCount}`)
    }

    // 计算总车厢数
    details.totalCars = details.seatCarCount + details.hardSleeperCount + 
                       details.softSleeperCount + details.diningCarCount + details.baggageCarCount

    console.log(`✅ 编组解析完成，总车厢数: ${details.totalCars}`)
    return details
  }

  // 提取序号
  static extractSequence(trainData: DynamicTrainData): string {
    const possibleFields = ['序号', 'sequence', 'id', 'trainSequence', 'trainId', '编号']

    for (const field of possibleFields) {
      const value = trainData[field]
      if (value !== undefined && value !== null && value !== '') {
        return value.toString().trim()
      }
    }

    // 备用：使用车次作为序号
    const trainNumber = trainData['车次'] || trainData.trainNumber
    if (trainNumber) {
      return trainNumber.toString().trim()
    }

    return 'unknown'
  }

  // 提取配备组数
  static extractGroupCount(trainData: DynamicTrainData): number {
    const possibleFields = ['组数', 'groupCount', '配备组数', '每组配备人数', '配备', '组', '班组数']

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
          if (!isNaN(parsed) && parsed > 0) {
            return parsed
          }
        }
        if (typeof value === 'number' && value > 0) {
          return value
        }
      }
    }

    return 1 // 默认1组
  }
}

// 普速规则引擎
export class ConventionalRuleEngine {
  private standard: StaffingStandard
  private rules: ConventionalStaffingRule[]

  constructor(standard: StaffingStandard) {
    this.standard = standard
    this.rules = standard.conventionalRules || []
  }

  // 匹配单趟列车的规则 - 使用层次化匹配策略
  matchRule(trainData: DynamicTrainData): ConventionalRuleMatch | null {
    if (this.rules.length === 0) return null

    const trainType = ConventionalDataExtractor.extractTrainType(trainData)
    const runningTime = ConventionalDataExtractor.extractRunningTime(trainData)
    const formation = ConventionalDataExtractor.extractFormation(trainData)
    const timeRange = ConventionalDataExtractor.getTimeRange(runningTime)

    console.log(`🔍 普速规则匹配: 列车类型=${trainType}, 运行时间=${runningTime}小时, 时间范围=${timeRange}, 编组=${formation}`)

    // 第一层：精确匹配 - 按优先级顺序匹配（直达列车 > 国际联运 > 其他类型）
    
    // 1.1 最高优先级：直达列车规则
    for (const rule of this.rules) {
      if (rule.conditions.trainTypes.includes('直达列车')) {
        // 检查列车类型是否匹配Z直达特快
        if (trainType === 'Z直达特快') {
          // 检查时间范围匹配
          if (!rule.conditions.runningTimeRange || rule.conditions.runningTimeRange === timeRange) {
            console.log(`🥇 找到直达列车规则(最高优先级): ${rule.name}`)
            return {
              rule,
              matchConditions: { trainType: true, runningTime: true, formation: true }
            }
          }
        }
      }
    }

    // 1.2 高优先级：其他精确匹配规则（国际联运等）
    for (const rule of this.rules) {
      // 跳过直达列车规则（已在上面处理）
      if (rule.conditions.trainTypes.includes('直达列车')) {
        continue
      }

      const matchConditions = {
        trainType: false,
        runningTime: false,
        formation: false
      }

      // 列车类型必须完全匹配
      if (!trainType || !rule.conditions.trainTypes.includes(trainType)) {
        continue // 列车类型不匹配，跳过此规则
      }
      matchConditions.trainType = true

      // 运行时间范围匹配（如果规则指定了时间范围，则必须匹配；如果未指定，则适用于所有时间范围）
      if (rule.conditions.runningTimeRange && rule.conditions.runningTimeRange !== timeRange) {
        continue // 时间范围不匹配，跳过此规则
      }
      matchConditions.runningTime = true

      // 编组类型匹配（暂时跳过，因为当前界面没有编组匹配要求）
      matchConditions.formation = true

      // 所有条件都匹配，返回此规则
      console.log(`✅ 找到精确匹配规则: ${rule.name}`)
      return {
        rule,
        matchConditions
      }
    }

    // 第二层：类型匹配 - 只匹配列车类型和时间范围，忽略编组
    if (trainType) {
      for (const rule of this.rules) {
        if (rule.conditions.trainTypes.includes(trainType)) {
          // 检查时间范围匹配
          if (!rule.conditions.runningTimeRange || rule.conditions.runningTimeRange === timeRange) {
            console.log(`🔶 找到类型匹配规则: ${rule.name} (忽略编组要求)`)
            return {
              rule,
              matchConditions: { trainType: true, runningTime: true, formation: false }
            }
          }
        }
      }
    }

    // 第三层：正常列车回退匹配 - 如果不是国际联运，则匹配正常列车规则
    const category = trainData['类别'] || trainData['编组类型'] || "" // 获取类别字段（普速列车不应该使用编组字段）
    const categoryLower = category.toString().toLowerCase()
    const isInternational = categoryLower.includes('国际联运') || categoryLower.includes('国际')
    
    if (!isInternational) {
      console.log(`🔄 尝试正常列车回退匹配...`)
      
      // 优先匹配时间范围相符的正常列车规则
      for (const rule of this.rules) {
        if (rule.conditions.trainTypes.includes('正常列车')) {
          if (!rule.conditions.runningTimeRange || rule.conditions.runningTimeRange === timeRange) {
            console.log(`🔶 找到正常列车规则(时间匹配): ${rule.name}`)
            return {
              rule,
              matchConditions: { trainType: true, runningTime: true, formation: false }
            }
          }
        }
      }
      
      // 如果没有时间匹配的，使用任意正常列车规则
      const normalTrainRule = this.rules.find(rule => rule.conditions.trainTypes.includes('正常列车'))
      if (normalTrainRule) {
        console.log(`🔶 找到正常列车规则(通用): ${normalTrainRule.name}`)
        return {
          rule: normalTrainRule,
          matchConditions: { trainType: true, runningTime: false, formation: false }
        }
      }
    }

    // 记录未匹配规则的详细信息
    const unmatchedDetails = {
      trainNumber: trainData['车次'],
      trainType,
      runningTime,
      timeRange,
      formation,
      category: trainData['类别']
    }
    
    console.warn(`❌ 未找到匹配的定员规则:`, unmatchedDetails)
    console.warn(`📋 当前可用规则:`, this.rules.map(r => ({ name: r.name, trainTypes: r.conditions.trainTypes, timeRange: r.conditions.runningTimeRange })))
    
    return null
  }

  // 计算按比例配置的人员数量
  private calculateStaffByRatio(ratio: string, carCount: number, minStaff: number): number {
    console.log(`📊 计算人员比例: ${ratio}, 车厢数: ${carCount}, 最少人数: ${minStaff}`)
    
    if (ratio.includes('1人1车') || ratio.includes('1人/车')) {
      const result = Math.max(carCount, minStaff)
      console.log(`   → 1人1车规则，结果: ${result}`)
      return result
    } else if (ratio.includes('1人2车') || ratio.includes('1人/2车')) {
      const result = Math.max(Math.ceil(carCount / 2), minStaff)
      console.log(`   → 1人2车规则，结果: ${result}`)
      return result
    } else if (ratio.includes('1人3车') || ratio.includes('1人/3车')) {
      const result = Math.max(Math.ceil(carCount / 3), minStaff)
      console.log(`   → 1人3车规则，结果: ${result}`)
      return result
    } else if (ratio.includes('2人1车') || ratio.includes('2人/车')) {
      const result = Math.max(carCount * 2, minStaff)
      console.log(`   → 2人1车规则，结果: ${result}`)
      return result
    } else if (ratio.includes('2人3车') || ratio.includes('2人/3车')) {
      const result = Math.max(Math.ceil(carCount * 2 / 3), minStaff)
      console.log(`   → 2人3车规则，结果: ${result}`)
      return result
    } else if (ratio.includes('3人2车') || ratio.includes('3人/2车')) {
      const result = Math.max(Math.ceil(carCount * 3 / 2), minStaff)
      console.log(`   → 3人2车规则，结果: ${result}`)
      return result
    }
    
    console.log(`   → 未匹配到规则，使用最少人数: ${minStaff}`)
    return minStaff
  }

  // 计算单趟列车定员
  calculateTrainStaffing(trainData: DynamicTrainData): ConventionalTrainStaffingResult {
    console.log(`🚆 开始计算普速列车定员:`, trainData['车次'])
    console.log(`📊 列车数据:`, trainData)

    const matchedRule = this.matchRule(trainData)
    const warnings: string[] = []
    const groupCount = ConventionalDataExtractor.extractGroupCount(trainData)

    console.log(`📋 配备组数: ${groupCount}`)

    if (!matchedRule) {
      const emptyStaffing = {
        trainConductor: 0,
        trainAttendants: { seatCar: 0, hardSleeper: 0, softSleeper: 0, diningCar: 0 },
        operationConductor: 0,
        translator: 0,
        additionalStaff: { broadcaster: 0, trainDutyOfficer: 0 },
        baggageStaff: 0,
        diningCarStaff: 0,
        salesStaff: 0,
        total: 0
      }

      const emptyPerGroupStaffing = {
        trainConductor: 0,
        trainAttendants: { seatCar: 0, hardSleeper: 0, softSleeper: 0, diningCar: 0 },
        operationConductor: 0,
        translator: 0,
        additionalStaff: { broadcaster: 0, trainDutyOfficer: 0 },
        baggageStaff: 0,
        diningCarStaff: 0,
        salesStaff: 0,
        total: 0
      }

      return {
        trainData,
        matchedRule: null,
        groupCount,
        staffing: emptyStaffing,
        exactStaffing: emptyStaffing, // 精确值与显示值相同（都是0）
        perGroupStaffing: emptyPerGroupStaffing,
        isMatched: false,
        warnings: ['未找到匹配的定员规则']
      }
    }

    const rule = matchedRule.rule
    const formation = ConventionalDataExtractor.parseFormationDetails(
      ConventionalDataExtractor.extractFormation(trainData)
    )
    const runningTime = ConventionalDataExtractor.extractRunningTime(trainData)

    // 基础人员配置
    let trainConductor = rule.staffing.trainConductor
    const operationConductor = rule.staffing.trainOperator || 0
    const translator = rule.staffing.translator || 0

    // 列车员配置
    const trainAttendants = {
      seatCar: 0,
      hardSleeper: 0,
      softSleeper: 0,
      diningCar: 0
    }

    // 按车厢类型配置列车员
    console.log(`🔧 开始按车厢类型配置列车员，编组详情:`, formation)
    console.log(`📋 当前规则配置:`, rule.staffing)
    // 检查规则中的定员配置结构
    const hasCarStaffing = !!(rule.staffing as any).carStaffing
    const hasTrainAttendants = !!rule.staffing.trainAttendants
    
    console.log(`🔍 检查定员配置结构:`, {
      hasCarStaffing,
      hasTrainAttendants,
      carStaffingKeys: (rule.staffing as any).carStaffing ? Object.keys((rule.staffing as any).carStaffing) : [],
      trainAttendantsKeys: rule.staffing.trainAttendants ? Object.keys(rule.staffing.trainAttendants) : [],
      carStaffingValue: (rule.staffing as any).carStaffing,
      trainAttendantsValue: rule.staffing.trainAttendants
    })
    
    // 座车/硬座配置
    if (formation.seatCarCount > 0) {
      let config = null
      if ((rule.staffing as any).carStaffing?.hardSeat) {
        config = (rule.staffing as any).carStaffing.hardSeat
        trainAttendants.seatCar = this.calculateStaffByRatio(config.ratio, formation.seatCarCount, config.count)
      } else if (rule.staffing.trainAttendants?.seatCar) {
        config = rule.staffing.trainAttendants.seatCar
        trainAttendants.seatCar = this.calculateStaffByRatio(config.ratio, formation.seatCarCount, config.minStaff)
      }
      
      if (config) {
        console.log(`   硬座/座车配置: ${formation.seatCarCount}节 × ${config.ratio} = ${trainAttendants.seatCar}人`)
      } else {
        console.log(`   硬座/座车跳过: 车厢数=${formation.seatCarCount}, 规则配置缺失`)
      }
    }

    // 硬卧配置
    if (formation.hardSleeperCount > 0) {
      let config = null
      if ((rule.staffing as any).carStaffing?.hardSleeper) {
        config = (rule.staffing as any).carStaffing.hardSleeper
        trainAttendants.hardSleeper = this.calculateStaffByRatio(config.ratio, formation.hardSleeperCount, config.count)
      } else if (rule.staffing.trainAttendants?.hardSleeper) {
        config = rule.staffing.trainAttendants.hardSleeper
        trainAttendants.hardSleeper = this.calculateStaffByRatio(config.ratio, formation.hardSleeperCount, config.minStaff)
      }
      
      if (config) {
        console.log(`   硬卧配置: ${formation.hardSleeperCount}节 × ${config.ratio} = ${trainAttendants.hardSleeper}人`)
      } else {
        console.log(`   硬卧跳过: 车厢数=${formation.hardSleeperCount}, 规则配置缺失`)
      }
    }

    // 软卧配置
    if (formation.softSleeperCount > 0) {
      let config = null
      if ((rule.staffing as any).carStaffing?.softSleeper) {
        config = (rule.staffing as any).carStaffing.softSleeper
        trainAttendants.softSleeper = this.calculateStaffByRatio(config.ratio, formation.softSleeperCount, config.count)
      } else if (rule.staffing.trainAttendants?.softSleeper) {
        config = rule.staffing.trainAttendants.softSleeper
        trainAttendants.softSleeper = this.calculateStaffByRatio(config.ratio, formation.softSleeperCount, config.minStaff)
      }
      
      if (config) {
        console.log(`   软卧配置: ${formation.softSleeperCount}节 × ${config.ratio} = ${trainAttendants.softSleeper}人`)
      } else {
        console.log(`   软卧跳过: 车厢数=${formation.softSleeperCount}, 规则配置缺失`)
      }
    }

    // 餐车配置 - 注意：餐车的列车员配置不在这里，而是有专门的餐车人员配置
    // trainAttendants.diningCar 字段是预留的，用于显示餐车相关的列车员（如果有的话）
    trainAttendants.diningCar = 0 // 默认为0，因为餐车人员有专门的配置

    // 额外人员配置
    const additionalStaff = {
      broadcaster: rule.staffing.additionalStaff?.broadcaster || 0,
      trainDutyOfficer: rule.staffing.additionalStaff?.trainDutyOfficer || 0
    }

    // 行李员配置 - 基于规则条件配置
    let baggageStaff = 0
    if (formation.baggageCarCount > 0) {
      // 如果列车有行李车，使用规则中配置的行李员人数
      baggageStaff = rule.conditions.baggageStaffWhenHasBaggage || 0
      console.log(`🎒 行李员配置: 列车有${formation.baggageCarCount}节行李车，配备${baggageStaff}人`)
    }

    // 餐车人员配置
    let diningCarStaff = 0
    if (rule.staffing.diningCarStaff?.enabled && formation.diningCarCount > 0) {
      const diningCarConfig = rule.staffing.diningCarStaff.rules
      if (runningTime >= 24) {
        diningCarStaff = diningCarConfig.over24h * formation.diningCarCount
        console.log(`🍽️ 餐车人员配置: ${formation.diningCarCount}节餐车 × ${diningCarConfig.over24h}人(≥24h) = ${diningCarStaff}人`)
      } else {
        diningCarStaff = diningCarConfig.under24h * formation.diningCarCount
        console.log(`🍽️ 餐车人员配置: ${formation.diningCarCount}节餐车 × ${diningCarConfig.under24h}人(<24h) = ${diningCarStaff}人`)
      }
    }

    // 售货人员配置（与餐车人员互斥）
    let salesStaff = 0
    if (rule.staffing.salesStaff?.enabled && formation.diningCarCount === 0) {
      salesStaff = rule.staffing.salesStaff.staffPerGroup
      console.log(`🛒 售货人员配置: 无餐车，每组配备${salesStaff}人`)
    } else if (formation.diningCarCount > 0) {
      console.log(`🛒 售货人员配置: 有餐车，不配备售货人员`)
    }

    // 计算每组定员（基础配置）
    const perGroupTrainAttendants = Object.values(trainAttendants).reduce((sum, count) => sum + count, 0)
    const perGroupAdditionalStaff = Object.values(additionalStaff).reduce((sum, count) => sum + count, 0)
    const perGroupTotal = trainConductor + perGroupTrainAttendants + operationConductor +
                         translator + perGroupAdditionalStaff + baggageStaff + diningCarStaff + salesStaff

    console.log(`📊 每组定员明细:`)
    console.log(`   - 列车长: ${trainConductor}人`)
    console.log(`   - 列车员: ${perGroupTrainAttendants}人 (座车:${trainAttendants.seatCar}, 硬卧:${trainAttendants.hardSleeper}, 软卧:${trainAttendants.softSleeper}, 餐车:${trainAttendants.diningCar})`)
    console.log(`   - 运转车长: ${operationConductor}人`)
    console.log(`   - 行李员: ${baggageStaff}人`)
    console.log(`   - 翻译: ${translator}人`)
    console.log(`   - 额外人员: ${perGroupAdditionalStaff}人`)
    console.log(`   - 餐车人员: ${diningCarStaff}人`)
    console.log(`   - 售货人员: ${salesStaff}人`)
    console.log(`📊 每组总计: ${perGroupTotal}人`)
    console.log(`📊 配备组数: ${groupCount}`)

    // 先计算每组总人数，再乘以配备组数（精确值）
    const exactTotalStaff = perGroupTotal * groupCount

    // 计算精确值（用于汇总计算）- 保持每组人数的精确分配
    const exactStaffing = {
      trainConductor: trainConductor * groupCount,
      trainAttendants: {
        seatCar: trainAttendants.seatCar * groupCount,
        hardSleeper: trainAttendants.hardSleeper * groupCount,
        softSleeper: trainAttendants.softSleeper * groupCount,
        diningCar: trainAttendants.diningCar * groupCount
      },
      operationConductor: operationConductor * groupCount,
      translator: translator * groupCount,
      additionalStaff: {
        broadcaster: additionalStaff.broadcaster * groupCount,
        trainDutyOfficer: additionalStaff.trainDutyOfficer * groupCount
      },
      baggageStaff: baggageStaff * groupCount,
      diningCarStaff: diningCarStaff * groupCount,
      salesStaff: salesStaff * groupCount,
      total: exactTotalStaff
    }

    // 显示值（四舍五入为整数）
    const displayStaffing = {
      trainConductor: Math.round(exactStaffing.trainConductor),
      trainAttendants: {
        seatCar: Math.round(exactStaffing.trainAttendants.seatCar),
        hardSleeper: Math.round(exactStaffing.trainAttendants.hardSleeper),
        softSleeper: Math.round(exactStaffing.trainAttendants.softSleeper),
        diningCar: Math.round(exactStaffing.trainAttendants.diningCar)
      },
      operationConductor: Math.round(exactStaffing.operationConductor),
      translator: Math.round(exactStaffing.translator),
      additionalStaff: {
        broadcaster: Math.round(exactStaffing.additionalStaff.broadcaster),
        trainDutyOfficer: Math.round(exactStaffing.additionalStaff.trainDutyOfficer)
      },
      baggageStaff: Math.round(exactStaffing.baggageStaff),
      diningCarStaff: Math.round(exactStaffing.diningCarStaff),
      salesStaff: Math.round(exactStaffing.salesStaff),
      total: Math.round(exactTotalStaff)
    }

    console.log(`📊 最终定员计算: ${perGroupTotal}人/组 × ${groupCount}组 = ${displayStaffing.total}人`)

    return {
      trainData,
      matchedRule,
      groupCount,
      staffing: displayStaffing,
      exactStaffing: exactStaffing,
      // 添加每组人员配置信息
      perGroupStaffing: {
        trainConductor,
        trainAttendants,
        operationConductor,
        translator,
        additionalStaff,
        baggageStaff,
        diningCarStaff,
        salesStaff,
        total: perGroupTotal
      },
      isMatched: true,
      warnings
    }
  }

  // 获取预备率 - 使用单位特定的主要生产预备率
  private getReserveRate(unitName: string = TRAIN_UNITS.beijing): number {
    const unitKey = unitName === TRAIN_UNITS.beijing ? 'beijing' :
                    unitName === TRAIN_UNITS.shijiazhuang ? 'shijiazhuang' :
                    unitName === TRAIN_UNITS.tianjin ? 'tianjin' : 'beijing'
    
    const rate = this.standard.reserveRates.mainProduction[unitKey] || RESERVE_RATES.MAIN_PRODUCTION.DEFAULT
    console.log(`📊 普速定员预备率: ${unitName} = ${rate}%`)
    return rate / 100
  }

  // 计算单位普速定员汇总 - 使用序号分组避免重复计算
  calculateUnitStaffing(conventionalTrains: DynamicTrainData[], unitName: string = '北京客运段'): ConventionalUnitStaffingResult {
    console.log(`🚄 开始计算普速列车定员汇总，原始数据数量: ${conventionalTrains.length}`)
    
    // 按序号分组，每个序号组只计算一次
    const groupedBySequence = conventionalTrains.reduce((acc, train) => {
      const sequence = ConventionalDataExtractor.extractSequence(train)
      if (!acc[sequence]) {
        acc[sequence] = []
      }
      acc[sequence].push(train)
      return acc
    }, {} as Record<string, DynamicTrainData[]>)

    console.log(`📊 按序号分组结果:`, Object.keys(groupedBySequence).map(seq => `${seq}(${groupedBySequence[seq].length}条)`).join(', '))

    // 为每个序号组选择代表性数据（第一条记录）进行计算
    const representativeTrains = Object.values(groupedBySequence).map(group => group[0])
    console.log(`🎯 选择代表性数据数量: ${representativeTrains.length}`)
    
    const trainResults: ConventionalTrainStaffingResult[] = []
    const matchedTrains: ConventionalTrainStaffingResult[] = []
    const unmatchedTrains: ConventionalTrainStaffingResult[] = []

    // 对代表性数据进行定员计算
    for (const train of representativeTrains) {
      const result = this.calculateTrainStaffing(train)
      trainResults.push(result)

      if (result.isMatched) {
        matchedTrains.push(result)
      } else {
        unmatchedTrains.push(result)
      }
    }

    // 使用精确值计算基础定员和预备率
    const exactBaseTotalStaff = matchedTrains.reduce((sum, result) => sum + result.exactStaffing.total, 0)
    const reserveRate = this.getReserveRate(unitName)

    // 基础定员取整（精确值求和后取整）
    const baseTotalStaff = Math.ceil(exactBaseTotalStaff)

    // 最终定员：使用精确值计算预备率，最后取整
    const exactTotalWithReserve = exactBaseTotalStaff * (1 + reserveRate)
    const totalStaff = Math.ceil(exactTotalWithReserve)

    const totalGroups = Object.keys(groupedBySequence).length
    const coverageRate = totalGroups > 0 ? (matchedTrains.length / totalGroups) * 100 : 100
    
    console.log(`📈 覆盖率计算: ${matchedTrains.length}/${totalGroups} = ${coverageRate.toFixed(1)}%`)
    
    // 如果有未匹配的列车，显示详细信息
    if (unmatchedTrains.length > 0) {
      console.warn(`⚠️ 发现 ${unmatchedTrains.length} 辆列车未匹配到定员规则:`)
      unmatchedTrains.forEach((result, index) => {
        const train = result.trainData
        console.warn(`   ${index + 1}. 车次: ${train['车次']}, 类别: ${train['类别']}, 运行时间: ${ConventionalDataExtractor.extractRunningTime(train)}小时`)
      })
      console.warn(`ℹ️ 请在规则配置页面中检查并添加相应的定员规则`)
    }

    // 计算人员配置汇总（仅统计匹配的列车）
    console.log(`📉 开始计算人员配置汇总，匹配的列车数量: ${matchedTrains.length}`)
    const staffingBreakdown = {
      trainConductor: 0,
      trainAttendants: {
        seatCar: 0,
        hardSleeper: 0,
        softSleeper: 0,
        diningCar: 0,
        total: 0
      },
      operationConductor: 0,
      translator: 0,
      additionalStaff: {
        broadcaster: 0,
        trainDutyOfficer: 0,
        total: 0
      },
      baggageStaff: 0,
      diningCarStaff: 0,
      salesStaff: 0
    }

    // 累计各类人员数量
    for (const train of matchedTrains) {
      const staffing = train.exactStaffing // 使用精确值进行统计
      staffingBreakdown.trainConductor += staffing.trainConductor
      staffingBreakdown.trainAttendants.seatCar += staffing.trainAttendants.seatCar
      staffingBreakdown.trainAttendants.hardSleeper += staffing.trainAttendants.hardSleeper
      staffingBreakdown.trainAttendants.softSleeper += staffing.trainAttendants.softSleeper
      staffingBreakdown.trainAttendants.diningCar += staffing.trainAttendants.diningCar
      staffingBreakdown.operationConductor += staffing.operationConductor
      staffingBreakdown.translator += staffing.translator
      staffingBreakdown.additionalStaff.broadcaster += staffing.additionalStaff.broadcaster
      staffingBreakdown.additionalStaff.trainDutyOfficer += staffing.additionalStaff.trainDutyOfficer
      staffingBreakdown.baggageStaff += staffing.baggageStaff
      staffingBreakdown.diningCarStaff += staffing.diningCarStaff
      staffingBreakdown.salesStaff += staffing.salesStaff
    }

    // 计算小计并四舍五入为整数
    staffingBreakdown.trainAttendants.total = Math.round(
      staffingBreakdown.trainAttendants.seatCar +
      staffingBreakdown.trainAttendants.hardSleeper +
      staffingBreakdown.trainAttendants.softSleeper +
      staffingBreakdown.trainAttendants.diningCar
    )

    staffingBreakdown.additionalStaff.total = Math.round(
      staffingBreakdown.additionalStaff.broadcaster +
      staffingBreakdown.additionalStaff.trainDutyOfficer
    )

    // 将所有数值四舍五入为整数用于显示
    const displayStaffingBreakdown = {
      trainConductor: Math.round(staffingBreakdown.trainConductor),
      trainAttendants: {
        seatCar: Math.round(staffingBreakdown.trainAttendants.seatCar),
        hardSleeper: Math.round(staffingBreakdown.trainAttendants.hardSleeper),
        softSleeper: Math.round(staffingBreakdown.trainAttendants.softSleeper),
        diningCar: Math.round(staffingBreakdown.trainAttendants.diningCar),
        total: staffingBreakdown.trainAttendants.total
      },
      operationConductor: Math.round(staffingBreakdown.operationConductor),
      translator: Math.round(staffingBreakdown.translator),
      additionalStaff: {
        broadcaster: Math.round(staffingBreakdown.additionalStaff.broadcaster),
        trainDutyOfficer: Math.round(staffingBreakdown.additionalStaff.trainDutyOfficer),
        total: staffingBreakdown.additionalStaff.total
      },
      baggageStaff: Math.round(staffingBreakdown.baggageStaff),
      diningCarStaff: Math.round(staffingBreakdown.diningCarStaff),
      salesStaff: Math.round(staffingBreakdown.salesStaff)
    }

    // 计算每组配置汇总（用于显示每组配置）
    const perGroupBreakdown = {
      trainConductor: 0,
      trainAttendants: {
        seatCar: 0,
        hardSleeper: 0,
        softSleeper: 0,
        diningCar: 0,
        total: 0
      },
      operationConductor: 0,
      translator: 0,
      additionalStaff: {
        broadcaster: 0,
        trainDutyOfficer: 0,
        total: 0
      },
      baggageStaff: 0,
      diningCarStaff: 0,
      salesStaff: 0,
      totalGroups: 0
    }

    // 累计每组配置
    for (const train of matchedTrains) {
      const perGroup = train.perGroupStaffing
      perGroupBreakdown.trainConductor += perGroup.trainConductor
      perGroupBreakdown.trainAttendants.seatCar += perGroup.trainAttendants.seatCar
      perGroupBreakdown.trainAttendants.hardSleeper += perGroup.trainAttendants.hardSleeper
      perGroupBreakdown.trainAttendants.softSleeper += perGroup.trainAttendants.softSleeper
      perGroupBreakdown.trainAttendants.diningCar += perGroup.trainAttendants.diningCar
      perGroupBreakdown.operationConductor += perGroup.operationConductor
      perGroupBreakdown.translator += perGroup.translator
      perGroupBreakdown.additionalStaff.broadcaster += perGroup.additionalStaff.broadcaster
      perGroupBreakdown.additionalStaff.trainDutyOfficer += perGroup.additionalStaff.trainDutyOfficer
      perGroupBreakdown.baggageStaff += perGroup.baggageStaff
      perGroupBreakdown.diningCarStaff += perGroup.diningCarStaff
      perGroupBreakdown.salesStaff += perGroup.salesStaff
      perGroupBreakdown.totalGroups += train.groupCount
    }

    // 计算每组配置小计
    perGroupBreakdown.trainAttendants.total = Math.round(
      perGroupBreakdown.trainAttendants.seatCar +
      perGroupBreakdown.trainAttendants.hardSleeper +
      perGroupBreakdown.trainAttendants.softSleeper +
      perGroupBreakdown.trainAttendants.diningCar
    )

    perGroupBreakdown.additionalStaff.total = Math.round(
      perGroupBreakdown.additionalStaff.broadcaster +
      perGroupBreakdown.additionalStaff.trainDutyOfficer
    )

    console.log(`📊 普速定员汇总计算:`)
    console.log(`   精确基础定员: ${exactBaseTotalStaff.toFixed(2)}人`)
    console.log(`   基础定员(取整): ${baseTotalStaff}人`)
    console.log(`   预备率: ${(reserveRate * 100).toFixed(1)}%`)
    console.log(`   精确总定员: ${exactTotalWithReserve.toFixed(2)}人`)
    console.log(`   最终定员(取整): ${totalStaff}人`)
    console.log(`   人员配置汇总:`)
    console.log(`   - 列车长: ${displayStaffingBreakdown.trainConductor}人`)
    console.log(`   - 列车员: ${displayStaffingBreakdown.trainAttendants.total}人 (座车:${displayStaffingBreakdown.trainAttendants.seatCar}, 硬卧:${displayStaffingBreakdown.trainAttendants.hardSleeper}, 软卧:${displayStaffingBreakdown.trainAttendants.softSleeper}, 餐车:${displayStaffingBreakdown.trainAttendants.diningCar})`)
    console.log(`   - 行李员: ${displayStaffingBreakdown.baggageStaff}人`)
    console.log(`   - 运转车长: ${displayStaffingBreakdown.operationConductor}人`)
    console.log(`   - 翻译: ${displayStaffingBreakdown.translator}人`)
    console.log(`   - 额外人员: ${displayStaffingBreakdown.additionalStaff.total}人`)
    console.log(`   - 餐车人员: ${displayStaffingBreakdown.diningCarStaff}人`)
    console.log(`   - 售货人员: ${displayStaffingBreakdown.salesStaff}人`)
    console.log(`   每组配置汇总 (总组数: ${perGroupBreakdown.totalGroups}):`)
    console.log(`   - 每组列车长: ${Math.round(perGroupBreakdown.trainConductor)}人`)
    console.log(`   - 每组列车员: ${Math.round(perGroupBreakdown.trainAttendants.total)}人`)
    console.log(`   - 每组运转车长: ${Math.round(perGroupBreakdown.operationConductor)}人`)
    console.log(`   - 每组行李员: ${Math.round(perGroupBreakdown.baggageStaff)}人`)
    console.log(`   - 每组售货人员: ${Math.round(perGroupBreakdown.salesStaff)}人`)

    return {
      unitName: unitName,
      standard: this.standard,
      trainResults,
      summary: {
        totalTrains: totalGroups,
        matchedTrains: matchedTrains.length,
        unmatchedTrains: unmatchedTrains.length,
        baseTotalStaff, // 基础定员（精确值求和后取整）
        reserveRate, // 预备率
        totalStaff, // 最终定员（精确值计算预备率后取整）
        coverageRate,
        staffingBreakdown: displayStaffingBreakdown, // 新增：人员配置汇总
        perGroupBreakdown // 新增：每组人员配置汇总
      },
      unmatchedTrains
    }
  }
}
