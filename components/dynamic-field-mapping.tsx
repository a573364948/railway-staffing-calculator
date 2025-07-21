"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CheckCircle, AlertCircle, Info, Database } from "lucide-react"
import type { DynamicTableSchema } from "@/types/dynamic-train-data"

interface DynamicFieldMappingProps {
  schema: DynamicTableSchema
  actualHeaders: string[]
}

export function DynamicFieldMapping({ schema, actualHeaders }: DynamicFieldMappingProps) {
  const requiredFieldsStatus = schema.requiredFields.map((required) => {
    const matchedHeader = schema.headers.find((h) => h.label.includes(required))
    return {
      field: required,
      found: !!matchedHeader,
      matchedHeader: matchedHeader?.label,
      index: matchedHeader?.index,
    }
  })

  const foundRequired = requiredFieldsStatus.filter((f) => f.found)
  const missingRequired = requiredFieldsStatus.filter((f) => !f.found)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center space-x-2">
            <Database className="h-5 w-5" />
            <span>动态表头适配</span>
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Badge variant="outline">{schema.headers.length} 个字段</Badge>
            <Badge variant={missingRequired.length === 0 ? "default" : "destructive"}>
              {foundRequired.length}/{schema.requiredFields.length} 必需字段
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 表头适配说明 */}
        <div className="bg-blue-50 p-3 rounded-md border border-blue-200">
          <div className="flex items-start space-x-2">
            <Info className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-700">
              <p className="font-medium">动态表头适配</p>
              <p className="mt-1">
                系统已自动识别Excel文件的表头结构，将使用实际的列名进行数据导入和显示。 检测到 {schema.headers.length}{" "}
                个有效字段，其中 {foundRequired.length} 个必需字段已匹配。
              </p>
            </div>
          </div>
        </div>

        {/* 必需字段状态 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-theme-accent p-3 rounded-md border border-theme-secondary">
            <div className="flex items-center space-x-2 mb-2">
              <CheckCircle className="h-5 w-5 text-theme-secondary" />
              <span className="font-medium text-theme-secondary">已匹配必需字段</span>
            </div>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {foundRequired.map((field, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <span className="text-theme-secondary">{field.field}</span>
                  <Badge variant="outline" className="text-xs">
                    {field.matchedHeader}
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          {missingRequired.length > 0 && (
            <div className="bg-red-50 p-3 rounded-md border border-red-200">
              <div className="flex items-center space-x-2 mb-2">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <span className="font-medium text-red-800">缺失必需字段</span>
              </div>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {missingRequired.map((field, index) => (
                  <div key={index} className="text-sm text-red-700">
                    {field.field}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 完整字段列表 */}
        <div>
          <h4 className="font-medium mb-3">检测到的所有字段</h4>
          <div className="max-h-60 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>序号</TableHead>
                  <TableHead>字段名</TableHead>
                  <TableHead>数据类型</TableHead>
                  <TableHead>是否必需</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schema.headers.map((header, index) => (
                  <TableRow key={index}>
                    <TableCell>{header.index + 1}</TableCell>
                    <TableCell className="font-medium">{header.label}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {header.dataType === "text"
                          ? "文本"
                          : header.dataType === "number"
                            ? "数字"
                            : header.dataType === "time"
                              ? "时间"
                              : "日期"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {header.isRequired ? (
                        <Badge variant="default" className="text-xs">
                          必需
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          可选
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* 适配结果 */}
        <div className="bg-green-50 p-3 rounded-md border border-green-200">
          <div className="flex items-start space-x-2">
            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
            <div className="text-sm text-green-700">
              <p className="font-medium">适配完成</p>
              <p className="mt-1">
                系统将使用以下实际表头进行数据展示和操作：
                <br />
                <span className="font-mono text-xs bg-white px-1 rounded">
                  {schema.headers
                    .slice(0, 5)
                    .map((h) => h.label)
                    .join(", ")}
                  {schema.headers.length > 5 ? ` 等${schema.headers.length}个字段` : ""}
                </span>
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
