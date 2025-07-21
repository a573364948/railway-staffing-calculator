"use client"

import { useState, useMemo } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Download, ChevronLeft, ChevronRight, Building2, Trash2 } from "lucide-react"
import { PageContainer } from "./page-container"
import { useTrainData } from "@/contexts/train-data-context"

import type { TrainType, TrainUnit } from "@/types/dynamic-train-data"
import { TRAIN_UNITS } from "@/types/dynamic-train-data"
import * as XLSX from "xlsx"

export function DisplayPage() {
  const { unitData, currentUnit, setCurrentUnit, clearUnitData, getUnitStats, isDataLoaded } = useTrainData()

  // 调试：打印实际数据结构
  console.log("=== 详细调试信息 ===")
  console.log("当前单位数据:", unitData[currentUnit])

  // 打印高铁数据的所有字段
  if (unitData[currentUnit]?.highSpeedData?.[0]) {
    console.log("高铁数据完整样例:", JSON.stringify(unitData[currentUnit].highSpeedData[0], null, 2))
    console.log("高铁数据字段列表:", Object.keys(unitData[currentUnit].highSpeedData[0]))
  }

  // 打印普速数据的所有字段
  if (unitData[currentUnit]?.conventionalData?.[0]) {
    console.log("普速数据完整样例:", JSON.stringify(unitData[currentUnit].conventionalData[0], null, 2))
    console.log("普速数据字段列表:", Object.keys(unitData[currentUnit].conventionalData[0]))
  }

  // 打印Schema的headers信息
  if (unitData[currentUnit]?.highSpeedSchema?.headers) {
    console.log("高铁Schema headers:", unitData[currentUnit].highSpeedSchema.headers.map(h => h.label))
  }

  if (unitData[currentUnit]?.conventionalSchema?.headers) {
    console.log("普速Schema headers:", unitData[currentUnit].conventionalSchema.headers.map(h => h.label))
  }

  const [activeTab, setActiveTab] = useState<TrainType>("highSpeed")
  const [currentPage, setCurrentPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState("")

  const itemsPerPage = 20

  // 获取当前单位的数据和表头结构
  const currentUnitData = unitData[currentUnit]
  const currentData = activeTab === "highSpeed" ? currentUnitData.highSpeedData : currentUnitData.conventionalData
  const currentSchema = activeTab === "highSpeed" ? currentUnitData.highSpeedSchema : currentUnitData.conventionalSchema

  // 获取统计信息
  const unitStats = getUnitStats()

  // 处理表格数据，按序号分组并计算rowspan
  const processedTableData = useMemo(() => {
    if (!currentData || currentData.length === 0) return { rows: [], mergeInfo: {} }

    // 按序号分组
    const groupedBySequence = currentData.reduce((acc, item) => {
      const sequence = item['序号'] || item['sequence'] || '未知'
      if (!acc[sequence]) {
        acc[sequence] = []
      }
      acc[sequence].push(item)
      return acc
    }, {} as Record<string, any[]>)

    // 排序并生成表格行数据
    const sortedGroups = Object.entries(groupedBySequence).sort(([a], [b]) => {
      const seqA = parseInt(a || '0')
      const seqB = parseInt(b || '0')
      return seqA - seqB
    })

    const rows: any[] = []
    const mergeInfo: Record<number, Record<string, { rowspan: number; isFirst: boolean }>> = {}

    sortedGroups.forEach(([sequence, items]) => {
      items.forEach((item, itemIndex) => {
        const rowIndex = rows.length
        rows.push(item)

        // 初始化合并信息
        mergeInfo[rowIndex] = {}

        // 为每个字段计算合并信息
        if (currentSchema?.headers) {
          currentSchema.headers.forEach(header => {
            const fieldKey = header.label

            if (itemIndex === 0) {
              // 检查这个字段在当前序号组内是否所有值都相同
              const values = items.map(i => i[fieldKey])
              const uniqueValues = [...new Set(values.filter(v => v !== null && v !== undefined && v !== ''))]

              if (uniqueValues.length <= 1) {
                // 值相同，需要合并
                mergeInfo[rowIndex][fieldKey] = {
                  rowspan: items.length,
                  isFirst: true
                }
              } else {
                // 值不同，不合并
                mergeInfo[rowIndex][fieldKey] = {
                  rowspan: 1,
                  isFirst: true
                }
              }
            } else {
              // 非第一行，检查是否需要隐藏（被合并）
              const firstRowValues = items.map(i => i[fieldKey])
              const uniqueValues = [...new Set(firstRowValues.filter(v => v !== null && v !== undefined && v !== ''))]

              if (uniqueValues.length <= 1) {
                // 被合并，隐藏此单元格
                mergeInfo[rowIndex][fieldKey] = {
                  rowspan: 0,
                  isFirst: false
                }
              } else {
                // 不合并，正常显示
                mergeInfo[rowIndex][fieldKey] = {
                  rowspan: 1,
                  isFirst: true
                }
              }
            }
          })
        }
      })
    })

    return { rows, mergeInfo }
  }, [currentData, currentSchema])

  // 搜索过滤
  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return processedTableData.rows

    const searchLower = searchTerm.toLowerCase()

    return processedTableData.rows.filter((item) => {
      return Object.values(item).some((value) => {
        if (value === null || value === undefined) return false
        return String(value).toLowerCase().includes(searchLower)
      })
    })
  }, [searchTerm, processedTableData.rows])

  // 分页数据和合并信息
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const pageData = filteredData.slice(startIndex, startIndex + itemsPerPage)

    // 重新计算分页后的合并信息
    const pageMergeInfo: Record<number, Record<string, { rowspan: number; isFirst: boolean }>> = {}

    // 按序号重新分组分页后的数据
    const pageGroupedBySequence = pageData.reduce((acc, item, index) => {
      const sequence = item['序号'] || item['sequence'] || '未知'
      if (!acc[sequence]) {
        acc[sequence] = []
      }
      acc[sequence].push({ item, pageIndex: index })
      return acc
    }, {} as Record<string, Array<{ item: any; pageIndex: number }>>)

    // 为分页数据重新计算合并信息
    Object.entries(pageGroupedBySequence).forEach(([sequence, pageItems]) => {
      pageItems.forEach(({ item, pageIndex }, itemIndex) => {
        pageMergeInfo[pageIndex] = {}

        if (currentSchema?.headers) {
          currentSchema.headers.forEach(header => {
            const fieldKey = header.label

            if (itemIndex === 0) {
              // 检查这个字段在当前序号组内是否所有值都相同
              const values = pageItems.map(pi => pi.item[fieldKey])
              const uniqueValues = [...new Set(values.filter(v => v !== null && v !== undefined && v !== ''))]

              if (uniqueValues.length <= 1) {
                // 值相同，需要合并
                pageMergeInfo[pageIndex][fieldKey] = {
                  rowspan: pageItems.length,
                  isFirst: true
                }
              } else {
                // 值不同，不合并
                pageMergeInfo[pageIndex][fieldKey] = {
                  rowspan: 1,
                  isFirst: true
                }
              }
            } else {
              // 非第一行，检查是否需要隐藏（被合并）
              const firstRowValues = pageItems.map(pi => pi.item[fieldKey])
              const uniqueValues = [...new Set(firstRowValues.filter(v => v !== null && v !== undefined && v !== ''))]

              if (uniqueValues.length <= 1) {
                // 被合并，隐藏此单元格
                pageMergeInfo[pageIndex][fieldKey] = {
                  rowspan: 0,
                  isFirst: false
                }
              } else {
                // 不合并，正常显示
                pageMergeInfo[pageIndex][fieldKey] = {
                  rowspan: 1,
                  isFirst: true
                }
              }
            }
          })
        }
      })
    })

    return { data: pageData, mergeInfo: pageMergeInfo }
  }, [filteredData, currentPage, currentSchema])

  const totalPages = Math.ceil(filteredData.length / itemsPerPage)

  const handleUnitChange = (unit: TrainUnit) => {
    setCurrentUnit(unit)
    setCurrentPage(1)
    setSearchTerm("")
  }

  const handleTabChange = (value: string) => {
    setActiveTab(value as TrainType)
    setCurrentPage(1)
    setSearchTerm("")
  }

  const exportToExcel = () => {
    if (!currentSchema || currentData.length === 0) return

    const exportData = currentData.map((item) => {
      const exportItem: any = {}
      currentSchema.headers.forEach((header) => {
        exportItem[header.label] = item[header.label] || ""
      })
      return exportItem
    })

    const worksheet = XLSX.utils.json_to_sheet(exportData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      `${TRAIN_UNITS[currentUnit]}-${activeTab === "highSpeed" ? "高铁" : "普速"}`,
    )
    XLSX.writeFile(workbook, `${TRAIN_UNITS[currentUnit]}-${activeTab === "highSpeed" ? "高铁" : "普速"}运行图数据.xlsx`)
  }

  const handleClearData = (type?: TrainType) => {
    if (
      confirm(
        `确定要清空${TRAIN_UNITS[currentUnit]}的${type ? (type === "highSpeed" ? "高铁" : "普速") : "所有"}数据吗？`,
      )
    ) {
      clearUnitData(currentUnit, type)
    }
  }

  const pageActions = (
    <>
      <Button variant="outline" onClick={exportToExcel} disabled={currentData.length === 0}>
        <Download className="h-4 w-4 mr-2" />
        导出Excel
      </Button>
      <Button variant="outline" onClick={() => handleClearData(activeTab)} disabled={currentData.length === 0}>
        <Trash2 className="h-4 w-4 mr-2" />
        清空当前数据
      </Button>
    </>
  )

  return (
    <PageContainer title="数据展示" description="运行图数据管理和展示，支持多单位数据查看和操作" actions={pageActions}>
      <div className="space-y-6">
        {/* 单位选择和统计 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Building2 className="h-5 w-5" />
              <span>客运段数据统计</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              {unitStats.map((stat) => (
                <div
                  key={stat.unit}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    currentUnit === stat.unit ? "border-primary bg-primary/5" : "border-gray-200 hover:border-gray-300"
                  }`}
                  onClick={() => handleUnitChange(stat.unit)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium">{stat.unitName}</h3>
                    <Badge variant={currentUnit === stat.unit ? "default" : "outline"}>{stat.totalCount} 条</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <span>高铁: {stat.highSpeedCount}</span>
                    <span>普速: {stat.conventionalCount}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">当前选择：</span>
                <Select value={currentUnit} onValueChange={(value) => handleUnitChange(value as TrainUnit)}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beijing">{TRAIN_UNITS.beijing}</SelectItem>
                    <SelectItem value="shijiazhuang">{TRAIN_UNITS.shijiazhuang}</SelectItem>
                    <SelectItem value="tianjin">{TRAIN_UNITS.tianjin}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 数据展示 */}
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="highSpeed" className="flex items-center space-x-2">
              <span>高铁运行图</span>
              <Badge variant="secondary">{currentUnitData.highSpeedData.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="conventional" className="flex items-center space-x-2">
              <span>普速运行图</span>
              <Badge variant="secondary">{currentUnitData.conventionalData.length}</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="space-y-6">
            {currentSchema ? (
              <>
                {/* 搜索栏 */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-4">
                      <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="搜索所有字段..."
                          value={searchTerm}
                          onChange={(e) => {
                            setSearchTerm(e.target.value)
                            setCurrentPage(1)
                          }}
                          className="pl-10"
                        />
                      </div>

                      <Badge variant="outline">{currentSchema.headers.length} 个字段</Badge>
                      <Badge variant="outline">{filteredData.length} 条记录</Badge>
                      {isDataLoaded && (
                        <Badge variant="secondary" className="text-theme-secondary">
                          数据已保存
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* 数据表格 */}
                {paginatedData.data.length > 0 ? (
                  <Card>
                    <CardHeader>
                      <CardTitle>
                        {TRAIN_UNITS[currentUnit]} - {activeTab === "highSpeed" ? "高铁运行图数据" : "普速运行图数据"}
                        {searchTerm && ` - 搜索结果`}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              {currentSchema.headers.map((header) => (
                                <TableHead
                                  key={header.key}
                                  className={header.isRequired ? "font-bold text-primary" : ""}
                                >
                                  {header.label}
                                  {header.isRequired && <span className="text-red-500 ml-1">*</span>}
                                </TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {paginatedData.data.map((row, index) => (
                              <TableRow
                                key={row.id || index}
                                className="hover:bg-gray-50"
                              >
                                {currentSchema.headers.map((header) => {
                                  const fieldKey = header.label
                                  const mergeInfo = paginatedData.mergeInfo[index]?.[fieldKey]

                                  // 如果rowspan为0，说明这个单元格被合并了，不渲染
                                  if (mergeInfo && mergeInfo.rowspan === 0) {
                                    return null
                                  }

                                  return (
                                    <TableCell
                                      key={header.key}
                                      className={`${header.isRequired ? "font-medium" : ""} ${mergeInfo?.rowspan > 1 ? "border-r border-gray-200" : ""}`}
                                      rowSpan={mergeInfo?.rowspan || 1}
                                    >
                                      <div className="max-w-32 truncate" title={row[header.label] || ""}>
                                        {row[header.label] || "-"}
                                      </div>
                                    </TableCell>
                                  )
                                })}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>

                      {/* 分页控件 */}
                      <div className="flex items-center justify-between mt-4">
                        <div className="text-sm text-gray-500">
                          第 {currentPage} 页，共 {totalPages} 页，显示 {filteredData.length} 条记录
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(currentPage - 1)}
                            disabled={currentPage <= 1}
                          >
                            <ChevronLeft className="h-4 w-4" />
                            上一页
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(currentPage + 1)}
                            disabled={currentPage >= totalPages}
                          >
                            下一页
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="text-center py-12 text-gray-500">
                      {currentData.length === 0
                        ? `${TRAIN_UNITS[currentUnit]}暂无${activeTab === "highSpeed" ? "高铁" : "普速"}数据，请先导入数据`
                        : "没有符合搜索条件的数据"}
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <Card>
                <CardContent className="text-center py-12 text-gray-500">
                  <p>{TRAIN_UNITS[currentUnit]}暂无数据，请先导入Excel文件</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </PageContainer>
  )
}
