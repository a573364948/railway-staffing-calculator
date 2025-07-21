"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Info, Eye, EyeOff, Grid } from "lucide-react"
import { FieldMappingPreview } from "./field-mapping-preview"
import { MergedCellsPreview } from "./merged-cells-preview"
import type { TrainType } from "@/types/train-data"

interface MergedCellInfo {
  startRow: number
  endRow: number
  startCol: number
  endCol: number
  rowSpan: number
  colSpan: number
}

interface HeaderConfigProps {
  headerRowCount: number
  onHeaderRowCountChange: (count: number) => void
  excelData?: any[][]
  mergedCells?: MergedCellInfo[]
  trainType: TrainType
}

export function HeaderConfig({
  headerRowCount,
  onHeaderRowCountChange,
  excelData,
  mergedCells = [],
  trainType,
}: HeaderConfigProps) {
  const [localCount, setLocalCount] = useState(headerRowCount.toString())
  const [showPreview, setShowPreview] = useState(true)
  const [showMergedCells, setShowMergedCells] = useState(mergedCells.length > 0)

  const handleApply = () => {
    const count = Number.parseInt(localCount)
    if (!isNaN(count) && count >= 0 && count <= 10) {
      onHeaderRowCountChange(count)
    }
  }

  // 获取表头预览数据
  const getHeaderPreview = () => {
    if (!excelData || excelData.length === 0) return []
    const previewRowCount = Math.min(Math.max(Number.parseInt(localCount) || 3, 1), excelData.length)
    return excelData.slice(0, previewRowCount)
  }

  // 获取数据行预览（用于对比）
  const getDataPreview = () => {
    if (!excelData || excelData.length === 0) return []
    const headerCount = Number.parseInt(localCount) || 3
    return excelData.slice(headerCount, headerCount + 2) // 显示前2行数据
  }

  // 获取当前选择的表头行（用作字段名）
  const getCurrentHeaders = () => {
    if (!excelData || excelData.length === 0) return []
    const headerCount = Number.parseInt(localCount) || 3
    if (headerCount > excelData.length) return []
    return excelData[headerCount - 1] || []
  }

  const currentHeaders = getCurrentHeaders()
  const headerPreview = getHeaderPreview()
  const dataPreview = getDataPreview()

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">表头配置</CardTitle>
            <div className="flex items-center space-x-2">
              {mergedCells.length > 0 && (
                <Badge variant="outline" className="flex items-center space-x-1">
                  <Grid className="h-3 w-3" />
                  <span>{mergedCells.length} 个合并区域</span>
                </Badge>
              )}
              {excelData && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPreview(!showPreview)}
                  className="flex items-center space-x-2"
                >
                  {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  <span>{showPreview ? "隐藏" : "显示"}预览</span>
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex items-start space-x-4">
            <div className="flex-1 space-y-2">
              <Label htmlFor="headerRowCount">表头行数</Label>
              <div className="flex space-x-2">
                <Input
                  id="headerRowCount"
                  type="number"
                  min="0"
                  max="10"
                  value={localCount}
                  onChange={(e) => setLocalCount(e.target.value)}
                  className="w-24"
                />
                <Button onClick={handleApply} variant="secondary">
                  应用
                </Button>
              </div>
            </div>
            <div className="bg-blue-50 p-3 rounded-md flex-1">
              <div className="flex items-start space-x-2">
                <Info className="h-5 w-5 text-blue-500 mt-0.5" />
                <div className="text-sm text-blue-700">
                  <p className="font-medium">表头说明</p>
                  <p className="mt-1">
                    设置表头行数，系统将跳过这些行，并使用最后一行表头作为字段名。
                    {mergedCells.length > 0 && "已自动处理合并单元格。"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 表头预览 */}
          {showPreview && excelData && excelData.length > 0 && (
            <div className="space-y-4">
              <div className="border-t pt-4">
                <h4 className="font-medium mb-3 flex items-center space-x-2">
                  <span>表头预览</span>
                  <Badge variant="outline">前{headerPreview.length}行</Badge>
                </h4>

                <div className="border rounded-md overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="w-16">行号</TableHead>
                        <TableHead>内容</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {headerPreview.map((row, rowIndex) => (
                        <TableRow
                          key={rowIndex}
                          className={rowIndex === headerPreview.length - 1 ? "bg-theme-accent border-theme-secondary" : ""}
                        >
                          <TableCell className="font-medium">
                            <div className="flex items-center space-x-2">
                              <span>{rowIndex + 1}</span>
                              {rowIndex === headerPreview.length - 1 && (
                                <Badge variant="secondary" className="text-xs">
                                  字段名
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1 max-w-4xl">
                              {row.slice(0, 15).map((cell, cellIndex) => (
                                <Badge
                                  key={cellIndex}
                                  variant={rowIndex === headerPreview.length - 1 ? "default" : "outline"}
                                  className="text-xs max-w-32 truncate"
                                  title={cell || "空"}
                                >
                                  {cell || "空"}
                                </Badge>
                              ))}
                              {row.length > 15 && (
                                <Badge variant="outline" className="text-xs">
                                  ...还有{row.length - 15}列
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* 数据行预览 */}
              {dataPreview.length > 0 && (
                <div>
                  <h4 className="font-medium mb-3 flex items-center space-x-2">
                    <span>数据行预览</span>
                    <Badge variant="outline">
                      第{(Number.parseInt(localCount) || 3) + 1}-
                      {(Number.parseInt(localCount) || 3) + dataPreview.length}行
                    </Badge>
                  </h4>

                  <div className="border rounded-md overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-theme-surface">
                          <TableHead className="w-16">行号</TableHead>
                          <TableHead>内容</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dataPreview.map((row, rowIndex) => (
                          <TableRow key={rowIndex} className="bg-theme-surface">
                            <TableCell className="font-medium">
                              <div className="flex items-center space-x-2">
                                <span>{(Number.parseInt(localCount) || 3) + rowIndex + 1}</span>
                                <Badge variant="secondary" className="text-xs">
                                  数据
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1 max-w-4xl">
                                {row.slice(0, 15).map((cell, cellIndex) => (
                                  <Badge
                                    key={cellIndex}
                                    variant="secondary"
                                    className="text-xs max-w-32 truncate"
                                    title={cell || "空"}
                                  >
                                    {cell || "空"}
                                  </Badge>
                                ))}
                                {row.length > 15 && (
                                  <Badge variant="outline" className="text-xs">
                                    ...还有{row.length - 15}列
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* 字段映射提示 */}
              {headerPreview.length > 0 && (
                <div className="bg-green-50 p-3 rounded-md border border-green-200">
                  <div className="flex items-start space-x-2">
                    <Info className="h-5 w-5 text-green-600 mt-0.5" />
                    <div className="text-sm text-green-700">
                      <p className="font-medium">字段映射</p>
                      <p className="mt-1">
                        系统将使用第{headerPreview.length}行（高亮显示）作为字段名进行数据解析。
                        请确保该行包含正确的列标题，如：车次、运行区段、始发时间等。
                        {mergedCells.length > 0 && "合并单元格已自动处理。"}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 添加字段映射预览 */}
          {showPreview && currentHeaders.length > 0 && (
            <div className="border-t pt-4">
              <FieldMappingPreview headers={currentHeaders} trainType={trainType} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* 合并单元格预览 */}
      {showPreview && mergedCells.length > 0 && excelData && (
        <MergedCellsPreview
          data={excelData}
          mergedCells={mergedCells}
          headerRowCount={Number.parseInt(localCount) || 3}
        />
      )}
    </div>
  )
}
