"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Separator } from "@/components/ui/separator"
import {
  Plus, AlertTriangle, Save, Edit, Trash2, Eye, Clock, Train,
  Copy, CheckSquare, Square, Lightbulb, Settings, Building2,
  Users, BarChart3, X, Download, Upload, CheckCircle
} from "lucide-react"
import { useTrainData } from "@/contexts/train-data-context"
import { useStaffingRules } from "@/contexts/staffing-rules-context"
import type { RailwayBureau, HighSpeedStaffingRule } from "@/types/staffing-rules"
import { RAILWAY_BUREAUS } from "@/types/staffing-rules"

// 增强的高铁规则类型
interface EnhancedHighSpeedRule {
  id: string
  name: string
  formationType: string
  runningTimeLimit: "none" | "under12" | "over12"
  staffing: {
    trainConductor: number
    trainAttendant: number
    businessClassAttendant: number
  }
  coverageCount?: number
  bureauId: string
  createdAt: Date
  description?: string
}



// 智能推荐规则
interface RecommendedRule {
  formationType: string
  runningTimeLimit: "none" | "under12" | "over12"
  reason: string
  affectedTrains: number
  suggestedStaffing: {
    trainConductor: number
    trainAttendant: number
    businessClassAttendant: number
  }
}

// 本地存储键名
const STORAGE_KEYS = {
  RULES: "enhanced-high-speed-rules"
}

// 从本地存储加载数据
const loadFromStorage = <T,>(key: string, defaultValue: T): T => {
  if (typeof window === "undefined") return defaultValue

  try {
    const stored = localStorage.getItem(key)
    if (stored) {
      const parsed = JSON.parse(stored)
      // 如果是规则数据，需要恢复Date对象
      if (key === STORAGE_KEYS.RULES && parsed) {
        Object.keys(parsed).forEach(bureau => {
          if (parsed[bureau] && Array.isArray(parsed[bureau])) {
            parsed[bureau] = parsed[bureau].map((rule: any) => ({
              ...rule,
              createdAt: new Date(rule.createdAt)
            }))
          }
        })
      }
      return parsed
    }
  } catch (error) {
    console.warn(`Failed to load ${key} from localStorage:`, error)
  }

  return defaultValue
}

// 保存数据到本地存储
const saveToStorage = (key: string, data: any) => {
  if (typeof window === "undefined") return

  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch (error) {
    console.warn(`Failed to save ${key} to localStorage:`, error)
  }
}

// 转换函数：将 EnhancedHighSpeedRule 转换为 HighSpeedStaffingRule
const convertEnhancedRuleToStaffingRule = (enhancedRule: EnhancedHighSpeedRule): HighSpeedStaffingRule => {
  // 构建条件对象
  const conditions: HighSpeedStaffingRule['conditions'] = {
    formation: [enhancedRule.formationType]
  }

  // 根据运行时间限制设置时间条件
  if (enhancedRule.runningTimeLimit === 'under12') {
    conditions.runningTime = { max: 12 }
  } else if (enhancedRule.runningTimeLimit === 'over12') {
    conditions.runningTime = { min: 12 }
  }
  // 'none' 情况下不设置时间限制

  return {
    id: enhancedRule.id,
    name: enhancedRule.name,
    description: enhancedRule.description,
    conditions,
    staffing: {
      trainConductor: enhancedRule.staffing.trainConductor,
      trainAttendant: enhancedRule.staffing.trainAttendant,
      businessClassAttendant: enhancedRule.staffing.businessClassAttendant
    }
  }
}

