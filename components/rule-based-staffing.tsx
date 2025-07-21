"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { 
  Calculator, Train, AlertTriangle, CheckCircle, Settings, 
  TrendingUp, Users, Clock, Target, ArrowRight, Eye, Download,
  Car, Briefcase
} from "lucide-react"
import { useTrainData } from "@/contexts/train-data-context"
import { useStaffingRules } from "@/contexts/staffing-rules-context"
import { HighSpeedRuleEngine, type HighSpeedUnitStaffingResult, type HighSpeedTrainStaffingResult } from "@/utils/high-speed-rule-engine"
import { ConventionalRuleEngine, type ConventionalUnitStaffingResult, type ConventionalTrainStaffingResult } from "@/utils/conventional-rule-engine"
import { OtherProductionRuleEngine, type OtherProductionUnitStaffingResult } from "@/utils/other-production-rule-engine"
import type { StaffingStandard } from "@/types/staffing-rules"
import { TRAIN_UNITS } from "@/types/dynamic-train-data"
import * as XLSX from "xlsx"

// 计算类型定义
type CalculationType = 'highSpeed' | 'conventional' | 'otherProduction'

// 计算结果接口
interface CalculationResults {
  highSpeed?: HighSpeedUnitStaffingResult
  conventional?: ConventionalUnitStaffingResult
  otherProduction?: OtherProductionUnitStaffingResult
}

