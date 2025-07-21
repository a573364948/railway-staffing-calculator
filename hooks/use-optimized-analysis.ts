// 优化的数据分析Hook - 解决性能瓶颈

import { useMemo, useCallback } from 'react'
import type { DynamicTrainData } from '@/types/dynamic-train-data'
import type { ConventionalStaffingRule } from '@/types/staffing-rules'

interface AnalysisResult {
  uncoveredTrains: DynamicTrainData[]
  coverageStats: {
    total: number
    covered: number
    uncovered: number
    coverageRate: number
  }
  recommendations: Array<{
    trainType: string
    timeRange: string
    count: number
    priority: 'high' | 'medium' | 'low'
  }>
}

// 规则匹配缓存
const ruleMatchCache = new Map<string, boolean>()

export function useOptimizedAnalysis(
  trains: DynamicTrainData[],
  rules: ConventionalStaffingRule[]
) {
  // 缓存key生成
  const cacheKey = useMemo(() => {
    return `${trains.length}-${rules.length}-${JSON.stringify(rules.map(r => r.id))}`
  }, [trains.length, rules.length, rules])
  
  // 优化的规则匹配函数
  const optimizedMatchRule = useCallback((train: DynamicTrainData, rules: ConventionalStaffingRule[]): boolean => {
    const trainKey = `${train.车次}-${train.类别}`
    const rulesHash = rules.map(r => r.id).join(',')
    const cacheKey = `${trainKey}-${rulesHash}`
    
    // 检查缓存
    if (ruleMatchCache.has(cacheKey)) {
      return ruleMatchCache.get(cacheKey)!
    }
    
    // 执行匹配逻辑
    const category = train['类别'] || train['编组类型'] || ""
    const runningTime = getTrainRunningTime(train)
    const timeRange = getTimeRange(runningTime)
    
    for (const rule of rules) {
      // 快速类型匹配
      const typeMatches = rule.conditions.trainTypes.some(type => category.includes(type))
      if (!typeMatches) continue
      
      // 时间范围匹配
      const timeMatches = !rule.conditions.runningTimeRange || rule.conditions.runningTimeRange === timeRange
      if (!timeMatches) continue
      
      // 国际联运特殊要求
      const internationalMatches = !rule.conditions.isInternational || category.includes('国际联运')
      if (internationalMatches) {
        ruleMatchCache.set(cacheKey, true)
        return true
      }
    }
    
    // 正常列车回退匹配
    const isInternational = category.toLowerCase().includes('国际联运')
    if (!isInternational) {
      const normalRule = rules.find(rule => rule.conditions.trainTypes.includes('正常列车'))
      if (normalRule) {
        const timeMatches = !normalRule.conditions.runningTimeRange || normalRule.conditions.runningTimeRange === timeRange
        if (timeMatches) {
          ruleMatchCache.set(cacheKey, true)
          return true
        }
      }
    }
    
    ruleMatchCache.set(cacheKey, false)
    return false
  }, [])
  
  // 获取运行时间的辅助函数
  const getTrainRunningTime = useCallback((train: DynamicTrainData): number => {
    const runningTimeStr = train['单程运行时间'] || train['运行时间'] || ""
    const timeMatch = runningTimeStr.toString().match(/(\d+(?:\.\d+)?)/)
    return timeMatch ? parseFloat(timeMatch[1]) : 0
  }, [])
  
  // 获取时间范围的辅助函数
  const getTimeRange = useCallback((runningTime: number): string => {
    if (runningTime < 4) return 'under4'
    if (runningTime < 12) return '4to12'
    if (runningTime < 24) return '12to24'
    return 'over24'
  }, [])
  
  // 主要的分析逻辑 - 使用memo缓存结果
  const analysisResult = useMemo((): AnalysisResult => {
    console.log(`🔍 开始分析列车数据 (${trains.length}条记录, ${rules.length}个规则)`)
    const startTime = performance.now()
    
    // 筛选有效列车数据
    const validTrains = trains.filter(train => {
      const category = train['类别'] || train['编组类型'] || ""
      const trainNumber = train.车次 as string || ""
      
      return (
        category.includes("K快车") ||
        category.includes("T特快列车") ||
        category.includes("Z直达特快") ||
        category.includes("直达列车") ||
        category.includes("国际联运") ||
        trainNumber.match(/^[KTZ]\d+/) ||
        (!trainNumber.match(/^[GDC]\d+/) && !category.includes("高速") && !category.includes("动车"))
      )
    })
    
    // 使用优化的匹配算法
    const uncoveredTrains: DynamicTrainData[] = []
    const coveredTrains: DynamicTrainData[] = []
    
    for (const train of validTrains) {
      if (optimizedMatchRule(train, rules)) {
        coveredTrains.push(train)
      } else {
        uncoveredTrains.push(train)
      }
    }
    
    // 生成推荐
    const recommendations = generateRecommendations(uncoveredTrains)
    
    const result: AnalysisResult = {
      uncoveredTrains,
      coverageStats: {
        total: validTrains.length,
        covered: coveredTrains.length,
        uncovered: uncoveredTrains.length,
        coverageRate: validTrains.length > 0 ? (coveredTrains.length / validTrains.length) * 100 : 0
      },
      recommendations
    }
    
    const endTime = performance.now()
    console.log(`✅ 分析完成，耗时: ${(endTime - startTime).toFixed(2)}ms`)
    console.log(`📊 覆盖率: ${result.coverageStats.coverageRate.toFixed(1)}%`)
    
    return result
  }, [trains, rules, cacheKey, optimizedMatchRule])
  
  // 生成推荐规则
  const generateRecommendations = useCallback((uncoveredTrains: DynamicTrainData[]) => {
    const recommendations = new Map<string, { count: number, trains: DynamicTrainData[] }>()
    
    uncoveredTrains.forEach(train => {
      const category = train['类别'] || train['编组类型'] || ""
      const runningTime = getTrainRunningTime(train)
      const timeRange = getTimeRange(runningTime)
      
      let trainType = '正常列车'
      if (category.includes('国际联运')) trainType = '国际联运'
      else if (category.includes('Z直达') || category.includes('Z字头')) trainType = '直达列车'
      
      const key = `${trainType}-${timeRange}`
      
      if (!recommendations.has(key)) {
        recommendations.set(key, { count: 0, trains: [] })
      }
      
      const rec = recommendations.get(key)!
      rec.count++
      rec.trains.push(train)
    })
    
    return Array.from(recommendations.entries()).map(([key, data]) => {
      const [trainType, timeRange] = key.split('-')
      return {
        trainType,
        timeRange,
        count: data.count,
        priority: (data.count > 10 ? 'high' : data.count > 5 ? 'medium' : 'low') as 'high' | 'medium' | 'low'
      }
    }).sort((a, b) => b.count - a.count)
  }, [getTrainRunningTime, getTimeRange])
  
  // 清理缓存的方法
  const clearCache = useCallback(() => {
    ruleMatchCache.clear()
    console.log('🧹 规则匹配缓存已清理')
  }, [])
  
  return {
    ...analysisResult,
    clearCache,
    isAnalyzing: false // 由于使用了memo，分析是同步的
  }
}