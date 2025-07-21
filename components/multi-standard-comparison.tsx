"use client"

import React, { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Download, Calculator, BarChart3, TrendingUp, AlertCircle, Building } from 'lucide-react'
import { useTrainData } from '@/contexts/train-data-context'
import { useStaffingRules } from '@/contexts/staffing-rules-context'
import { MultiStandardComparisonProvider, useMultiStandardComparison } from '@/contexts/multi-standard-comparison-context'
import { MultiStandardCalculator } from '@/utils/multi-standard-calculator'
import { MultiStandardExporter } from '@/utils/multi-standard-export'
import { DifferenceAnalysis } from './difference-analysis'
import type { StaffingStandard, RailwayBureau } from '@/types'

const RAILWAY_BUREAUS: { value: RailwayBureau; label: string }[] = [
  { value: 'beijing', label: '北京客运段' },
  { value: 'shijiazhuang', label: '石家庄客运段' },
  { value: 'tianjin', label: '天津客运段' }
]

// 岗位名称映射表
const POSITION_NAME_MAP: Record<string, string> = {
  // 高铁岗位
  trainConductor: '列车长',
  trainAttendant: '乘务员',
  businessClassAttendant: '商务座乘务员',
  total: '合计',

  // 普速岗位
  conductor: '列车长',
  attendant: '乘务员',
  seatCar: '硬座乘务员',
  hardSleeper: '硬卧乘务员',
  softSleeper: '软卧乘务员',
  diningCar: '餐车乘务员',
  operationConductor: '运转车长',
  translator: '翻译',
  baggageStaff: '行李员',
  diningCarStaff: '餐车人员',
  salesStaff: '售货人员',

  // 额外人员
  broadcaster: '广播员',
  trainDutyOfficer: '值班员',

  // 其他可能的岗位
  chiefConductor: '列车长',
  assistant: '乘务员',
  security: '乘警',

  // 如果没有映射，返回原名称
}

// 获取中文岗位名称的辅助函数
const getPositionDisplayName = (positionKey: string): string => {
  return POSITION_NAME_MAP[positionKey] || positionKey
}