export function RuleBasedStaffing() {
  const { getCurrentUnitData, currentUnit, getActualTrainCount } = useTrainData()
  const { standards, currentStandard } = useStaffingRules()
  
  const [selectedStandardId, setSelectedStandardId] = useState<string>("")
  const [calculationType, setCalculationType] = useState<CalculationType>('highSpeed')
  const [calculationResults, setCalculationResults] = useState<CalculationResults>({})
  const [isCalculating, setIsCalculating] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [showAllTrains, setShowAllTrains] = useState(false)

  // 初始化选择当前标准
  useEffect(() => {
    if (currentStandard && !selectedStandardId) {
      setSelectedStandardId(currentStandard.id)
    }
  }, [currentStandard, selectedStandardId])

  // 获取当前选中的标准
  const selectedStandard = selectedStandardId ? 
    standards.find(s => s.id === selectedStandardId) : null

  // 获取当前单位的数据
  const unitData = getCurrentUnitData()
  const highSpeedTrains = unitData.highSpeedData || []
  const conventionalTrains = unitData.conventionalData || []

  // 获取当前计算类型的数据和规则数量
  const getCurrentTypeData = () => {
    switch (calculationType) {
      case 'highSpeed':
        return {
          data: highSpeedTrains,
          dataCount: getActualTrainCount(highSpeedTrains),
          rulesCount: selectedStandard?.highSpeedRules.length || 0,
          icon: Train,
          label: '高铁列车'
        }
      case 'conventional':
        return {
          data: conventionalTrains,
          dataCount: getActualTrainCount(conventionalTrains),
          rulesCount: selectedStandard?.conventionalRules.length || 0,
          icon: Car,
          label: '普速列车'
        }
      case 'otherProduction':
        return {
          data: [],
          dataCount: 0,
          rulesCount: selectedStandard?.otherProductionRules.length || 0,
          icon: Briefcase,
          label: '其余生产'
        }
      default:
        return {
          data: [],
          dataCount: 0,
          rulesCount: 0,
          icon: Train,
          label: '未知'
        }
    }
  }

  const currentTypeData = getCurrentTypeData()
  const currentResult = calculationResults[calculationType]

  // 执行基于规则的定员计算
  const calculateStaffing = async () => {
    if (!selectedStandard) return

    // 检查当前类型是否有数据（其余生产除外）
    if (calculationType !== 'otherProduction' && currentTypeData.dataCount === 0) return

    setIsCalculating(true)
    try {
      if (calculationType === 'highSpeed') {
        // 高铁计算
        const engine = new HighSpeedRuleEngine(selectedStandard)
        const unitName = TRAIN_UNITS[currentUnit]
        console.log('Debug: selectedStandard.reserveRates:', selectedStandard.reserveRates)
        console.log('Debug: currentUnit:', currentUnit, 'unitName:', unitName)
        const result = engine.calculateUnitStaffing(highSpeedTrains, unitName)
        console.log('Debug: calculation result:', result)
        setCalculationResults(prev => ({ ...prev, highSpeed: result }))
      } else if (calculationType === 'conventional') {
        // 普速计算
        const conventionalEngine = new ConventionalRuleEngine(selectedStandard)
        const unitName = TRAIN_UNITS[currentUnit]
        console.log('Debug: 普速计算单位:', currentUnit, 'unitName:', unitName)
        const result = conventionalEngine.calculateUnitStaffing(conventionalTrains, unitName)
        console.log('普速计算结果:', result)
        setCalculationResults(prev => ({ ...prev, conventional: result }))
      } else if (calculationType === 'otherProduction') {
        // 其余生产计算
        const otherEngine = new OtherProductionRuleEngine(selectedStandard)
        const unitName = TRAIN_UNITS[currentUnit]

        // 获取高铁和普速的计算结果
        const highSpeedResult = calculationResults.highSpeed || null
        const conventionalResult = calculationResults.conventional || null

        const result = otherEngine.calculateUnitStaffing(highSpeedResult, conventionalResult, unitName)
        console.log('其余生产计算结果:', result)
        setCalculationResults(prev => ({ ...prev, otherProduction: result }))
      }
    } catch (error) {
      console.error(`${calculationType}计算定员失败:`, error)
    } finally {
      setIsCalculating(false)
    }
  }

  // 导出计算结果
  const exportResults = () => {
    if (!currentResult) return

    const workbook = XLSX.utils.book_new()

    // 其余生产定员导出
    if (calculationType === 'otherProduction' && currentResult) {
      const result = currentResult as OtherProductionUnitStaffingResult
      const summaryData = [
        ['项目', '数值'],
        ['计算标准', result.standard.name],
        ['单位名称', result.unitName],
        ['计算时间', result.calculatedAt.toLocaleString()],
        ['', ''],
        ['基础数据', ''],
        ['高铁总定员', result.baseData.highSpeedTotalStaff + '人'],
        ['普速总定员', result.baseData.conventionalTotalStaff + '人'],
        ['主要生产总计', result.baseData.mainProductionTotal + '人'],
        ['', ''],
        ['计算过程', ''],
        ...result.summary.appliedRules.map(ruleResult => [
          ruleResult.rule.name,
          ruleResult.calculation + ' = ' + ruleResult.calculatedStaff + '人'
        ]),
        ['', ''],
        ['最终结果', ''],
        ['基础定员', result.summary.baseTotalStaff + '人'],
        ['预备率', (result.summary.reserveRate * 100).toFixed(1) + '%'],
        ['最终定员', result.summary.totalStaff + '人']
      ]

      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData)
      XLSX.utils.book_append_sheet(workbook, summarySheet, "其余生产定员汇总")
    }

    // 高铁定员导出
    if (calculationType === 'highSpeed' && currentResult) {
      const result = currentResult as HighSpeedUnitStaffingResult
      const summaryData = [
        ['项目', '数值'],
        ['计算标准', result.standard.name],
        ['标准工时', result.standard.standardWorkHours + '小时'],
        ['列车总数', result.summary.totalTrains],
        ['已匹配列车', result.summary.matchedTrains],
        ['未匹配列车', result.summary.unmatchedTrains],
        ['规则覆盖率', result.summary.coverageRate.toFixed(1) + '%'],
        ['基础定员人数', result.summary.baseTotalStaff],
        ['预备率', (result.summary.reserveRate * 100).toFixed(1) + '%'],
        ['总定员人数', result.summary.totalStaff]
      ]
      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData)
      XLSX.utils.book_append_sheet(workbook, summarySheet, "汇总")

      // 详细计算结果
      const detailData = [
        ['车次', '编组', '运行时间(小时)', '匹配规则', '列车长', '列车员', '商务座', '总定员', '组数', '匹配状态']
      ]

      result.trainResults.forEach(trainResult => {
        const trainNumber = trainResult.trainData['车次'] || trainResult.trainData['trainNumber'] || '未知'
        const formation = trainResult.trainData['编组'] || trainResult.trainData['formation'] || '未知'
        const runningTime = trainResult.trainData['单程工时'] || trainResult.trainData['runningTime'] || 0
        const ruleName = trainResult.matchedRule?.rule.name || '无匹配规则'
        
        detailData.push([
          trainNumber,
          formation,
          runningTime,
          ruleName,
          trainResult.staffing.trainConductor,
          trainResult.staffing.trainAttendant,
          trainResult.staffing.businessClassAttendant,
          trainResult.staffing.total,
          trainResult.groupCount.toFixed(2),
          trainResult.isMatched ? '已匹配' : '未匹配'
        ])
      })

      const detailSheet = XLSX.utils.aoa_to_sheet(detailData)
      XLSX.utils.book_append_sheet(workbook, detailSheet, "详细结果")

      // 未匹配列车分析
      if (result.unmatchedTrains.length > 0) {
        const unmatchedData = [
          ['车次', '编组', '运行时间', '未匹配原因', '建议操作']
        ]
        
        result.unmatchedTrains.forEach(unmatched => {
          const trainNumber = unmatched.trainData['车次'] || unmatched.trainData['trainNumber'] || '未知'
          const formation = unmatched.trainData['编组'] || unmatched.trainData['formation'] || '未知'
          const runningTime = unmatched.trainData['单程工时'] || unmatched.trainData['runningTime'] || 0
          
          unmatchedData.push([
            trainNumber,
            formation,
            runningTime,
            unmatched.reason,
            unmatched.suggestedAction
          ])
        })

        const unmatchedSheet = XLSX.utils.aoa_to_sheet(unmatchedData)
        XLSX.utils.book_append_sheet(workbook, unmatchedSheet, "未匹配分析")
      }

      // 导出文件
      const fileName = `${currentTypeData.label}定员计算结果_${result.standard.name}_${new Date().toISOString().split('T')[0]}.xlsx`
      XLSX.writeFile(workbook, fileName)
    }
    
    // 普速定员导出
    if (calculationType === 'conventional' && currentResult) {
      const result = currentResult as ConventionalUnitStaffingResult
      const summaryData = [
        ['项目', '数值'],
        ['计算标准', result.standard.name],
        ['标准工时', result.standard.standardWorkHours + '小时'],
        ['列车总数', result.summary.totalTrains],
        ['已匹配列车', result.summary.matchedTrains],
        ['未匹配列车', result.summary.unmatchedTrains],
        ['规则覆盖率', result.summary.coverageRate.toFixed(1) + '%'],
        ['基础定员人数', result.summary.baseTotalStaff],
        ['预备率', (result.summary.reserveRate * 100).toFixed(1) + '%'],
        ['总定员人数', result.summary.totalStaff],
        ['', ''],
        ['人员配置汇总', ''],
        ['列车长', result.summary.staffingBreakdown.trainConductor + '人'],
        ['列车员总数', result.summary.staffingBreakdown.trainAttendants.total + '人'],
        ['  座车列车员', result.summary.staffingBreakdown.trainAttendants.seatCar + '人'],
        ['  硬卧列车员', result.summary.staffingBreakdown.trainAttendants.hardSleeper + '人'],
        ['  软卧列车员', result.summary.staffingBreakdown.trainAttendants.softSleeper + '人'],
        ['  餐车列车员', result.summary.staffingBreakdown.trainAttendants.diningCar + '人'],
        ['行李员', result.summary.staffingBreakdown.baggageStaff + '人'],
        ['运转车长', result.summary.staffingBreakdown.operationConductor + '人'],
        ['翻译', result.summary.staffingBreakdown.translator + '人'],
        ['额外人员总数', result.summary.staffingBreakdown.additionalStaff.total + '人'],
        ['  广播员', result.summary.staffingBreakdown.additionalStaff.broadcaster + '人'],
        ['  值班员', result.summary.staffingBreakdown.additionalStaff.trainDutyOfficer + '人'],
        ['餐车人员', result.summary.staffingBreakdown.diningCarStaff + '人'],
        ['售货人员', result.summary.staffingBreakdown.salesStaff + '人']
      ]
      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData)
      XLSX.utils.book_append_sheet(workbook, summarySheet, "汇总")

      // 详细计算结果
      const detailData = [
        ['车次', '类别', '编组详情', '运行时间(小时)', '匹配规则', '配备组数', '每组定员', '计算公式', '列车长', '座车列车员', '硬卧列车员', '软卧列车员', '餐车列车员', '行李员', '翻译', '运转车长', '总定员', '匹配状态']
      ]

      result.trainResults.forEach(trainResult => {
        const trainNumber = trainResult.trainData['车次'] || trainResult.trainData['trainNumber'] || '未知'
        const category = trainResult.trainData['类别'] || trainResult.trainData['编组类型'] || '未知类别'
        const formationDetails = trainResult.trainData['编组详情'] || '未知编组详情'
        const runningTime = trainResult.trainData['单程工时'] || trainResult.trainData['runningTime'] || 0
        const ruleName = trainResult.matchedRule?.rule.name || '无匹配规则'
        const perGroupStaff = trainResult.groupCount > 0 ? Math.round(trainResult.staffing.total / trainResult.groupCount) : 0
        const calculationFormula = `${perGroupStaff}人/组 × ${trainResult.groupCount}组 = ${trainResult.staffing.total}人`

        detailData.push([
          trainNumber,
          category,
          formationDetails,
          runningTime,
          ruleName,
          trainResult.groupCount,
          perGroupStaff,
          calculationFormula,
          trainResult.staffing.trainConductor,
          trainResult.staffing.trainAttendants.seatCar,
          trainResult.staffing.trainAttendants.hardSleeper,
          trainResult.staffing.trainAttendants.softSleeper,
          trainResult.staffing.trainAttendants.diningCar,
          trainResult.staffing.baggageStaff,
          trainResult.staffing.translator,
          trainResult.staffing.operationConductor,
          trainResult.staffing.total,
          trainResult.isMatched ? '已匹配' : '未匹配'
        ])
      })

      const detailSheet = XLSX.utils.aoa_to_sheet(detailData)
      XLSX.utils.book_append_sheet(workbook, detailSheet, "详细结果")

      // 未匹配列车分析
      if (result.unmatchedTrains.length > 0) {
        const unmatchedData = [
          ['车次', '类别', '编组详情', '运行时间', '未匹配原因', '建议操作']
        ]
        
        result.unmatchedTrains.forEach(unmatched => {
          const trainNumber = unmatched.trainData['车次'] || unmatched.trainData['trainNumber'] || '未知'
          const category = unmatched.trainData['类别'] || unmatched.trainData['编组类型'] || '未知类别'
          const formationDetails = unmatched.trainData['编组详情'] || '未知编组详情'
          const runningTime = unmatched.trainData['单程工时'] || unmatched.trainData['runningTime'] || 0
          
          unmatchedData.push([
            trainNumber,
            category,
            formationDetails,
            runningTime,
            unmatched.reason,
            unmatched.suggestedAction
          ])
        })

        const unmatchedSheet = XLSX.utils.aoa_to_sheet(unmatchedData)
        XLSX.utils.book_append_sheet(workbook, unmatchedSheet, "未匹配分析")
      }

      // 导出文件
      const fileName = `${currentTypeData.label}定员计算结果_${result.standard.name}_${new Date().toISOString().split('T')[0]}.xlsx`
      XLSX.writeFile(workbook, fileName)
    }
  }

  return (
    <div className="space-y-6">
      {/* 计算类型选择 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>定员计算</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={calculationType} onValueChange={(value) => setCalculationType(value as CalculationType)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="highSpeed" className="flex items-center space-x-2">
                <Train className="h-4 w-4" />
                <span>高铁定员</span>
                {calculationResults.highSpeed && (
                  <Badge variant="default" className="ml-2">✓</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="conventional" className="flex items-center space-x-2">
                <Car className="h-4 w-4" />
                <span>普速定员</span>
                {calculationResults.conventional && (
                  <Badge variant="default" className="ml-2">✓</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="otherProduction" className="flex items-center space-x-2">
                <Briefcase className="h-4 w-4" />
                <span>其余生产</span>
                {calculationResults.otherProduction && (
                  <Badge variant="default" className="ml-2">✓</Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      {/* 标准选择和基本信息 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>规则配置</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">选择定员标准</label>
              <Select value={selectedStandardId} onValueChange={setSelectedStandardId}>
                <SelectTrigger>
                  <SelectValue placeholder="请选择定员标准" />
                </SelectTrigger>
                <SelectContent>
                  {standards.map(standard => (
                    <SelectItem key={standard.id} value={standard.id}>
                      {standard.name} ({standard.standardWorkHours}h)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {selectedStandard && (
              <div>
                <label className="text-sm font-medium mb-2 block">标准信息</label>
                <div className="p-3 bg-muted rounded-lg text-sm">
                  <div>标准工时: {selectedStandard.standardWorkHours}小时</div>
                  <div>{currentTypeData.label}规则: {currentTypeData.rulesCount}个</div>
                  <div>主要生产预备率: {currentUnit === 'beijing' ? selectedStandard.reserveRates.mainProduction.beijing : currentUnit === 'shijiazhuang' ? selectedStandard.reserveRates.mainProduction.shijiazhuang : selectedStandard.reserveRates.mainProduction.tianjin}%</div>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-4">
            <Button
              onClick={calculateStaffing}
              disabled={
                !selectedStandard ||
                isCalculating ||
                (calculationType === 'otherProduction'
                  ? (!calculationResults.highSpeed && !calculationResults.conventional)
                  : currentTypeData.dataCount === 0
                )
              }
              className="flex items-center space-x-2"
            >
              <Calculator className="h-4 w-4" />
              <span>{isCalculating ? "计算中..." : `开始计算${currentTypeData.label}`}</span>
            </Button>
            
            {currentResult && (
              <Button onClick={exportResults} variant="outline">
                <Download className="h-4 w-4 mr-1" />
                导出结果
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 数据概览 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            {React.createElement(currentTypeData.icon, { className: "h-8 w-8 mx-auto mb-2 text-blue-600" })}
            <div className="text-2xl font-bold">{currentTypeData.dataCount}</div>
            <div className="text-sm text-muted-foreground">{currentTypeData.label}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <Target className="h-8 w-8 mx-auto mb-2 text-green-600" />
            <div className="text-2xl font-bold">
              {currentTypeData.rulesCount}
            </div>
            <div className="text-sm text-muted-foreground">配置规则</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <CheckCircle className="h-8 w-8 mx-auto mb-2 text-purple-600" />
            <div className="text-2xl font-bold">
              {currentResult && 'summary' in currentResult ? currentResult.summary.matchedTrains : 0}
            </div>
            <div className="text-sm text-muted-foreground">已匹配</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="h-8 w-8 mx-auto mb-2 text-orange-600" />
            <div className="text-2xl font-bold">
              {currentResult && 'summary' in currentResult ? currentResult.summary.totalStaff : 0}
            </div>
            <div className="text-sm text-muted-foreground">总定员</div>
          </CardContent>
        </Card>
      </div>

      {/* 计算结果汇总 */}
      {currentResult && calculationType === 'highSpeed' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5" />
                <span>计算结果汇总</span>
              </div>
              <Badge variant={(currentResult as HighSpeedUnitStaffingResult).summary.coverageRate >= 90 ? "default" : "destructive"}>
                覆盖率 {(currentResult as HighSpeedUnitStaffingResult).summary.coverageRate.toFixed(1)}%
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 覆盖率进度条 */}
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>规则覆盖率</span>
                <span>{(currentResult as HighSpeedUnitStaffingResult).summary.matchedTrains}/{(currentResult as HighSpeedUnitStaffingResult).summary.totalTrains}</span>
              </div>
              <Progress value={(currentResult as HighSpeedUnitStaffingResult).summary.coverageRate} className="h-2" />
            </div>

            {/* 汇总统计 */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {calculationType === 'highSpeed'
                    ? (currentResult as HighSpeedUnitStaffingResult).summary.matchedTrains
                    : calculationType === 'conventional'
                    ? (currentResult as ConventionalUnitStaffingResult).summary.matchedTrains
                    : 0
                  }
                </div>
                <div className="text-sm text-green-700">已匹配列车</div>
              </div>

              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-600">
                  {Math.round(calculationType === 'highSpeed'
                    ? (currentResult as HighSpeedUnitStaffingResult).summary.baseTotalStaff
                    : calculationType === 'conventional'
                    ? (currentResult as ConventionalUnitStaffingResult).summary.baseTotalStaff
                    : 0
                  )}
                </div>
                <div className="text-sm text-gray-700">基础定员</div>
              </div>

              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {calculationType === 'highSpeed'
                    ? ((currentResult as HighSpeedUnitStaffingResult).summary.reserveRate * 100).toFixed(1) + '%'
                    : calculationType === 'conventional'
                    ? ((currentResult as ConventionalUnitStaffingResult).summary.reserveRate * 100).toFixed(1) + '%'
                    : 'N/A'
                  }
                </div>
                <div className="text-sm text-purple-700">预备率</div>
              </div>

              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {Math.round(calculationType === 'highSpeed'
                    ? (currentResult as HighSpeedUnitStaffingResult).summary.totalStaff
                    : calculationType === 'conventional'
                    ? (currentResult as ConventionalUnitStaffingResult).summary.totalStaff
                    : 0
                  )}
                </div>
                <div className="text-sm text-blue-700">总定员人数</div>
              </div>
            </div>

            {/* 未匹配列车警告 */}
            {((calculationType === 'highSpeed' && (currentResult as HighSpeedUnitStaffingResult).unmatchedTrains.length > 0) ||
              (calculationType === 'conventional' && (currentResult as ConventionalUnitStaffingResult).unmatchedTrains.length > 0)) && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  发现 {calculationType === 'highSpeed'
                    ? (currentResult as HighSpeedUnitStaffingResult).unmatchedTrains.length
                    : (currentResult as ConventionalUnitStaffingResult).unmatchedTrains.length
                  } 趟列车未能匹配定员规则。
                  <Button
                    variant="link"
                    className="p-0 h-auto font-normal"
                    onClick={() => setShowDetails(true)}
                  >
                    查看详情
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            <div className="flex justify-center">
              <Button 
                onClick={() => setShowDetails(!showDetails)} 
                variant="outline"
              >
                <Eye className="h-4 w-4 mr-1" />
                {showDetails ? "隐藏详情" : "查看详情"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 详细计算结果 */}
      {showDetails && currentResult && calculationType === 'highSpeed' && (
        <Card>
          <CardHeader>
            <CardTitle>详细计算结果</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* 已匹配列车 */}
              {(currentResult as HighSpeedUnitStaffingResult).trainResults.filter(r => r.isMatched).length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3 text-green-600">
                    已匹配列车 ({(currentResult as HighSpeedUnitStaffingResult).trainResults.filter(r => r.isMatched).length}趟)
                  </h4>
                  <div className="space-y-4">
                    {/* 搜索功能 */}
                    <div className="flex items-center space-x-4">
                      <Input
                        placeholder="搜索车次、编组或序号..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="max-w-md"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowAllTrains(!showAllTrains)}
                      >
                        {showAllTrains ? '显示前10条' : '显示全部'}
                      </Button>
                    </div>
                    
                    {/* 列车结果列表 */}
                    <div className="space-y-2">
                      {(() => {
                        const matchedResults = (currentResult as HighSpeedUnitStaffingResult).trainResults.filter(result => result.isMatched)
                        const filteredResults = matchedResults.filter(result => {
                          if (!searchTerm) return true
                          const trainNumber = result.trainData['车次'] || result.trainData['trainNumber'] || ''
                          const formation = result.trainData['编组'] || result.trainData['formation'] || ''
                          const sequence = result.trainData['序号'] || result.trainData['sequence'] || ''
                          return trainNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                 formation.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                 sequence.toString().toLowerCase().includes(searchTerm.toLowerCase())
                        })
                        const displayResults = showAllTrains ? filteredResults : filteredResults.slice(0, 10)
                        
                        return (
                          <>
                            {displayResults.map((result, index) => (
                              <TrainResultCard key={index} result={result} />
                            ))}
                            {!showAllTrains && filteredResults.length > 10 && (
                              <div className="text-sm text-gray-500 text-center">
                                显示 {displayResults.length}/{filteredResults.length} 条结果，点击“显示全部”查看更多
                              </div>
                            )}
                            {searchTerm && filteredResults.length === 0 && (
                              <div className="text-sm text-gray-500 text-center">
                                未找到匹配的列车
                              </div>
                            )}
                          </>
                        )
                      })()} 
                    </div>
                  </div>
                </div>
              )}

              {/* 未匹配列车 */}
              {(currentResult as HighSpeedUnitStaffingResult).unmatchedTrains.length > 0 && (
                <div>
                  <Separator />
                  <h4 className="font-semibold mb-3 text-red-600">
                    未匹配列车 ({(currentResult as HighSpeedUnitStaffingResult).unmatchedTrains.length}趟)
                  </h4>
                  <div className="space-y-2">
                    {(currentResult as HighSpeedUnitStaffingResult).unmatchedTrains.map((unmatched, index) => (
                      <UnmatchedTrainCard key={index} unmatchedTrain={unmatched} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 普速定员计算结果汇总 */}
      {currentResult && calculationType === 'conventional' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5" />
                <span>普速定员计算结果汇总</span>
              </div>
              <Badge variant={(currentResult as ConventionalUnitStaffingResult).summary.coverageRate >= 90 ? "default" : "destructive"}>
                覆盖率 {(currentResult as ConventionalUnitStaffingResult).summary.coverageRate.toFixed(1)}%
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 覆盖率进度条 */}
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>规则覆盖率</span>
                <span>{(currentResult as ConventionalUnitStaffingResult).summary.matchedTrains}/{(currentResult as ConventionalUnitStaffingResult).summary.totalTrains}</span>
              </div>
              <Progress value={(currentResult as ConventionalUnitStaffingResult).summary.coverageRate} className="h-2" />
            </div>

            {/* 汇总统计 */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {(currentResult as ConventionalUnitStaffingResult).summary.matchedTrains}
                </div>
                <div className="text-sm text-green-700">已匹配列车</div>
              </div>

              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-600">
                  {Math.round((currentResult as ConventionalUnitStaffingResult).summary.baseTotalStaff)}
                </div>
                <div className="text-sm text-gray-700">基础定员</div>
              </div>

              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {((currentResult as ConventionalUnitStaffingResult).summary.reserveRate * 100).toFixed(1)}%
                </div>
                <div className="text-sm text-purple-700">预备率</div>
              </div>

              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {Math.round((currentResult as ConventionalUnitStaffingResult).summary.totalStaff)}
                </div>
                <div className="text-sm text-blue-700">总定员人数</div>
              </div>
            </div>

            {/* 人员配置汇总 */}
            <div className="mt-6">
              <h4 className="font-semibold mb-3 text-gray-800">
                人员配置汇总
                <span className="ml-2 text-sm font-normal text-gray-600">
                  (总组数: {(currentResult as ConventionalUnitStaffingResult).summary.perGroupBreakdown.totalGroups}组)
                </span>
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(() => {
                  const breakdown = (currentResult as ConventionalUnitStaffingResult).summary.staffingBreakdown
                  const perGroupBreakdown = (currentResult as ConventionalUnitStaffingResult).summary.perGroupBreakdown
                  return (
                    <>
                      <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="font-medium text-blue-800">列车长</div>
                        <div className="text-2xl font-bold text-blue-600">{Math.round(breakdown.trainConductor)}</div>
                        <div className="text-sm text-blue-700">
                          总计{Math.round(breakdown.trainConductor)}人 | 每组{Math.round(perGroupBreakdown.trainConductor)}人
                        </div>
                      </div>

                      <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                        <div className="font-medium text-green-800">列车员</div>
                        <div className="text-2xl font-bold text-green-600">{Math.round(breakdown.trainAttendants.total)}</div>
                        <div className="text-sm text-green-700">
                          总计{Math.round(breakdown.trainAttendants.total)}人 | 每组{Math.round(perGroupBreakdown.trainAttendants.total)}人<br/>
                          座车:{Math.round(breakdown.trainAttendants.seatCar)} | 硬卧:{Math.round(breakdown.trainAttendants.hardSleeper)} | 软卧:{Math.round(breakdown.trainAttendants.softSleeper)} | 餐车:{Math.round(breakdown.trainAttendants.diningCar)}
                        </div>
                      </div>

                      <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                        <div className="font-medium text-orange-800">行李员</div>
                        <div className="text-2xl font-bold text-orange-600">{Math.round(breakdown.baggageStaff)}</div>
                        <div className="text-sm text-orange-700">
                          总计{Math.round(breakdown.baggageStaff)}人 | 每组{Math.round(perGroupBreakdown.baggageStaff)}人
                        </div>
                      </div>

                      <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                        <div className="font-medium text-purple-800">运转车长</div>
                        <div className="text-2xl font-bold text-purple-600">{Math.round(breakdown.operationConductor)}</div>
                        <div className="text-sm text-purple-700">
                          总计{Math.round(breakdown.operationConductor)}人 | 每组{Math.round(perGroupBreakdown.operationConductor)}人
                        </div>
                      </div>

                      {breakdown.translator > 0 && (
                        <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                          <div className="font-medium text-indigo-800">翻译</div>
                          <div className="text-2xl font-bold text-indigo-600">{Math.round(breakdown.translator)}</div>
                          <div className="text-sm text-indigo-700">
                            总计{Math.round(breakdown.translator)}人 | 每组{Math.round(perGroupBreakdown.translator)}人
                          </div>
                        </div>
                      )}

                      {breakdown.additionalStaff.total > 0 && (
                        <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                          <div className="font-medium text-yellow-800">额外人员</div>
                          <div className="text-2xl font-bold text-yellow-600">{Math.round(breakdown.additionalStaff.total)}</div>
                          <div className="text-sm text-yellow-700">
                            总计{Math.round(breakdown.additionalStaff.total)}人 | 每组{Math.round(perGroupBreakdown.additionalStaff.total)}人<br/>
                            广播员:{Math.round(breakdown.additionalStaff.broadcaster)} | 值班员:{Math.round(breakdown.additionalStaff.trainDutyOfficer)}
                          </div>
                        </div>
                      )}

                      {breakdown.diningCarStaff > 0 && (
                        <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                          <div className="font-medium text-green-800">餐车人员</div>
                          <div className="text-2xl font-bold text-green-600">{Math.round(breakdown.diningCarStaff)}</div>
                          <div className="text-sm text-green-700">
                            总计{Math.round(breakdown.diningCarStaff)}人 | 每组{Math.round(perGroupBreakdown.diningCarStaff)}人
                          </div>
                        </div>
                      )}

                      {breakdown.salesStaff > 0 && (
                        <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                          <div className="font-medium text-orange-800">售货人员</div>
                          <div className="text-2xl font-bold text-orange-600">{Math.round(breakdown.salesStaff)}</div>
                          <div className="text-sm text-orange-700">
                            总计{Math.round(breakdown.salesStaff)}人 | 每组{Math.round(perGroupBreakdown.salesStaff)}人
                          </div>
                        </div>
                      )}
                    </>
                  )
                })()}
              </div>
            </div>

            {/* 未匹配列车警告 */}
            {(currentResult as ConventionalUnitStaffingResult).unmatchedTrains.length > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  发现 {(currentResult as ConventionalUnitStaffingResult).unmatchedTrains.length} 趟列车未能匹配定员规则。
                  <Button
                    variant="link"
                    className="p-0 h-auto font-normal"
                    onClick={() => setShowDetails(true)}
                  >
                    查看详情
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            <div className="flex justify-center">
              <Button 
                onClick={() => setShowDetails(!showDetails)} 
                variant="outline"
              >
                <Eye className="h-4 w-4 mr-1" />
                {showDetails ? "隐藏详情" : "查看详情"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 普速定员详细计算结果 */}
      {showDetails && currentResult && calculationType === 'conventional' && (
        <Card>
          <CardHeader>
            <CardTitle>普速定员详细计算结果</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* 已匹配列车 */}
              {(currentResult as ConventionalUnitStaffingResult).trainResults.filter(r => r.isMatched).length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3 text-green-600">
                    已匹配列车 ({(currentResult as ConventionalUnitStaffingResult).trainResults.filter(r => r.isMatched).length}趟)
                  </h4>
                  <div className="space-y-4">
                    {/* 搜索功能 */}
                    <div className="flex items-center space-x-4">
                      <Input
                        placeholder="搜索车次、编组或序号..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="max-w-md"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowAllTrains(!showAllTrains)}
                      >
                        {showAllTrains ? '显示前10条' : '显示全部'}
                      </Button>
                    </div>
                    
                    {/* 列车结果列表 */}
                    <div className="space-y-2">
                      {(() => {
                        const matchedResults = (currentResult as ConventionalUnitStaffingResult).trainResults.filter(result => result.isMatched)
                        const filteredResults = matchedResults.filter(result => {
                          if (!searchTerm) return true
                          const trainNumber = result.trainData['车次'] || result.trainData['trainNumber'] || ''
                          const formation = result.trainData['编组'] || result.trainData['formation'] || ''
                          const sequence = result.trainData['序号'] || result.trainData['sequence'] || ''
                          return trainNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                 formation.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                 sequence.toString().toLowerCase().includes(searchTerm.toLowerCase())
                        })
                        const displayResults = showAllTrains ? filteredResults : filteredResults.slice(0, 10)
                        
                        return (
                          <>
                            {displayResults.map((result, index) => (
                              <ConventionalTrainResultCard key={index} result={result} />
                            ))}
                            {!showAllTrains && filteredResults.length > 10 && (
                              <div className="text-sm text-gray-500 text-center">
                                显示 {displayResults.length}/{filteredResults.length} 条结果，点击"显示全部"查看更多
                              </div>
                            )}
                            {searchTerm && filteredResults.length === 0 && (
                              <div className="text-sm text-gray-500 text-center">
                                未找到匹配的列车
                              </div>
                            )}
                          </>
                        )
                      })()} 
                    </div>
                  </div>
                </div>
              )}

              {/* 未匹配列车 */}
              {(currentResult as ConventionalUnitStaffingResult).unmatchedTrains.length > 0 && (
                <div>
                  <Separator />
                  <h4 className="font-semibold mb-3 text-red-600">
                    未匹配列车 ({(currentResult as ConventionalUnitStaffingResult).unmatchedTrains.length}趟)
                  </h4>
                  <div className="space-y-2">
                    {(currentResult as ConventionalUnitStaffingResult).unmatchedTrains.map((unmatched, index) => (
                      <ConventionalUnmatchedTrainCard key={index} unmatchedTrain={unmatched} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 其余生产计算结果 */}
      {calculationType === 'otherProduction' && currentResult && (
        <div className="space-y-6">
          {(() => {
            const result = currentResult as OtherProductionUnitStaffingResult
            return (
              <>
                {/* 计算汇总 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Briefcase className="h-5 w-5 text-orange-600" />
                      <span>其余生产定员计算结果</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* 基础数据 */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="text-sm font-medium text-blue-800">高铁总定员</div>
                        <div className="text-2xl font-bold text-blue-600">{result.baseData.highSpeedTotalStaff}</div>
                        <div className="text-xs text-blue-700">人</div>
                      </div>
                      <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                        <div className="text-sm font-medium text-green-800">普速总定员</div>
                        <div className="text-2xl font-bold text-green-600">{result.baseData.conventionalTotalStaff}</div>
                        <div className="text-xs text-green-700">人</div>
                      </div>
                      <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                        <div className="text-sm font-medium text-purple-800">主要生产总计</div>
                        <div className="text-2xl font-bold text-purple-600">{result.baseData.mainProductionTotal}</div>
                        <div className="text-xs text-purple-700">人</div>
                      </div>
                    </div>

                    {/* 计算过程 */}
                    {result.summary.appliedRules.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="font-semibold text-gray-800">计算过程</h4>
                        {result.summary.appliedRules.map((ruleResult, index) => (
                          <div key={index} className="p-3 bg-gray-50 rounded-lg border">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-medium text-gray-800">{ruleResult.rule.name}</div>
                                <div className="text-sm text-gray-600">{ruleResult.calculation}</div>
                              </div>
                              <div className="text-lg font-bold text-orange-600">{ruleResult.calculatedStaff}人</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 最终结果 */}
                    <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <div className="text-sm font-medium text-orange-800">基础定员</div>
                          <div className="text-xl font-bold text-orange-600">{result.summary.baseTotalStaff}人</div>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-orange-800">预备率</div>
                          <div className="text-xl font-bold text-orange-600">{(result.summary.reserveRate * 100).toFixed(1)}%</div>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-orange-800">最终定员</div>
                          <div className="text-2xl font-bold text-orange-600">{result.summary.totalStaff}人</div>
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-orange-700">
                        计算逻辑: {result.summary.baseTotalStaff}人 × (1 + {(result.summary.reserveRate * 100).toFixed(1)}%) = {result.summary.totalStaff}人
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )
          })()}
        </div>
      )}

      {/* 其余生产无结果时的提示 */}
      {calculationType === 'otherProduction' && !currentResult && (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="text-4xl mb-4">📊</div>
            <h3 className="text-lg font-medium mb-2">其余生产定员计算</h3>
            <p className="text-muted-foreground mb-4">
              其余生产定员基于高铁和普速的总定员计算
            </p>
            <p className="text-sm text-orange-600">
              请先完成高铁或普速定员计算，然后点击"开始计算其余生产"
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// 单趟列车结果卡片
function TrainResultCard({ result }: { result: HighSpeedTrainStaffingResult }) {
  const trainNumber = result.trainData['车次'] || result.trainData['trainNumber'] || '未知'
  const formation = result.trainData['编组'] || result.trainData['formation'] || '未知'
  const sequence = result.trainData['序号'] || result.trainData['sequence'] || '未知'
  
  // 计算每组的人数（按比例分配）
  const ruleStaffing = result.matchedRule?.rule.staffing
  if (!ruleStaffing) return null
  
  // 检查实际的商务座配置
  const actualBusinessClassStaff = result.staffing.businessClassAttendant
  const ruleBusinessClassStaff = ruleStaffing.businessClassAttendant || 0
  const businessClassAdjusted = actualBusinessClassStaff !== ruleBusinessClassStaff
  
  // 每组的标准配置（应该显示规则中的配置，而不是总数除以组数）
  const perGroupStaff = {
    trainConductor: ruleStaffing.trainConductor,
    trainAttendant: ruleStaffing.trainAttendant,
    businessClassAttendant: actualBusinessClassStaff > 0 ? ruleBusinessClassStaff : 0  // 使用规则配置而不是计算值
  }
  const perGroupTotal = perGroupStaff.trainConductor + perGroupStaff.trainAttendant + perGroupStaff.businessClassAttendant
  
  return (
    <div className="p-3 bg-green-50 rounded-lg border border-green-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="font-medium">{trainNumber}</div>
          <Badge variant="outline">{formation}</Badge>
          <Badge variant="secondary">序号:{sequence}</Badge>
          <div className="text-sm text-gray-600">
            {result.matchedRule?.rule.name}
          </div>
          {businessClassAdjusted && (
            <Badge variant="destructive" className="text-xs">
              {actualBusinessClassStaff === 0 ? '无商务座' : '商务座调整'}
            </Badge>
          )}
        </div>
        <div className="flex items-center space-x-4 text-sm">
          <div className="text-gray-600">
            每组: 列车长{perGroupStaff.trainConductor} + 列车员{perGroupStaff.trainAttendant}
            {actualBusinessClassStaff > 0 && ` + 商务座${perGroupStaff.businessClassAttendant}`}
            = {perGroupTotal}人
          </div>
          <div className="text-gray-600">
            组数: {result.groupCount.toFixed(2)}
          </div>
          <Badge className="bg-green-100 text-green-800">
            总计:{Math.round(result.staffing.total)}人
          </Badge>
        </div>
      </div>
      {/* 显示详细分配 */}
      <div className="mt-2 text-xs text-gray-500">
        实际分配: 列车长{Math.round(result.staffing.trainConductor)}人 + 列车员{Math.round(result.staffing.trainAttendant)}人
        {actualBusinessClassStaff > 0 && ` + 商务座服务员${Math.round(actualBusinessClassStaff)}人`}
      </div>
      {result.warnings.length > 0 && (
        <div className="mt-2 text-xs text-yellow-600">
          {result.warnings.join('; ')}
        </div>
      )}
    </div>
  )
}

// 未匹配列车卡片
function UnmatchedTrainCard({ unmatchedTrain }: { unmatchedTrain: any }) {
  const trainNumber = unmatchedTrain.trainData['车次'] || unmatchedTrain.trainData['trainNumber'] || '未知'
  const formation = unmatchedTrain.trainData['编组'] || unmatchedTrain.trainData['formation'] || '未知'
  
  return (
    <div className="p-3 bg-red-50 rounded-lg border border-red-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="font-medium">{trainNumber}</div>
          <Badge variant="outline">{formation}</Badge>
          <div className="text-sm text-red-600">{unmatchedTrain.reason}</div>
        </div>
        <div className="text-xs text-gray-600">
          {unmatchedTrain.suggestedAction}
        </div>
      </div>
    </div>
  )
}

// 普速单趟列车结果卡片
function ConventionalTrainResultCard({ result }: { result: ConventionalTrainStaffingResult }) {
  const trainNumber = result.trainData['车次'] || result.trainData['trainNumber'] || '未知'
  const category = result.trainData['类别'] || result.trainData['编组类型'] || '未知类别'
  const formationDetails = result.trainData['编组详情'] || '未知编组详情'
  const sequence = result.trainData['序号'] || result.trainData['sequence'] || '未知'
  
  // 获取匹配的规则
  const matchedRule = result.matchedRule
  if (!matchedRule) return null
  
  // 显示人员配置详情
  const staffing = result.staffing
  const exactStaffing = result.exactStaffing
  
  return (
    <div className="p-3 bg-green-50 rounded-lg border border-green-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="font-medium">{trainNumber}</div>
          <Badge variant="outline">{category}</Badge>
          <Badge variant="secondary">序号:{sequence}</Badge>
          <div className="text-sm text-gray-600">
            {matchedRule.rule.name}
          </div>
        </div>
        <div className="flex items-center space-x-4 text-sm">
          <div className="text-gray-600">
            配备组数: {result.groupCount}
          </div>
          <Badge className="bg-green-100 text-green-800">
            总计:{Math.round(staffing.total)}人
          </Badge>
        </div>
      </div>
      
      {/* 显示详细人员配置 - 每组配置 */}
      <div className="mt-2 text-xs text-gray-600">
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {(() => {
            const perGroup = result.perGroupStaffing
            return (
              <>
                <span>列车长: {Math.round(perGroup.trainConductor)}人</span>
                {perGroup.trainAttendants.seatCar > 0 && (
                  <span>座车列车员: {Math.round(perGroup.trainAttendants.seatCar)}人</span>
                )}
                {perGroup.trainAttendants.hardSleeper > 0 && (
                  <span>硬卧列车员: {Math.round(perGroup.trainAttendants.hardSleeper)}人</span>
                )}
                {perGroup.trainAttendants.softSleeper > 0 && (
                  <span>软卧列车员: {Math.round(perGroup.trainAttendants.softSleeper)}人</span>
                )}
                {perGroup.trainAttendants.diningCar > 0 && (
                  <span>餐车列车员: {Math.round(perGroup.trainAttendants.diningCar)}人</span>
                )}
                {perGroup.baggageStaff > 0 && (
                  <span>行李员: {Math.round(perGroup.baggageStaff)}人</span>
                )}
                {perGroup.translator > 0 && (
                  <span>翻译: {Math.round(perGroup.translator)}人</span>
                )}
                {perGroup.operationConductor > 0 && (
                  <span>运转车长: {Math.round(perGroup.operationConductor)}人</span>
                )}
                {perGroup.additionalStaff.broadcaster > 0 && (
                  <span>广播员: {Math.round(perGroup.additionalStaff.broadcaster)}人</span>
                )}
                {perGroup.additionalStaff.trainDutyOfficer > 0 && (
                  <span>值班员: {Math.round(perGroup.additionalStaff.trainDutyOfficer)}人</span>
                )}
                {perGroup.diningCarStaff > 0 && (
                  <span>餐车人员: {Math.round(perGroup.diningCarStaff)}人</span>
                )}
                {perGroup.salesStaff > 0 && (
                  <span>售货人员: {Math.round(perGroup.salesStaff)}人</span>
                )}
              </>
            )
          })()}
        </div>

        {/* 显示计算说明 */}
        <div className="mt-1 text-xs text-blue-600">
          计算逻辑: {Math.round(staffing.total / result.groupCount)}人/组 × {result.groupCount}组 = {Math.round(staffing.total)}人
        </div>
      </div>
      
      {/* 显示精确值与显示值的差异 */}
      {Math.abs(exactStaffing.total - staffing.total) > 0.01 && (
        <div className="mt-1 text-xs text-blue-600">
          精确计算: {exactStaffing.total.toFixed(2)}人 → 实际配置: {staffing.total}人
        </div>
      )}
      
      {/* 显示警告信息 */}
      {result.warnings && result.warnings.length > 0 && (
        <div className="mt-2 text-xs text-yellow-600">
          {result.warnings.join('; ')}
        </div>
      )}
    </div>
  )
}

// 普速未匹配列车卡片
function ConventionalUnmatchedTrainCard({ unmatchedTrain }: { unmatchedTrain: any }) {
  const trainNumber = unmatchedTrain.trainData['车次'] || unmatchedTrain.trainData['trainNumber'] || '未知'
  const category = unmatchedTrain.trainData['类别'] || unmatchedTrain.trainData['编组类型'] || '未知类别'
  
  return (
    <div className="p-3 bg-red-50 rounded-lg border border-red-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="font-medium">{trainNumber}</div>
          <Badge variant="outline">{category}</Badge>
          <div className="text-sm text-red-600">{unmatchedTrain.reason}</div>
        </div>
        <div className="text-xs text-gray-600">
          {unmatchedTrain.suggestedAction}
        </div>
      </div>
    </div>
  )
}