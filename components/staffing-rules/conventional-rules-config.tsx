"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Plus, Trash2, Edit, Save, X, TestTube, CheckCircle, XCircle,
  Train, Lightbulb, AlertTriangle, Copy, Eye, Settings, Info
} from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useTrainData } from "@/contexts/train-data-context"
import type { ConventionalStaffingRule } from "@/types/staffing-rules"
import type { DynamicTrainData } from "@/types/dynamic-train-data"
import type { RailwayBureau } from "@/types/staffing-rules"
import { RAILWAY_BUREAUS } from "@/types/staffing-rules"

interface ConventionalRulesConfigProps {
  rules: ConventionalStaffingRule[]
  onChange: (rules: ConventionalStaffingRule[]) => void
}

// 普速列车类型映射
const CONVENTIONAL_TRAIN_TYPE_MAPPING = {
  '直达列车': {
    category: 'direct',
    needsTranslator: false,
    needsTrainOperator: false,
    description: '直达特快列车（主要为Z字头）'
  },
  '国际联运': {
    category: 'international',
    needsTranslator: true,
    needsTrainOperator: true,
    description: '国际联运列车'
  },
  '正常列车': {
    category: 'regular',
    needsTranslator: false,
    needsTrainOperator: false,
    description: '普通客运列车（K、T等）'
  }
}

// 运行时间范围选项
const TIME_RANGE_OPTIONS = [
  { value: 'under4', label: '4小时以下', description: '单程运行时间在4小时以内的列车' },
  { value: '4to12', label: '4-12小时', description: '单程运行时间4小时以上不足12小时的列车' },
  { value: '12to24', label: '12-24小时', description: '单程运行时间12小时以上不足24小时的列车' },
  { value: 'over24', label: '24小时以上', description: '单程运行时间在24小时以上的列车' }
]

// 推荐配置
interface RecommendationItem {
  trainTypes: string[]
  timeRange: string
  count: number
  priority: 'high' | 'medium' | 'low'
}

interface UncoveredAnalysis {
  totalUncovered: number
  byTrainType: Record<string, number>
  byTimeRange: Record<string, number>
  samples: RecommendationItem[]
}

