import type { ComparisonResult } from '@/contexts/multi-standard-comparison-context'
import type { StaffingStandard } from '@/types'

// 车次差异数据结构 - 纯客观数据，无任何建议
export interface TrainDifference {
  trainId: string
  trainNumber: string
  formation: string
  runningTime: number
  trainType: 'highSpeed' | 'conventional'
  
  // 各标准的计算结果
  standardResults: {
    [standardId: string]: {
      standardName: string
      totalStaff: number
      matchedRule?: string
      isMatched: boolean
      positionBreakdown: Record<string, number>
    }
  }
  
  // 差异计算结果
  maxDifference: number      // 最大与最小值的差异
  minValue: number           // 最小定员数
  maxValue: number           // 最大定员数
  differenceRange: string    // "45-77人"
  differencePercentage: number // 相对差异百分比
  
  // 差异原因分类 - 客观描述，不做价值判断
  differenceType: 'parameter_based' | 'rule_based' | 'match_status' | 'coverage_gap'
  differenceDescription: string // 客观描述原因
}

// 差异统计数据
export interface DifferenceStats {
  totalTrainsAnalyzed: number
  trainsWithDifferences: number
  trainsWithoutDifferences: number
  
  // 按差异程度分类
  severityDistribution: {
    high: number    // >20人差异
    medium: number  // 5-20人差异  
    low: number     // 1-5人差异
  }
  
  // 按差异原因分类
  typeDistribution: {
    parameter_based: number
    rule_based: number
    match_status: number
    coverage_gap: number
  }
  
  // 数值统计
  averageDifference: number
  maxDifferenceFound: number
  medianDifference: number
}

export class DifferenceAnalyzer {
  /**
   * 分析多标准对比结果，找出有差异的车次
   */
  analyzeTrainDifferences(
    results: Record<string, ComparisonResult>,
    standards: StaffingStandard[]
  ): {
    differences: TrainDifference[]
    stats: DifferenceStats
  } {
    // 收集所有车次数据
    const allTrains = this.collectAllTrainData(results, standards)
    
    // 计算每个车次的差异
    console.log(`🧮 开始计算 ${allTrains.length} 个车次的差异...`)
    const allDifferences = allTrains.map((train, index) => {
      if (index < 3) {
        console.log(`🔍 计算车次 ${index + 1} 差异: ${this.extractTrainNumber(train)}`)
      }
      return this.calculateTrainDifference(train, results, standards)
    })
    
    console.log(`📈 所有车次差异计算完成，有差异的车次数量: ${allDifferences.filter(diff => diff.maxDifference > 0).length}`)
    
    const differences = allDifferences
      .filter(diff => diff.maxDifference > 0) // 只保留有差异的车次
      .sort((a, b) => b.maxDifference - a.maxDifference) // 按差异降序排序
    
    // 显示前几个最大差异
    differences.slice(0, 5).forEach((diff, index) => {
      console.log(`🏆 差异排名 ${index + 1}: ${diff.trainNumber} (${diff.maxDifference}人差异)`)
    })
    
    // 生成统计数据
    const stats = this.generateDifferenceStats(differences, allTrains.length)
    console.log(`📊 最终统计:`, stats)
    
    return { differences, stats }
  }

  /**
   * 收集所有参与对比的车次数据
   */
  private collectAllTrainData(
    results: Record<string, ComparisonResult>,
    standards: StaffingStandard[]
  ): any[] {
    console.log('🚂 开始收集车次数据...')
    const trainMap = new Map<string, any>()
    
    standards.forEach(standard => {
      console.log(`📋 处理标准: ${standard.name} (${standard.id})`)
      const result = results[standard.id]
      if (!result) {
        console.log(`⚠️ 未找到标准 ${standard.id} 的计算结果`)
        return
      }
      
      // 收集高铁车次
      if (result.highSpeed.details?.matchedTrains) {
        console.log(`🚄 高铁车次数量: ${result.highSpeed.details.matchedTrains.length}`)
        result.highSpeed.details.matchedTrains.forEach((train: any, index: number) => {
          if (index < 3) { // 只打印前3个车次的详细信息
            console.log(`  车次 ${index + 1}:`, train)
          }
          const trainId = this.generateTrainId(train, 'highSpeed')
          if (!trainMap.has(trainId)) {
            trainMap.set(trainId, {
              ...train,
              trainType: 'highSpeed',
              trainId
            })
          }
        })
      } else {
        console.log(`⚠️ 标准 ${standard.name} 没有高铁 matchedTrains 数据`)
      }
      
      // 收集普速车次
      if (result.conventional.details?.matchedTrains) {
        console.log(`🚃 普速车次数量: ${result.conventional.details.matchedTrains.length}`)
        result.conventional.details.matchedTrains.forEach((train: any, index: number) => {
          if (index < 3) { // 只打印前3个车次的详细信息
            console.log(`  车次 ${index + 1}:`, train)
          }
          const trainId = this.generateTrainId(train, 'conventional')
          if (!trainMap.has(trainId)) {
            trainMap.set(trainId, {
              ...train,
              trainType: 'conventional', 
              trainId
            })
          }
        })
      } else {
        console.log(`⚠️ 标准 ${standard.name} 没有普速 matchedTrains 数据`)
      }
    })
    
    const allTrains = Array.from(trainMap.values())
    console.log(`📊 收集完成，去重后总车次数: ${allTrains.length}`)
    if (allTrains.length > 0) {
      console.log('📝 示例车次数据:', allTrains[0])
    }
    
    return allTrains
  }

