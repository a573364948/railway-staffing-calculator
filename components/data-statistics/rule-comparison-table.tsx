"use client"

import { useState, useMemo } from "react"
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
  RefreshCw, Search, Settings, AlertTriangle, 
  Clock, Users, TrendingUp, Building, 
  CheckCircle, XCircle, Target, Calculator
} from "lucide-react"
import type { RuleComparisonData } from "@/types/data-statistics"

interface RuleComparisonTableProps {
  ruleComparisons: RuleComparisonData[]
  onRefresh: () => void
}

export function RuleComparisonTable({ ruleComparisons, onRefresh }: RuleComparisonTableProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [showDifferencesOnly, setShowDifferencesOnly] = useState(false)
  const [sortBy, setSortBy] = useState<"name" | "workHours" | "totalRules">("name")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")

  // 分析规则差异
  const analysisResults = useMemo(() => {
    if (ruleComparisons.length === 0) return { differences: [], commonalities: [] }

    const differences: Array<{
      field: string
      description: string
      values: Array<{ bureau: string; value: any }>
    }> = []

    const commonalities: Array<{
      field: string
      description: string
      commonValue: any
    }> = []

    // 分析预备率差异
    const beijingRates = ruleComparisons.map(r => r.reserveRates.mainProduction.beijing)
    const shijiazhuangRates = ruleComparisons.map(r => r.reserveRates.mainProduction.shijiazhuang)
    const tianjinRates = ruleComparisons.map(r => r.reserveRates.mainProduction.tianjin)
    const otherRates = ruleComparisons.map(r => r.reserveRates.otherProduction)

    if (new Set(beijingRates).size > 1) {
      differences.push({
        field: "beijingReserveRate",
        description: "北京客运段预备率",
        values: ruleComparisons.map(r => ({
          bureau: r.bureauName,
          value: r.reserveRates.mainProduction.beijing + "%"
        }))
      })
    } else {
      commonalities.push({
        field: "beijingReserveRate",
        description: "北京客运段预备率",
        commonValue: beijingRates[0] + "%"
      })
    }

    if (new Set(shijiazhuangRates).size > 1) {
      differences.push({
        field: "shijiazhuangReserveRate",
        description: "石家庄客运段预备率",
        values: ruleComparisons.map(r => ({
          bureau: r.bureauName,
          value: r.reserveRates.mainProduction.shijiazhuang + "%"
        }))
      })
    } else {
      commonalities.push({
        field: "shijiazhuangReserveRate",
        description: "石家庄客运段预备率",
        commonValue: shijiazhuangRates[0] + "%"
      })
    }

    if (new Set(tianjinRates).size > 1) {
      differences.push({
        field: "tianjinReserveRate",
        description: "天津客运段预备率",
        values: ruleComparisons.map(r => ({
          bureau: r.bureauName,
          value: r.reserveRates.mainProduction.tianjin + "%"
        }))
      })
    } else {
      commonalities.push({
        field: "tianjinReserveRate",
        description: "天津客运段预备率",
        commonValue: tianjinRates[0] + "%"
      })
    }

    if (new Set(otherRates).size > 1) {
      differences.push({
        field: "otherReserveRate",
        description: "其余生产预备率",
        values: ruleComparisons.map(r => ({
          bureau: r.bureauName,
          value: r.reserveRates.otherProduction + "%"
        }))
      })
    } else {
      commonalities.push({
        field: "otherReserveRate",
        description: "其余生产预备率",
        commonValue: otherRates[0] + "%"
      })
    }

    // 分析标准工时差异
    const workHours = ruleComparisons.map(r => r.standardWorkHours)
    if (new Set(workHours).size > 1) {
      differences.push({
        field: "workHours",
        description: "标准工时",
        values: ruleComparisons.map(r => ({
          bureau: r.bureauName,
          value: r.standardWorkHours + "h"
        }))
      })
    } else {
      commonalities.push({
        field: "workHours",
        description: "标准工时",
        commonValue: workHours[0] + "h"
      })
    }

    return { differences, commonalities }
  }, [ruleComparisons])

  // 过滤和排序数据
  const filteredAndSortedData = useMemo(() => {
    let filtered = ruleComparisons.filter(rule => {
      const matchesSearch = rule.bureauName.toLowerCase().includes(searchTerm.toLowerCase())
      
      if (showDifferencesOnly) {
        // 只显示有差异的规则
        return matchesSearch && analysisResults.differences.some(diff => 
          diff.values.some(v => v.bureau === rule.bureauName)
        )
      }
      
      return matchesSearch
    })

    // 排序
    filtered.sort((a, b) => {
      let aValue: any, bValue: any
      
      switch (sortBy) {
        case "name":
          aValue = a.bureauName
          bValue = b.bureauName
          break
        case "workHours":
          aValue = a.standardWorkHours
          bValue = b.standardWorkHours
          break
        case "totalRules":
          aValue = a.highSpeedRules.totalRules + a.conventionalRules.totalRules + a.otherProductionRules.totalRules
          bValue = b.highSpeedRules.totalRules + b.conventionalRules.totalRules + b.otherProductionRules.totalRules
          break
        default:
          return 0
      }

      if (typeof aValue === "string") {
        return sortOrder === "asc" ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue)
      } else {
        return sortOrder === "asc" ? aValue - bValue : bValue - aValue
      }
    })

    return filtered
  }, [ruleComparisons, searchTerm, showDifferencesOnly, sortBy, sortOrder, analysisResults])

  const getDifferenceIndicator = (field: string, bureau: string) => {
    const difference = analysisResults.differences.find(d => d.field === field)
    if (!difference) return null
    
    const values = difference.values.map(v => v.value)
    const uniqueValues = [...new Set(values)]
    
    if (uniqueValues.length <= 1) return null
    
    return (
      <AlertTriangle className="h-3 w-3 text-amber-500 ml-1" />
    )
  }

  return (
    <div className="space-y-6">
      {/* 差异分析概览 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2 text-base">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <span>规则差异项</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold text-amber-600">
                {analysisResults.differences.length}
              </div>
              <div className="text-sm text-muted-foreground">
                个字段在各路局间存在差异
              </div>
              {analysisResults.differences.length > 0 && (
                <div className="text-xs text-muted-foreground">
                  {analysisResults.differences.map(d => d.description).join(", ")}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2 text-base">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span>规则一致项</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold text-green-600">
                {analysisResults.commonalities.length}
              </div>
              <div className="text-sm text-muted-foreground">
                个字段在各路局间保持一致
              </div>
              {analysisResults.commonalities.length > 0 && (
                <div className="text-xs text-muted-foreground">
                  {analysisResults.commonalities.map(c => c.description).join(", ")}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 规则对比表 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Settings className="h-5 w-5" />
              <span>规则对比分析</span>
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Badge variant="outline">
                {filteredAndSortedData.length} 个路局
              </Badge>
              <Button onClick={onRefresh} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-1" />
                刷新
              </Button>
            </div>
          </div>
          
          {/* 搜索和过滤栏 */}
          <div className="flex items-center space-x-4 mt-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索路局..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="showDifferencesOnly"
                checked={showDifferencesOnly}
                onChange={(e) => setShowDifferencesOnly(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="showDifferencesOnly" className="text-sm">
                只显示差异项
              </label>
            </div>
            
            <Select value={sortBy} onValueChange={(value: typeof sortBy) => setSortBy(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">按名称</SelectItem>
                <SelectItem value="workHours">按工时</SelectItem>
                <SelectItem value="totalRules">按规则数</SelectItem>
              </SelectContent>
            </Select>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
            >
              {sortOrder === "asc" ? "↑" : "↓"}
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>路局名称</TableHead>
                <TableHead className="text-center">预备率(北京)</TableHead>
                <TableHead className="text-center">预备率(石家庄)</TableHead>
                <TableHead className="text-center">预备率(天津)</TableHead>
                <TableHead className="text-center">其余生产预备率</TableHead>
                <TableHead className="text-center">标准工时</TableHead>
                <TableHead className="text-center">高铁规则</TableHead>
                <TableHead className="text-center">普速规则</TableHead>
                <TableHead className="text-center">其余生产规则</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedData.map((rule) => (
                <TableRow key={rule.bureauId}>
                  <TableCell className="font-medium">
                    <div className="flex items-center space-x-2">
                      <Building className="h-4 w-4" />
                      <span>{rule.bureauName}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center">
                      <span>{rule.reserveRates.mainProduction.beijing}%</span>
                      {getDifferenceIndicator("beijingReserveRate", rule.bureauName)}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center">
                      <span>{rule.reserveRates.mainProduction.shijiazhuang}%</span>
                      {getDifferenceIndicator("shijiazhuangReserveRate", rule.bureauName)}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center">
                      <span>{rule.reserveRates.mainProduction.tianjin}%</span>
                      {getDifferenceIndicator("tianjinReserveRate", rule.bureauName)}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center">
                      <span>{rule.reserveRates.otherProduction}%</span>
                      {getDifferenceIndicator("otherReserveRate", rule.bureauName)}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center">
                      <span>{rule.standardWorkHours}h</span>
                      {getDifferenceIndicator("workHours", rule.bureauName)}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center space-x-1">
                      <span className="text-blue-600">{rule.highSpeedRules.totalRules}</span>
                      <span className="text-xs text-muted-foreground">条</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center space-x-1">
                      <span className="text-green-600">{rule.conventionalRules.totalRules}</span>
                      <span className="text-xs text-muted-foreground">条</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center space-x-1">
                      <span className="text-orange-600">{rule.otherProductionRules.totalRules}</span>
                      <span className="text-xs text-muted-foreground">条</span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {filteredAndSortedData.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
              <p>没有找到符合条件的数据</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 详细差异分析 */}
      {analysisResults.differences.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Target className="h-5 w-5" />
              <span>详细差异分析</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analysisResults.differences.map((difference, index) => (
                <Alert key={index}>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <div className="font-medium">{difference.description}</div>
                      <div className="text-sm">
                        {difference.values.map((v, i) => (
                          <span key={i} className="inline-block mr-4">
                            <strong>{v.bureau}:</strong> {v.value}
                          </span>
                        ))}
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}