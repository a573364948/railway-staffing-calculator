"use client"

import React, { useState, useMemo } from "react"
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
import { 
  RefreshCw, Search, Filter, ChevronDown, ChevronRight,
  Users, Building, Calculator, CheckCircle, XCircle, 
  Clock, AlertTriangle, TrendingUp, Download
} from "lucide-react"
import type { BureauStaffingStats } from "@/types/data-statistics"

interface BureauStaffingTableProps {
  bureauStats: BureauStaffingStats[]
  onRefresh: () => void
}

export function BureauStaffingTable({ bureauStats, onRefresh }: BureauStaffingTableProps) {
  const [expandedBureaus, setExpandedBureaus] = useState<Set<string>>(new Set())
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState<"all" | "completed" | "incomplete">("all")
  const [sortBy, setSortBy] = useState<"name" | "total" | "completion">("name")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")

  // 过滤和排序数据
  const filteredAndSortedData = useMemo(() => {
    let filtered = bureauStats.filter(bureau => {
      const matchesSearch = bureau.bureauName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           bureau.units.some(unit => unit.unitName.toLowerCase().includes(searchTerm.toLowerCase()))
      
      const matchesFilter = filterStatus === "all" || 
                           (filterStatus === "completed" && bureau.calculationStatus.percentage === 100) ||
                           (filterStatus === "incomplete" && bureau.calculationStatus.percentage < 100)
      
      return matchesSearch && matchesFilter
    })

    // 排序
    filtered.sort((a, b) => {
      let aValue: any, bValue: any
      
      switch (sortBy) {
        case "name":
          aValue = a.bureauName
          bValue = b.bureauName
          break
        case "total":
          aValue = a.totals.grandTotal
          bValue = b.totals.grandTotal
          break
        case "completion":
          aValue = a.calculationStatus.percentage
          bValue = b.calculationStatus.percentage
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
  }, [bureauStats, searchTerm, filterStatus, sortBy, sortOrder])

  const toggleBureauExpansion = (bureauId: string) => {
    setExpandedBureaus(prev => {
      const newSet = new Set(prev)
      if (newSet.has(bureauId)) {
        newSet.delete(bureauId)
      } else {
        newSet.add(bureauId)
      }
      return newSet
    })
  }

  const getStatusIcon = (unit: BureauStaffingStats['units'][0]) => {
    const isCompleted = Object.values(unit.isCalculated).every(Boolean)
    return isCompleted ? (
      <CheckCircle className="h-4 w-4 text-green-600" />
    ) : (
      <XCircle className="h-4 w-4 text-red-600" />
    )
  }

  const getStatusBadge = (percentage: number) => {
    if (percentage === 100) {
      return <Badge variant="default" className="bg-green-600">已完成</Badge>
    } else if (percentage > 0) {
      return <Badge variant="secondary">进行中</Badge>
    } else {
      return <Badge variant="destructive">未开始</Badge>
    }
  }

  const formatNumber = (num: number) => {
    return num.toLocaleString()
  }

  const calculateGrandTotals = (data: BureauStaffingStats[]) => {
    return data.reduce((acc, bureau) => ({
      highSpeed: acc.highSpeed + bureau.totals.highSpeed,
      conventional: acc.conventional + bureau.totals.conventional,
      otherProduction: acc.otherProduction + bureau.totals.otherProduction,
      grandTotal: acc.grandTotal + bureau.totals.grandTotal
    }), { highSpeed: 0, conventional: 0, otherProduction: 0, grandTotal: 0 })
  }

  const grandTotals = calculateGrandTotals(filteredAndSortedData)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Building className="h-5 w-5" />
            <span>路局定员统计</span>
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
              placeholder="搜索路局或客运段..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={filterStatus} onValueChange={(value: typeof filterStatus) => setFilterStatus(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部</SelectItem>
              <SelectItem value="completed">已完成</SelectItem>
              <SelectItem value="incomplete">未完成</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={sortBy} onValueChange={(value: typeof sortBy) => setSortBy(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">按名称</SelectItem>
              <SelectItem value="total">按总数</SelectItem>
              <SelectItem value="completion">按完成度</SelectItem>
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
        <div className="space-y-4">
          {/* 总计行 */}
          <div className="bg-muted/50 p-4 rounded-lg">
            <div className="grid grid-cols-6 gap-4 text-sm font-medium">
              <div>总计</div>
              <div className="text-blue-600">{formatNumber(grandTotals.highSpeed)}</div>
              <div className="text-green-600">{formatNumber(grandTotals.conventional)}</div>
              <div className="text-orange-600">{formatNumber(grandTotals.otherProduction)}</div>
              <div className="text-purple-600 font-bold">{formatNumber(grandTotals.grandTotal)}</div>
              <div></div>
            </div>
          </div>

          {/* 表格 */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>路局/客运段</TableHead>
                <TableHead className="text-center">高铁定员</TableHead>
                <TableHead className="text-center">普速定员</TableHead>
                <TableHead className="text-center">其余生产</TableHead>
                <TableHead className="text-center">总定员</TableHead>
                <TableHead className="text-center">状态</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedData.map((bureau) => (
                <React.Fragment key={bureau.bureauId}>
                  {/* 路局汇总行 */}
                  <TableRow 
                    className="cursor-pointer hover:bg-muted/50 font-medium"
                    onClick={() => toggleBureauExpansion(bureau.bureauId)}
                  >
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {expandedBureaus.has(bureau.bureauId) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                        <Building className="h-4 w-4" />
                        <span className="font-semibold">{bureau.bureauName}</span>
                        <Badge variant="outline" className="ml-2">
                          {bureau.units.length} 个客运段
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-semibold text-blue-600">
                      {formatNumber(bureau.totals.highSpeed)}
                    </TableCell>
                    <TableCell className="text-center font-semibold text-green-600">
                      {formatNumber(bureau.totals.conventional)}
                    </TableCell>
                    <TableCell className="text-center font-semibold text-orange-600">
                      {formatNumber(bureau.totals.otherProduction)}
                    </TableCell>
                    <TableCell className="text-center font-bold text-purple-600">
                      {formatNumber(bureau.totals.grandTotal)}
                    </TableCell>
                    <TableCell className="text-center">
                      {getStatusBadge(bureau.calculationStatus.percentage)}
                    </TableCell>
                  </TableRow>
                  
                  {/* 客运段详细行 */}
                  {expandedBureaus.has(bureau.bureauId) && bureau.units.map((unit) => (
                    <TableRow key={unit.unitKey} className="bg-muted/20">
                      <TableCell className="pl-12">
                        <div className="flex items-center space-x-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span>{unit.unitName}</span>
                          {getStatusIcon(unit)}
                        </div>
                      </TableCell>
                      <TableCell className="text-center text-blue-600">
                        {unit.isCalculated.highSpeed ? formatNumber(unit.staffing.highSpeed) : "-"}
                      </TableCell>
                      <TableCell className="text-center text-green-600">
                        {unit.isCalculated.conventional ? formatNumber(unit.staffing.conventional) : "-"}
                      </TableCell>
                      <TableCell className="text-center text-orange-600">
                        {unit.isCalculated.otherProduction ? formatNumber(unit.staffing.otherProduction) : "-"}
                      </TableCell>
                      <TableCell className="text-center text-purple-600">
                        {formatNumber(unit.staffing.total)}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center space-x-1">
                          {unit.isCalculated.highSpeed && (
                            <Badge variant="outline" className="text-xs">高铁</Badge>
                          )}
                          {unit.isCalculated.conventional && (
                            <Badge variant="outline" className="text-xs">普速</Badge>
                          )}
                          {unit.isCalculated.otherProduction && (
                            <Badge variant="outline" className="text-xs">其余</Badge>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
          
          {filteredAndSortedData.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
              <p>没有找到符合条件的数据</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}