// 其余生产定员计算引擎
import type { StaffingStandard, OtherProductionRule } from '@/types/staffing-rules'
import type { HighSpeedUnitStaffingResult } from './high-speed-rule-engine'
import type { ConventionalUnitStaffingResult } from './conventional-rule-engine'

// 导入预备率常量
const RESERVE_RATES = {
  OTHER_PRODUCTION: {
    DEFAULT: 5       // 默认其余生产预备率
  }
} as const

// 其余生产定员计算结果
export interface OtherProductionUnitStaffingResult {
  unitName: string
  standard: StaffingStandard
  
  // 基础数据
  baseData: {
    highSpeedTotalStaff: number    // 高铁总定员
    conventionalTotalStaff: number // 普速总定员
    mainProductionTotal: number    // 主要生产总定员
  }
  
  // 计算结果
  summary: {
    appliedRules: Array<{
      rule: OtherProductionRule
      calculatedStaff: number
      calculation: string // 计算说明
    }>
    baseTotalStaff: number    // 基础其余生产定员
    reserveRate: number       // 其余生产预备率
    totalStaff: number        // 最终其余生产定员（含预备率）
  }
  
  // 计算时间
  calculatedAt: Date
}

export class OtherProductionRuleEngine {
  constructor(private standard: StaffingStandard) {}

  // 计算单位其余生产定员
  calculateUnitStaffing(
    highSpeedResult: HighSpeedUnitStaffingResult | null,
    conventionalResult: ConventionalUnitStaffingResult | null,
    unitName: string
  ): OtherProductionUnitStaffingResult {
    console.log(`🏭 开始计算其余生产定员: ${unitName}`)
    
    // 获取主要生产总定员
    const highSpeedTotalStaff = highSpeedResult?.summary.totalStaff || 0
    const conventionalTotalStaff = conventionalResult?.summary.totalStaff || 0
    const mainProductionTotal = highSpeedTotalStaff + conventionalTotalStaff
    
    console.log(`📊 主要生产定员基数:`)
    console.log(`   高铁总定员: ${highSpeedTotalStaff}人`)
    console.log(`   普速总定员: ${conventionalTotalStaff}人`)
    console.log(`   主要生产总计: ${mainProductionTotal}人`)
    
    if (mainProductionTotal === 0) {
      console.log(`⚠️ 主要生产定员为0，无法计算其余生产定员`)
      return this.createEmptyResult(unitName, highSpeedTotalStaff, conventionalTotalStaff)
    }
    
    // 应用其余生产规则
    const appliedRules: Array<{
      rule: OtherProductionRule
      calculatedStaff: number
      calculation: string
    }> = []
    
    let baseTotalStaff = 0
    
    for (const rule of this.standard.otherProductionRules) {
      const result = this.applyRule(rule, mainProductionTotal, highSpeedTotalStaff, conventionalTotalStaff)
      appliedRules.push(result)
      baseTotalStaff += result.calculatedStaff
      
      console.log(`📋 应用规则: ${rule.name}`)
      console.log(`   ${result.calculation}`)
      if (result.breakdown) {
        console.log(`   详细分解:`, result.breakdown)
      }
      console.log(`   计算结果: ${result.calculatedStaff}人`)
    }
    
    // 应用其余生产预备率
    const reserveRate = this.getReserveRate()
    const exactTotalWithReserve = baseTotalStaff * (1 + reserveRate)
    const totalStaff = Math.ceil(exactTotalWithReserve)
    
    console.log(`📈 其余生产定员汇总:`)
    console.log(`   基础定员: ${baseTotalStaff}人`)
    console.log(`   预备率: ${(reserveRate * 100).toFixed(1)}%`)
    console.log(`   精确总定员: ${exactTotalWithReserve.toFixed(2)}人`)
    console.log(`   最终定员: ${totalStaff}人`)
    
    return {
      unitName,
      standard: this.standard,
      baseData: {
        highSpeedTotalStaff,
        conventionalTotalStaff,
        mainProductionTotal
      },
      summary: {
        appliedRules,
        baseTotalStaff,
        reserveRate,
        totalStaff
      },
      calculatedAt: new Date()
    }
  }
  
