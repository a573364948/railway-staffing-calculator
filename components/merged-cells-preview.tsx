"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Info, Grid } from "lucide-react"

interface MergedCellInfo {
  startRow: number
  endRow: number
  startCol: number
  endCol: number
  rowSpan: number
  colSpan: number
}

interface MergedCellsPreviewProps {
  data: any[][]
  mergedCells: MergedCellInfo[]
  headerRowCount: number
}

export function MergedCellsPreview({ data, mergedCells, headerRowCount }: MergedCellsPreviewProps) {
  // 检查某个单元格是否是合并单元格的一部分
  const getMergedCellInfo = (rowIndex: number, colIndex: number) => {
    return mergedCells.find(
      (merge) =>
        rowIndex >= merge.startRow &&
        rowIndex <= merge.endRow &&
        colIndex >= merge.startCol &&
        colIndex <= merge.endCol,
    )
  }

  // 检查某个单元格是否是合并单元格的起始位置
  const isMergedCellStart = (rowIndex: number, colIndex: number) => {
    return mergedCells.some((merge) => merge.startRow === rowIndex && merge.startCol === colIndex)
  }

  // 获取预览数据（表头部分）
  const previewData = data.slice(0, Math.min(headerRowCount + 2, data.length))
  const maxCols = Math.max(...previewData.map((row) => row.length))

  // 生成列索引数组
  const columnIndexes = Array.from({ length: Math.min(maxCols, 20) }, (_, i) => i)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center space-x-2">
            <Grid className="h-5 w-5" />
            <span>合并单元格预览</span>
          </CardTitle>
          <Badge variant="outline">{mergedCells.length} 个合并区域</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 合并单元格统计信息 */}
        <div className="bg-theme-accent p-3 rounded-md border border-theme-secondary">
          <div className="flex items-start space-x-2">
            <Info className="h-5 w-5 text-theme-secondary mt-0.5" />
            <div className="text-sm text-theme-secondary">
              <p className="font-medium">合并单元格处理</p>
              <p className="mt-1">
                检测到 {mergedCells.length} 个合并单元格区域。系统已自动处理合并单元格，
                将合并区域的值填充到所有相关单元格中。
              </p>
            </div>
          </div>
        </div>

        {/* 合并单元格详情 */}
        {mergedCells.length > 0 && (
          <div>
            <h4 className="font-medium mb-3">合并区域详情</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {mergedCells.slice(0, 6).map((merge, index) => (
                <div key={index} className="bg-theme-surface p-3 rounded-md border border-theme">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="secondary">区域 {index + 1}</Badge>
                    <span className="text-xs text-gray-500">
                      {merge.rowSpan}行 × {merge.colSpan}列
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    <p>
                      行范围: {merge.startRow + 1} - {merge.endRow + 1}
                    </p>
                    <p>
                      列范围: {merge.startCol + 1} - {merge.endCol + 1}
                    </p>
                    {data[merge.startRow] && data[merge.startRow][merge.startCol] && (
                      <p className="mt-1 font-medium text-gray-800">内容: &ldquo;{data[merge.startRow][merge.startCol]}&rdquo;</p>
                    )}
                  </div>
                </div>
              ))}
              {mergedCells.length > 6 && (
                <div className="bg-theme-surface p-3 rounded-md border border-theme flex items-center justify-center">
                  <span className="text-sm text-gray-500">还有 {mergedCells.length - 6} 个合并区域...</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 表格预览 */}
        <div>
          <h4 className="font-medium mb-3">表格预览（含合并单元格标识）</h4>
          <div className="border rounded-md overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-theme-surface">
                  <TableHead className="w-16">行号</TableHead>
                  {columnIndexes.map((colIndex) => (
                    <TableHead key={colIndex} className="min-w-24 text-center">
                      {colIndex + 1}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewData.map((row, rowIndex) => (
                  <TableRow key={rowIndex} className={rowIndex < headerRowCount ? "bg-theme-accent" : "bg-theme-surface"}>
                    <TableCell className="font-medium">
                      <div className="flex items-center space-x-2">
                        <span>{rowIndex + 1}</span>
                        {rowIndex < headerRowCount && (
                          <Badge variant="secondary" className="text-xs">
                            表头
                          </Badge>
                        )}
                        {rowIndex >= headerRowCount && (
                          <Badge variant="outline" className="text-xs">
                            数据
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    {columnIndexes.map((colIndex) => {
                      const cellValue = row[colIndex] || ""
                      const mergedInfo = getMergedCellInfo(rowIndex, colIndex)
                      const isStart = isMergedCellStart(rowIndex, colIndex)

                      return (
                        <TableCell
                          key={colIndex}
                          className={`text-center relative ${mergedInfo ? "bg-theme-accent border-theme-secondary" : ""}`}
                        >
                          <div className="flex flex-col items-center space-y-1">
                            <span className="text-xs max-w-20 truncate" title={cellValue}>
                              {cellValue || "-"}
                            </span>
                            {mergedInfo && (
                              <Badge variant={isStart ? "default" : "outline"} className="text-xs">
                                {isStart ? "合并起点" : "合并区域"}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                      )
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* 处理说明 */}
        <div className="bg-theme-accent p-3 rounded-md border border-theme-secondary">
          <div className="flex items-start space-x-2">
            <Info className="h-5 w-5 text-theme-secondary mt-0.5" />
            <div className="text-sm text-theme-secondary">
              <p className="font-medium">处理结果</p>
              <p className="mt-1">
                • 橙色背景的单元格表示合并单元格区域
                <br />• &ldquo;合并起点&rdquo;标识合并区域的左上角单元格
                <br />• &ldquo;合并区域&rdquo;标识合并区域内的其他单元格
                <br />• 合并单元格的值已自动填充到整个合并区域
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