function StandardSelector() {
  const { standards } = useStaffingRules()
  const { selectedStandards, toggleStandard, clearAllStandards } = useMultiStandardComparison()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="w-5 h-5" />
          标准选择
        </CardTitle>
        <CardDescription>
          选择2-5个定员标准进行对比分析
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">
            已选择 {selectedStandards.length} 个标准
          </span>
          {selectedStandards.length > 0 && (
            <Button variant="outline" size="sm" onClick={clearAllStandards}>
              清空选择
            </Button>
          )}
        </div>
        
        <div className="grid gap-3">
          {standards.map((standard) => (
            <div
              key={standard.id}
              className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors ${
                selectedStandards.includes(standard.id)
                  ? 'bg-primary/5 border-primary'
                  : 'hover:bg-muted/50'
              }`}
            >
              <Checkbox
                id={standard.id}
                checked={selectedStandards.includes(standard.id)}
                onCheckedChange={() => toggleStandard(standard.id)}
                disabled={!selectedStandards.includes(standard.id) && selectedStandards.length >= 5}
              />
              <div className="flex-1">
                <label
                  htmlFor={standard.id}
                  className="text-sm font-medium cursor-pointer"
                >
                  {standard.name}
                </label>
                <div className="text-xs text-muted-foreground mt-1">
                  标准工时: {standard.standardWorkHours}h | 主生产预备率: {
                    standard.reserveRates.mainProduction.beijing
                  }%
                </div>
              </div>
              {selectedStandards.includes(standard.id) && (
                <Badge variant="default" className="text-xs">
                  已选择
                </Badge>
              )}
            </div>
          ))}
        </div>

        {selectedStandards.length > 5 && (
          <div className="flex items-center gap-2 text-amber-600 text-sm">
            <AlertCircle className="w-4 h-4" />
            <span>最多只能选择5个标准进行对比</span>
          </div>
        )}

        {selectedStandards.length === 1 && (
          <div className="flex items-center gap-2 text-blue-600 text-sm">
            <AlertCircle className="w-4 h-4" />
            <span>至少需要选择2个标准才能进行对比</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function BureauSelector() {
  const { selectedBureaus, toggleBureau } = useMultiStandardComparison()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          客运段选择
        </CardTitle>
        <CardDescription>
          选择要进行对比分析的客运段
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3">
          {RAILWAY_BUREAUS.map((bureau) => (
            <div
              key={bureau.value}
              className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors ${
                selectedBureaus.includes(bureau.value)
                  ? 'bg-primary/5 border-primary'
                  : 'hover:bg-muted/50'
              }`}
            >
              <Checkbox
                id={bureau.value}
                checked={selectedBureaus.includes(bureau.value)}
                onCheckedChange={() => toggleBureau(bureau.value)}
              />
              <label
                htmlFor={bureau.value}
                className="text-sm font-medium cursor-pointer flex-1"
              >
                {bureau.label}
              </label>
              {selectedBureaus.includes(bureau.value) && (
                <Badge variant="default" className="text-xs">
                  已选择
                </Badge>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function ComparisonResults() {
  const { unitData } = useTrainData()
  const { standards } = useStaffingRules()
  const {
    selectedStandards,
    selectedBureaus,
    comparisonResults,
    bureauGroupedResults,
    displayMode,
    setComparisonResults,
    setBureauGroupedResults,
    setDisplayMode
  } = useMultiStandardComparison()
  const [isCalculating, setIsCalculating] = useState(false)

  // 将unitData转换为MultiStandardCalculator期望的格式
  const convertToTrainData = useMemo(() => {
    const trainData: any = {}
    Object.entries(unitData).forEach(([unit, data]) => {
      trainData[unit] = {
        highSpeed: data.highSpeedData || [],
        conventional: data.conventionalData || []
      }
    })
    return trainData
  }, [unitData])

  const selectedStandardObjects = useMemo(() => 
    standards.filter(s => selectedStandards.includes(s.id)),
    [standards, selectedStandards]
  )

  const canCalculate = selectedStandards.length >= 2 && selectedBureaus.length > 0
  const hasResults = comparisonResults !== null || bureauGroupedResults !== null

  const handleCalculate = async () => {
    if (!canCalculate) return

    setIsCalculating(true)
    try {
      const calculator = new MultiStandardCalculator()

      if (displayMode === 'merged') {
        // 合并模式：将所有客运段数据合并计算
        const results = await calculator.calculateMultipleStandards(
          convertToTrainData,
          selectedStandardObjects,
          selectedBureaus
        )
        setComparisonResults(results)
        setBureauGroupedResults(null)
      } else {
        // 分组模式：按客运段分别计算
        const groupedResults = await calculator.calculateMultipleStandardsByBureau(
          convertToTrainData,
          selectedStandardObjects,
          selectedBureaus
        )
        setBureauGroupedResults(groupedResults)
        setComparisonResults(null)
      }
    } catch (error) {
      console.error('计算出错:', error)
    } finally {
      setIsCalculating(false)
    }
  }

  if (!canCalculate) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">准备开始对比分析</h3>
          <p className="text-sm text-muted-foreground text-center max-w-sm">
            请至少选择2个定员标准和1个客运段，然后点击计算按钮开始对比分析
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            对比分析
          </CardTitle>
          <CardDescription>
            基于选定的标准和客运段进行多维度对比分析
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* 显示模式选择 */}
            {selectedBureaus.length > 1 && (
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium">显示模式:</span>
                <div className="flex items-center gap-2">
                  <Button
                    variant={displayMode === 'grouped' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setDisplayMode('grouped')}
                  >
                    按客运段分组
                  </Button>
                  <Button
                    variant={displayMode === 'merged' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setDisplayMode('merged')}
                  >
                    合并显示
                  </Button>
                </div>
              </div>
            )}

            {/* 计算控制 */}
            <div className="flex justify-between items-center">
              <div className="text-sm text-muted-foreground">
                将对比 {selectedStandards.length} 个标准在 {selectedBureaus.length} 个客运段的定员差异
                {hasResults && (
                  <span className="text-green-600 ml-2">
                    ✓ 已完成计算 ({displayMode === 'grouped' ? '按客运段分组' : '合并显示'})
                  </span>
                )}
              </div>
              <Button
                onClick={handleCalculate}
                disabled={isCalculating}
                className="gap-2"
              >
                <Calculator className="w-4 h-4" />
                {isCalculating ? '计算中...' : '开始计算'}
              </Button>
            </div>
          </div>

          {/* 显示结果 */}
          {(comparisonResults || bureauGroupedResults) && (
            <div className="mt-6">
              {displayMode === 'merged' && comparisonResults ? (
                <Tabs defaultValue="summary" className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="summary">汇总对比</TabsTrigger>
                    <TabsTrigger value="highspeed">高铁对比</TabsTrigger>
                    <TabsTrigger value="conventional">普速对比</TabsTrigger>
                    <TabsTrigger value="differences">差异分析</TabsTrigger>
                  </TabsList>

                  <TabsContent value="summary" className="mt-6">
                    <SummaryComparison results={comparisonResults} standards={selectedStandardObjects} />
                  </TabsContent>

                  <TabsContent value="highspeed" className="mt-6">
                    <HighSpeedComparison results={comparisonResults} standards={selectedStandardObjects} />
                  </TabsContent>

                  <TabsContent value="conventional" className="mt-6">
                    <ConventionalComparison results={comparisonResults} standards={selectedStandardObjects} />
                  </TabsContent>

                  <TabsContent value="differences" className="mt-6">
                    <DifferenceAnalysis results={comparisonResults} standards={selectedStandardObjects} />
                  </TabsContent>
                </Tabs>
              ) : displayMode === 'grouped' && bureauGroupedResults ? (
                <BureauGroupedComparison
                  groupedResults={bureauGroupedResults}
                  standards={selectedStandardObjects}
                  selectedBureaus={selectedBureaus}
                />
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// 共用的客运段名称映射函数
const getBureauName = (bureau: RailwayBureau): string => {
  const bureauNames = {
    beijing: '北京客运段',
    shijiazhuang: '石家庄客运段',
    tianjin: '天津客运段'
  }
  return bureauNames[bureau] || bureau
}

function BureauGroupedComparison({
  groupedResults,
  standards,
  selectedBureaus
}: {
  groupedResults: Record<string, Record<string, ComparisonResult>>
  standards: StaffingStandard[]
  selectedBureaus: RailwayBureau[]
}) {

  return (
    <div className="space-y-6">
      {/* 汇总对比 */}
      <Card>
        <CardHeader>
          <CardTitle>各客运段汇总对比</CardTitle>
          <CardDescription>按客运段分组显示各标准下的定员汇总</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6">
            {selectedBureaus.map(bureau => {
              const bureauResults = groupedResults[bureau]
              if (!bureauResults) return null

              return (
                <Card key={bureau} className="p-4">
                  <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                    <Building className="w-5 h-5" />
                    {getBureauName(bureau)}
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {standards.map(standard => {
                      const result = bureauResults[standard.id]
                      if (!result) return null

                      return (
                        <div key={standard.id} className="border rounded-lg p-3">
                          <div className="font-medium text-sm mb-2">{standard.name}</div>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span>高铁:</span>
                              <span className="font-medium text-blue-600">
                                {result.highSpeed.totalStaff}人
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>普速:</span>
                              <span className="font-medium text-green-600">
                                {result.conventional.totalStaff}人
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>其余:</span>
                              <span className="font-medium text-orange-600">
                                {result.otherProduction.totalStaff}人
                              </span>
                            </div>
                            <div className="flex justify-between border-t pt-1">
                              <span className="font-medium">总计:</span>
                              <span className="font-bold text-purple-600">
                                {result.summary.totalStaff}人
                              </span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              覆盖率: {(result.summary.coverageRate * 100).toFixed(1)}%
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </Card>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* 详细对比 */}
      <Tabs defaultValue="highspeed" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="highspeed">高铁详细对比</TabsTrigger>
          <TabsTrigger value="conventional">普速详细对比</TabsTrigger>
          <TabsTrigger value="differences">差异分析</TabsTrigger>
        </TabsList>

        <TabsContent value="highspeed" className="mt-6">
          <BureauGroupedHighSpeedComparison
            groupedResults={groupedResults}
            standards={standards}
            selectedBureaus={selectedBureaus}
          />
        </TabsContent>

        <TabsContent value="conventional" className="mt-6">
          <BureauGroupedConventionalComparison
            groupedResults={groupedResults}
            standards={standards}
            selectedBureaus={selectedBureaus}
          />
        </TabsContent>

        <TabsContent value="differences" className="mt-6">
          <BureauGroupedDifferenceAnalysis
            groupedResults={groupedResults}
            standards={standards}
            selectedBureaus={selectedBureaus}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function BureauGroupedHighSpeedComparison({
  groupedResults,
  standards,
  selectedBureaus
}: {
  groupedResults: Record<string, Record<string, ComparisonResult>>
  standards: StaffingStandard[]
  selectedBureaus: RailwayBureau[]
}) {

  return (
    <div className="space-y-6">
      {selectedBureaus.map(bureau => {
        const bureauResults = groupedResults[bureau]
        if (!bureauResults) return null

        // 将该客运段的结果转换为原有格式
        const results: Record<string, ComparisonResult> = {}
        standards.forEach(standard => {
          if (bureauResults[standard.id]) {
            results[standard.id] = bureauResults[standard.id]
          }
        })

        return (
          <Card key={bureau}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="w-5 h-5" />
                {getBureauName(bureau)} - 高铁定员对比
              </CardTitle>
            </CardHeader>
            <CardContent>
              <HighSpeedComparison results={results} standards={standards} />
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

function BureauGroupedConventionalComparison({
  groupedResults,
  standards,
  selectedBureaus
}: {
  groupedResults: Record<string, Record<string, ComparisonResult>>
  standards: StaffingStandard[]
  selectedBureaus: RailwayBureau[]
}) {

  return (
    <div className="space-y-6">
      {selectedBureaus.map(bureau => {
        const bureauResults = groupedResults[bureau]
        if (!bureauResults) return null

        // 将该客运段的结果转换为原有格式
        const results: Record<string, ComparisonResult> = {}
        standards.forEach(standard => {
          if (bureauResults[standard.id]) {
            results[standard.id] = bureauResults[standard.id]
          }
        })

        return (
          <Card key={bureau}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="w-5 h-5" />
                {getBureauName(bureau)} - 普速定员对比
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ConventionalComparison results={results} standards={standards} />
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

function BureauGroupedDifferenceAnalysis({
  groupedResults,
  standards,
  selectedBureaus
}: {
  groupedResults: Record<string, Record<string, ComparisonResult>>
  standards: StaffingStandard[]
  selectedBureaus: RailwayBureau[]
}) {

  return (
    <div className="space-y-6">
      {selectedBureaus.map(bureau => {
        const bureauResults = groupedResults[bureau]
        if (!bureauResults) return null

        // 将该客运段的结果转换为原有格式
        const results: Record<string, ComparisonResult> = {}
        standards.forEach(standard => {
          if (bureauResults[standard.id]) {
            results[standard.id] = bureauResults[standard.id]
          }
        })

        return (
          <Card key={bureau}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="w-5 h-5" />
                {getBureauName(bureau)} - 差异分析
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DifferenceAnalysis results={results} standards={standards} />
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

function SummaryComparison({ results, standards }: {
  results: any;
  standards: StaffingStandard[]
}) {
  const baseStandard = standards[0]
  const baseResult = results[baseStandard?.id]

  return (
    <div className="space-y-6">
      {/* 概览卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">对比标准数量</p>
                <p className="text-2xl font-bold">{standards.length}</p>
              </div>
              <Calculator className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">最大定员差异</p>
                <p className="text-2xl font-bold text-red-600">
                  {baseResult ? Math.max(...Object.values(results).map((r: any) => 
                    Math.abs(r.summary.totalStaff - baseResult.summary.totalStaff)
                  )) : 0}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">平均覆盖率</p>
                <p className="text-2xl font-bold text-green-600">
                  {Object.values(results).length > 0 ? 
                    Math.round(Object.values(results).reduce((sum: number, r: any) => sum + r.summary.coverageRate, 0) / Object.values(results).length * 100) : 0
                  }%
                </p>
              </div>
              <BarChart3 className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">未匹配车次</p>
                <p className="text-2xl font-bold text-amber-600">
                  {Object.values(results).length > 0 ? 
                    Math.round(Object.values(results).reduce((sum: number, r: any) => sum + r.summary.unmatchedTrains, 0) / Object.values(results).length) : 0
                  }
                </p>
              </div>
              <AlertCircle className="w-8 h-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 详细对比表 */}
      <Card>
        <CardHeader>
          <CardTitle>总定员对比</CardTitle>
          <CardDescription>各标准下的定员分布及差异分析</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>标准名称</TableHead>
                  <TableHead>标准工时</TableHead>
                  <TableHead>高铁定员</TableHead>
                  <TableHead>普速定员</TableHead>
                  <TableHead>其余生产</TableHead>
                  <TableHead>总定员</TableHead>
                  <TableHead>覆盖率</TableHead>
                  <TableHead>与基准差异</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {standards.map((standard, index) => {
                  const result = results[standard.id]
                  if (!result) return null
                  
                  const totalStaff = result.summary.totalStaff
                  const baseTotalStaff = baseResult?.summary.totalStaff || 0
                  const difference = totalStaff - baseTotalStaff
                  const isBase = index === 0
                  
                  return (
                    <TableRow key={standard.id} className={isBase ? 'bg-muted/20' : ''}>
                      <TableCell className="font-medium">
                        {standard.name}
                        {isBase && <Badge variant="outline" className="ml-2">基准</Badge>}
                      </TableCell>
                      <TableCell>{standard.standardWorkHours}h</TableCell>
                      <TableCell>{result.highSpeed.totalStaff}</TableCell>
                      <TableCell>{result.conventional.totalStaff}</TableCell>
                      <TableCell>{result.otherProduction.totalStaff}</TableCell>
                      <TableCell className="font-medium">{totalStaff}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full" 
                              style={{width: `${result.summary.coverageRate * 100}%`}}
                            />
                          </div>
                          <span className="text-sm">{Math.round(result.summary.coverageRate * 100)}%</span>
                        </div>
                      </TableCell>
                      <TableCell className={
                        isBase ? 'text-muted-foreground font-medium' :
                        difference > 0 ? 'text-red-600 font-medium' : 
                        difference < 0 ? 'text-green-600 font-medium' : 
                        'text-muted-foreground'
                      }>
                        {isBase ? '基准' : `${difference > 0 ? '+' : ''}${difference}`}
                        {!isBase && (
                          <div className="text-xs text-muted-foreground">
                            {difference > 0 ? '↑' : difference < 0 ? '↓' : '='} {Math.abs(Math.round(difference / baseTotalStaff * 100))}%
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* 差异分析 */}
      <Card>
        <CardHeader>
          <CardTitle>关键差异因素</CardTitle>
          <CardDescription>影响定员差异的主要因素分析</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2">标准工时分布</h4>
              <div className="space-y-2">
                {standards.map(standard => (
                  <div key={standard.id} className="flex justify-between items-center text-sm">
                    <span>{standard.name}</span>
                    <Badge variant="outline">{standard.standardWorkHours}h</Badge>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">预备率设置</h4>
              <div className="space-y-2">
                {standards.map(standard => (
                  <div key={standard.id} className="flex justify-between items-center text-sm">
                    <span>{standard.name}</span>
                    <Badge variant="outline">
                      {Math.round(standard.reserveRates.mainProduction.beijing * 100)}%
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function HighSpeedComparison({ results, standards }: { 
  results: any; 
  standards: StaffingStandard[] 
}) {
  // 获取所有岗位类型
  const allPositions = new Set<string>()
  standards.forEach(standard => {
    const result = results[standard.id]
    if (result?.highSpeed?.details?.positionSummary) {
      Object.keys(result.highSpeed.details.positionSummary).forEach(pos => 
        allPositions.add(pos)
      )
    }
  })

  return (
    <div className="space-y-6">
      {/* 高铁定员总览 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">平均高铁定员</p>
                <p className="text-2xl font-bold">
                  {standards.length > 0 ? Math.round(
                    standards.reduce((sum, standard) => 
                      sum + (results[standard.id]?.highSpeed?.totalStaff || 0), 0
                    ) / standards.length
                  ) : 0}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">最大差异</p>
                <p className="text-2xl font-bold text-orange-600">
                  {standards.length > 0 ? (() => {
                    const totals = standards.map(s => results[s.id]?.highSpeed?.totalStaff || 0)
                    return Math.max(...totals) - Math.min(...totals)
                  })() : 0}
                </p>
              </div>
              <BarChart3 className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">匹配列车数</p>
                <p className="text-2xl font-bold text-green-600">
                  {standards.length > 0 ? Math.round(
                    standards.reduce((sum, standard) => {
                      const result = results[standard.id]
                      const total = result?.highSpeed?.details?.matchedTrains?.length || 0
                      return sum + total
                    }, 0) / standards.length
                  ) : 0}
                </p>
              </div>
              <Calculator className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 各标准高铁定员对比 */}
      <Card>
        <CardHeader>
          <CardTitle>高铁定员详细对比</CardTitle>
          <CardDescription>各标准下高铁各岗位定员分布</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>标准名称</TableHead>
                  <TableHead>总定员</TableHead>
                  <TableHead>匹配车次</TableHead>
                  <TableHead>未匹配</TableHead>
                  <TableHead>覆盖率</TableHead>
                  <TableHead>商务座配置</TableHead>
                  <TableHead>主要岗位分布</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {standards.map(standard => {
                  const result = results[standard.id]
                  const highSpeedResult = result?.highSpeed
                  
                  if (!highSpeedResult) return null

                  const coverageRate = highSpeedResult.details?.matchedTrains?.length && 
                    (highSpeedResult.details.matchedTrains.length + highSpeedResult.unmatchedCount) > 0 
                    ? highSpeedResult.details.matchedTrains.length / 
                      (highSpeedResult.details.matchedTrains.length + highSpeedResult.unmatchedCount)
                    : 0

                  return (
                    <TableRow key={standard.id}>
                      <TableCell className="font-medium">{standard.name}</TableCell>
                      <TableCell className="font-medium">{highSpeedResult.totalStaff}</TableCell>
                      <TableCell>{highSpeedResult.details?.matchedTrains?.length || 0}</TableCell>
                      <TableCell className="text-amber-600">{highSpeedResult.unmatchedCount}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-12 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-green-600 h-2 rounded-full" 
                              style={{width: `${coverageRate * 100}%`}}
                            />
                          </div>
                          <span className="text-sm">{Math.round(coverageRate * 100)}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {highSpeedResult.details?.businessClassStats?.withBusinessClass || 0}辆
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {highSpeedResult.details?.positionSummary && 
                            Object.entries(highSpeedResult.details.positionSummary)
                              .slice(0, 3)
                              .map(([position, count]) => (
                                <Badge key={position} variant="secondary" className="text-xs">
                                  {getPositionDisplayName(position)}: {count as number}
                                </Badge>
                              ))
                          }
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* 岗位定员对比 */}
      {allPositions.size > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>各岗位定员对比</CardTitle>
            <CardDescription>不同标准下各岗位的定员分布差异</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from(allPositions).map(position => (
                <Card key={position} className="p-4">
                  <h4 className="font-medium mb-3">{getPositionDisplayName(position)}</h4>
                  <div className="space-y-2">
                    {standards.map(standard => {
                      const result = results[standard.id]
                      const positionCount = result?.highSpeed?.details?.positionSummary?.[position] || 0
                      
                      return (
                        <div key={standard.id} className="flex justify-between items-center">
                          <span className="text-sm truncate flex-1 mr-2">{standard.name}</span>
                          <Badge variant={positionCount > 0 ? "default" : "secondary"}>
                            {positionCount}
                          </Badge>
                        </div>
                      )
                    })}
                  </div>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function ConventionalComparison({ results, standards }: { 
  results: any; 
  standards: StaffingStandard[] 
}) {
  // 获取所有岗位类型
  const allPositions = new Set<string>()
  standards.forEach(standard => {
    const result = results[standard.id]
    if (result?.conventional?.details?.positionSummary) {
      Object.keys(result.conventional.details.positionSummary).forEach(pos => 
        allPositions.add(pos)
      )
    }
  })

  return (
    <div className="space-y-6">
      {/* 普速定员总览 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">平均普速定员</p>
                <p className="text-2xl font-bold">
                  {standards.length > 0 ? Math.round(
                    standards.reduce((sum, standard) => 
                      sum + (results[standard.id]?.conventional?.totalStaff || 0), 0
                    ) / standards.length
                  ) : 0}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">最大差异</p>
                <p className="text-2xl font-bold text-orange-600">
                  {standards.length > 0 ? (() => {
                    const totals = standards.map(s => results[s.id]?.conventional?.totalStaff || 0)
                    return Math.max(...totals) - Math.min(...totals)
                  })() : 0}
                </p>
              </div>
              <BarChart3 className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">匹配列车数</p>
                <p className="text-2xl font-bold text-green-600">
                  {standards.length > 0 ? Math.round(
                    standards.reduce((sum, standard) => {
                      const result = results[standard.id]
                      const total = result?.conventional?.details?.matchedTrains?.length || 0
                      return sum + total
                    }, 0) / standards.length
                  ) : 0}
                </p>
              </div>
              <Calculator className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 各标准普速定员对比 */}
      <Card>
        <CardHeader>
          <CardTitle>普速定员详细对比</CardTitle>
          <CardDescription>各标准下普速各岗位定员分布</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>标准名称</TableHead>
                  <TableHead>总定员</TableHead>
                  <TableHead>匹配车次</TableHead>
                  <TableHead>未匹配</TableHead>
                  <TableHead>覆盖率</TableHead>
                  <TableHead>主要岗位分布</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {standards.map(standard => {
                  const result = results[standard.id]
                  const conventionalResult = result?.conventional
                  
                  if (!conventionalResult) return null

                  const coverageRate = conventionalResult.details?.matchedTrains?.length && 
                    (conventionalResult.details.matchedTrains.length + conventionalResult.unmatchedCount) > 0 
                    ? conventionalResult.details.matchedTrains.length / 
                      (conventionalResult.details.matchedTrains.length + conventionalResult.unmatchedCount)
                    : 0

                  return (
                    <TableRow key={standard.id}>
                      <TableCell className="font-medium">{standard.name}</TableCell>
                      <TableCell className="font-medium">{conventionalResult.totalStaff}</TableCell>
                      <TableCell>{conventionalResult.details?.matchedTrains?.length || 0}</TableCell>
                      <TableCell className="text-amber-600">{conventionalResult.unmatchedCount}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-12 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-purple-600 h-2 rounded-full" 
                              style={{width: `${coverageRate * 100}%`}}
                            />
                          </div>
                          <span className="text-sm">{Math.round(coverageRate * 100)}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {conventionalResult.details?.positionSummary && 
                            Object.entries(conventionalResult.details.positionSummary)
                              .slice(0, 3)
                              .map(([position, count]) => (
                                <Badge key={position} variant="secondary" className="text-xs">
                                  {getPositionDisplayName(position)}: {count as number}
                                </Badge>
                              ))
                          }
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* 岗位定员对比 */}
      {allPositions.size > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>各岗位定员对比</CardTitle>
            <CardDescription>不同标准下各岗位的定员分布差异</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from(allPositions).map(position => (
                <Card key={position} className="p-4">
                  <h4 className="font-medium mb-3">{getPositionDisplayName(position)}</h4>
                  <div className="space-y-2">
                    {standards.map(standard => {
                      const result = results[standard.id]
                      const positionCount = result?.conventional?.details?.positionSummary?.[position] || 0
                      
                      return (
                        <div key={standard.id} className="flex justify-between items-center">
                          <span className="text-sm truncate flex-1 mr-2">{standard.name}</span>
                          <Badge variant={positionCount > 0 ? "default" : "secondary"}>
                            {positionCount}
                          </Badge>
                        </div>
                      )
                    })}
                  </div>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}


function ExportButtons() {
  const { comparisonResults, hasResults } = useMultiStandardComparison()
  const { standards } = useStaffingRules()

  const selectedStandardObjects = useMemo(() => 
    standards.filter(s => comparisonResults && Object.keys(comparisonResults).includes(s.id)),
    [standards, comparisonResults]
  )

  const handleExportExcel = () => {
    if (!comparisonResults || !hasResults) return

    const exporter = new MultiStandardExporter()
    exporter.exportComparisonReport(comparisonResults, selectedStandardObjects)
  }

  const handleExportJSON = () => {
    if (!comparisonResults || !hasResults) return

    const exporter = new MultiStandardExporter()
    exporter.generateJSONExport(comparisonResults, selectedStandardObjects)
  }

  const handleExportPDF = () => {
    if (!comparisonResults || !hasResults) return

    const exporter = new MultiStandardExporter()
    exporter.generatePDFReport(comparisonResults, selectedStandardObjects)
  }

  if (!hasResults) {
    return (
      <Button variant="outline" disabled className="gap-2">
        <Download className="w-4 h-4" />
        导出对比报告
      </Button>
    )
  }

  return (
    <div className="flex gap-2">
      <Button onClick={handleExportExcel} className="gap-2">
        <Download className="w-4 h-4" />
        导出Excel
      </Button>
      <Button variant="outline" onClick={handleExportJSON} className="gap-2">
        <Download className="w-4 h-4" />
        导出JSON
      </Button>
      <Button variant="outline" onClick={handleExportPDF} className="gap-2">
        <Download className="w-4 h-4" />
        生成PDF
      </Button>
    </div>
  )
}

function MultiStandardComparisonContent() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">多标准对比分析</h1>
          <p className="text-muted-foreground mt-1">
            同时使用多个局的标准进行定员测算对比，分析不同标准下的定员差异
          </p>
        </div>
        <ExportButtons />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <StandardSelector />
          <BureauSelector />
        </div>
        <div className="lg:col-span-2">
          <ComparisonResults />
        </div>
      </div>
    </div>
  )
}

export default function MultiStandardComparison() {
  return (
    <MultiStandardComparisonProvider>
      <MultiStandardComparisonContent />
    </MultiStandardComparisonProvider>
  )
}