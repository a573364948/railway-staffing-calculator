"use client"

import { useState, useMemo, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Search, Calculator, TrendingUp, Clock, 
  Train, Users, BarChart3, Target,
  ChevronDown, ChevronRight
} from "lucide-react"
import { DifferenceAnalyzer, type TrainDifference, type DifferenceStats } from "@/utils/difference-analyzer"
import type { ComparisonResult } from "@/contexts/multi-standard-comparison-context"
import type { StaffingStandard } from "@/types/staffing-rules"

interface DifferenceAnalysisProps {
  results: Record<string, ComparisonResult>
  standards: StaffingStandard[]
}

export function DifferenceAnalysis({ results, standards }: DifferenceAnalysisProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [severityFilter, setSeverityFilter] = useState<"all" | "high" | "medium" | "low">("all")
  const [typeFilter, setTypeFilter] = useState<"all" | "parameter_based" | "rule_based" | "match_status" | "coverage_gap">("all")
  const [expandedTrains, setExpandedTrains] = useState<Set<string>>(new Set())

  // 初始化差异分析器
  const analyzer = useMemo(() => new DifferenceAnalyzer(), [])

  // 分析差异数据
  const analysisData = useMemo(() => {
    // 调试信息
    console.log('=== 差异分析调试信息 ===')
    console.log('results 数量:', Object.keys(results).length)
    console.log('standards 数量:', standards.length)
    console.log('results 详情:', results)
    console.log('standards 详情:', standards)

    if (Object.keys(results).length === 0 || standards.length === 0) {
      console.log('跳过分析：缺少数据或标准')
      return {
        differences: [],
        stats: {
          totalTrainsAnalyzed: 0,
          trainsWithDifferences: 0,
          trainsWithoutDifferences: 0,
          severityDistribution: { high: 0, medium: 0, low: 0 },
          typeDistribution: { parameter_based: 0, rule_based: 0, match_status: 0, coverage_gap: 0 },
          averageDifference: 0,
          maxDifferenceFound: 0,
          medianDifference: 0
        } as DifferenceStats
      }
    }

    // 检查每个结果中的车次数据
    Object.keys(results).forEach(standardId => {
      const result = results[standardId]
      console.log(`标准 ${standardId}:`)
      console.log('  高铁 matchedTrains:', result?.highSpeed?.details?.matchedTrains?.length || 0)
      console.log('  普速 matchedTrains:', result?.conventional?.details?.matchedTrains?.length || 0)
      console.log('  高铁详情:', result?.highSpeed?.details)
      console.log('  普速详情:', result?.conventional?.details)
    })

    const analysisResult = analyzer.analyzeTrainDifferences(results, standards)
    console.log('分析结果:', analysisResult)
    return analysisResult
  }, [results, standards, analyzer])

  // 过滤和搜索
  const filteredDifferences = useMemo(() => {
    return analysisData.differences.filter(diff => {
      // 搜索过滤
      const matchesSearch = !searchTerm || 
        diff.trainNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        diff.formation.toLowerCase().includes(searchTerm.toLowerCase())

      // 严重程度过滤
      let matchesSeverity = true
      if (severityFilter !== "all") {
        const severity = diff.maxDifference > 20 ? "high" : 
                        diff.maxDifference >= 5 ? "medium" : "low"
        matchesSeverity = severity === severityFilter
      }

      // 差异类型过滤
      const matchesType = typeFilter === "all" || diff.differenceType === typeFilter

      return matchesSearch && matchesSeverity && matchesType
    })
  }, [analysisData.differences, searchTerm, severityFilter, typeFilter])

  const toggleTrainExpanded = (trainId: string) => {
    const newExpanded = new Set(expandedTrains)
    if (newExpanded.has(trainId)) {
      newExpanded.delete(trainId)
    } else {
      newExpanded.add(trainId)
    }
    setExpandedTrains(newExpanded)
  }

  const getSeverityColor = (difference: number) => {
    if (difference > 20) return "text-red-600 bg-red-50 border-red-200"
    if (difference >= 5) return "text-amber-600 bg-amber-50 border-amber-200"
    return "text-blue-600 bg-blue-50 border-blue-200"
  }

  const getSeverityLabel = (difference: number) => {
    if (difference > 20) return "高"
    if (difference >= 5) return "中"
    return "低"
  }

  const getTypeLabel = (type: TrainDifference['differenceType']) => {
    const labels = {
      parameter_based: "参数差异",
      rule_based: "规则差异", 
      match_status: "匹配状态差异",
      coverage_gap: "覆盖范围差异"
    }
    return labels[type]
  }

  const getTypeColor = (type: TrainDifference['differenceType']) => {
    const colors = {
      parameter_based: "bg-purple-100 text-purple-800",
      rule_based: "bg-green-100 text-green-800",
      match_status: "bg-orange-100 text-orange-800", 
      coverage_gap: "bg-gray-100 text-gray-800"
    }
    return colors[type]
  }

  return (
    <div className="space-y-6">
      {/* 统计概览 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2 text-base">
              <Calculator className="h-5 w-5 text-blue-500" />
              <span>已分析车次</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {analysisData.stats.totalTrainsAnalyzed}
            </div>
            <div className="text-sm text-muted-foreground">
              个车次参与对比
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2 text-base">
              <TrendingUp className="h-5 w-5 text-red-500" />
              <span>存在差异</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {analysisData.stats.trainsWithDifferences}
            </div>
            <div className="text-sm text-muted-foreground">
              个车次存在定员差异
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2 text-base">
              <Users className="h-5 w-5 text-amber-500" />
              <span>平均差异</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {analysisData.stats.averageDifference}
            </div>
            <div className="text-sm text-muted-foreground">
              人/车次
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2 text-base">
              <BarChart3 className="h-5 w-5 text-green-500" />
              <span>最大差异</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {analysisData.stats.maxDifferenceFound}
            </div>
            <div className="text-sm text-muted-foreground">
              人/车次
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 差异分布 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">差异严重程度分布</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm">高（&gt;20人）</span>
                <Badge variant="destructive">{analysisData.stats.severityDistribution.high}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">中（5-20人）</span>
                <Badge variant="secondary" className="bg-amber-100 text-amber-800">{analysisData.stats.severityDistribution.medium}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">低（1-5人）</span>
                <Badge variant="outline" className="text-blue-600">{analysisData.stats.severityDistribution.low}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">差异类型分布</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm">参数差异</span>
                <Badge className="bg-purple-100 text-purple-800">{analysisData.stats.typeDistribution.parameter_based}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">规则差异</span>
                <Badge className="bg-green-100 text-green-800">{analysisData.stats.typeDistribution.rule_based}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">匹配状态差异</span>
                <Badge className="bg-orange-100 text-orange-800">{analysisData.stats.typeDistribution.match_status}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">覆盖范围差异</span>
                <Badge className="bg-gray-100 text-gray-800">{analysisData.stats.typeDistribution.coverage_gap}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 差异车次列表 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Target className="h-5 w-5" />
              <span>差异车次详情</span>
            </CardTitle>
            <Badge variant="outline">
              {filteredDifferences.length} 个车次
            </Badge>
          </div>
          
          {/* 过滤控制 */}
          <div className="flex items-center space-x-4 mt-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索车次或编组..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={severityFilter} onValueChange={(value: typeof severityFilter) => setSeverityFilter(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部严重程度</SelectItem>
                <SelectItem value="high">高差异</SelectItem>
                <SelectItem value="medium">中差异</SelectItem>
                <SelectItem value="low">低差异</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={typeFilter} onValueChange={(value: typeof typeFilter) => setTypeFilter(value)}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部类型</SelectItem>
                <SelectItem value="parameter_based">参数差异</SelectItem>
                <SelectItem value="rule_based">规则差异</SelectItem>
                <SelectItem value="match_status">匹配状态差异</SelectItem>
                <SelectItem value="coverage_gap">覆盖范围差异</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-4">
            {filteredDifferences.map((diff) => (
              <div key={diff.trainId} className="border rounded-lg p-4">
                <div 
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => toggleTrainExpanded(diff.trainId)}
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      {expandedTrains.has(diff.trainId) ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      <Train className="h-4 w-4" />
                      <span className="font-medium">{diff.trainNumber}</span>
                    </div>
                    
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <span>{diff.formation}</span>
                      <span>•</span>
                      <span>{diff.runningTime}h</span>
                      <span>•</span>
                      <Badge variant="outline" className={diff.trainType === 'highSpeed' ? 'text-blue-600' : 'text-green-600'}>
                        {diff.trainType === 'highSpeed' ? '高铁' : '普速'}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Badge className={getTypeColor(diff.differenceType)}>
                      {getTypeLabel(diff.differenceType)}
                    </Badge>
                    <Badge className={`border ${getSeverityColor(diff.maxDifference)}`}>
                      {getSeverityLabel(diff.maxDifference)}差异 {diff.differenceRange}
                    </Badge>
                  </div>
                </div>
                
                {expandedTrains.has(diff.trainId) && (
                  <div className="mt-4 space-y-3">
                    <Alert>
                      <AlertDescription>
                        <strong>差异原因：</strong>{diff.differenceDescription}
                      </AlertDescription>
                    </Alert>
                    
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>标准</TableHead>
                          <TableHead className="text-center">定员总数</TableHead>
                          <TableHead className="text-center">匹配状态</TableHead>
                          <TableHead>匹配规则</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Object.entries(diff.standardResults).map(([standardId, result]) => (
                          <TableRow key={standardId}>
                            <TableCell className="font-medium">{result.standardName}</TableCell>
                            <TableCell className="text-center">
                              <span className={`font-bold ${
                                result.totalStaff === diff.minValue ? 'text-green-600' :
                                result.totalStaff === diff.maxValue ? 'text-red-600' :
                                'text-gray-600'
                              }`}>
                                {result.totalStaff}人
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant={result.isMatched ? "default" : "secondary"}>
                                {result.isMatched ? "已匹配" : "未匹配"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {result.matchedRule || "无匹配规则"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            ))}
            
            {filteredDifferences.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Train className="h-8 w-8 mx-auto mb-2" />
                <p>没有找到符合条件的差异车次</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}