  /**
   * 生成车次唯一标识
   */
  private generateTrainId(trainData: any, type: string): string {
    const trainNumber = this.extractTrainNumber(trainData)
    const formation = this.extractFormation(trainData)
    const runningTime = this.extractRunningTime(trainData)
    
    return `${type}_${trainNumber}_${formation}_${runningTime}`
  }

  /**
   * 计算单个车次在不同标准下的差异
   */
  private calculateTrainDifference(
    trainData: any,
    results: Record<string, ComparisonResult>,
    standards: StaffingStandard[]
  ): TrainDifference {
    const standardResults: Record<string, any> = {}
    const staffValues: number[] = []
    
    // 为每个标准查找该车次的计算结果
    standards.forEach(standard => {
      const result = results[standard.id]
      if (!result) return
      
      const trainResult = this.findTrainInResults(trainData, result)
      if (trainResult) {
        // 从staffing对象中计算总定员（高铁通常有trainConductor, trainAttendant等）
        const staffing = trainResult.staffing || {}
        const totalStaff = Object.values(staffing).reduce((sum, count) => {
          return sum + (typeof count === 'number' ? count : 0)
        }, 0)
        
        console.log(`📊 ${this.extractTrainNumber(trainData)} 在 ${standard.name} 下的定员: ${totalStaff}人`)
        
        standardResults[standard.id] = {
          standardName: standard.name,
          totalStaff,
          matchedRule: trainResult.matchedRule?.rule?.name || trainResult.matchedRule?.name || '未知规则',
          isMatched: trainResult.isMatched !== false, // 默认为true，除非明确设为false
          positionBreakdown: staffing
        }
        staffValues.push(totalStaff)
      }
    })
    
    // 计算差异数值
    const minValue = Math.min(...staffValues)
    const maxValue = Math.max(...staffValues)
    const maxDifference = maxValue - minValue
    const averageValue = staffValues.reduce((sum, val) => sum + val, 0) / staffValues.length
    const differencePercentage = averageValue > 0 ? Math.round((maxDifference / averageValue) * 100) : 0
    
    // 客观分析差异原因
    const { differenceType, differenceDescription } = this.classifyDifferenceType(
      standardResults, 
      standards
    )
    
    return {
      trainId: trainData.trainId,
      trainNumber: this.extractTrainNumber(trainData),
      formation: this.extractFormation(trainData),
      runningTime: this.extractRunningTime(trainData),
      trainType: trainData.trainType,
      standardResults,
      maxDifference,
      minValue,
      maxValue,
      differenceRange: `${minValue}-${maxValue}人`,
      differencePercentage,
      differenceType,
      differenceDescription
    }
  }

  /**
   * 在计算结果中查找特定车次
   */
  private findTrainInResults(trainResult: any, result: ComparisonResult): any | null {
    const trainNumber = this.extractTrainNumber(trainResult)
    const trainId = trainResult.trainData?.id || trainResult.id
    
    console.log(`🔍 查找车次: ${trainNumber} (ID: ${trainId}) 在结果中...`)
    
    // 在高铁结果中查找
    if (trainResult.trainType === 'highSpeed' && result.highSpeed.details?.matchedTrains) {
      const found = result.highSpeed.details.matchedTrains.find((train: any) => {
        const trainDataId = train.trainData?.id || train.id
        const foundTrainNumber = this.extractTrainNumber(train)
        return trainDataId === trainId || foundTrainNumber === trainNumber
      })
      if (found) {
        console.log(`✅ 在高铁结果中找到车次: ${trainNumber}`)
        return found
      }
    }
    
    // 在普速结果中查找
    if (trainResult.trainType === 'conventional' && result.conventional.details?.matchedTrains) {
      const found = result.conventional.details.matchedTrains.find((train: any) => {
        const trainDataId = train.trainData?.id || train.id
        const foundTrainNumber = this.extractTrainNumber(train)
        return trainDataId === trainId || foundTrainNumber === trainNumber
      })
      if (found) {
        console.log(`✅ 在普速结果中找到车次: ${trainNumber}`)
        return found
      }
    }
    
    console.log(`❌ 未找到车次: ${trainNumber}`)
    return null
  }

