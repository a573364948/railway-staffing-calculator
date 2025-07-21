import { HighSpeedRuleEngine } from './high-speed-rule-engine'
import { ConventionalRuleEngine } from './conventional-rule-engine'
import { OtherProductionRuleEngine } from './other-production-rule-engine'
import type { 
  TrainData, 
  StaffingStandard, 
  RailwayBureau
} from '@/types'
import type { ComparisonResult } from '@/contexts/multi-standard-comparison-context'

export class MultiStandardCalculator {
  /**
   * 使用多个标准同时计算定员，返回对比结果（合并所有客运段）
   */
  async calculateMultipleStandards(
    trainData: TrainData,
    standards: StaffingStandard[],
    selectedBureaus: RailwayBureau[]
  ): Promise<Record<string, ComparisonResult>> {
    const results: Record<string, ComparisonResult> = {}

    // 并行计算所有标准
    const calculations = standards.map(standard =>
      this.calculateSingleStandard(trainData, standard, selectedBureaus)
    )

    const calculationResults = await Promise.all(calculations)

    // 组织结果数据
    standards.forEach((standard, index) => {
      results[standard.id] = {
        standardId: standard.id,
        standardName: standard.name,
        ...calculationResults[index]
      }
    })

    return results
  }

  /**
   * 使用多个标准按客运段分组计算定员，返回分组对比结果
   */
  async calculateMultipleStandardsByBureau(
    trainData: TrainData,
    standards: StaffingStandard[],
    selectedBureaus: RailwayBureau[]
  ): Promise<Record<string, Record<string, ComparisonResult>>> {
    const results: Record<string, Record<string, ComparisonResult>> = {}

    // 为每个客运段单独计算
    for (const bureau of selectedBureaus) {
      results[bureau] = {}

      // 为当前客运段计算所有标准
      const calculations = standards.map(standard =>
        this.calculateSingleStandard(trainData, standard, [bureau])
      )

      const calculationResults = await Promise.all(calculations)

      // 组织当前客运段的结果数据
      standards.forEach((standard, index) => {
        results[bureau][standard.id] = {
          standardId: standard.id,
          standardName: standard.name,
          bureauId: bureau,
          bureauName: this.getBureauName(bureau),
          ...calculationResults[index]
        }
      })
    }

    return results
  }

  /**
   * 获取客运段中文名称
   */
  private getBureauName(bureau: RailwayBureau): string {
    const bureauNames = {
      beijing: '北京客运段',
      shijiazhuang: '石家庄客运段',
      tianjin: '天津客运段'
    }
    return bureauNames[bureau] || bureau
  }

  /**
   * 使用单个标准计算定员
   */
  private async calculateSingleStandard(
    trainData: TrainData,
    standard: StaffingStandard,
    selectedBureaus: RailwayBureau[]
  ): Promise<Omit<ComparisonResult, 'standardId' | 'standardName'>> {
    // 合并选定客运段的数据
    const combinedData = this.combineSelectedBureauData(trainData, selectedBureaus)

    // 高铁计算
    const highSpeedEngine = new HighSpeedRuleEngine(standard)
    const highSpeedResult = highSpeedEngine.calculateUnitStaffing(combinedData.highSpeed, '多客运段对比')

    // 普速计算
    const conventionalEngine = new ConventionalRuleEngine(standard)
    const conventionalResult = conventionalEngine.calculateUnitStaffing(combinedData.conventional, '多客运段对比')

    // 其余生产计算
    const otherProductionEngine = new OtherProductionRuleEngine(standard)
    const otherProductionResult = otherProductionEngine.calculateUnitStaffing(
      highSpeedResult,
      conventionalResult,
      '多客运段对比'
    )

    // 计算汇总信息
    const totalStaff = highSpeedResult.summary.totalStaff + conventionalResult.summary.totalStaff + otherProductionResult.summary.totalStaff
    const totalTrains = combinedData.highSpeed.length + combinedData.conventional.length
    const totalUnmatchedTrains = highSpeedResult.summary.unmatchedTrains + conventionalResult.summary.unmatchedTrains
    const coverageRate = totalTrains > 0 ? (totalTrains - totalUnmatchedTrains) / totalTrains : 0

    return {
      highSpeed: {
        totalStaff: highSpeedResult.summary.totalStaff,
        details: this.transformHighSpeedDetails(highSpeedResult),
        unmatchedCount: highSpeedResult.summary.unmatchedTrains
      },
      conventional: {
        totalStaff: conventionalResult.summary.totalStaff,
        details: this.transformConventionalDetails(conventionalResult),
        unmatchedCount: conventionalResult.summary.unmatchedTrains
      },
      otherProduction: {
        totalStaff: otherProductionResult.summary.totalStaff,
        details: this.transformOtherProductionDetails(otherProductionResult)
      },
      summary: {
        totalStaff,
        coverageRate,
        unmatchedTrains: totalUnmatchedTrains
      }
    }
  }

