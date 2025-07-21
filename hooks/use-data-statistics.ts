"use client"

import { useState, useEffect, useMemo } from "react"
import { useStaffingRules } from "@/contexts/staffing-rules-context"
import { useTrainData } from "@/contexts/train-data-context"
import { HighSpeedRuleEngine } from "@/utils/high-speed-rule-engine"
import { ConventionalRuleEngine } from "@/utils/conventional-rule-engine"
import { OtherProductionRuleEngine } from "@/utils/other-production-rule-engine"
import type { 
  BureauStaffingStats, 
  RuleComparisonData, 
  ChartData, 
  SyncStatus,
  UnitStaffingStats 
} from "@/types/data-statistics"
import { RAILWAY_BUREAUS } from "@/types/staffing-rules"
import { TRAIN_UNITS } from "@/types/dynamic-train-data"

// 从localStorage获取已保存的计算结果
const getStoredResults = () => {
  if (typeof window === "undefined") return {}
  
  try {
    const stored = localStorage.getItem("staffing-calculation-results")
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (error) {
    console.warn("Failed to load stored results:", error)
  }
  
  return {}
}

// 保存计算结果到localStorage
const saveResults = (results: any) => {
  if (typeof window === "undefined") return
  
  try {
    localStorage.setItem("staffing-calculation-results", JSON.stringify(results))
  } catch (error) {
    console.warn("Failed to save results:", error)
  }
}

export function useDataStatistics(refreshKey: number = 0) {
  const { standards } = useStaffingRules()
  const { unitData, getDataByUnit } = useTrainData()
  
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isLoading: false,
    lastSyncTime: new Date(),
    errors: [],
    pendingUpdates: 0
  })
  
  // 一键计算所有定员
  const calculateAllStaffing = async () => {
    if (!standards || standards.length === 0) {
      setSyncStatus(prev => ({ ...prev, errors: ['没有可用的定员标准'] }))
      return
    }
    
    setSyncStatus(prev => ({ ...prev, isLoading: true, errors: [] }))
    
    try {
      const allResults: { [key: string]: any } = {}
      
      for (const standard of standards) {
        console.log(`开始计算 ${standard.name} 的定员数据...`)
        
        // 为每个客运段计算定员
        const units = ['beijing', 'shijiazhuang', 'tianjin'] as const
        
        for (const unit of units) {
          const unitName = TRAIN_UNITS[unit]
          
          try {
            // 获取该单位的列车数据
            const unitData = getDataByUnit(unit)
            const highSpeedTrains = unitData.filter(train => train.trainType === '高铁')
            const conventionalTrains = unitData.filter(train => train.trainType === '普速')
            
            // 计算高铁定员
            let highSpeedResult = null
            if (highSpeedTrains.length > 0) {
              const hsEngine = new HighSpeedRuleEngine(standard)
              highSpeedResult = hsEngine.calculateUnitStaffing(highSpeedTrains, unitName)
              
              allResults[`${standard.id}-${unit}-highSpeed`] = highSpeedResult.summary.totalStaff
              allResults[`${standard.id}-${unit}-highSpeed-time`] = new Date().toISOString()
              
              console.log(`${unitName} 高铁定员计算完成: ${highSpeedResult.summary.totalStaff}人`)
            }
            
            // 计算普速定员
            let conventionalResult = null
            if (conventionalTrains.length > 0) {
              const convEngine = new ConventionalRuleEngine(standard)
              conventionalResult = convEngine.calculateUnitStaffing(conventionalTrains, unitName)
              
              allResults[`${standard.id}-${unit}-conventional`] = conventionalResult.summary.totalStaff
              allResults[`${standard.id}-${unit}-conventional-time`] = new Date().toISOString()
              
              console.log(`${unitName} 普速定员计算完成: ${conventionalResult.summary.totalStaff}人`)
            }
            
            // 计算其余生产定员
            const otherEngine = new OtherProductionRuleEngine(standard)
            
            const otherResult = otherEngine.calculateUnitStaffing(highSpeedResult, conventionalResult, unitName)
            
            allResults[`${standard.id}-${unit}-otherProduction`] = otherResult.summary.totalStaff
            allResults[`${standard.id}-${unit}-otherProduction-time`] = new Date().toISOString()
            
            console.log(`${unitName} 其余生产定员计算完成: ${otherResult.summary.totalStaff}人`)
            
          } catch (error) {
            console.error(`计算 ${unitName} 定员时出错:`, error)
            setSyncStatus(prev => ({ ...prev, errors: [...prev.errors, `${unitName} 计算失败`] }))
          }
        }
      }
      
      // 保存所有结果
      saveResults(allResults)
      console.log('所有定员计算完成并保存')
      
      setSyncStatus(prev => ({ 
        ...prev, 
        isLoading: false, 
        lastSyncTime: new Date(),
        pendingUpdates: 0
      }))
      
    } catch (error) {
      console.error('批量计算定员时出错:', error)
      setSyncStatus(prev => ({ 
        ...prev, 
        isLoading: false, 
        errors: [...prev.errors, '批量计算失败']
      }))
    }
  }

  // 获取存储的计算结果
  const storedResults = useMemo(() => getStoredResults(), [refreshKey])

  // 生成路局定员统计
  const bureauStats = useMemo((): BureauStaffingStats[] => {
    if (!standards || standards.length === 0) return []

    return standards.map(standard => {
      const bureauName = RAILWAY_BUREAUS[standard.bureau] || standard.name
      
      // 为每个客运段生成统计数据
      const units: UnitStaffingStats[] = [
        {
          unitName: "北京客运段",
          unitKey: "beijing",
          staffing: {
            highSpeed: storedResults[`${standard.id}-beijing-highSpeed`] || 0,
            conventional: storedResults[`${standard.id}-beijing-conventional`] || 0,
            otherProduction: storedResults[`${standard.id}-beijing-otherProduction`] || 0,
            total: 0
          },
          isCalculated: {
            highSpeed: !!storedResults[`${standard.id}-beijing-highSpeed`],
            conventional: !!storedResults[`${standard.id}-beijing-conventional`],
            otherProduction: !!storedResults[`${standard.id}-beijing-otherProduction`]
          },
          lastUpdated: {
            highSpeed: storedResults[`${standard.id}-beijing-highSpeed-time`] ? new Date(storedResults[`${standard.id}-beijing-highSpeed-time`]) : undefined,
            conventional: storedResults[`${standard.id}-beijing-conventional-time`] ? new Date(storedResults[`${standard.id}-beijing-conventional-time`]) : undefined,
            otherProduction: storedResults[`${standard.id}-beijing-otherProduction-time`] ? new Date(storedResults[`${standard.id}-beijing-otherProduction-time`]) : undefined
          }
        },
        {
          unitName: "石家庄客运段",
          unitKey: "shijiazhuang",
          staffing: {
            highSpeed: storedResults[`${standard.id}-shijiazhuang-highSpeed`] || 0,
            conventional: storedResults[`${standard.id}-shijiazhuang-conventional`] || 0,
            otherProduction: storedResults[`${standard.id}-shijiazhuang-otherProduction`] || 0,
            total: 0
          },
          isCalculated: {
            highSpeed: !!storedResults[`${standard.id}-shijiazhuang-highSpeed`],
            conventional: !!storedResults[`${standard.id}-shijiazhuang-conventional`],
            otherProduction: !!storedResults[`${standard.id}-shijiazhuang-otherProduction`]
          },
          lastUpdated: {
            highSpeed: storedResults[`${standard.id}-shijiazhuang-highSpeed-time`] ? new Date(storedResults[`${standard.id}-shijiazhuang-highSpeed-time`]) : undefined,
            conventional: storedResults[`${standard.id}-shijiazhuang-conventional-time`] ? new Date(storedResults[`${standard.id}-shijiazhuang-conventional-time`]) : undefined,
            otherProduction: storedResults[`${standard.id}-shijiazhuang-otherProduction-time`] ? new Date(storedResults[`${standard.id}-shijiazhuang-otherProduction-time`]) : undefined
          }
        },
        {
          unitName: "天津客运段",
          unitKey: "tianjin",
          staffing: {
            highSpeed: storedResults[`${standard.id}-tianjin-highSpeed`] || 0,
            conventional: storedResults[`${standard.id}-tianjin-conventional`] || 0,
            otherProduction: storedResults[`${standard.id}-tianjin-otherProduction`] || 0,
            total: 0
          },
          isCalculated: {
            highSpeed: !!storedResults[`${standard.id}-tianjin-highSpeed`],
            conventional: !!storedResults[`${standard.id}-tianjin-conventional`],
            otherProduction: !!storedResults[`${standard.id}-tianjin-otherProduction`]
          },
          lastUpdated: {
            highSpeed: storedResults[`${standard.id}-tianjin-highSpeed-time`] ? new Date(storedResults[`${standard.id}-tianjin-highSpeed-time`]) : undefined,
            conventional: storedResults[`${standard.id}-tianjin-conventional-time`] ? new Date(storedResults[`${standard.id}-tianjin-conventional-time`]) : undefined,
            otherProduction: storedResults[`${standard.id}-tianjin-otherProduction-time`] ? new Date(storedResults[`${standard.id}-tianjin-otherProduction-time`]) : undefined
          }
        }
      ]

      // 计算每个单位的总定员
      units.forEach(unit => {
        unit.staffing.total = unit.staffing.highSpeed + unit.staffing.conventional + unit.staffing.otherProduction
      })

      // 计算路局总计
      const totals = {
        highSpeed: units.reduce((sum, unit) => sum + unit.staffing.highSpeed, 0),
        conventional: units.reduce((sum, unit) => sum + unit.staffing.conventional, 0),
        otherProduction: units.reduce((sum, unit) => sum + unit.staffing.otherProduction, 0),
        grandTotal: 0
      }
      totals.grandTotal = totals.highSpeed + totals.conventional + totals.otherProduction

      // 计算完成状态
      const completedUnits = units.filter(unit => 
        Object.values(unit.isCalculated).every(Boolean)
      ).length

      return {
        bureauId: standard.id,
        bureauName,
        standard,
        units,
        totals,
        calculationStatus: {
          completed: completedUnits,
          total: units.length,
          percentage: units.length > 0 ? (completedUnits / units.length) * 100 : 0
        }
      }
    })
  }, [standards, storedResults])

  // 生成规则对比数据
  const ruleComparisons = useMemo((): RuleComparisonData[] => {
    if (!standards || standards.length === 0) return []

    return standards.map(standard => {
      const bureauName = RAILWAY_BUREAUS[standard.bureau] || standard.name

      return {
        bureauId: standard.id,
        bureauName,
        reserveRates: {
          mainProduction: {
            beijing: standard.reserveRates?.mainProduction?.beijing || 8,
            shijiazhuang: standard.reserveRates?.mainProduction?.shijiazhuang || 8,
            tianjin: standard.reserveRates?.mainProduction?.tianjin || 8
          },
          otherProduction: standard.reserveRates?.otherProduction || 5
        },
        highSpeedRules: {
          totalRules: standard.highSpeedRules?.length || 0,
          ruleTypes: standard.highSpeedRules?.map(rule => rule.name) || [],
          keyDifferences: [],
          detailedRules: standard.highSpeedRules?.map(rule => ({
            name: rule.name,
            description: rule.description || "",
            conditions: rule.conditions,
            staffing: rule.staffing
          })) || []
        },
        conventionalRules: {
          totalRules: standard.conventionalRules?.length || 0,
          ruleTypes: standard.conventionalRules?.map(rule => rule.name) || [],
          keyDifferences: [],
          detailedRules: standard.conventionalRules?.map(rule => ({
            name: rule.name,
            description: rule.description || "",
            conditions: rule.conditions,
            staffing: rule.staffing
          })) || []
        },
        otherProductionRules: {
          totalRules: standard.otherProductionRules?.length || 0,
          configTypes: standard.otherProductionRules?.map(rule => rule.name) || [],
          keyDifferences: [],
          detailedRules: standard.otherProductionRules?.map(rule => ({
            name: rule.name,
            description: rule.description || "",
            configType: rule.configType,
            config: rule.config
          })) || []
        },
        standardWorkHours: standard.standardWorkHours || 174
      }
    })
  }, [standards])

  // 生成图表数据
  const chartData = useMemo((): ChartData => {
    const pieChartData = bureauStats.map((bureau, index) => ({
      name: bureau.bureauName,
      value: bureau.totals.grandTotal,
      color: `hsl(${index * 137.5}, 70%, 50%)` // 生成不同的颜色
    }))

    const barChartData = bureauStats.map(bureau => ({
      bureauName: bureau.bureauName,
      highSpeed: bureau.totals.highSpeed,
      conventional: bureau.totals.conventional,
      otherProduction: bureau.totals.otherProduction,
      total: bureau.totals.grandTotal
    }))

    const comparisonData = ruleComparisons.map(rule => ({
      bureauName: rule.bureauName,
      reserveRate: (rule.reserveRates.mainProduction.beijing + 
                   rule.reserveRates.mainProduction.shijiazhuang + 
                   rule.reserveRates.mainProduction.tianjin) / 3,
      totalRules: rule.highSpeedRules.totalRules + 
                  rule.conventionalRules.totalRules + 
                  rule.otherProductionRules.totalRules,
      standardWorkHours: rule.standardWorkHours
    }))

    return {
      pieChartData,
      barChartData,
      comparisonData
    }
  }, [bureauStats, ruleComparisons])

  // 刷新数据的函数
  const refreshData = () => {
    setSyncStatus(prev => ({ ...prev, isLoading: true, errors: [] }))
    
    // 模拟数据刷新
    setTimeout(() => {
      setSyncStatus(prev => ({ 
        ...prev, 
        isLoading: false,
        lastSyncTime: new Date(),
        pendingUpdates: 0
      }))
    }, 1000)
  }

  // 监听localStorage变化以实现实时同步
  useEffect(() => {
    const handleStorageChange = () => {
      // 当localStorage中的计算结果发生变化时，更新同步状态
      setSyncStatus(prev => ({ 
        ...prev, 
        lastSyncTime: new Date(),
        pendingUpdates: prev.pendingUpdates + 1
      }))
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  return {
    bureauStats,
    ruleComparisons,
    chartData,
    syncStatus,
    refreshData,
    calculateAllStaffing
  }
}