  /**
   * 客观分类差异原因 - 不做价值判断
   */
  private classifyDifferenceType(
    standardResults: Record<string, any>,
    standards: StaffingStandard[]
  ): { differenceType: TrainDifference['differenceType'], differenceDescription: string } {
    const results = Object.values(standardResults)
    
    // 检查匹配状态差异
    const matchStatuses = results.map(r => r.isMatched)
    const hasMatchStatusDifference = new Set(matchStatuses).size > 1
    
    if (hasMatchStatusDifference) {
      const matchedCount = matchStatuses.filter(Boolean).length
      const unmatchedCount = results.length - matchedCount
      return {
        differenceType: 'match_status',
        differenceDescription: `${matchedCount}个标准匹配成功，${unmatchedCount}个标准未匹配`
      }
    }
    
    // 检查规则匹配差异
    const matchedRules = results
      .filter(r => r.isMatched && r.matchedRule)
      .map(r => r.matchedRule)
    
    if (new Set(matchedRules).size > 1) {
      return {
        differenceType: 'rule_based',
        differenceDescription: '不同标准匹配了不同的定员规则'
      }
    }
    
    // 检查参数设置差异（工时、预备率等）
    const workHours = standards.map(s => s.standardWorkHours)
    const workHourRange = Math.max(...workHours) - Math.min(...workHours)
    
    if (workHourRange > 5) {
      return {
        differenceType: 'parameter_based',
        differenceDescription: `标准工时设置不同(${Math.min(...workHours)}-${Math.max(...workHours)}小时)`
      }
    }
    
    // 检查预备率差异
    const reserveRates = standards.map(s => s.reserveRates.mainProduction.beijing)
    const reserveRateRange = Math.max(...reserveRates) - Math.min(...reserveRates)
    
    if (reserveRateRange > 0.01) {
      const minRate = Math.round(Math.min(...reserveRates) * 100)
      const maxRate = Math.round(Math.max(...reserveRates) * 100)
      return {
        differenceType: 'parameter_based',
        differenceDescription: `预备率设置不同(${minRate}%-${maxRate}%)`
      }
    }
    
    // 默认分类
    return {
      differenceType: 'coverage_gap',
      differenceDescription: '规则覆盖范围或配置细节存在差异'
    }
  }

  /**
   * 生成差异统计数据
   */
  private generateDifferenceStats(
    differences: TrainDifference[],
    totalTrains: number
  ): DifferenceStats {
    const stats: DifferenceStats = {
      totalTrainsAnalyzed: totalTrains,
      trainsWithDifferences: differences.length,
      trainsWithoutDifferences: totalTrains - differences.length,
      
      severityDistribution: {
        high: differences.filter(d => d.maxDifference > 20).length,
        medium: differences.filter(d => d.maxDifference >= 5 && d.maxDifference <= 20).length,
        low: differences.filter(d => d.maxDifference > 0 && d.maxDifference < 5).length
      },
      
      typeDistribution: {
        parameter_based: differences.filter(d => d.differenceType === 'parameter_based').length,
        rule_based: differences.filter(d => d.differenceType === 'rule_based').length,
        match_status: differences.filter(d => d.differenceType === 'match_status').length,
        coverage_gap: differences.filter(d => d.differenceType === 'coverage_gap').length
      },
      
      averageDifference: differences.length > 0 
        ? Math.round(differences.reduce((sum, d) => sum + d.maxDifference, 0) / differences.length)
        : 0,
      maxDifferenceFound: differences.length > 0 
        ? Math.max(...differences.map(d => d.maxDifference))
        : 0,
      medianDifference: this.calculateMedian(differences.map(d => d.maxDifference))
    }
    
    return stats
  }

  /**
   * 计算中位数
   */
  private calculateMedian(values: number[]): number {
    if (values.length === 0) return 0
    
    const sorted = [...values].sort((a, b) => a - b)
    const mid = Math.floor(sorted.length / 2)
    
    return sorted.length % 2 === 0
      ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
      : sorted[mid]
  }