  /**
   * 合并选定客运段的数据
   */
  private combineSelectedBureauData(trainData: TrainData, selectedBureaus: RailwayBureau[]) {
    const combinedHighSpeed: any[] = []
    const combinedConventional: any[] = []

    selectedBureaus.forEach(bureau => {
      const bureauData = trainData[bureau]
      if (bureauData) {
        if (bureauData.highSpeed) {
          combinedHighSpeed.push(...bureauData.highSpeed)
        }
        if (bureauData.conventional) {
          combinedConventional.push(...bureauData.conventional)
        }
      }
    })

    return {
      highSpeed: combinedHighSpeed,
      conventional: combinedConventional
    }
  }

  /**
   * 转换高铁计算结果为对比格式
   */
  private transformHighSpeedDetails(result: any) {
    return {
      matchedTrains: result.trainResults?.filter((r: any) => r.isMatched) || [],
      unmatchedTrains: result.unmatchedTrains || [],
      positionSummary: this.extractPositionSummary(result.trainResults || []),
      calculationDetails: result.trainResults || [],
      businessClassStats: this.extractBusinessClassStats(result.trainResults || []),
      groupingStats: { totalGroups: result.trainResults?.length || 0 }
    }
  }

  /**
   * 转换普速计算结果为对比格式
   */
  private transformConventionalDetails(result: any) {
    return {
      matchedTrains: result.trainResults?.filter((r: any) => r.isMatched) || [],
      unmatchedTrains: result.unmatchedTrains || [],
      positionSummary: this.extractPositionSummary(result.trainResults || []),
      calculationDetails: result.trainResults || [],
      trainTypeStats: this.extractTrainTypeStats(result.trainResults || [])
    }
  }

  /**
   * 转换其余生产计算结果为对比格式
   */
  private transformOtherProductionDetails(result: any) {
    return {
      positionBreakdown: result.positionBreakdown || {},
      calculationMethod: result.calculationMethod || '按比例计算',
      baseStaffNumbers: {
        highSpeed: 0,
        conventional: 0
      }
    }
  }

  /**
   * 从训练结果中提取岗位汇总
   */
  private extractPositionSummary(trainResults: any[]): Record<string, number> {
    const summary: Record<string, number> = {}
    
    trainResults.forEach(result => {
      if (result.isMatched && result.staffing) {
        Object.entries(result.staffing).forEach(([position, count]) => {
          if (typeof count === 'number') {
            summary[position] = (summary[position] || 0) + count
          }
        })
      }
    })
    
    return summary
  }

  /**
   * 提取商务座统计信息
   */
  private extractBusinessClassStats(trainResults: any[]) {
    const withBusinessClass = trainResults.filter(result => 
      result.trainData && this.hasBusinessClass(result.trainData)
    ).length
    
    return {
      withBusinessClass,
      withoutBusinessClass: trainResults.length - withBusinessClass,
      total: trainResults.length
    }
  }

  /**
   * 检查是否有商务座
   */
  private hasBusinessClass(trainData: any): boolean {
    // 这里需要根据实际数据结构判断
    return false // 临时返回false，需要根据实际数据结构实现
  }

  /**
   * 提取列车类型统计
   */
  private extractTrainTypeStats(trainResults: any[]) {
    const stats: Record<string, number> = {}
    
    trainResults.forEach(result => {
      if (result.trainData) {
        // 提取列车类型，需要根据实际数据结构实现
        const trainType = 'unknown' // 临时值
        stats[trainType] = (stats[trainType] || 0) + 1
      }
    })
    
    return stats
  }

  /**
   * 生成标准间的差异分析
   */
  generateDifferenceAnalysis(
    results: Record<string, ComparisonResult>,
    standards: StaffingStandard[]
  ) {
    const analysis = {
      standardComparison: this.compareStandardParameters(standards),
      staffingDifferences: this.analyzeStaffingDifferences(results),
      keyFactors: this.identifyKeyDifferenceFactors(results, standards),
      recommendations: this.generateRecommendations(results, standards)
    }

    return analysis
  }

  /**
   * 对比标准参数
   */
  private compareStandardParameters(standards: StaffingStandard[]) {
    return standards.map(standard => ({
      id: standard.id,
      name: standard.name,
      standardWorkHours: standard.standardWorkHours,
      mainProductionReserveRate: {
        beijing: standard.reserveRates.mainProduction.beijing,
        shijiazhuang: standard.reserveRates.mainProduction.shijiazhuang,
        tianjin: standard.reserveRates.mainProduction.tianjin
      },
      otherProductionReserveRate: standard.reserveRates.otherProduction,
      highSpeedRulesCount: standard.highSpeedRules.length,
      conventionalRulesCount: standard.conventionalRules.length,
      otherProductionRulesCount: standard.otherProductionRules.length
    }))
  }

