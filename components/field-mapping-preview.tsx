"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CheckCircle, AlertCircle, Info } from "lucide-react"
import type { TrainType } from "@/types/train-data"

interface FieldMappingPreviewProps {
  headers: string[]
  trainType: TrainType
}

export function FieldMappingPreview({ headers, trainType }: FieldMappingPreviewProps) {
  // 根据实际Excel表头定义必需字段
  const requiredFields =
    trainType === "highSpeed"
      ? [
          "序号",
          "车型",
          "编组",
          "车次",
          "运行区段",
          "接班",
          "乘务员",
          "始发时间",
          "终到时间",
          "单程工时",
          "往返工时",
          "宿营地",
          "人员配备",
          "司机",
          "副司机",
          "乘务",
          "机械师",
          "随车机械师",
          "乘警",
          "列车长",
          "餐车",
          "备注",
        ]
      : ["序号", "类别", "车次", "运行区段", "始发时间", "终到时间", "编组详情", "配备人数", "备注"]

  // 检查字段映射状态
  const getFieldStatus = (field: string) => {
    const found = headers.find((header) => header && header.toString().includes(field))
    return {
      found: !!found,
      matchedHeader: found,
      index: found ? headers.indexOf(found) : -1,
    }
  }

  const fieldMappings = requiredFields.map((field) => ({
    field,
    ...getFieldStatus(field),
  }))

  const missingFields = fieldMappings.filter((mapping) => !mapping.found)
  const foundFields = fieldMappings.filter((mapping) => mapping.found)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">字段映射检查</CardTitle>
          <div className="flex items-center space-x-2">
            <Badge variant={missingFields.length === 0 ? "default" : "destructive"}>
              {foundFields.length}/{requiredFields.length} 字段匹配
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 映射状态总览 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-green-50 p-3 rounded-md border border-green-200">
            <div className="flex items-center space-x-2 mb-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="font-medium text-green-800">已匹配字段</span>
            </div>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {foundFields.map((mapping, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <span className="text-green-700">{mapping.field}</span>
                  <Badge variant="outline" className="text-xs">
                    列 {mapping.index + 1}
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          {missingFields.length > 0 && (
            <div className="bg-red-50 p-3 rounded-md border border-red-200">
              <div className="flex items-center space-x-2 mb-2">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <span className="font-medium text-red-800">缺失字段</span>
              </div>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {missingFields.map((mapping, index) => (
                  <div key={index} className="text-sm text-red-700">
                    {mapping.field}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 详细映射表 */}
        <div>
          <h4 className="font-medium mb-3">详细字段映射</h4>
          <div className="max-h-60 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>必需字段</TableHead>
                  <TableHead>Excel列标题</TableHead>
                  <TableHead>列位置</TableHead>
                  <TableHead>状态</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fieldMappings.map((mapping, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{mapping.field}</TableCell>
                    <TableCell>
                      {mapping.found ? (
                        <Badge variant="outline" className="max-w-32 truncate">
                          {mapping.matchedHeader}
                        </Badge>
                      ) : (
                        <span className="text-gray-400">未找到</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {mapping.found ? (
                        <Badge variant="secondary">第 {mapping.index + 1} 列</Badge>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {mapping.found ? (
                        <Badge variant="default" className="bg-green-100 text-green-800">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          匹配
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          缺失
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* 提示信息 */}
        <div className="bg-theme-accent p-3 rounded-md border border-theme-secondary">
          <div className="flex items-start space-x-2">
            <Info className="h-5 w-5 text-theme-secondary mt-0.5" />
            <div className="text-sm text-theme-secondary">
              <p className="font-medium">字段映射说明</p>
              <p className="mt-1">
                系统会自动匹配Excel列标题与必需字段。字段映射基于实际的客运高铁运行图表头结构，
                包括序号、车型、编组、车次、运行区段、时间信息、人员配备等完整字段。
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
