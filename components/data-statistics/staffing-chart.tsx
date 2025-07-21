"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { BarChart3, PieChart as PieChartIcon, TrendingUp } from "lucide-react"
import type { ChartData, BureauStaffingStats } from "@/types/data-statistics"

interface StaffingChartProps {
  chartData: ChartData
  bureauStats: BureauStaffingStats[]
}

export function StaffingChart({ chartData, bureauStats }: StaffingChartProps) {
  // 为柱状图准备数据
  const barData = useMemo(() => {
    return bureauStats.map(bureau => ({
      name: bureau.bureauName,
      高铁定员: bureau.totals.highSpeed,
      普速定员: bureau.totals.conventional,
      其余生产: bureau.totals.otherProduction,
      总定员: bureau.totals.grandTotal
    }))
  }, [bureauStats])

  // 为饼图准备数据
  const pieData = useMemo(() => {
    const total = bureauStats.reduce((sum, bureau) => sum + bureau.totals.grandTotal, 0)
    if (total === 0) return []
    
    return bureauStats.map(bureau => ({
      name: bureau.bureauName,
      value: bureau.totals.grandTotal,
      percentage: ((bureau.totals.grandTotal / total) * 100).toFixed(1)
    }))
  }, [bureauStats])

  // 为完成度趋势图准备数据
  const completionData = useMemo(() => {
    return bureauStats.map(bureau => ({
      name: bureau.bureauName,
      完成度: bureau.calculationStatus.percentage,
      已完成: bureau.calculationStatus.completed,
      总数: bureau.calculationStatus.total
    }))
  }, [bureauStats])

  // 定义颜色
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D']

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {`${entry.dataKey}: ${entry.value?.toLocaleString()}`}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  const PieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0]
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium">{data.name}</p>
          <p className="text-sm">
            定员: {data.value?.toLocaleString()}
          </p>
          <p className="text-sm">
            占比: {data.payload.percentage}%
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="space-y-6">
      {/* 定员分布概览 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5" />
            <span>路局定员分布</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {barData.map((bureau, index) => (
              <div key={bureau.name} className="space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="font-medium">{bureau.name}</h4>
                  <Badge variant="outline">{bureau.总定员.toLocaleString()}</Badge>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>高铁定员</span>
                      <span>{bureau.高铁定员.toLocaleString()}</span>
                    </div>
                    <Progress 
                      value={bureau.总定员 > 0 ? (bureau.高铁定员 / bureau.总定员) * 100 : 0} 
                      className="h-2"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>普速定员</span>
                      <span>{bureau.普速定员.toLocaleString()}</span>
                    </div>
                    <Progress 
                      value={bureau.总定员 > 0 ? (bureau.普速定员 / bureau.总定员) * 100 : 0} 
                      className="h-2"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>其余生产</span>
                      <span>{bureau.其余生产.toLocaleString()}</span>
                    </div>
                    <Progress 
                      value={bureau.总定员 > 0 ? (bureau.其余生产 / bureau.总定员) * 100 : 0} 
                      className="h-2"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 定员占比分析 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <PieChartIcon className="h-5 w-5" />
              <span>定员占比分析</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pieData.map((item, index) => (
                <div key={item.name} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-4 h-4 rounded-full" 
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="font-medium">{item.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{item.value.toLocaleString()}</div>
                    <div className="text-sm text-muted-foreground">{item.percentage}%</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 完成度分析 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5" />
              <span>计算完成度</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {completionData.map((item, index) => (
                <div key={item.name} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{item.name}</span>
                    <span className="text-sm text-muted-foreground">
                      {item.已完成}/{item.总数} ({item.完成度.toFixed(1)}%)
                    </span>
                  </div>
                  <Progress value={item.完成度} className="h-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 类型分析 */}
      <Card>
        <CardHeader>
          <CardTitle>定员类型分析</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 高铁定员分析 */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="font-medium">高铁定员</span>
              </div>
              <div className="space-y-2">
                {bureauStats.map((bureau) => (
                  <div key={bureau.bureauId} className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">{bureau.bureauName}</span>
                    <Badge variant="outline" className="text-blue-600">
                      {bureau.totals.highSpeed.toLocaleString()}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            {/* 普速定员分析 */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="font-medium">普速定员</span>
              </div>
              <div className="space-y-2">
                {bureauStats.map((bureau) => (
                  <div key={bureau.bureauId} className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">{bureau.bureauName}</span>
                    <Badge variant="outline" className="text-green-600">
                      {bureau.totals.conventional.toLocaleString()}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            {/* 其余生产分析 */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                <span className="font-medium">其余生产</span>
              </div>
              <div className="space-y-2">
                {bureauStats.map((bureau) => (
                  <div key={bureau.bureauId} className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">{bureau.bureauName}</span>
                    <Badge variant="outline" className="text-orange-600">
                      {bureau.totals.otherProduction.toLocaleString()}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}