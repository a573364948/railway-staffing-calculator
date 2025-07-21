"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Building2, MapPin } from "lucide-react"
import type { TrainUnit } from "@/types/dynamic-train-data"
import { TRAIN_UNITS } from "@/types/dynamic-train-data" // Import TRAIN_UNITS

interface UnitSelectorProps {
  selectedUnit: TrainUnit
  onUnitChange: (unit: TrainUnit) => void
  detectedUnit?: TrainUnit
  showStats?: boolean
  unitStats?: Array<{
    unit: TrainUnit
    unitName: string
    totalCount: number
  }>
}

export function UnitSelector({
  selectedUnit,
  onUnitChange,
  detectedUnit,
  showStats = false,
  unitStats = [],
}: UnitSelectorProps) {
  const units: Array<{ value: TrainUnit; label: string; description: string }> = [
    {
      value: "beijing",
      label: TRAIN_UNITS.beijing,
      description: "负责北京地区的客运业务",
    },
    {
      value: "shijiazhuang",
      label: TRAIN_UNITS.shijiazhuang,
      description: "负责石家庄地区的客运业务",
    },
    {
      value: "tianjin",
      label: TRAIN_UNITS.tianjin,
      description: "负责天津地区的客运业务",
    },
  ]

  const getUnitStats = (unit: TrainUnit) => {
    return unitStats.find((stat) => stat.unit === unit)
  }

  return (
    <Card className="bg-theme-background border-theme shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg flex items-center space-x-2 text-theme-primary">
          <Building2 className="h-5 w-5 text-theme-secondary" />
          <span>客运段选择</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <RadioGroup value={selectedUnit} onValueChange={(value) => onUnitChange(value as TrainUnit)}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {units.map((unit) => {
              const stats = getUnitStats(unit.value)
              const isDetected = detectedUnit === unit.value

              return (
                <div
                  key={unit.value}
                  className={`border rounded-xl p-4 cursor-pointer transition-all duration-300 ${
                    selectedUnit === unit.value
                      ? "border-theme-secondary bg-theme-accent shadow-md"
                      : "border-theme hover:border-theme-secondary hover:bg-theme-accent/50"
                  }`}
                  onClick={() => onUnitChange(unit.value)}
                >
                  <div className="flex items-center space-x-2 mb-2">
                    <RadioGroupItem value={unit.value} id={unit.value} />
                    <Label htmlFor={unit.value} className="font-medium cursor-pointer text-theme-primary">
                      {unit.label}
                    </Label>
                    {isDetected && (
                      <Badge variant="secondary" className="text-xs bg-theme-secondary text-white">
                        自动识别
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center space-x-1 text-sm text-theme-secondary mb-2">
                    <MapPin className="h-3 w-3" />
                    <span>{unit.description}</span>
                  </div>

                  {showStats && stats && (
                    <div className="flex items-center justify-between text-xs text-theme-muted">
                      <span>已导入数据</span>
                      <Badge variant="outline" className="text-xs border-theme text-theme-primary">
                        {stats.totalCount} 条
                      </Badge>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </RadioGroup>

        {detectedUnit && (
          <div className="bg-theme-accent p-4 rounded-xl border border-theme-secondary/30">
            <div className="flex items-start space-x-2">
              <MapPin className="h-4 w-4 text-theme-secondary mt-0.5" />
              <div className="text-sm text-theme-secondary">
                <p className="font-medium">自动识别单位</p>
                <p className="mt-1">
                  根据文件名自动识别为：{TRAIN_UNITS[detectedUnit]}
                  <br />
                  您可以手动选择其他单位进行覆盖。
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