  // 应用单个规则
  private applyRule(
    rule: OtherProductionRule, 
    mainProductionTotal: number,
    highSpeedTotal: number = 0,
    conventionalTotal: number = 0
  ): {
    rule: OtherProductionRule
    calculatedStaff: number
    calculation: string
    breakdown?: {
      highSpeedPart?: number
      conventionalPart?: number
    }
  } {
    let calculatedStaff = 0
    let calculation = ""
    let breakdown: any = {}
    
    switch (rule.configType) {
      case "segmented_percentage":
        // 新增：分段比例计算
        const segments = rule.config.segments || {}
        let totalFromSegments = 0
        let calculationParts: string[] = []
        
        // 计算高铁部分
        if (segments.highSpeed && highSpeedTotal > 0) {
          const hsPercentage = segments.highSpeed.percentage
          let hsPart = Math.ceil(highSpeedTotal * (hsPercentage / 100))
          
          // 应用最小值和最大值限制
          if (segments.highSpeed.minValue && hsPart < segments.highSpeed.minValue) {
            hsPart = segments.highSpeed.minValue
          }
          if (segments.highSpeed.maxValue && hsPart > segments.highSpeed.maxValue) {
            hsPart = segments.highSpeed.maxValue
          }
          
          totalFromSegments += hsPart
          breakdown.highSpeedPart = hsPart
          calculationParts.push(`高铁: ${highSpeedTotal}人 × ${hsPercentage}% = ${hsPart}人`)
        }
        
        // 计算普速部分
        if (segments.conventional && conventionalTotal > 0) {
          const convPercentage = segments.conventional.percentage
          let convPart = Math.ceil(conventionalTotal * (convPercentage / 100))
          
          // 应用最小值和最大值限制
          if (segments.conventional.minValue && convPart < segments.conventional.minValue) {
            convPart = segments.conventional.minValue
          }
          if (segments.conventional.maxValue && convPart > segments.conventional.maxValue) {
            convPart = segments.conventional.maxValue
          }
          
          totalFromSegments += convPart
          breakdown.conventionalPart = convPart
          calculationParts.push(`普速: ${conventionalTotal}人 × ${convPercentage}% = ${convPart}人`)
        }
        
        calculatedStaff = totalFromSegments
        calculation = calculationParts.length > 0 
          ? calculationParts.join(" + ") + ` = ${calculatedStaff}人`
          : `无有效配置 = ${calculatedStaff}人`
        break
        
      case "percentage":
        const percentage = rule.config.percentage || 0
        calculatedStaff = Math.ceil(mainProductionTotal * (percentage / 100))
        calculation = `${mainProductionTotal}人 × ${percentage}% = ${calculatedStaff}人`
        break
        
      case "fixed":
        calculatedStaff = rule.config.fixedCount || 0
        calculation = `固定配置 ${calculatedStaff}人`
        break
        
      case "formula":
        // 简单的公式解析（可以后续扩展）
        const formula = rule.config.formula || ""
        if (formula.includes("*")) {
          const match = formula.match(/(\d+(?:\.\d+)?)\s*\*\s*主要生产组/)
          if (match) {
            const multiplier = parseFloat(match[1])
            calculatedStaff = Math.ceil(mainProductionTotal * multiplier)
            calculation = `${mainProductionTotal}人 × ${multiplier} = ${calculatedStaff}人`
          }
        } else {
          calculatedStaff = 0
          calculation = `公式解析失败: ${formula}`
        }
        break
        
      default:
        calculatedStaff = 0
        calculation = "未知配置类型"
    }
    
    return {
      rule,
      calculatedStaff,
      calculation,
      breakdown
    }
  }
  
  // 获取其余生产预备率
  private getReserveRate(): number {
    const rate = this.standard.reserveRates.otherProduction ?? RESERVE_RATES.OTHER_PRODUCTION.DEFAULT
    return rate / 100
  }
  
  // 创建空结果
  private createEmptyResult(
    unitName: string, 
    highSpeedTotalStaff: number, 
    conventionalTotalStaff: number
  ): OtherProductionUnitStaffingResult {
    return {
      unitName,
      standard: this.standard,
      baseData: {
        highSpeedTotalStaff,
        conventionalTotalStaff,
        mainProductionTotal: 0
      },
      summary: {
        appliedRules: [],
        baseTotalStaff: 0,
        reserveRate: this.getReserveRate(),
        totalStaff: 0
      },
      calculatedAt: new Date()
    }
  }
}
