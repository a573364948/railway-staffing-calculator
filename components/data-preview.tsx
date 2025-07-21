"use client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import type { HighSpeedTrainData, ConventionalTrainData, TrainType } from "@/types/train-data"

interface DataPreviewProps {
  data: HighSpeedTrainData[] | ConventionalTrainData[]
  trainType: TrainType
  recordCount: number
  headers?: string[][]
}

export function DataPreview({ data, trainType, recordCount, headers }: DataPreviewProps) {
  const previewData = data.slice(0, 5)

  const renderHeaderInfo = () => {
    if (!headers || headers.length === 0) return null

    return (
      <div className="mb-4 p-3 bg-theme-surface rounded-md border border-theme">
        <h4 className="font-medium mb-2">表头信息</h4>
        <div className="text-sm text-gray-600">
          <p>检测到多行表头，已自动跳过前3行</p>
          <p>使用第3行作为数据字段名</p>
        </div>
      </div>
    )
  }

  if (trainType === "highSpeed") {
    const highSpeedData = previewData as HighSpeedTrainData[]
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>数据预览 - 客运高铁运行图</CardTitle>
            <Badge variant="secondary">解析成功：{recordCount}条高铁数据</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {renderHeaderInfo()}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>序号</TableHead>
                  <TableHead>车型</TableHead>
                  <TableHead>编组</TableHead>
                  <TableHead className="font-bold text-primary">车次</TableHead>
                  <TableHead className="font-bold text-primary">运行区段</TableHead>
                  <TableHead className="font-bold text-primary">始发时间</TableHead>
                  <TableHead className="font-bold text-primary">终到时间</TableHead>
                  <TableHead>单程工时</TableHead>
                  <TableHead>往返工时</TableHead>
                  <TableHead>司机</TableHead>
                  <TableHead>副司机</TableHead>
                  <TableHead>列车长</TableHead>
                  <TableHead>备注</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {highSpeedData.map((row, index) => (
                  <TableRow key={index}>
                    <TableCell>{row.序号}</TableCell>
                    <TableCell>{row.车型}</TableCell>
                    <TableCell>{row.编组}</TableCell>
                    <TableCell className="font-medium">{row.车次}</TableCell>
                    <TableCell className="font-medium">{row.运行区段}</TableCell>
                    <TableCell className="font-medium">{row.始发时间}</TableCell>
                    <TableCell className="font-medium">{row.终到时间}</TableCell>
                    <TableCell>{row.单程工时}</TableCell>
                    <TableCell>{row.往返工时}</TableCell>
                    <TableCell>{row.司机}</TableCell>
                    <TableCell>{row.副司机}</TableCell>
                    <TableCell>{row.列车长}</TableCell>
                    <TableCell>{row.备注}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {data.length > 5 && <p className="text-sm text-gray-500 mt-2">显示前5条数据，共{recordCount}条记录</p>}
        </CardContent>
      </Card>
    )
  } else {
    const conventionalData = previewData as ConventionalTrainData[]
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>数据预览 - 普速运行图</CardTitle>
            <Badge variant="secondary">解析成功：{recordCount}条普速数据</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {renderHeaderInfo()}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>序号</TableHead>
                <TableHead>类别</TableHead>
                <TableHead className="font-bold text-primary">车次</TableHead>
                <TableHead className="font-bold text-primary">运行区段</TableHead>
                <TableHead className="font-bold text-primary">始发时间</TableHead>
                <TableHead className="font-bold text-primary">终到时间</TableHead>
                <TableHead>编组详情</TableHead>
                <TableHead>配备人数</TableHead>
                <TableHead>备注</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {conventionalData.map((row, index) => (
                <TableRow key={index}>
                  <TableCell>{row.序号}</TableCell>
                  <TableCell>{row.类别}</TableCell>
                  <TableCell className="font-medium">{row.车次}</TableCell>
                  <TableCell className="font-medium">{row.运行区段}</TableCell>
                  <TableCell className="font-medium">{row.始发时间}</TableCell>
                  <TableCell className="font-medium">{row.终到时间}</TableCell>
                  <TableCell>{row.编组详情}</TableCell>
                  <TableCell>{row.配备人数}</TableCell>
                  <TableCell>{row.备注}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {data.length > 5 && <p className="text-sm text-gray-500 mt-2">显示前5条数据，共{recordCount}条记录</p>}
        </CardContent>
      </Card>
    )
  }
}