  /**
   * 分析定员差异
   */
  private analyzeStaffingDifferences(results: Record<string, ComparisonResult>) {
    const resultArray = Object.values(results)
    if (resultArray.length < 2) return null

    const baseResult = resultArray[0]
    const differences = resultArray.slice(1).map(result => ({
      standardId: result.standardId,
      standardName: result.standardName,
      totalStaffDiff: result.summary.totalStaff - baseResult.summary.totalStaff,
      highSpeedDiff: result.highSpeed.totalStaff - baseResult.highSpeed.totalStaff,
      conventionalDiff: result.conventional.totalStaff - baseResult.conventional.totalStaff,
      otherProductionDiff: result.otherProduction.totalStaff - baseResult.otherProduction.totalStaff,
      coverageRateDiff: result.summary.coverageRate - baseResult.summary.coverageRate
    }))

    return {
      baseStandard: {
        id: baseResult.standardId,
        name: baseResult.standardName
      },
      differences,
      maxDifference: Math.max(...differences.map(d => Math.abs(d.totalStaffDiff))),
      avgDifference: differences.reduce((sum, d) => sum + Math.abs(d.totalStaffDiff), 0) / differences.length
    }
  }

  /**
   * 识别关键差异因素
   */
  private identifyKeyDifferenceFactors(
    results: Record<string, ComparisonResult>,
    standards: StaffingStandard[]
  ) {
    const factors = []

    // 分析标准工时影响
    const workHoursRange = {
      min: Math.min(...standards.map(s => s.standardWorkHours)),
      max: Math.max(...standards.map(s => s.standardWorkHours))
    }
    if (workHoursRange.max - workHoursRange.min > 10) {
      factors.push({
        factor: 'standardWorkHours',
        description: '标准工时差异显著',
        impact: 'high',
        details: `工时范围：${workHoursRange.min}h - ${workHoursRange.max}h`
      })
    }

    // 分析预备率影响
    const reserveRates = standards.map(s => s.reserveRates.mainProduction.beijing)
    const reserveRateRange = {
      min: Math.min(...reserveRates),
      max: Math.max(...reserveRates)
    }
    if (reserveRateRange.max - reserveRateRange.min > 0.05) {
      factors.push({
        factor: 'reserveRates',
        description: '预备率设置差异较大',
        impact: 'medium',
        details: `预备率范围：${Math.round(reserveRateRange.min * 100)}% - ${Math.round(reserveRateRange.max * 100)}%`
      })
    }

    // 分析规则数量影响
    const rulesCountDiff = {
      highSpeed: Math.max(...standards.map(s => s.highSpeedRules.length)) - Math.min(...standards.map(s => s.highSpeedRules.length)),
      conventional: Math.max(...standards.map(s => s.conventionalRules.length)) - Math.min(...standards.map(s => s.conventionalRules.length))
    }
    if (rulesCountDiff.highSpeed > 5 || rulesCountDiff.conventional > 5) {
      factors.push({
        factor: 'rulesCount',
        description: '规则数量差异可能影响覆盖率',
        impact: 'medium',
        details: `高铁规则差异：${rulesCountDiff.highSpeed}，普速规则差异：${rulesCountDiff.conventional}`
      })
    }

    return factors
  }

  /**
   * 生成建议
   */
  private generateRecommendations(
    results: Record<string, ComparisonResult>,
    standards: StaffingStandard[]
  ) {
    const recommendations = []
    const resultArray = Object.values(results)

    // 覆盖率建议
    const avgCoverageRate = resultArray.reduce((sum, r) => sum + r.summary.coverageRate, 0) / resultArray.length
    if (avgCoverageRate < 0.9) {
      recommendations.push({
        type: 'coverage',
        priority: 'high',
        title: '提高规则覆盖率',
        description: `当前平均覆盖率为${Math.round(avgCoverageRate * 100)}%，建议增加更多匹配规则以提高覆盖率`
      })
    }

    // 定员差异建议
    const staffingRange = {
      min: Math.min(...resultArray.map(r => r.summary.totalStaff)),
      max: Math.max(...resultArray.map(r => r.summary.totalStaff))
    }
    const staffingRangePercent = (staffingRange.max - staffingRange.min) / staffingRange.min
    if (staffingRangePercent > 0.15) {
      recommendations.push({
        type: 'standardization',
        priority: 'medium',
        title: '标准化定员计算方法',
        description: `不同标准间定员差异达${Math.round(staffingRangePercent * 100)}%，建议统一关键参数设置`
      })
    }

    // 效率建议
    const mostEfficientStandard = resultArray.reduce((min, current) => 
      current.summary.totalStaff < min.summary.totalStaff ? current : min
    )
    recommendations.push({
      type: 'efficiency',
      priority: 'low',
      title: '参考高效标准',
      description: `${mostEfficientStandard.standardName}标准的定员最少(${mostEfficientStandard.summary.totalStaff}人)，可考虑参考其配置优化其他标准`
    })

    return recommendations
  }

  /**
   * 导出对比报告数据
   */
  generateExportData(
    results: Record<string, ComparisonResult>,
    standards: StaffingStandard[]
  ) {
    const analysis = this.generateDifferenceAnalysis(results, standards)
    
    return {
      summary: {
        calculationTime: new Date().toISOString(),
        standardsCompared: standards.length,
        totalResults: Object.keys(results).length
      },
      results,
      analysis,
      exportVersion: '1.0'
    }
  }
}