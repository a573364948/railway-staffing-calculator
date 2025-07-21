"use client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { DynamicFieldMapping } from "./dynamic-field-mapping"
import type { DynamicTrainData, DynamicTableSchema } from "@/types/dynamic-train-data"

interface DynamicDataPreviewProps {
  data: DynamicTrainData[]
  schema: DynamicTableSchema
  recordCount: number
  headers?: string[][]
}

export function DynamicDataPreview({ data, schema, recordCount, headers }: DynamicDataPreviewProps) {
  const previewData = data.slice(0, 5)

  const renderHeaderInfo = () => {
    if (!headers || headers.length === 0) return null

    return (
      <div className="mb-4 p-3 bg-theme-surface rounded-md border border-theme">
        <h4 className="font-medium mb-2">表头信息</h4>
        <div className="text-sm text-gray-600">
          <p>检测到多行表头，已自动跳过前3行</p>
          <p>使用第3行作为数据字段名，适配了{schema.headers.length}个字段</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 动态字段映射 */}
      <DynamicFieldMapping schema={schema} actualHeaders={schema.headers.map((h) => h.label)} />

      {/* 数据预览 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>数据预览 - {schema.dataType === "highSpeed" ? "高铁运行图" : "普速运行图"}</CardTitle>
            <Badge variant="secondary">解析成功：{recordCount}条数据</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {renderHeaderInfo()}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {schema.headers.slice(0, 10).map((header) => (
                    <TableHead key={header.key} className={header.isRequired ? "font-bold text-primary" : ""}>
                      {header.label}
                      {header.isRequired && <span className="text-red-500 ml-1">*</span>}
                    </TableHead>
                  ))}
                  {schema.headers.length > 10 && <TableHead>...</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewData.map((row, index) => (
                  <TableRow key={index}>
                    {schema.headers.slice(0, 10).map((header) => (
                      <TableCell key={header.key} className={header.isRequired ? "font-medium" : ""}>
                        {row[header.label] || "-"}
                      </TableCell>
                    ))}
                    {schema.headers.length > 10 && <TableCell>...</TableCell>}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {data.length > 5 && (
            <p className="text-sm text-gray-500 mt-2">
              显示前5条数据，共{recordCount}条记录，{schema.headers.length}个字段
              {schema.headers.length > 10 && "（表格显示前10个字段）"}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
