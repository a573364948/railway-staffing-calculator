"use client"

import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, ChevronRight, Download, Eye } from "lucide-react"
import type { HighSpeedTrainData, ConventionalTrainData, TrainType } from "@/types/train-data"
import * as XLSX from "xlsx"

interface DataTableProps {
  data: HighSpeedTrainData[] | ConventionalTrainData[]
  trainType: TrainType
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}

export function DataTable({ data, trainType, currentPage, totalPages, onPageChange }: DataTableProps) {
  const [printMode, setPrintMode] = useState(false)

  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(data)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, trainType === "highSpeed" ? "客运高铁运行图" : "普速运行图")
    XLSX.writeFile(workbook, `${trainType === "highSpeed" ? "客运高铁" : "普速"}运行图数据.xlsx`)
  }

  const togglePrintMode = () => {
    setPrintMode(!printMode)
  }

  if (trainType === "highSpeed") {
    const highSpeedData = data as HighSpeedTrainData[]

    return (
      <Card>
        <CardHeader className={printMode ? "print:hidden" : ""}>
          <div className="flex items-center justify-between">
            <CardTitle>客运高铁运行图数据</CardTitle>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm" onClick={togglePrintMode}>
                <Eye className="h-4 w-4 mr-2" />
                {printMode ? "退出" : "打印"}预览
              </Button>
              <Button variant="outline" size="sm" onClick={exportToExcel}>
                <Download className="h-4 w-4 mr-2" />
                导出Excel
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>序号</TableHead>
                  <TableHead>车型</TableHead>
                  <TableHead>编组</TableHead>
                  <TableHead>车次</TableHead>
                  <TableHead>运行区段</TableHead>
                  <TableHead>接班</TableHead>
                  <TableHead>始发时间</TableHead>
                  <TableHead>终到时间</TableHead>
                  <TableHead>单程工时</TableHead>
                  <TableHead>往返工时</TableHead>
                  <TableHead>宿营地</TableHead>
                  <TableHead>司机</TableHead>
                  <TableHead>副司机</TableHead>
                  <TableHead>列车长</TableHead>
                  <TableHead>乘务员</TableHead>
                  <TableHead>备注</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {highSpeedData.map((row, index) => (
                  <TableRow key={row.id} className="hover:bg-gray-50 cursor-pointer">
                    <TableCell>{row.序号}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{row.车型}</Badge>
                    </TableCell>
                    <TableCell>{row.编组}</TableCell>
                    <TableCell className="font-medium text-blue-600 hover:underline">{row.车次}</TableCell>
                    <TableCell>{row.运行区段}</TableCell>
                    <TableCell>{row.接班}</TableCell>
                    <TableCell>{row.始发时间}</TableCell>
                    <TableCell>{row.终到时间}</TableCell>
                    <TableCell>{row.单程工时}</TableCell>
                    <TableCell>{row.往返工时}</TableCell>
                    <TableCell>{row.宿营地}</TableCell>
                    <TableCell>{row.司机}</TableCell>
                    <TableCell>{row.副司机}</TableCell>
                    <TableCell>{row.列车长}</TableCell>
                    <TableCell>{row.乘务员}</TableCell>
                    <TableCell className="max-w-32 truncate" title={row.备注}>
                      {row.备注}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* 分页控件 */}
          {!printMode && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-gray-500">
                第 {currentPage} 页，共 {totalPages} 页
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(currentPage - 1)}
                  disabled={currentPage <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  上一页
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                >
                  下一页
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    )
  } else {
    const conventionalData = data as ConventionalTrainData[]

    return (
      <Card>
        <CardHeader className={printMode ? "print:hidden" : ""}>
          <div className="flex items-center justify-between">
            <CardTitle>普速运行图数据</CardTitle>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm" onClick={togglePrintMode}>
                <Eye className="h-4 w-4 mr-2" />
                {printMode ? "退出" : "打印"}预览
              </Button>
              <Button variant="outline" size="sm" onClick={exportToExcel}>
                <Download className="h-4 w-4 mr-2" />
                导出Excel
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>序号</TableHead>
                <TableHead>类别</TableHead>
                <TableHead>车次</TableHead>
                <TableHead>运行区段</TableHead>
                <TableHead>始发时间</TableHead>
                <TableHead>终到时间</TableHead>
                <TableHead>编组详情</TableHead>
                <TableHead>配备人数</TableHead>
                <TableHead>备注</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {conventionalData.map((row, index) => (
                <TableRow key={row.id} className="hover:bg-gray-50 cursor-pointer">
                  <TableCell>{row.序号}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{row.类别}</Badge>
                  </TableCell>
                  <TableCell className="font-medium text-blue-600 hover:underline">{row.车次}</TableCell>
                  <TableCell>{row.运行区段}</TableCell>
                  <TableCell>{row.始发时间}</TableCell>
                  <TableCell>{row.终到时间}</TableCell>
                  <TableCell>{row.编组详情}</TableCell>
                  <TableCell>{row.配备人数}</TableCell>
                  <TableCell className="max-w-32 truncate" title={row.备注}>
                    {row.备注}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* 分页控件 */}
          {!printMode && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-gray-500">
                第 {currentPage} 页，共 {totalPages} 页
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(currentPage - 1)}
                  disabled={currentPage <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  上一页
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                >
                  下一页
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }
}
