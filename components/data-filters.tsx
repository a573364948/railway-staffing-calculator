"use client"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Search, RotateCcw } from "lucide-react"
import type { TrainType } from "@/types/train-data"
import type { DynamicTrainData } from "@/types/dynamic-train-data"

interface DataFiltersProps {
  trainType: TrainType
  data: DynamicTrainData[] // 添加数据参数用于动态生成选项
  filters: {
    车次: string
    车型?: string
    编组?: string
    运行区段?: string
    司机?: string
    列车长?: string
    timeRange: {
      start: string
      end: string
    }
  }
  onFiltersChange: (filters: any) => void
  onReset: () => void
}

export function DataFilters({ trainType, data, filters, onFiltersChange, onReset }: DataFiltersProps) {
  const updateFilter = (key: string, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    })
  }

  // 动态生成车型选项
  const getUniqueValues = (fieldName: string): string[] => {
    const values = new Set<string>()
    data.forEach(item => {
      const value = item[fieldName]
      if (value && typeof value === 'string' && value.trim() && value !== '-') {
        values.add(value.trim())
      }
    })
    return Array.from(values).sort()
  }

  const updateTimeRange = (type: "start" | "end", value: string) => {
    onFiltersChange({
      ...filters,
      timeRange: {
        ...filters.timeRange,
        [type]: value,
      },
    })
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 车次搜索 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">车次搜索</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="输入车次号..."
                value={filters.车次}
                onChange={(e) => updateFilter("车次", e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* 运行区段搜索 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">运行区段</label>
            <Input
              placeholder="输入运行区段..."
              value={filters.运行区段 || ""}
              onChange={(e) => updateFilter("运行区段", e.target.value)}
            />
          </div>

          {/* 高铁特有筛选 */}
          {trainType === "highSpeed" && (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">车型</label>
                <Select
                  value={filters.车型 || "all"}
                  onValueChange={(value) => updateFilter("车型", value === "all" ? "" : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择车型" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部车型</SelectItem>
                    {getUniqueValues('车型').map(carType => (
                      <SelectItem key={carType} value={carType}>
                        {carType}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">编组</label>
                <Select
                  value={filters.编组 || "all"}
                  onValueChange={(value) => updateFilter("编组", value === "all" ? "" : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择编组" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部编组</SelectItem>
                    {getUniqueValues('编组').map(formation => (
                      <SelectItem key={formation} value={formation}>
                        {formation}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">司机</label>
                <Input
                  placeholder="输入司机姓名..."
                  value={filters.司机 || ""}
                  onChange={(e) => updateFilter("司机", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">列车长</label>
                <Input
                  placeholder="输入列车长姓名..."
                  value={filters.列车长 || ""}
                  onChange={(e) => updateFilter("列车长", e.target.value)}
                />
              </div>
            </>
          )}

          {/* 时间范围 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">始发时间</label>
            <Input
              type="time"
              value={filters.timeRange.start}
              onChange={(e) => updateTimeRange("start", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">终到时间</label>
            <Input type="time" value={filters.timeRange.end} onChange={(e) => updateTimeRange("end", e.target.value)} />
          </div>

          {/* 重置按钮 */}
          <div className="flex items-end">
            <Button variant="outline" onClick={onReset} className="w-full">
              <RotateCcw className="h-4 w-4 mr-2" />
              重置筛选
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
