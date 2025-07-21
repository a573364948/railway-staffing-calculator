"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { PageContainer } from "./page-container"
import { RuleBasedStaffing } from "./rule-based-staffing"
import { useTrainData } from "@/contexts/train-data-context"
import type { TrainUnit } from "@/types/dynamic-train-data"
import { TRAIN_UNITS } from "@/types/dynamic-train-data"

export function StaffingPage() {
  const { unitData, currentUnit, setCurrentUnit, getActualTrainCount } = useTrainData()

  const currentUnitData = unitData[currentUnit]

  // 检查当前单位是否有数据
  const hasData = currentUnitData.highSpeedData.length > 0 || currentUnitData.conventionalData.length > 0

  const pageActions = <></>

  return (
    <PageContainer
      title="定员测算"
      description="根据不同铁路局标准计算各单位的定员人数，支持高铁、普速和生产定员计算"
      actions={pageActions}
    >
      <div className="space-y-6">
        {/* 单位选择和状态 */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <span className="text-sm font-medium">当前单位：</span>
                <Select value={currentUnit} onValueChange={(value) => setCurrentUnit(value as TrainUnit)}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beijing">{TRAIN_UNITS.beijing}</SelectItem>
                    <SelectItem value="shijiazhuang">{TRAIN_UNITS.shijiazhuang}</SelectItem>
                    <SelectItem value="tianjin">{TRAIN_UNITS.tianjin}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <span>高铁: {getActualTrainCount(currentUnitData.highSpeedData)} 趟</span>
                <span>普速: {getActualTrainCount(currentUnitData.conventionalData)} 趟</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 数据状态提示 */}
        {!hasData && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              当前单位暂无运行图数据，请先在"数据导入"页面导入Excel文件后再进行定员测算。
            </AlertDescription>
          </Alert>
        )}

        {/* 规则计算 */}
        <RuleBasedStaffing />
      </div>
    </PageContainer>
  )
}
