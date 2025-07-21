"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, AlertCircle, RotateCcw, Upload, RefreshCw } from "lucide-react"
import { FileUpload } from "./file-upload"
import { DynamicDataPreview } from "./dynamic-data-preview"
import { UnitSelector } from "./unit-selector"
import { PageContainer } from "./page-container"
import { useTrainData } from "@/contexts/train-data-context"
import {
  parseDynamicExcelFile,
  detectTrainType,
  detectTrainUnit,
  readExcelForPreview,
} from "@/utils/dynamic-excel-parser"
import type { TrainType, TrainUnit, ParseResult, DynamicTrainData } from "@/types/dynamic-train-data"
import { useToast } from "@/hooks/use-toast"
import { HeaderConfig } from "./header-config"

interface MergedCellInfo {
  startRow: number
  endRow: number
  startCol: number
  endCol: number
  rowSpan: number
  colSpan: number
}

export function ImportPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [trainType, setTrainType] = useState<TrainType>("highSpeed")
  const [selectedUnit, setSelectedUnit] = useState<TrainUnit>("beijing")
  const [detectedUnit, setDetectedUnit] = useState<TrainUnit | undefined>(undefined)
  const [parseResult, setParseResult] = useState<(ParseResult & { mergedCells?: MergedCellInfo[] }) | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string>("")
  const [headerRowCount, setHeaderRowCount] = useState<number>(3)
  const [excelData, setExcelData] = useState<any[][] | null>(null)
  const [mergedCells, setMergedCells] = useState<MergedCellInfo[]>([])

  const { addUnitData, getUnitStats } = useTrainData()
  const { toast } = useToast()

  const handleFileSelect = async (file: File) => {
    setSelectedFile(file)
    setError("")
    setParseResult(null)

    // 自动识别类型和单位
    const detectedType = detectTrainType(file.name)
    const detectedUnitValue = detectTrainUnit(file.name)

    setTrainType(detectedType)
    setDetectedUnit(detectedUnitValue)
    setSelectedUnit(detectedUnitValue)

    try {
      const result = await readExcelForPreview(file)
      setExcelData(result.data)
      setMergedCells(result.mergedCells)

      if (result.mergedCells.length > 0) {
        toast({
          title: "检测到合并单元格",
          description: `发现 ${result.mergedCells.length} 个合并单元格区域，系统将自动处理`,
        })
      }
    } catch (err) {
      console.error("读取Excel文件失败:", err)
      setExcelData(null)
      setMergedCells([])
    }
  }

  const handleUploadAndParse = async () => {
    if (!selectedFile) {
      setError("请先选择文件")
      return
    }

    setIsProcessing(true)
    setError("")

    try {
      const result = await parseDynamicExcelFile(selectedFile, trainType, selectedUnit, headerRowCount)
      const headers = excelData?.slice(0, headerRowCount) as string[][]

      setParseResult({
        ...result,
        headers,
        mergedCells: result.mergedCells || [],
      } as any)

      if (result.success) {
        // 存储数据到对应单位
        addUnitData(selectedUnit, result.data as DynamicTrainData[], result.schema, trainType)

        toast({
          title: "数据导入成功",
          description: `已成功为${result.schema.unit === "beijing" ? "北京客运段" : result.schema.unit === "shijiazhuang" ? "石家庄客运段" : "天津客运段"}导入${result.recordCount}条${trainType === "highSpeed" ? "高铁" : "普速"}数据，适配了${result.schema.headers.length}个字段${
            mergedCells.length > 0 ? `，处理了${mergedCells.length}个合并单元格` : ""
          }`,
        })
      } else {
        setError(result.errors.join("; "))
      }
    } catch (err) {
      setError("文件处理失败，请检查文件格式")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleReset = () => {
    setSelectedFile(null)
    setParseResult(null)
    setError("")
    setTrainType("highSpeed")
    setSelectedUnit("beijing")
    setDetectedUnit(undefined)
    setExcelData(null)
    setMergedCells([])
  }

  const unitStats = getUnitStats()

  const pageActions = (
    <>
      <Button
        onClick={handleUploadAndParse}
        disabled={!selectedFile || isProcessing}
        className="flex items-center space-x-2"
      >
        {isProcessing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        <span>{isProcessing ? "解析中..." : "上传并解析"}</span>
      </Button>
      <Button variant="outline" onClick={handleReset} className="flex items-center space-x-2">
        <RotateCcw className="h-4 w-4" />
        <span>重置</span>
      </Button>
    </>
  )

  return (
    <PageContainer
      title="数据导入"
      description="上传Excel文件，系统将自动适配表头结构并按单位分类导入数据"
      actions={pageActions}
    >
      <div className="space-y-6">
        {/* 文件选择区域 */}
        <Card className="bg-theme-background border-theme shadow-sm">
          <CardHeader>
            <CardTitle className="text-theme-primary">选择文件</CardTitle>
          </CardHeader>
          <CardContent>
            <FileUpload onFileSelect={handleFileSelect} selectedFile={selectedFile} error={error} />
          </CardContent>
        </Card>

        {/* 单位选择 */}
        {selectedFile && (
          <UnitSelector
            selectedUnit={selectedUnit}
            onUnitChange={setSelectedUnit}
            detectedUnit={detectedUnit}
            showStats={true}
            unitStats={unitStats}
          />
        )}

        {/* 运行图类型选择 */}
        <Card className="bg-theme-background border-theme shadow-sm">
          <CardHeader>
            <CardTitle className="text-theme-primary">运行图类型</CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup value={trainType} onValueChange={(value) => setTrainType(value as TrainType)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="highSpeed" id="highSpeed" />
                <Label htmlFor="highSpeed" className="text-theme-secondary">高铁运行图</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="conventional" id="conventional" />
                <Label htmlFor="conventional" className="text-theme-secondary">普速运行图</Label>
              </div>
            </RadioGroup>
            {selectedFile && (
              <p className="text-sm text-theme-muted mt-2">
                根据文件名自动识别为：{trainType === "highSpeed" ? "高铁运行图" : "普速运行图"}
              </p>
            )}
          </CardContent>
        </Card>

        {/* 表头配置 */}
        {selectedFile && (
          <HeaderConfig
            headerRowCount={headerRowCount}
            onHeaderRowCountChange={setHeaderRowCount}
            excelData={excelData || undefined}
            mergedCells={mergedCells}
            trainType={trainType}
          />
        )}

        {/* 解析状态提示 */}
        {parseResult && (
          <Alert variant={parseResult.success ? "default" : "destructive"}>
            {parseResult.success ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            <AlertDescription>
              {parseResult.success
                ? `解析成功：为${parseResult.schema.unit === "beijing" ? "北京客运段" : parseResult.schema.unit === "shijiazhuang" ? "石家庄客运段" : "天津客运段"}导入${parseResult.recordCount}条${trainType === "highSpeed" ? "高铁" : "普速"}数据，适配${parseResult.schema.headers.length}个字段${
                    parseResult.mergedCells && parseResult.mergedCells.length > 0
                      ? `，处理了${parseResult.mergedCells.length}个合并单元格`
                      : ""
                  }`
                : `解析失败：${parseResult.errors.join("; ")}`}
            </AlertDescription>
          </Alert>
        )}

        {/* 数据预览区 */}
        {parseResult && parseResult.success && parseResult.data.length > 0 && (
          <DynamicDataPreview
            data={parseResult.data}
            schema={parseResult.schema}
            recordCount={parseResult.recordCount}
            headers={(parseResult as any).headers}
          />
        )}
      </div>
    </PageContainer>
  )
}