export function ConventionalRulesConfig({ rules, onChange }: ConventionalRulesConfigProps) {
  const [editingRule, setEditingRule] = useState<ConventionalStaffingRule | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [showRecommendations, setShowRecommendations] = useState(false)
  const [currentBureau] = useState<RailwayBureau>("beijing") // 默认北京局

  // 获取训练数据
  const { unitData, currentUnit, isDataLoaded } = useTrainData()

  // 智能推荐和分析
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([])
  const [uncoveredAnalysis, setUncoveredAnalysis] = useState<UncoveredAnalysis>({
    totalUncovered: 0,
    byTrainType: {},
    byTimeRange: {},
    samples: []
  })
  const [uncoveredTrains, setUncoveredTrains] = useState<DynamicTrainData[]>([])
  const [showUncoveredDetails, setShowUncoveredDetails] = useState(false)

  // 筛选普速列车数据
  const filterConventionalTrains = (data: DynamicTrainData[]): DynamicTrainData[] => {
    return data.filter(train => {
      const category = train['类别'] || train['编组类型'] || "" // 使用类别字段（普速列车不使用编组字段）
      const trainNumber = train.车次 as string || ""

      // 筛选普速列车：基于类别字段
      return (
        category.includes("K快车") ||
        category.includes("T特快列车") ||
        category.includes("Z直达特快") ||
        category.includes("国际联运") ||
        trainNumber.match(/^[KTZ]\d+/) ||
        (!trainNumber.match(/^[GDC]\d+/) && !category.includes("高速") && !category.includes("动车"))
      )
    })
  }

  // 获取列车运行时间
  const getTrainRunningTime = (train: DynamicTrainData): number => {
    // 尝试多种字段名
    const runningTimeStr = train['单程运行时间'] ||
                          train['运行时间'] ||
                          train['单程时间'] ||
                          train['运行时长'] ||
                          train['时长']

    if (runningTimeStr) {
      const timeMatch = String(runningTimeStr).match(/(\d+(?:\.\d+)?)/);
      if (timeMatch) {
        return parseFloat(timeMatch[1]);
      }
    }

    // 如果没有直接的运行时间，尝试从始发终到时间计算
    const startTime = train['始发时间'] || train['出发时间']
    const endTime = train['终到时间'] || train['到达时间']

    if (startTime && endTime) {
      // 简单的时间差计算（这里可以根据实际格式调整）
      // 假设格式为 "HH:MM"
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
    }

    return 0 // 无法获取运行时间时返回0
  }

  // 获取时间范围
  const getTimeRange = (runningTime: number): string => {
    if (runningTime < 4) return 'under4'
    if (runningTime < 12) return '4to12'
    if (runningTime < 24) return '12to24'
    return 'over24'
  }

  // 确保规则数据结构完整
  const ensureRuleDataStructure = (rule: ConventionalStaffingRule): ConventionalStaffingRule => {
    return {
      ...rule,
      staffing: {
        ...rule.staffing,
        trainAttendants: rule.staffing.trainAttendants || {
          seatCar: { ratio: "1人1车", minStaff: 0 },
          softSleeper: { ratio: "1人2车", minStaff: 0 },
          hardSleeper: { ratio: "1人1车", minStaff: 0 }
        },
        // 兼容旧数据格式，将字符串类型的 broadcaster 和 trainDutyOfficer 转换为新格式
        additionalStaff: rule.staffing.additionalStaff || {
          broadcaster: 0,
          trainDutyOfficer: 0
        },
        baggageStaffConfig: rule.staffing.baggageStaffConfig || {
          enabled: (rule.conditions?.baggageCarCount || 0) > 0,
          staffPerTrain: (rule.conditions?.baggageCarCount || 0) > 0 ? 1 : 0
        }
      },
      conditions: {
        ...rule.conditions,
        baggageCarCount: rule.conditions.baggageCarCount || 0
      }
    }
  }

  // 从车次数据中提取行李车数量
  const getBaggageCarCount = (train: DynamicTrainData): number => {
    const formationText = train['编组详情'] || train['编组'] || train['formation'] || ""
    if (!formationText) return 0

    // 匹配行李车数量的正则表达式
    const patterns = ['行李车(\\d+)节', '行李(\\d+)节', '行包车(\\d+)节', '行包(\\d+)节']

    for (const pattern of patterns) {
      const match = formationText.match(new RegExp(pattern))
      if (match) {
        return parseInt(match[1]) || 0
      }
    }

    return 0
  }

  // 匹配规则 - 使用与规则引擎一致的层次化匹配策略
  const matchesRule = (train: DynamicTrainData, rule: ConventionalStaffingRule) => {
    const category = train['类别'] || train['编组类型'] || "" // 使用类别字段（普速列车不使用编组字段）
    const runningTime = getTrainRunningTime(train)
    const timeRange = getTimeRange(runningTime)

    // 第一层：精确匹配 - 检查列车类型匹配
    const typeMatches = (rule.conditions.trainTypes || []).some(type => category.includes(type))
    
    if (typeMatches) {
      // 检查时间范围匹配（如果规则未指定时间范围，则适用于所有时间）
      const timeMatches = !rule.conditions.runningTimeRange || rule.conditions.runningTimeRange === timeRange
      
      if (timeMatches) {
        // 检查国际联运特殊要求
        const internationalMatches = !rule.conditions.isInternational || category.includes('国际联运')
        
        if (internationalMatches) {
          // 行李员配置现在通过 baggageStaffWhenHasBaggage 设置，不再基于行李车数量匹配
          return true // 精确匹配成功
        }
      }
    }

    // 第二层：正常列车回退匹配 - 如果规则是"正常列车"且当前列车不是国际联运
    if (rule.conditions.trainTypes.includes('正常列车')) {
      const categoryLower = category.toLowerCase()
      const isInternational = categoryLower.includes('国际联运') || categoryLower.includes('国际')
      
      if (!isInternational) {
        // 检查时间范围匹配（优先匹配时间范围，如果不匹配也可以作为通用规则）
        const timeMatches = !rule.conditions.runningTimeRange || rule.conditions.runningTimeRange === timeRange
        
        if (timeMatches) {
          return true // 正常列车回退匹配成功
        }
      }
    }

    return false
  }

  // 分析未配备规则的列车
  const analyzeUncoveredTrains = () => {
    if (!isDataLoaded || !unitData[currentUnit]) {
      return
    }

    const conventionalData = unitData[currentUnit].conventionalData || []
    const validTrains = filterConventionalTrains(conventionalData)

    const uncovered = validTrains.filter(train => {
      // 使用层次化匹配策略检查是否有规则匹配
      const hasMatch = rules.some(rule => matchesRule(train, rule))
      
      // 如果没有精确匹配，尝试"正常列车"通用回退
      if (!hasMatch) {
        const category = train['类别'] || train['编组类型'] || "" // 使用类别字段（普速列车不使用编组字段）
        const categoryLower = category.toLowerCase()
        const isInternational = categoryLower.includes('国际联运') || categoryLower.includes('国际')
        
        // 对于非国际联运列车，检查是否有"正常列车"通用规则（不限时间范围）
        if (!isInternational) {
          const normalTrainRule = rules.find(rule => 
            rule.conditions.trainTypes.includes('正常列车') && 
            !rule.conditions.runningTimeRange // 查找不限时间范围的通用规则
          )
          if (normalTrainRule) {
            return false // 有通用正常列车规则，不算未配备
          }
        }
      }
      
      return !hasMatch
    })

    const byTrainType: Record<string, number> = {}
    const byTimeRange: Record<string, number> = {}
    const combinations: Record<string, RecommendationItem> = {}

    uncovered.forEach(train => {
      const category = train['类别'] || train['编组类型'] || "" // 使用类别字段（普速列车不使用编组字段）
      const runningTime = getTrainRunningTime(train)
      const timeRange = getTimeRange(runningTime)

      // 统计按列车类型
      Object.keys(CONVENTIONAL_TRAIN_TYPE_MAPPING).forEach(type => {
        if (category.includes(type)) {
          byTrainType[type] = (byTrainType[type] || 0) + 1
        }
      })

      // 统计按时间范围
      byTimeRange[timeRange] = (byTimeRange[timeRange] || 0) + 1

      // 统计组合
      Object.keys(CONVENTIONAL_TRAIN_TYPE_MAPPING).forEach(type => {
        if (category.includes(type)) {
          const key = `${type}-${timeRange}`
          if (!combinations[key]) {
            combinations[key] = {
              trainTypes: [type],
              timeRange,
              count: 0,
              priority: 'medium'
            }
          }
          combinations[key].count++
        }
      })
    })

    // 生成推荐
    const samples = Object.values(combinations)
      .filter(item => item.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map(item => ({
        ...item,
        priority: item.count >= 5 ? 'high' : item.count >= 2 ? 'medium' : 'low'
      })) as RecommendationItem[]

    setUncoveredAnalysis({
      totalUncovered: uncovered.length,
      byTrainType,
      byTimeRange,
      samples
    })

    // 保存具体的未匹配列车数据
    setUncoveredTrains(uncovered)

    setRecommendations(samples.filter(item => item.priority === 'high'))
  }

  // 使用 useEffect 来自动分析
  useEffect(() => {
    if (isDataLoaded) {
      analyzeUncoveredTrains()
    }
  }, [isDataLoaded, rules, currentUnit])

  // 快速创建规则
  const handleQuickCreateRule = (trainType: string, timeRange: string) => {
    const timeRangeOption = TIME_RANGE_OPTIONS.find(opt => opt.value === timeRange)

    // 自动分析行李车配置
    const baggageConfig = analyzeAndSetBaggageConfig(trainType, timeRange)

    const isInternational = trainType === '国际联运'
    const ruleName = isInternational ? `${trainType}-通用` : `${trainType}-${timeRangeOption?.label || timeRange}`
    const ruleDescription = isInternational ? `${trainType}列车，适用于所有运行时间` : `${trainType}列车，${timeRangeOption?.description || ''}`

    const newRule: ConventionalStaffingRule = {
      id: `conv-rule-${Date.now()}`,
      name: ruleName,
      description: ruleDescription,
      conditions: {
        runningTimeRange: isInternational ? undefined : timeRange as any,
        trainTypes: [trainType],
        baggageCarCount: baggageConfig.baggageCarCount, // 从数据自动分析
        isInternational,
        hasRestaurant: false
      },
      staffing: {
        trainConductor: timeRange === 'over24' ? 2 : 1,
        trainAttendants: {
          seatCar: { ratio: "1人1车", minStaff: 0 },
          softSleeper: { ratio: "1人2车", minStaff: 0 },
          hardSleeper: { ratio: "1人1车", minStaff: 0 }
        },
        translator: trainType === '国际联运' ? 1 : 0,
        trainOperator: trainType === '国际联运' ? 2 : 0, // 只有国际联运才有运转车长
        additionalStaff: {
          broadcaster: 0,      // 默认由列车员兼任
          trainDutyOfficer: 0  // 默认由列车员兼任
        },
        baggageStaffConfig: {
          enabled: baggageConfig.baggageCarCount > 0, // 有行李车时启用
          staffPerTrain: baggageConfig.baggageCarCount > 0 ? 1 : 0 // 默认每列车1个行李员
        }
      },
      notes: trainType === '国际联运' ? ["国际联运列车需配备翻译人员"] : [],
      bureauId: currentBureau,
      createdAt: new Date()
    }

    setEditingRule(newRule)
    setIsCreating(true)
  }

  const handleCreateNew = () => {
    // 自动分析默认配置的行李车配置
    const baggageConfig = analyzeAndSetBaggageConfig('正常列车', 'under4')

    const newRule: ConventionalStaffingRule = {
      id: `conv-rule-${Date.now()}`,
      name: "正常列车-4小时以下",
      description: "",
      conditions: {
        runningTimeRange: 'under4',
        trainTypes: ['正常列车'], // 默认为正常列车
        baggageCarCount: baggageConfig.baggageCarCount, // 从数据自动分析
        isInternational: false,
        hasRestaurant: false
      },
      staffing: {
        trainConductor: 1,
        trainAttendants: {
          seatCar: { ratio: "1人1车", minStaff: 0 },
          softSleeper: { ratio: "1人2车", minStaff: 0 },
          hardSleeper: { ratio: "1人1车", minStaff: 0 }
        },
        translator: 0,
        trainOperator: 0, // 默认为0，只有国际联运才有
        additionalStaff: {
          broadcaster: 0,      // 默认由列车员兼任
          trainDutyOfficer: 0  // 默认由列车员兼任
        },
        baggageStaffConfig: {
          enabled: baggageConfig.baggageCarCount > 0, // 有行李车时启用
          staffPerTrain: baggageConfig.baggageCarCount > 0 ? 1 : 0 // 默认每列车1个行李员
        }
      },
      notes: [],
      bureauId: currentBureau,
      createdAt: new Date()
    }
    setEditingRule(newRule)
    setIsCreating(true)
  }

  const handleEdit = (rule: ConventionalStaffingRule) => {
    setEditingRule({ ...rule })
    setIsCreating(false)
  }

  const handleSave = () => {
    if (!editingRule) return

    if (isCreating) {
      onChange([...rules, editingRule])
    } else {
      onChange(rules.map(r => r.id === editingRule.id ? editingRule : r))
    }

    setEditingRule(null)
    setIsCreating(false)
  }

  const handleCancel = () => {
    setEditingRule(null)
    setIsCreating(false)
  }

  const handleDelete = (id: string) => {
    if (confirm("确定要删除这个规则吗？")) {
      onChange(rules.filter(r => r.id !== id))
    }
  }

  const handleCopy = (rule: ConventionalStaffingRule) => {
    const copiedRule: ConventionalStaffingRule = {
      ...rule,
      id: `conv-rule-${Date.now()}`,
      name: `${rule.name} (副本)`,
      createdAt: new Date()
    }
    setEditingRule(copiedRule)
    setIsCreating(true)
  }

  const updateEditingRule = (updates: Partial<ConventionalStaffingRule>) => {
    if (editingRule) {
      setEditingRule({ ...editingRule, ...updates })
    }
  }

  // 自动生成规则名称（同步版本，不触发状态更新）
  const generateRuleNameSync = (trainType: string, timeRange?: string): string => {
    console.log('generateRuleNameSync 调用:', { trainType, timeRange })
    let name = trainType
    if (timeRange) {
      const timeRangeOption = TIME_RANGE_OPTIONS.find(opt => opt.value === timeRange)
      name = `${trainType}-${timeRangeOption?.label || timeRange}`
      console.log('生成的名称（有时间范围）:', name)
    } else if (trainType === '国际联运') {
      name = `${trainType}-通用`
      console.log('生成的名称（国际联运不限时间）:', name)
    } else {
      console.log('生成的名称（默认）:', name)
    }
    return name
  }

  // 自动生成规则名称（异步版本，用于独立调用）
  const generateRuleName = (trainType: string, timeRange?: string) => {
    if (editingRule) {
      const name = generateRuleNameSync(trainType, timeRange)
      updateEditingRule({ name })
    }
  }

  // 分析当前规则条件下的车次数据，自动设置行李车配置
  const analyzeAndSetBaggageConfig = (trainType: string, timeRange?: string) => {
    if (!isDataLoaded || !unitData[currentUnit]) {
      return { baggageCarCount: 0 }
    }

    const conventionalData = unitData[currentUnit].conventionalData || []
    const validTrains = filterConventionalTrains(conventionalData)

    // 筛选符合当前规则条件的车次
    const matchingTrains = validTrains.filter(train => {
      const formation = train['编组'] || train['formation'] || train['类别'] || ""
      const runningTime = getTrainRunningTime(train)
      const trainTimeRange = getTimeRange(runningTime)

      // 检查列车类型匹配
      const typeMatches = trainType === '国际联运'
        ? formation.includes('国际联运')
        : !formation.includes('国际联运')

      // 检查时间范围匹配（如果没有指定时间范围，则匹配所有时间范围）
      const timeMatches = !timeRange || trainTimeRange === timeRange

      return typeMatches && timeMatches
    })

    // 分析行李车配置
    const baggageCarCounts = matchingTrains.map(train => getBaggageCarCount(train))
    const maxBaggageCarCount = Math.max(0, ...baggageCarCounts)
    const hasBaggageCar = maxBaggageCarCount > 0

    return {
      baggageCarCount: maxBaggageCarCount
    }
  }

  const updateConditions = (updates: Partial<ConventionalStaffingRule['conditions']>) => {
    if (editingRule) {
      const newConditions = { ...editingRule.conditions, ...updates }
      const newStaffing = { ...editingRule.staffing }
      let newName = editingRule.name

      // 如果更新了列车类型，自动调整相关配置
      if (updates.trainTypes) {
        const trainType = updates.trainTypes[0]
        const isInternational = trainType === '国际联运'

        // 设置国际联运标志
        newConditions.isInternational = isInternational
        newStaffing.translator = isInternational ? 1 : 0
        newStaffing.trainOperator = isInternational ? 2 : 0

        // 自动生成规则名称
        const timeRange = newConditions.runningTimeRange
        newName = generateRuleNameSync(trainType, timeRange || undefined)
      }

      // 如果更新了运行时间范围，重新分析行李车配置和生成规则名称
      if ('runningTimeRange' in updates) { // 使用 'in' 操作符检查属性是否存在，而不是检查值
        const trainType = newConditions.trainTypes?.[0]
        const timeRange = updates.runningTimeRange

        console.log('🔄 运行时间范围更新:', { trainType, timeRange, updateValue: updates.runningTimeRange })

        if (trainType) {
          // 行李员配置现在通过 baggageStaffWhenHasBaggage 手动设置，不再自动分析
          console.log('ℹ️ 行李员配置已改为手动设置模式')
          
          // 重新生成规则名称
          const generatedName = generateRuleNameSync(trainType, timeRange || undefined)
          newName = generatedName
          console.log('🏷️ 生成新的规则名称:', generatedName)
        }
      }

      setEditingRule({
        ...editingRule,
        name: newName,
        conditions: newConditions,
        staffing: newStaffing
      })
    }
  }

  const updateStaffing = (updates: Partial<ConventionalStaffingRule['staffing']>) => {
    if (editingRule) {
      setEditingRule({
        ...editingRule,
        staffing: { ...editingRule.staffing, ...updates }
      })
    }
  }

  const updateTrainAttendants = (carType: keyof ConventionalStaffingRule['staffing']['trainAttendants'], updates: { ratio: string; minStaff: number }) => {
    if (editingRule) {
      setEditingRule({
        ...editingRule,
        staffing: {
          ...editingRule.staffing,
          trainAttendants: {
            ...editingRule.staffing.trainAttendants,
            [carType]: updates
          }
        }
      })
    }
  }

  const updateAdditionalStaff = (updates: Partial<NonNullable<ConventionalStaffingRule['staffing']['additionalStaff']>>) => {
    if (editingRule) {
      setEditingRule({
        ...editingRule,
        staffing: {
          ...editingRule.staffing,
          additionalStaff: {
            ...editingRule.staffing.additionalStaff,
            ...updates
          }
        }
      })
    }
  }

  const updateBaggageStaffConfig = (updates: Partial<NonNullable<ConventionalStaffingRule['staffing']['baggageStaffConfig']>>) => {
    if (editingRule) {
      setEditingRule({
        ...editingRule,
        staffing: {
          ...editingRule.staffing,
          baggageStaffConfig: {
            ...editingRule.staffing.baggageStaffConfig,
            ...updates
          }
        }
      })
    }
  }

  const updateDiningCarStaffConfig = (updates: Partial<NonNullable<ConventionalStaffingRule['staffing']['diningCarStaff']>>) => {
    if (editingRule) {
      setEditingRule({
        ...editingRule,
        staffing: {
          ...editingRule.staffing,
          diningCarStaff: {
            ...editingRule.staffing.diningCarStaff,
            ...updates
          }
        }
      })
    }
  }

  const updateSalesStaffConfig = (updates: Partial<NonNullable<ConventionalStaffingRule['staffing']['salesStaff']>>) => {
    if (editingRule) {
      setEditingRule({
        ...editingRule,
        staffing: {
          ...editingRule.staffing,
          salesStaff: {
            ...editingRule.staffing.salesStaff,
            ...updates
          }
        }
      })
    }
  }



  return (
    <div className="space-y-6">
      <Separator />

      {/* 普速规则配置标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">普速定员规则配置</h2>
          <p className="text-muted-foreground">
            {RAILWAY_BUREAUS[currentBureau]} - 配置K、T、Z字头及国际联运列车的定员规则
          </p>
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
      {showRecommendations && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-orange-800 flex items-center">
                <Lightbulb className="h-5 w-5 mr-2" />
                智能推荐配置
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowRecommendations(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {recommendations.length > 0 ? (
              <div className="space-y-3">
                <p className="text-sm text-orange-700">
                  基于当前数据分析，建议优先配置以下规则：
                </p>
                {recommendations.map((rec, index) => (
                  <div key={index} className="bg-white p-3 rounded border flex items-center justify-between">
                    <div>
                      <span className="font-medium">{rec.trainTypes.join('、')}</span>
                      <span className="text-gray-500 mx-2">•</span>
                      <span className="text-sm">
                        {TIME_RANGE_OPTIONS.find(opt => opt.value === rec.timeRange)?.label}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="bg-orange-100">
                        {rec.count} 趟列车
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-7"
                        onClick={() => handleQuickCreateRule(rec.trainTypes[0] || '正常列车', rec.timeRange)}
                      >
                        快速创建
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-orange-700">
                当前所有普速列车都已配备定员规则，无需额外配置。
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* 未配备规则分析 */}
      {uncoveredAnalysis.totalUncovered > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-red-800 flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2" />
              普速列车未配备定员规则分析
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="text-center p-3 bg-white rounded border">
                <div className="text-2xl font-bold text-red-600">
                  {uncoveredAnalysis.totalUncovered}
                </div>
                <div className="text-sm text-red-700">未配备规则的列车</div>
              </div>
              <div className="text-center p-3 bg-white rounded border">
                <div className="text-2xl font-bold text-blue-600">
                  {Object.keys(uncoveredAnalysis.byTrainType).length}
                </div>
                <div className="text-sm text-blue-700">涉及列车类型</div>
              </div>
              <div className="text-center p-3 bg-white rounded border">
                <div className="text-2xl font-bold text-purple-600">
                  {Object.keys(uncoveredAnalysis.byTimeRange).length}
                </div>
                <div className="text-sm text-purple-700">涉及时间范围</div>
              </div>
            </div>

            {/* 按列车类型分布 */}
            {Object.keys(uncoveredAnalysis.byTrainType).length > 0 && (
              <div className="mb-4">
                <h4 className="font-semibold text-sm mb-2 text-red-700">按列车类型分布：</h4>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(uncoveredAnalysis.byTrainType).map(([type, count]) => (
                    <Badge key={type} variant="outline" className="bg-white">
                      {type}: {count} 趟
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* 查看详细列车清单按钮 */}
            <div className="mb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowUncoveredDetails(!showUncoveredDetails)}
                className="bg-white hover:bg-gray-50"
              >
                <Eye className="h-4 w-4 mr-2" />
                {showUncoveredDetails ? '隐藏' : '查看'}未匹配列车详细清单
              </Button>
            </div>

            {/* 未匹配列车详细清单 */}
            {showUncoveredDetails && uncoveredTrains.length > 0 && (
              <div className="mb-4 bg-white p-4 rounded border">
                <h4 className="font-semibold text-sm mb-3 text-red-700">
                  未匹配列车详细清单 ({uncoveredTrains.length} 趟)
                </h4>
                <div className="max-h-80 overflow-y-auto">
                  <div className="space-y-2">
                    {uncoveredTrains.map((train, index) => {
                      const trainNumber = train.车次 as string || `未知${index + 1}`
                      const category = train['类别'] || train['编组类型'] || '未知类别'
                      const formationDetails = train['编组详情'] || train['编组详情'] || '未知编组详情'
                      const runningTime = getTrainRunningTime(train)
                      const timeRange = getTimeRange(runningTime)
                      const timeRangeLabel = TIME_RANGE_OPTIONS.find(opt => opt.value === timeRange)?.label || timeRange
                      const sequence = train['序号'] || train['sequence'] || '未知'
                      const section = train['运行区段'] || train['section'] || '未知区段'
                      
                      return (
                        <div key={index} className="p-3 bg-red-50 rounded border border-red-200 text-sm">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <div className="font-medium text-red-800">{trainNumber}</div>
                              <Badge variant="outline" className="bg-white text-xs">
                                序号: {sequence}
                              </Badge>
                              <div className="text-gray-600">类别:{category}</div>
                              <div className="text-gray-600">编组详情:{formationDetails}</div>
                              <div className="text-gray-600">{section}</div>
                            </div>
                            <div className="flex items-center space-x-2 text-xs">
                              <Badge variant="secondary">
                                {runningTime}小时 ({timeRangeLabel})
                              </Badge>
                              <div className="text-red-600">无匹配规则</div>
                            </div>
                          </div>
                          {/* 显示匹配失败的详细原因 */}
                          <div className="mt-2 text-xs text-gray-500">
                            匹配失败原因: {(() => {
                              // 分析为什么这趟车没有匹配到规则
                              const categoryLower = category.toLowerCase()
                              const isInternational = categoryLower.includes('国际联运') || categoryLower.includes('国际')
                              
                              if (isInternational) {
                                return '国际联运列车未找到对应规则'
                              }
                              
                              // 检查是否有正常列车规则
                              const hasNormalRule = rules.some(rule => rule.conditions.trainTypes.includes('正常列车'))
                              if (!hasNormalRule) {
                                return '缺少"正常列车"通用规则'
                              }
                              
                              // 检查时间范围
                              const timeSpecificRule = rules.find(rule => 
                                rule.conditions.trainTypes.includes('正常列车') && 
                                rule.conditions.runningTimeRange === timeRange
                              )
                              const generalRule = rules.find(rule => 
                                rule.conditions.trainTypes.includes('正常列车') && 
                                !rule.conditions.runningTimeRange
                              )
                              
                              if (!timeSpecificRule && !generalRule) {
                                return `缺少正常列车${timeRangeLabel}规则且无通用规则`
                              }
                              
                              return '匹配条件不满足'
                            })()}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* 具体组合示例 */}
            {uncoveredAnalysis.samples.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm mb-2 text-red-700">需要配置的普速规则类型：</h4>
                <div className="space-y-2">
                  {uncoveredAnalysis.samples.slice(0, 5).map((sample, index) => (
                    <div key={index} className="bg-white p-3 rounded border flex items-center justify-between hover:bg-gray-50 transition-colors">
                      <div>
                        <span className="font-medium">{sample.trainTypes.join('、')}</span>
                        <span className="text-gray-500 mx-2">•</span>
                        <span className="text-sm">
                          {TIME_RANGE_OPTIONS.find(opt => opt.value === sample.timeRange)?.label}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline">{sample.count} 趟普速</Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-7"
                          onClick={() => handleQuickCreateRule(sample.trainTypes[0] || '正常列车', sample.timeRange)}
                        >
                          创建规则
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}



      {/* 规则列表 */}
      {rules.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {rules.map((rule) => {
            const safeRule = ensureRuleDataStructure(rule)
            return (
            <Card key={safeRule.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="space-y-3">
                  {/* 标题行 */}
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm truncate">{safeRule.name}</h3>
                    <TooltipProvider>
                      <div className="flex items-center space-x-1">
                        <Button
                          onClick={() => handleEdit(rule)}
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          disabled={!!editingRule}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          onClick={() => handleCopy(rule)}
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          disabled={!!editingRule}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        <Button
                          onClick={() => handleDelete(rule.id)}
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                          disabled={!!editingRule}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TooltipProvider>
                  </div>

                  {/* 标签行 */}
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="outline" className="text-xs">
                      {safeRule.conditions.runningTimeRange
                        ? TIME_RANGE_OPTIONS.find(opt => opt.value === safeRule.conditions.runningTimeRange)?.label
                        : '不限时间范围'
                      }
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {(safeRule.conditions.trainTypes || [])[0] || '未设置'}
                    </Badge>
                    {safeRule.conditions.isInternational && (
                      <Badge variant="secondary" className="text-xs">国际联运</Badge>
                    )}
                  </div>

                  {/* 配置信息 */}
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <div className="flex justify-between">
                      <span>列车长:</span>
                      <span>{safeRule.staffing.trainConductor}人</span>
                    </div>
                    {(safeRule.conditions.baggageStaffWhenHasBaggage || 0) > 0 && (
                      <div className="flex justify-between">
                        <span>有行李车时的行李员:</span>
                        <span>{safeRule.conditions.baggageStaffWhenHasBaggage}人</span>
                      </div>
                    )}
                    {safeRule.staffing.trainOperator > 0 && (
                      <div className="flex justify-between">
                        <span>运转车长:</span>
                        <span>{safeRule.staffing.trainOperator}人</span>
                      </div>
                    )}
                    {safeRule.staffing.translator > 0 && (
                      <div className="flex justify-between">
                        <span>翻译:</span>
                        <span>{safeRule.staffing.translator}人</span>
                      </div>
                    )}
                    {(safeRule.staffing.additionalStaff?.broadcaster || 0) > 0 && (
                      <div className="flex justify-between">
                        <span>额外广播员:</span>
                        <span>{safeRule.staffing.additionalStaff?.broadcaster}人</span>
                      </div>
                    )}
                    {(safeRule.staffing.additionalStaff?.trainDutyOfficer || 0) > 0 && (
                      <div className="flex justify-between">
                        <span>额外值班员:</span>
                        <span>{safeRule.staffing.additionalStaff?.trainDutyOfficer}人</span>
                      </div>
                    )}
                    {safeRule.staffing.baggageStaffConfig?.enabled && (
                      <div className="flex justify-between">
                        <span>每列车行李员:</span>
                        <span>{safeRule.staffing.baggageStaffConfig?.staffPerTrain || 0}人</span>
                      </div>
                    )}
                  </div>

                  {/* 列车员配置概览 */}
                  {safeRule.staffing.trainAttendants && (
                    <div className="text-xs text-muted-foreground border-t pt-2">
                      <div className="font-medium mb-1">列车员配置:</div>
                      <div className="space-y-0.5">
                        {safeRule.staffing.trainAttendants.seatCar && (
                          <div className="flex justify-between">
                            <span>座车:</span>
                            <span>{safeRule.staffing.trainAttendants.seatCar.ratio}</span>
                          </div>
                        )}
                        {safeRule.staffing.trainAttendants.hardSleeper && (
                          <div className="flex justify-between">
                            <span>硬卧:</span>
                            <span>{safeRule.staffing.trainAttendants.hardSleeper.ratio}</span>
                          </div>
                        )}
                        {safeRule.staffing.trainAttendants.softSleeper && (
                          <div className="flex justify-between">
                            <span>软卧:</span>
                            <span>{safeRule.staffing.trainAttendants.softSleeper.ratio}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            )
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Train className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">暂无普速定员规则</h3>
            <p className="text-muted-foreground mb-4">
              请添加规则开始配置 {RAILWAY_BUREAUS[currentBureau]} 的普速列车乘务人员定员标准
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
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>
                  {isCreating ? "创建新的普速定员规则" : "编辑普速定员规则"}
                </CardTitle>
                <Button onClick={handleCancel} variant="ghost" size="sm">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
          <CardContent className="space-y-6">

            {/* 基本信息 */}
            <div className="space-y-4">
              <h3 className="font-semibold text-blue-800">基本信息</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="ruleName">规则名称（自动生成）</Label>
                  <Input
                    id="ruleName"
                    value={editingRule.name}
                    readOnly
                    className="bg-gray-100"
                    placeholder="规则名称将自动生成"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    规则名称格式：列车类型-运行时间范围（国际联运可不设时间范围）
                  </p>
                </div>
                <div>
                  <Label htmlFor="ruleDesc">规则描述</Label>
                  <Input
                    id="ruleDesc"
                    value={editingRule.description || ""}
                    onChange={(e) => updateEditingRule({ description: e.target.value })}
                    placeholder="规则的详细描述"
                    className="bg-white"
                  />
                </div>
              </div>
            </div>

            {/* 匹配条件 */}
            <div className="space-y-4">
              <h3 className="font-semibold text-blue-800">匹配条件</h3>

              {/* 运行时间范围 */}
              <div>
                <Label htmlFor="timeRange">
                  运行时间范围
                  {editingRule.conditions.isInternational && (
                    <span className="text-xs text-muted-foreground ml-2">（国际联运可选，不选则适用所有时间范围）</span>
                  )}
                </Label>
                <Select
                  value={editingRule.conditions.runningTimeRange === undefined ? "unlimited" : editingRule.conditions.runningTimeRange}
                  onValueChange={(value) => {
                    console.log('时间范围选择变化:', value)
                    console.log('当前runningTimeRange:', editingRule.conditions.runningTimeRange)
                    updateConditions({
                      runningTimeRange: value === "unlimited" ? undefined : value as any
                    })
                  }}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder={
                      editingRule.conditions.isInternational
                        ? "选择运行时间范围（可选）"
                        : "选择运行时间范围"
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    {/* 检查当前选择的列车类型是否为国际联运 */}
                    {((editingRule.conditions.trainTypes?.[0] === '国际联运') || editingRule.conditions.isInternational) && (
                      <SelectItem value="unlimited">
                        <div>
                          <div className="font-medium">不限时间范围</div>
                          <div className="text-xs text-gray-500">适用于所有运行时间的国际联运列车</div>
                        </div>
                      </SelectItem>
                    )}
                    {TIME_RANGE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div>
                          <div className="font-medium">{option.label}</div>
                          <div className="text-xs text-gray-500">{option.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 适用列车类型 */}
              <div>
                <Label>适用列车类型</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                  {Object.entries(CONVENTIONAL_TRAIN_TYPE_MAPPING).map(([type, info]) => (
                    <div
                      key={type}
                      className={`flex items-center space-x-3 p-3 rounded border cursor-pointer transition-colors ${
                        (editingRule.conditions.trainTypes || [])[0] === type
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 bg-white hover:bg-gray-50'
                      }`}
                      onClick={() => {
                        updateConditions({ trainTypes: [type] })
                      }}
                    >
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        (editingRule.conditions.trainTypes || [])[0] === type
                          ? 'border-blue-500 bg-blue-500'
                          : 'border-gray-300'
                      }`}>
                        {(editingRule.conditions.trainTypes || [])[0] === type && (
                          <div className="w-2 h-2 rounded-full bg-white"></div>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium">{type}</div>
                        <div className="text-xs text-gray-500">{info.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 行李员配置 */}
              <div>
                <Label>行李员配置</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                  <div>
                    <Label htmlFor="baggageStaffWhenHasBaggage" className="text-sm">有行李车时的行李员配置 (人)</Label>
                    <Input
                      id="baggageStaffWhenHasBaggage"
                      type="number"
                      min="0"
                      value={editingRule.conditions.baggageStaffWhenHasBaggage || 0}
                      onChange={(e) => updateConditions({
                        baggageStaffWhenHasBaggage: parseInt(e.target.value) || 0
                      })}
                      placeholder="当列车有行李车时配备的行李员人数"
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      当符合此规则条件的列车有行李车时，配备的行李员总人数
                    </div>
                  </div>
                </div>
              </div>

              {/* 特殊属性 */}
              <div>
                <Label>特殊属性</Label>
                <div className="flex items-center space-x-6 mt-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="hasRestaurant"
                      checked={editingRule.conditions.hasRestaurant || false}
                      onCheckedChange={(checked) => updateConditions({ hasRestaurant: checked as boolean })}
                    />
                    <Label htmlFor="hasRestaurant" className="text-sm cursor-pointer">
                      配备餐车
                    </Label>
                  </div>
                </div>
              </div>
            </div>

            {/* 基础人员配置 */}
            <div className="space-y-4">
              <h3 className="font-semibold text-blue-800">基础人员配置</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="conductor">列车长 (人)</Label>
                  <Input
                    id="conductor"
                    type="number"
                    min="1"
                    max="3"
                    value={editingRule.staffing.trainConductor}
                    onChange={(e) => updateStaffing({
                      trainConductor: parseInt(e.target.value) || 1
                    })}
                    className="bg-white"
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    12小时以上建议2人
                  </div>
                </div>
                <div>
                  <Label htmlFor="trainOperator">运转车长 (人)</Label>
                  <Input
                    id="trainOperator"
                    type="number"
                    min="0"
                    max="2"
                    value={editingRule.staffing.trainOperator}
                    readOnly
                    className="bg-gray-100"
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    仅国际联运配备（2人），其他列车为0人
                  </div>
                </div>
                <div>
                  <Label htmlFor="translator">翻译 (人)</Label>
                  <Input
                    id="translator"
                    type="number"
                    min="0"
                    max="2"
                    value={editingRule.staffing.translator}
                    readOnly
                    className="bg-gray-100"
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    根据列车类型自动配置（国际联运为1人，其他为0人）
                  </div>
                </div>
              </div>
            </div>

            {/* 列车员配置 */}
            <div className="space-y-4">
              <h3 className="font-semibold text-blue-800">列车员配置</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 座车 */}
                <div className="p-4 bg-white rounded border">
                  <Label className="font-medium">座车</Label>
                  <div className="space-y-3 mt-2">
                    <div>
                      <Label htmlFor="seatCarRatio" className="text-sm">配置比例</Label>
                      <Select
                        value={editingRule.staffing.trainAttendants.seatCar.ratio}
                        onValueChange={(value) => updateTrainAttendants('seatCar', {
                          ratio: value,
                          minStaff: editingRule.staffing.trainAttendants.seatCar.minStaff
                        })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1人1车">1人1车</SelectItem>
                          <SelectItem value="2人1车">2人1车</SelectItem>
                          <SelectItem value="1人2车">1人2车</SelectItem>
                          <SelectItem value="2人3车">2人3车</SelectItem>
                          <SelectItem value="3人2车">3人2车</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="seatCarMin" className="text-sm">最少人数</Label>
                      <Input
                        id="seatCarMin"
                        type="number"
                        min="0"
                        value={editingRule.staffing.trainAttendants.seatCar.minStaff}
                        onChange={(e) => updateTrainAttendants('seatCar', {
                          ratio: editingRule.staffing.trainAttendants.seatCar.ratio,
                          minStaff: parseInt(e.target.value) || 0
                        })}
                      />
                    </div>
                  </div>
                </div>

                {/* 硬卧车 */}
                <div className="p-4 bg-white rounded border">
                  <Label className="font-medium">硬卧车</Label>
                  <div className="space-y-3 mt-2">
                    <div>
                      <Label htmlFor="hardSleeperRatio" className="text-sm">配置比例</Label>
                      <Select
                        value={editingRule.staffing.trainAttendants.hardSleeper.ratio}
                        onValueChange={(value) => updateTrainAttendants('hardSleeper', {
                          ratio: value,
                          minStaff: editingRule.staffing.trainAttendants.hardSleeper.minStaff
                        })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1人1车">1人1车</SelectItem>
                          <SelectItem value="2人1车">2人1车</SelectItem>
                          <SelectItem value="1人2车">1人2车</SelectItem>
                          <SelectItem value="2人3车">2人3车</SelectItem>
                          <SelectItem value="3人2车">3人2车</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="hardSleeperMin" className="text-sm">最少人数</Label>
                      <Input
                        id="hardSleeperMin"
                        type="number"
                        min="0"
                        value={editingRule.staffing.trainAttendants.hardSleeper.minStaff}
                        onChange={(e) => updateTrainAttendants('hardSleeper', {
                          ratio: editingRule.staffing.trainAttendants.hardSleeper.ratio,
                          minStaff: parseInt(e.target.value) || 0
                        })}
                      />
                    </div>
                  </div>
                </div>

                {/* 软卧车 */}
                <div className="p-4 bg-white rounded border">
                  <Label className="font-medium">软卧车</Label>
                  <div className="space-y-3 mt-2">
                    <div>
                      <Label htmlFor="softSleeperRatio" className="text-sm">配置比例</Label>
                      <Select
                        value={editingRule.staffing.trainAttendants.softSleeper.ratio}
                        onValueChange={(value) => updateTrainAttendants('softSleeper', {
                          ratio: value,
                          minStaff: editingRule.staffing.trainAttendants.softSleeper.minStaff
                        })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1人1车">1人1车</SelectItem>
                          <SelectItem value="2人1车">2人1车</SelectItem>
                          <SelectItem value="1人2车">1人2车</SelectItem>
                          <SelectItem value="2人3车">2人3车</SelectItem>
                          <SelectItem value="3人2车">3人2车</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="softSleeperMin" className="text-sm">最少人数</Label>
                      <Input
                        id="softSleeperMin"
                        type="number"
                        min="0"
                        value={editingRule.staffing.trainAttendants.softSleeper.minStaff}
                        onChange={(e) => updateTrainAttendants('softSleeper', {
                          ratio: editingRule.staffing.trainAttendants.softSleeper.ratio,
                          minStaff: parseInt(e.target.value) || 0
                        })}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 额外人员配置 */}
            <div className="space-y-4">
              <h3 className="font-semibold text-blue-800">额外人员配置</h3>
              <p className="text-sm text-muted-foreground">可选择增加额外的广播员或列车值班员，0表示由列车员兼任</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="additionalBroadcaster">额外广播员 (人)</Label>
                  <Input
                    id="additionalBroadcaster"
                    type="number"
                    min="0"
                    max="2"
                    value={editingRule.staffing.additionalStaff?.broadcaster || 0}
                    onChange={(e) => updateAdditionalStaff({
                      broadcaster: parseInt(e.target.value) || 0
                    })}
                    className="bg-white"
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    0 = 由列车员兼任，1+ = 专职人员
                  </div>
                </div>
                <div>
                  <Label htmlFor="additionalTrainDutyOfficer">额外列车值班员 (人)</Label>
                  <Input
                    id="additionalTrainDutyOfficer"
                    type="number"
                    min="0"
                    max="2"
                    value={editingRule.staffing.additionalStaff?.trainDutyOfficer || 0}
                    onChange={(e) => updateAdditionalStaff({
                      trainDutyOfficer: parseInt(e.target.value) || 0
                    })}
                    className="bg-white"
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    0 = 由列车员兼任，1+ = 专职人员
                  </div>
                </div>
              </div>
            </div>

            {/* 行李员配置 */}
            <div className="space-y-4">
              <h3 className="font-semibold text-blue-800">行李员配置</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="enableBaggageStaff"
                    checked={editingRule.staffing.baggageStaffConfig?.enabled || false}
                    onChange={(e) => updateBaggageStaffConfig({
                      enabled: e.target.checked,
                      staffPerTrain: e.target.checked ? (editingRule.staffing.baggageStaffConfig?.staffPerTrain || 1) : 0
                    })}
                    className="rounded"
                  />
                  <Label htmlFor="enableBaggageStaff">启用行李员配置（当列车有行李车时）</Label>
                </div>

                {editingRule.staffing.baggageStaffConfig?.enabled && (
                  <div>
                    <Label htmlFor="baggageStaffPerTrain">每列车行李员总数 (人)</Label>
                    <Input
                      id="baggageStaffPerTrain"
                      type="number"
                      min="0"
                      max="5"
                      value={editingRule.staffing.baggageStaffConfig?.staffPerTrain || 1}
                      onChange={(e) => updateBaggageStaffConfig({
                        staffPerTrain: parseInt(e.target.value) || 0
                      })}
                      className="bg-white max-w-xs"
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      设置整列车配备的行李员总数，不按行李车数量计算
                    </div>
                  </div>
                )}
              </div>

            </div>

            {/* 餐车人员配置 */}
            <div className="space-y-4">
              <h3 className="font-semibold text-green-800">🍽️ 餐车人员配置</h3>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="enableDiningCarStaff"
                  checked={editingRule.staffing.diningCarStaff?.enabled || false}
                  onCheckedChange={(checked) => updateDiningCarStaffConfig({
                    enabled: checked as boolean,
                    rules: editingRule.staffing.diningCarStaff?.rules || {
                      under24h: 4,
                      over24h: 5
                    }
                  })}
                />
                <Label htmlFor="enableDiningCarStaff">启用餐车人员配置（当列车有餐车时）</Label>
              </div>

              {editingRule.staffing.diningCarStaff?.enabled && (
                <div className="space-y-4 pl-6 border-l-2 border-green-200">
                  <div>
                    <Label htmlFor="diningCarUnder24h">运行时间24小时以内 (人)</Label>
                    <Input
                      id="diningCarUnder24h"
                      type="number"
                      min="0"
                      max="10"
                      value={editingRule.staffing.diningCarStaff?.rules.under24h || 4}
                      onChange={(e) => updateDiningCarStaffConfig({
                        enabled: true,
                        rules: {
                          ...editingRule.staffing.diningCarStaff?.rules,
                          under24h: parseInt(e.target.value) || 0
                        }
                      })}
                      className="bg-white max-w-xs"
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      单程运行时间在24小时以内的列车，每节餐车配备人员数
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="diningCarOver24h">运行时间24小时以上 (人)</Label>
                    <Input
                      id="diningCarOver24h"
                      type="number"
                      min="0"
                      max="10"
                      value={editingRule.staffing.diningCarStaff?.rules.over24h || 5}
                      onChange={(e) => updateDiningCarStaffConfig({
                        enabled: true,
                        rules: {
                          ...editingRule.staffing.diningCarStaff?.rules,
                          over24h: parseInt(e.target.value) || 0
                        }
                      })}
                      className="bg-white max-w-xs"
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      单程运行时间在24小时以上的列车，每节餐车配备人员数
                    </div>
                  </div>
                  <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
                    📊 餐车人员会根据列车运行时间和餐车数量自动计算
                  </div>
                </div>
              )}
            </div>

            {/* 售货人员配置 */}
            <div className="space-y-4">
              <h3 className="font-semibold text-orange-800">🛒 售货人员配置</h3>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="enableSalesStaff"
                  checked={editingRule.staffing.salesStaff?.enabled || false}
                  onCheckedChange={(checked) => updateSalesStaffConfig({
                    enabled: checked as boolean,
                    staffPerGroup: editingRule.staffing.salesStaff?.staffPerGroup || 1
                  })}
                />
                <Label htmlFor="enableSalesStaff">启用售货人员配置（当列车没有餐车时）</Label>
              </div>

              {editingRule.staffing.salesStaff?.enabled && (
                <div className="space-y-4 pl-6 border-l-2 border-orange-200">
                  <div>
                    <Label htmlFor="salesStaffPerGroup">每组售货人员数量</Label>
                    <Input
                      id="salesStaffPerGroup"
                      type="number"
                      min="0"
                      max="5"
                      value={editingRule.staffing.salesStaff?.staffPerGroup || 1}
                      onChange={(e) => updateSalesStaffConfig({
                        enabled: true,
                        staffPerGroup: parseInt(e.target.value) || 1
                      })}
                      className="bg-white max-w-xs"
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      没有餐车时，每组配备的售货人员数量（建议1人）
                    </div>
                  </div>
                  <div className="text-xs text-orange-600 bg-orange-50 p-2 rounded">
                    📊 售货人员与餐车人员互斥：有餐车时不配备售货人员，没有餐车时配备售货人员
                  </div>
                </div>
              )}
            </div>

            {/* 特殊说明 */}
            <div className="space-y-4">
              <h3 className="font-semibold text-blue-800">特殊说明</h3>
              <div>
                <Label htmlFor="notes">规则说明 (每行一条)</Label>
                <textarea
                  id="notes"
                  className="w-full p-3 border rounded-md bg-white min-h-[80px]"
                  value={editingRule.notes?.join('\n') || ""}
                  onChange={(e) => updateEditingRule({
                    notes: e.target.value.split('\n').filter(line => line.trim())
                  })}
                  placeholder="如：国际联运列车需配备翻译人员"
                />
              </div>

              {/* 操作按钮 */}
              <div className="flex justify-end space-x-2 pt-6 border-t">
                <Button onClick={handleCancel} variant="outline">
                  取消
                </Button>
                <Button onClick={handleSave}>
                  <Save className="h-4 w-4 mr-1" />
                  保存
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        </div>
      )}
    </div>
  )
}