export function EnhancedHighSpeedRulesB() {
  const trainDataContext = useTrainData()
  const { updateStandard: updateStaffingStandard, standards: staffingStandards, currentStandard: currentStaffingStandard } = useStaffingRules()

  // 数据结构检查（仅在开发环境）
  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('=== 编组字段检查 ===')
      try {
        const unitData = trainDataContext.getCurrentUnitData()

        if (unitData.conventionalData?.length > 0) {
          const conventionalSample = unitData.conventionalData[0]
          console.log('普速数据字段:', Object.keys(conventionalSample))

          // 检查普速数据的编组相关字段
          const possibleFormationFields = ['编组', 'formation', '编组详情', 'Formation', '车型', '编组类型', '列车编组', '编组信息', '车型编组', '编组配置']
          console.log('普速编组字段检查:')
          possibleFormationFields.forEach(field => {
            if (conventionalSample[field]) {
              console.log(`  找到字段 "${field}":`, conventionalSample[field])
            }
          })
        }
      } catch (error) {
        console.log('数据检查出错:', error)
      }
    }
  }, [])

  // 从 StaffingRulesContext 获取当前铁路局信息
  const currentBureau = currentStaffingStandard?.bureau || "beijing"

  const [rules, setRules] = useState<Record<string, EnhancedHighSpeedRule[]>>(() =>
    loadFromStorage(STORAGE_KEYS.RULES, { beijing: [] })
  )
  
  const [availableFormations, setAvailableFormations] = useState<string[]>([])
  const [uncoveredTrains, setUncoveredTrains] = useState<any[]>([])
  const [uncoveredAnalysis, setUncoveredAnalysis] = useState<{
    byFormation: Record<string, number>
    byTimeLimit: Record<string, number>
    samples: Array<{formation: string, timeLimit: string, trainNumber: string, count: number}>
  }>({ byFormation: {}, byTimeLimit: {}, samples: [] })
  const [editingRule, setEditingRule] = useState<EnhancedHighSpeedRule | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [selectedRules, setSelectedRules] = useState<Set<string>>(new Set())
  const [showRecommendations, setShowRecommendations] = useState(false)
  const [sortBy, setSortBy] = useState<"formation" | "time" | "staff" | "created">("formation")
  const [recommendations, setRecommendations] = useState<RecommendedRule[]>([])


  // 获取当前铁路局的规则和标准，并按选择的方式排序
  const currentRules = (rules[currentBureau] || []).sort((a, b) => {
    switch (sortBy) {
      case "formation":
        // 按编组类型排序
        const formationA = a.formationType.toLowerCase()
        const formationB = b.formationType.toLowerCase()
        if (formationA !== formationB) {
          return formationA.localeCompare(formationB)
        }
        // 编组相同时按运行时间限制排序
        const timeOrder = { 'none': 0, 'under12': 1, 'over12': 2 }
        return timeOrder[a.runningTimeLimit] - timeOrder[b.runningTimeLimit]

      case "time":
        // 按运行时间限制排序
        const timeOrderB = { 'none': 0, 'under12': 1, 'over12': 2 }
        return timeOrderB[a.runningTimeLimit] - timeOrderB[b.runningTimeLimit]

      case "staff":
        // 按总人数排序
        return getTotalStaff(b.staffing) - getTotalStaff(a.staffing)

      case "created":
        // 按创建时间排序（最新的在前）
        return b.createdAt.getTime() - a.createdAt.getTime()

      default:
        return 0
    }
  })
  // 自动保存数据到本地存储

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.RULES, rules)
  }, [rules])

  // 同步当前铁路局的规则到 StaffingRulesContext
  useEffect(() => {
    const currentRulesForBureau = rules[currentBureau] || []
    if (currentRulesForBureau.length > 0) {
      syncRulesToStaffingContext(currentRulesForBureau)
    }
  }, [currentBureau, rules])

  // 从高铁数据中提取编组类型
  useEffect(() => {
    try {
      const unitData = trainDataContext.getCurrentUnitData()

      // 只使用高铁数据
      const highSpeedData = unitData.highSpeedData || []

      if (highSpeedData.length > 0) {
        // 尝试从不同可能的字段名中提取编组信息
        const formations = new Set<string>()

        highSpeedData.forEach(train => {
          // 使用扩展的编组字段提取逻辑
          const formationValue = train['编组'] ||
                                 train['formation'] ||
                                 train['编组详情'] ||
                                 train['Formation'] ||
                                 train['车型'] ||
                                 train['编组类型'] ||
                                 train['列车编组'] ||
                                 train['编组信息'] ||
                                 train['车型编组'] ||
                                 train['编组配置']
          if (formationValue && typeof formationValue === 'string' && formationValue.trim()) {
            formations.add(formationValue.trim())
          }
        })

        const formationArray = Array.from(formations).sort()
        setAvailableFormations(formationArray)

        if (process.env.NODE_ENV === 'development') {
          console.log('从高铁数据中提取的编组类型:', formationArray)
        }
      } else {
        // 如果没有数据，显示空列表
        setAvailableFormations([])
      }
    } catch (error) {
      console.warn('提取编组信息失败，显示空列表:', error)
      setAvailableFormations([])
    }
  }, [currentBureau, trainDataContext])

  // 检查未配备规则的列车（仅高铁）
  useEffect(() => {
    try {
      const unitData = trainDataContext.getCurrentUnitData()

      // 只使用高铁数据，不包含普速数据
      const highSpeedData = unitData.highSpeedData || []

      if (highSpeedData.length === 0) {
        setUncoveredTrains([])
        setRecommendations([])
        return
      }

      const uncovered = highSpeedData.filter(train => {
        return !currentRules.some(rule => matchesRule(train, rule))
      })
      setUncoveredTrains(uncovered)

      // 分析未配备列车
      const analysis = analyzeUncoveredTrains(uncovered)
      setUncoveredAnalysis(analysis)

      // 生成智能推荐
      generateRecommendations(uncovered)
    } catch (error) {
      console.warn('检查未配备规则失败:', error)
      setUncoveredTrains([])
      setRecommendations([])
    }
  }, [currentRules, currentBureau, trainDataContext])

  const matchesRule = (train: any, rule: EnhancedHighSpeedRule) => {
    // 获取列车的编组信息 - 扩展字段支持
    const trainFormation = train['编组'] ||
                          train['formation'] ||
                          train['编组详情'] ||
                          train['Formation'] ||
                          train['车型'] ||
                          train['编组类型'] ||
                          train['列车编组'] ||
                          train['编组信息'] ||
                          train['车型编组'] ||
                          train['编组配置']
    const formationMatch = rule.formationType === trainFormation
    if (!formationMatch) return false

    // 获取运行时间信息
    const runningTime = getTrainRunningTime(train)

    if (rule.runningTimeLimit === 'none') return true
    if (rule.runningTimeLimit === 'under12' && runningTime < 12) return true
    if (rule.runningTimeLimit === 'over12' && runningTime >= 12) return true

    return false
  }

  const getTrainRunningTime = (train: any): number => {
    // 尝试从不同字段获取运行时间
    const timeFields = ['单程运行时间', '单程工时', '运行时间', 'runningTime', '工时']

    for (const field of timeFields) {
      const timeValue = train[field]
      if (timeValue) {
        // 如果是字符串格式如"4:28"，转换为小时数
        if (typeof timeValue === 'string' && timeValue.includes(':')) {
          const [hours, minutes] = timeValue.split(':').map(Number)
          return hours + (minutes || 0) / 60
        }
        // 如果是数字，直接返回
        if (typeof timeValue === 'number') {
          return timeValue
        }
        // 尝试解析字符串数字
        const parsed = parseFloat(timeValue)
        if (!isNaN(parsed)) {
          return parsed
        }
      }
    }

    // 默认返回0
    return 0
  }

  // 分析未配备列车的详细信息
  const analyzeUncoveredTrains = (uncovered: any[]) => {
    const byFormation: Record<string, number> = {}
    const byTimeLimit: Record<string, number> = {}
    const combinationCounts: Record<string, {formation: string, timeLimit: string, trainNumber: string, count: number}> = {}

    uncovered.forEach((train, index) => {
      // 扩展编组字段提取逻辑，支持更多可能的字段名
      const formation = train['编组'] ||
                       train['formation'] ||
                       train['编组详情'] ||
                       train['Formation'] ||
                       train['车型'] ||
                       train['编组类型'] ||
                       train['列车编组'] ||
                       train['编组信息'] ||
                       train['车型编组'] ||
                       train['编组配置'] ||
                       '未知编组'
      const runningTime = getTrainRunningTime(train)
      const timeLimit = runningTime < 12 ? 'under12' : runningTime >= 12 ? 'over12' : 'none'
      const trainNumber = train.车次 || train.trainNumber || train['车次'] || '未知'

      // 按编组统计
      byFormation[formation] = (byFormation[formation] || 0) + 1

      // 按时间限制统计
      const timeLimitText = timeLimit === 'under12' ? '12小时以下' :
                           timeLimit === 'over12' ? '12小时以上' : '不限时间'
      byTimeLimit[timeLimitText] = (byTimeLimit[timeLimitText] || 0) + 1

      // 按组合统计
      const key = `${formation}-${timeLimit}`
      if (!combinationCounts[key]) {
        combinationCounts[key] = {
          formation,
          timeLimit: timeLimitText,
          trainNumber,
          count: 0
        }
      }
      combinationCounts[key].count++
    })

    // 转换为数组并排序
    const samples = Object.values(combinationCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10) // 只显示前10种组合

    return { byFormation, byTimeLimit, samples }
  }

  const generateRecommendations = (uncovered: any[]) => {
    const formationGroups = uncovered.reduce((acc, train) => {
      // 使用与其他函数一致的编组字段提取逻辑
      const formation = train['编组'] ||
                       train['formation'] ||
                       train['编组详情'] ||
                       train['Formation'] ||
                       train['车型'] ||
                       train['编组类型'] ||
                       train['列车编组'] ||
                       train['编组信息'] ||
                       train['车型编组'] ||
                       train['编组配置']
      if (formation) {
        if (!acc[formation]) acc[formation] = []
        acc[formation].push(train)
      }
      return acc
    }, {} as Record<string, any[]>)

    const newRecommendations: RecommendedRule[] = []

    Object.entries(formationGroups).forEach(([formation, trains]) => {
      const shortTrains = trains.filter(t => getTrainRunningTime(t) < 12)
      const longTrains = trains.filter(t => getTrainRunningTime(t) >= 12)

      if (shortTrains.length > 0) {
        newRecommendations.push({
          formationType: formation,
          runningTimeLimit: "under12",
          reason: `${shortTrains.length}趟短途高铁需要配置规则`,
          affectedTrains: shortTrains.length,
          suggestedStaffing: getSuggestedStaffing(formation, "under12")
        })
      }

      if (longTrains.length > 0) {
        newRecommendations.push({
          formationType: formation,
          runningTimeLimit: "over12",
          reason: `${longTrains.length}趟长途高铁需要配置规则`,
          affectedTrains: longTrains.length,
          suggestedStaffing: getSuggestedStaffing(formation, "over12")
        })
      }
    })

    setRecommendations(newRecommendations)
  }

  const getSuggestedStaffing = (formation: string, timeLimit: string) => {
    // 基于编组类型和时间限制的智能推荐
    const isLongFormation = formation.includes("16") || formation.includes("长")
    const isLongTime = timeLimit === "over12"
    
    return {
      trainConductor: isLongFormation || isLongTime ? 2 : 1,
      trainAttendant: isLongFormation ? (isLongTime ? 4 : 3) : (isLongTime ? 3 : 2),
      businessClassAttendant: isLongFormation && isLongTime ? 1 : 0
    }
  }

  const generateRuleName = (formationType: string, runningTimeLimit: string) => {
    const timeText = getTimeText(runningTimeLimit)
    return `${formationType}-${timeText}`
  }

  const handleCreateNew = () => {
    const defaultFormation = availableFormations[0] || "8编组"
    const defaultTimeLimit = "none"

    const newRule: EnhancedHighSpeedRule = {
      id: `rule-${Date.now()}`,
      name: generateRuleName(defaultFormation, defaultTimeLimit),
      formationType: defaultFormation,
      runningTimeLimit: defaultTimeLimit,
      staffing: {
        trainConductor: 1,
        trainAttendant: 2,
        businessClassAttendant: 0
      },
      bureauId: currentBureau,
      createdAt: new Date()
    }
    setEditingRule(newRule)
    setIsCreating(true)
  }

  const handleEdit = (rule: EnhancedHighSpeedRule) => {
    setEditingRule({ ...rule })
    setIsCreating(false)
  }

  const handleCopy = (rule: EnhancedHighSpeedRule) => {
    const copiedRule: EnhancedHighSpeedRule = {
      ...rule,
      id: `rule-${Date.now()}`,
      name: `${generateRuleName(rule.formationType, rule.runningTimeLimit)}-副本`,
      createdAt: new Date()
    }
    setEditingRule(copiedRule)
    setIsCreating(true)
  }

  // 同步规则到 StaffingRulesContext
  const syncRulesToStaffingContext = (updatedRules: EnhancedHighSpeedRule[]) => {
    // 查找或创建对应的 StaffingStandard
    const bureauName = RAILWAY_BUREAUS[currentBureau]
    let targetStandard = staffingStandards.find(s => s.bureau === currentBureau)

    if (!targetStandard) {
      // 如果没有找到对应的标准，创建一个新的
      const newStandard = {
        id: `${currentBureau}-standard-${Date.now()}`,
        name: `${bureauName}标准`,
        bureau: currentBureau,
        standardWorkHours: currentStaffingStandard?.standardWorkHours || 166.6,
        description: `${bureauName}客运段定员标准`,
        createdAt: new Date(),
        updatedAt: new Date(),
        reserveRates: currentStaffingStandard?.reserveRates || {
          mainProduction: {
            beijing: 8,
            shijiazhuang: 8,
            tianjin: 8
          },
          otherProduction: 5
        },
        highSpeedRules: updatedRules.map(convertEnhancedRuleToStaffingRule),
        conventionalRules: [],
        otherProductionRules: []
      }

      // 创建新标准
      updateStaffingStandard(newStandard)
    } else {
      // 更新现有标准的高铁规则
      const updatedStandard = {
        ...targetStandard,
        highSpeedRules: updatedRules.map(convertEnhancedRuleToStaffingRule)
      }
      updateStaffingStandard(updatedStandard)
    }
  }

  const handleSave = () => {
    if (!editingRule) return

    const updatedRules = [...currentRules]
    if (isCreating) {
      updatedRules.push(editingRule)
    } else {
      const index = updatedRules.findIndex(r => r.id === editingRule.id)
      if (index >= 0) updatedRules[index] = editingRule
    }

    setRules(prev => ({ ...prev, [currentBureau]: updatedRules }))

    // 同步到 StaffingRulesContext
    syncRulesToStaffingContext(updatedRules)

    setEditingRule(null)
    setIsCreating(false)

    // 显示成功提示
    console.log(`✅ 规则已保存并同步到定员测算系统，当前${RAILWAY_BUREAUS[currentBureau]}共有 ${updatedRules.length} 条高铁规则`)
  }

  const handleCancel = () => {
    setEditingRule(null)
    setIsCreating(false)
  }

  const handleDelete = (id: string) => {
    if (confirm('确定要删除这个规则吗？')) {
      const updatedRules = currentRules.filter(r => r.id !== id)
      setRules(prev => ({ ...prev, [currentBureau]: updatedRules }))

      // 同步到 StaffingRulesContext
      syncRulesToStaffingContext(updatedRules)
    }
  }

  const handleBatchDelete = () => {
    if (selectedRules.size === 0) return
    if (confirm(`确定要删除选中的 ${selectedRules.size} 个规则吗？`)) {
      const updatedRules = currentRules.filter(r => !selectedRules.has(r.id))
      setRules(prev => ({ ...prev, [currentBureau]: updatedRules }))
      setSelectedRules(new Set())

      // 同步到 StaffingRulesContext
      syncRulesToStaffingContext(updatedRules)
    }
  }

  const handleSelectRule = (ruleId: string, selected: boolean) => {
    const newSelected = new Set(selectedRules)
    if (selected) {
      newSelected.add(ruleId)
    } else {
      newSelected.delete(ruleId)
    }
    setSelectedRules(newSelected)
  }

  const handleSelectAll = () => {
    if (selectedRules.size === currentRules.length) {
      setSelectedRules(new Set())
    } else {
      setSelectedRules(new Set(currentRules.map(r => r.id)))
    }
  }

  const applyRecommendation = (rec: RecommendedRule) => {
    const newRule: EnhancedHighSpeedRule = {
      id: `rule-${Date.now()}`,
      name: generateRuleName(rec.formationType, rec.runningTimeLimit),
      formationType: rec.formationType,
      runningTimeLimit: rec.runningTimeLimit,
      staffing: rec.suggestedStaffing,
      bureauId: currentBureau,
      createdAt: new Date(),
      description: `智能推荐：${rec.reason}`
    }

    const updatedRules = [...currentRules, newRule]
    setRules(prev => ({ ...prev, [currentBureau]: updatedRules }))

    // 同步到 StaffingRulesContext
    syncRulesToStaffingContext(updatedRules)
  }

  const getTimeText = (timeLimit: string) => {
    switch (timeLimit) {
      case 'none': return '不限时间'
      case 'under12': return '12小时以下'
      case 'over12': return '12小时以上'
      default: return timeLimit
    }
  }

  const getTotalStaff = (staffing: EnhancedHighSpeedRule['staffing']) => {
    return staffing.trainConductor + staffing.trainAttendant + staffing.businessClassAttendant
  }

  const getCoveredTrainsCount = (rule: EnhancedHighSpeedRule) => {
    try {
      const unitData = trainDataContext.getCurrentUnitData()
      const allData = [...unitData.highSpeedData, ...unitData.conventionalData]

      return allData.filter(train => matchesRule(train, rule)).length
    } catch (error) {
      console.warn('获取覆盖列车数量失败:', error)
      return 0
    }
  }









  // 快速创建规则
  const handleQuickCreateRule = (formation: string, timeLimit: string) => {
    const timeLimitValue = timeLimit === '12小时以下' ? 'under12' :
                          timeLimit === '12小时以上' ? 'over12' : 'none'

    const newRule: EnhancedHighSpeedRule = {
      id: `rule-${Date.now()}`,
      name: `${formation}-${timeLimit}`,
      formationType: formation,
      runningTimeLimit: timeLimitValue,
      staffing: {
        trainConductor: 1,
        trainAttendant: 2,
        businessClassAttendant: 0
      },
      bureauId: currentBureau,
      createdAt: new Date(),
      description: `自动创建的${formation}${timeLimit}规则`
    }

    setEditingRule(newRule)
    setIsCreating(true)
  }

  return (
    <div className="space-y-6">
      {/* 高铁规则配置标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">高铁定员规则配置</h2>
          <p className="text-muted-foreground">
            {RAILWAY_BUREAUS[currentBureau]} - 逐个配置每种编组和时间组合的定员规则
          </p>
          <div className="flex items-center space-x-2 mt-2">
            <Badge variant="outline" className="text-green-600 border-green-200">
              <CheckCircle className="h-3 w-3 mr-1" />
              已同步到定员测算
            </Badge>
            <span className="text-xs text-muted-foreground">
              配置的规则将自动应用于定员测算页面
            </span>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            onClick={() => setShowRecommendations(!showRecommendations)}
            variant="outline"
            className={recommendations.length > 0 ? "border-orange-500 text-orange-600" : ""}
          >
            <Lightbulb className="h-4 w-4 mr-1" />
            智能推荐 {recommendations.length > 0 && `(${recommendations.length})`}
          </Button>
          <Button onClick={handleCreateNew}>
            <Plus className="h-4 w-4 mr-1" />
            新建规则
          </Button>
        </div>
      </div>


      {/* 智能推荐面板 */}
      {showRecommendations && recommendations.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-orange-700">
              <Lightbulb className="h-5 w-5" />
              <span>智能推荐规则</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recommendations.map((rec, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                  <div className="flex-1">
                    <div className="font-medium">
                      {rec.formationType} - {getTimeText(rec.runningTimeLimit)}
                    </div>
                    <div className="text-sm text-muted-foreground">{rec.reason}</div>
                    <div className="text-sm text-blue-600">
                      建议配置：列车长{rec.suggestedStaffing.trainConductor}人，
                      列车员{rec.suggestedStaffing.trainAttendant}人
                      {rec.suggestedStaffing.businessClassAttendant > 0 &&
                        `，商务座${rec.suggestedStaffing.businessClassAttendant}人`}
                    </div>
                  </div>
                  <Button
                    onClick={() => applyRecommendation(rec)}
                    size="sm"
                    className="ml-4"
                  >
                    应用推荐
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 未配备规则详细分析 */}
      {uncoveredTrains.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-red-700">
              <AlertTriangle className="h-5 w-5" />
              <span>高铁未配备定员规则分析</span>
              <Badge variant="destructive">{uncoveredTrains.length} 趟高铁</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 按编组类型统计 */}
            <div>
              <h4 className="font-semibold text-sm mb-2 text-red-700">高铁按编组类型分布：</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {Object.entries(uncoveredAnalysis.byFormation).map(([formation, count]) => (
                  <div key={formation} className="bg-white p-2 rounded border">
                    <div className="text-sm font-medium">{formation}</div>
                    <div className="text-xs text-gray-600">{count} 趟高铁</div>
                  </div>
                ))}
              </div>
            </div>

            {/* 按时间限制统计 */}
            <div>
              <h4 className="font-semibold text-sm mb-2 text-red-700">高铁按运行时间分布：</h4>
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(uncoveredAnalysis.byTimeLimit).map(([timeLimit, count]) => (
                  <div key={timeLimit} className="bg-white p-2 rounded border">
                    <div className="text-sm font-medium">{timeLimit}</div>
                    <div className="text-xs text-gray-600">{count} 趟高铁</div>
                  </div>
                ))}
              </div>
            </div>

            {/* 具体组合示例 */}
            {uncoveredAnalysis.samples.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm mb-2 text-red-700">需要配置的高铁规则类型：</h4>
                <div className="space-y-2">
                  {uncoveredAnalysis.samples.slice(0, 5).map((sample, index) => (
                    <div key={index} className="bg-white p-3 rounded border flex items-center justify-between hover:bg-gray-50 transition-colors">
                      <div>
                        <span className="font-medium">{sample.formation}</span>
                        <span className="text-gray-500 mx-2">•</span>
                        <span className="text-sm">{sample.timeLimit}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline">{sample.count} 趟高铁</Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-7"
                          onClick={() => handleQuickCreateRule(sample.formation, sample.timeLimit)}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          创建规则
                        </Button>
                      </div>
                    </div>
                  ))}
                  {uncoveredAnalysis.samples.length > 5 && (
                    <div className="text-xs text-gray-500 text-center">
                      还有 {uncoveredAnalysis.samples.length - 5} 种其他组合...
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 统计仪表板 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Train className="h-8 w-8 mx-auto mb-2 text-blue-600" />
            <div className="text-2xl font-bold">{availableFormations.length}</div>
            <div className="text-sm text-muted-foreground">编组类型</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Edit className="h-8 w-8 mx-auto mb-2 text-green-600" />
            <div className="text-2xl font-bold">{currentRules.length}</div>
            <div className="text-sm text-muted-foreground">已配置规则</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Eye className="h-8 w-8 mx-auto mb-2 text-purple-600" />
            <div className="text-2xl font-bold">{(() => {
              try {
                const unitData = trainDataContext.getCurrentUnitData()
                const highSpeedData = unitData.highSpeedData || []
                return highSpeedData.length - uncoveredTrains.length
              } catch (error) {
                return 0
              }
            })()}</div>
            <div className="text-sm text-muted-foreground">已覆盖高铁</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-red-600" />
            <div className="text-2xl font-bold text-red-600">{uncoveredTrains.length}</div>
            <div className="text-sm text-muted-foreground">未覆盖高铁</div>
          </CardContent>
        </Card>
      </div>

      {/* 批量操作工具栏 */}
      {currentRules.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Button
                  onClick={handleSelectAll}
                  variant="outline"
                  size="sm"
                  className="flex items-center space-x-2"
                >
                  {selectedRules.size === currentRules.length ? (
                    <CheckSquare className="h-4 w-4" />
                  ) : (
                    <Square className="h-4 w-4" />
                  )}
                  <span>全选</span>
                </Button>
                <span className="text-sm text-muted-foreground">
                  已选择 {selectedRules.size} / {currentRules.length} 个规则
                </span>

                {/* 排序选择器 */}
                <div className="flex items-center space-x-2">
                  <Label className="text-sm">排序:</Label>
                  <Select value={sortBy} onValueChange={(value: "formation" | "time" | "staff" | "created") => setSortBy(value)}>
                    <SelectTrigger className="w-32 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="formation">按编组</SelectItem>
                      <SelectItem value="time">按时间限制</SelectItem>
                      <SelectItem value="staff">按人数</SelectItem>
                      <SelectItem value="created">按创建时间</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {selectedRules.size > 0 && (
                <div className="flex items-center space-x-2">
                  <Button
                    onClick={handleBatchDelete}
                    variant="outline"
                    size="sm"
                    className="text-red-600 border-red-200 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    批量删除
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 规则列表 */}
      {currentRules.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {currentRules.map((rule) => (
            <Card key={rule.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="space-y-3">
                  {/* 标题行 */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Button
                        onClick={() => handleSelectRule(rule.id, !selectedRules.has(rule.id))}
                        variant="ghost"
                        size="sm"
                        className="p-1 h-auto"
                      >
                        {selectedRules.has(rule.id) ? (
                          <CheckSquare className="h-3 w-3 text-blue-600" />
                        ) : (
                          <Square className="h-3 w-3" />
                        )}
                      </Button>
                      <h3 className="font-semibold text-sm truncate">{rule.name}</h3>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {getTotalStaff(rule.staffing)}人
                    </Badge>
                  </div>

                  {/* 定员信息 */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span>列车长: {rule.staffing.trainConductor}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>列车员: {rule.staffing.trainAttendant}</span>
                    </div>
                    {rule.staffing.businessClassAttendant > 0 && (
                      <div className="flex items-center space-x-1 col-span-2">
                        <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                        <span>商务座: {rule.staffing.businessClassAttendant}</span>
                      </div>
                    )}
                  </div>

                  {/* 覆盖信息 */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>覆盖 {getCoveredTrainsCount(rule)} 趟列车</span>
                    <span>{getTimeText(rule.runningTimeLimit)}</span>
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="flex items-center space-x-1">
                      <Button
                        onClick={() => handleCopy(rule)}
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        title="复制规则"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button
                        onClick={() => handleEdit(rule)}
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        title="编辑规则"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        onClick={() => handleDelete(rule.id)}
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                        title="删除规则"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {rule.createdAt.toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Train className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">暂无高铁定员规则</h3>
            <p className="text-muted-foreground mb-4">
              请添加规则开始配置 {RAILWAY_BUREAUS[currentBureau]} 的高铁乘务人员定员标准
            </p>
            <Button onClick={handleCreateNew}>
              <Plus className="h-4 w-4 mr-2" />
              创建第一个规则
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 规则编辑模态框 */}
      {editingRule && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>
                  {isCreating ? "创建新规则" : "编辑规则"}
                </CardTitle>
                <Button onClick={handleCancel} variant="ghost" size="sm">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 基础信息 */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="ruleName">规则名称（自动生成）</Label>
                  <Input
                    id="ruleName"
                    value={editingRule.name}
                    readOnly
                    className="bg-muted"
                    placeholder="规则名称将自动生成"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    规则名称格式：编组类型-运行时间限制
                  </p>
                </div>

                <div>
                  <Label htmlFor="ruleDescription">规则描述</Label>
                  <Input
                    id="ruleDescription"
                    value={editingRule.description || ""}
                    onChange={(e) => setEditingRule(prev => prev ? {...prev, description: e.target.value} : null)}
                    placeholder="输入规则描述（可选）"
                  />
                </div>
              </div>

              {/* 匹配条件 */}
              <div className="space-y-4">
                <h4 className="font-medium text-lg">匹配条件</h4>

                <div>
                  <Label>编组类型</Label>
                  <Select
                    value={editingRule.formationType}
                    onValueChange={(value) => setEditingRule(prev => prev ? {
                      ...prev,
                      formationType: value,
                      name: generateRuleName(value, prev.runningTimeLimit)
                    } : null)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableFormations.map(formation => (
                        <SelectItem key={formation} value={formation}>
                          {formation}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>运行时间限制</Label>
                  <RadioGroup
                    value={editingRule.runningTimeLimit}
                    onValueChange={(value: "none" | "under12" | "over12") =>
                      setEditingRule(prev => prev ? {
                        ...prev,
                        runningTimeLimit: value,
                        name: generateRuleName(prev.formationType, value)
                      } : null)
                    }
                    className="flex space-x-6 mt-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="none" id="none" />
                      <Label htmlFor="none">不限时间</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="under12" id="under12" />
                      <Label htmlFor="under12">12小时以下</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="over12" id="over12" />
                      <Label htmlFor="over12">12小时以上</Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>

              {/* 人员配置 */}
              <div className="space-y-4">
                <h4 className="font-medium text-lg">人员配置</h4>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="trainConductor">列车长</Label>
                    <Input
                      id="trainConductor"
                      type="number"
                      min="0"
                      value={editingRule.staffing.trainConductor}
                      onChange={(e) => setEditingRule(prev => prev ? {
                        ...prev,
                        staffing: { ...prev.staffing, trainConductor: parseInt(e.target.value) || 0 }
                      } : null)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="trainAttendant">列车员</Label>
                    <Input
                      id="trainAttendant"
                      type="number"
                      min="0"
                      value={editingRule.staffing.trainAttendant}
                      onChange={(e) => setEditingRule(prev => prev ? {
                        ...prev,
                        staffing: { ...prev.staffing, trainAttendant: parseInt(e.target.value) || 0 }
                      } : null)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="businessClassAttendant">商务座服务员</Label>
                    <Input
                      id="businessClassAttendant"
                      type="number"
                      min="0"
                      value={editingRule.staffing.businessClassAttendant}
                      onChange={(e) => setEditingRule(prev => prev ? {
                        ...prev,
                        staffing: { ...prev.staffing, businessClassAttendant: parseInt(e.target.value) || 0 }
                      } : null)}
                    />
                  </div>
                </div>

                <div className="bg-muted p-3 rounded-lg">
                  <div className="text-sm font-medium mb-1">总人数预览</div>
                  <div className="text-lg font-bold text-primary">
                    {getTotalStaff(editingRule.staffing)} 人
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    预计覆盖列车: {(() => {
                      try {
                        const unitData = trainDataContext.getCurrentUnitData()
                        const allData = [...unitData.highSpeedData, ...unitData.conventionalData]
                        return allData.filter(train => matchesRule(train, editingRule)).length
                      } catch (error) {
                        return 0
                      }
                    })()} 趟
                  </div>
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="flex justify-end space-x-2 pt-4 border-t">
                <Button onClick={handleCancel} variant="outline">
                  取消
                </Button>
                <Button onClick={handleSave}>
                  <Save className="h-4 w-4 mr-1" />
                  保存规则
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