  // 辅助方法 - 数据提取
  private extractTrainNumber(trainResult: any): string {
    // 从车次结果对象中提取车次号，数据结构是 {trainData: {...}, ...}
    const actualTrainData = trainResult?.trainData || trainResult

    const trainNumber = actualTrainData?.车次 ||
                       actualTrainData?.trainNumber ||
                       actualTrainData?.trainCode ||
                       actualTrainData?.number ||
                       actualTrainData?.code ||
                       actualTrainData?.name ||
                       actualTrainData?.列车号 ||
                       actualTrainData?.车次号

    // 如果找到了有效的车次号，返回它
    if (trainNumber && typeof trainNumber === 'string' && trainNumber.trim()) {
      return trainNumber.trim()
    }

    // 如果没有找到，尝试从ID生成
    if (actualTrainData?.id) {
      return `Train_${actualTrainData.id}`
    }

    return 'Unknown'
  }
  
  private extractFormation(trainResult: any): string {
    // 从车次结果对象中提取编组信息
    const actualTrainData = trainResult?.trainData || trainResult

    // 高铁数据：优先使用编组字段
    const highSpeedFormation = actualTrainData?.编组 ||
                              actualTrainData?.formation ||
                              actualTrainData?.grouping

    if (highSpeedFormation && typeof highSpeedFormation === 'string' && highSpeedFormation.trim()) {
      return highSpeedFormation.trim()
    }

    // 普速数据：优先使用编组详情字段
    const conventionalFormation = actualTrainData?.编组详情 ||
                                 actualTrainData?.formationDetails ||
                                 actualTrainData?.consist

    if (conventionalFormation && typeof conventionalFormation === 'string' && conventionalFormation.trim()) {
      return conventionalFormation.trim()
    }

    // 对于普速列车，如果没有编组详情，使用类别字段
    const category = actualTrainData?.类别 ||
                    actualTrainData?.category ||
                    actualTrainData?.编组类型 ||
                    actualTrainData?.车型 ||
                    actualTrainData?.trainType ||
                    actualTrainData?.type

    if (category && typeof category === 'string' && category.trim()) {
      return category.trim()
    }

    return 'Unknown'
  }
  
  private extractRunningTime(trainResult: any): number {
    // 从车次结果对象中提取单程运行时间
    const actualTrainData = trainResult?.trainData || trainResult

    // 高铁数据：优先使用单程工时字段
    const highSpeedTime = actualTrainData?.单程工时 ||
                         actualTrainData?.workHours ||
                         actualTrainData?.singleTripTime

    if (highSpeedTime) {
      const parsed = typeof highSpeedTime === 'string' ? parseFloat(highSpeedTime) : highSpeedTime
      if (!isNaN(parsed) && parsed > 0) {
        return parsed
      }
    }

    // 通用运行时间字段
    const generalTime = actualTrainData?.单程运行时间 ||
                       actualTrainData?.运行时间 ||
                       actualTrainData?.runningTime ||
                       actualTrainData?.duration ||
                       actualTrainData?.time

    if (generalTime) {
      const parsed = typeof generalTime === 'string' ? parseFloat(generalTime) : generalTime
      if (!isNaN(parsed) && parsed > 0) {
        return parsed
      }
    }

    // 如果没有单程时间，尝试从往返工时计算（除以2）
    const roundTripTime = actualTrainData?.往返工时 ||
                         actualTrainData?.totalTime ||
                         actualTrainData?.roundTripTime

    if (roundTripTime) {
      const parsed = typeof roundTripTime === 'string' ? parseFloat(roundTripTime) : roundTripTime
      if (!isNaN(parsed) && parsed > 0) {
        return parsed / 2
      }
    }

    // 最后尝试从始发和终到时间计算
    const startTime = actualTrainData?.始发时间 || actualTrainData?.startTime
    const endTime = actualTrainData?.终到时间 || actualTrainData?.endTime

    if (startTime && endTime) {
      const calculatedTime = this.calculateTimeFromSchedule(startTime, endTime)
      if (calculatedTime > 0) {
        return calculatedTime
      }
    }

    return 0
  }

  /**
   * 从始发和终到时间计算运行时间
   */
  private calculateTimeFromSchedule(startTime: string, endTime: string): number {
    try {
      // 简单的时间差计算，假设格式为 "HH:MM"
      const start = String(startTime).split(':').map(Number)
      const end = String(endTime).split(':').map(Number)

      if (start.length === 2 && end.length === 2) {
        let hours = end[0] - start[0]
        let minutes = end[1] - start[1]

        if (minutes < 0) {
          hours -= 1
          minutes += 60
        }

        if (hours < 0) {
          hours += 24 // 跨天
        }

        return hours + minutes / 60
      }
    } catch (error) {
      console.warn('Failed to calculate time from schedule:', error)
    }

    return 0
  }
}