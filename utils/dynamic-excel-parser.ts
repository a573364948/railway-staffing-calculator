import * as XLSX from "xlsx"
import type {
  DynamicTrainData,
  ParseResult,
  TrainType,
  TrainUnit,
  DynamicTableSchema,
  TableHeader,
} from "@/types/dynamic-train-data"

// 从文件名检测单位
export function detectTrainUnit(filename: string): TrainUnit {
  const lowerName = filename.toLowerCase()
  if (lowerName.includes("北京") || lowerName.includes("beijing")) {
    return "beijing"
  }
  if (lowerName.includes("石家庄") || lowerName.includes("shijiazhuang")) {
    return "shijiazhuang"
  }
  if (lowerName.includes("天津") || lowerName.includes("tianjin")) {
    return "tianjin"
  }
  // 默认返回北京
  return "beijing"
}

// 检测运行图类型
export function detectTrainType(filename: string): TrainType {
  const lowerName = filename.toLowerCase()
  if (lowerName.includes("高铁") || lowerName.includes("crh") || lowerName.includes("cr400")) {
    return "highSpeed"
  }
  return "conventional"
}

// 处理合并单元格的函数
function processMergedCells(worksheet: XLSX.WorkSheet, jsonData: any[][]): any[][] {
  const merges = worksheet["!merges"] || []
  const processedData = jsonData.map((row) => [...row])

  merges.forEach((merge) => {
    const { s: start, e: end } = merge
    const mergeValue = processedData[start.r] && processedData[start.r][start.c]

    if (mergeValue !== undefined && mergeValue !== null && mergeValue !== "") {
      for (let row = start.r; row <= end.r; row++) {
        for (let col = start.c; col <= end.c; col++) {
          if (!processedData[row]) {
            processedData[row] = []
          }
          if (!processedData[row][col] || processedData[row][col] === "") {
            processedData[row][col] = mergeValue
          }
        }
      }
    }
  })

  return processedData
}

// 获取合并单元格信息
export function getMergedCellsInfo(worksheet: XLSX.WorkSheet) {
  const merges = worksheet["!merges"] || []
  return merges.map((merge) => ({
    startRow: merge.s.r,
    endRow: merge.e.r,
    startCol: merge.s.c,
    endCol: merge.e.c,
    rowSpan: merge.e.r - merge.s.r + 1,
    colSpan: merge.e.c - merge.s.c + 1,
  }))
}

// 分析数据类型
function analyzeDataType(values: any[]): "text" | "number" | "time" | "date" {
  const nonEmptyValues = values.filter((v) => v !== null && v !== undefined && v !== "")

  if (nonEmptyValues.length === 0) return "text"

  // 检查是否为时间格式
  const timePattern = /^\d{1,2}:\d{2}(:\d{2})?$/
  if (nonEmptyValues.some((v) => timePattern.test(String(v)))) {
    return "time"
  }

  // 检查是否为数字
  const numberPattern = /^\d+(\.\d+)?$/
  if (nonEmptyValues.some((v) => numberPattern.test(String(v)))) {
    return "number"
  }

  return "text"
}

// 创建动态表头结构
function createDynamicSchema(
  headers: string[],
  rows: any[][],
  trainType: TrainType,
  unit: TrainUnit,
): DynamicTableSchema {
  const tableHeaders: TableHeader[] = headers
    .map((header, index) => {
      const columnValues = rows.map((row) => row[index])
      const dataType = analyzeDataType(columnValues)

      // 判断是否为必需字段
      const isRequired = isRequiredField(header, trainType)

      return {
        key: `col_${index}`,
        label: header || `列${index + 1}`,
        index,
        isRequired,
        dataType,
      }
    })
    .filter((h) => h.label.trim() !== "") // 过滤空表头

  // 根据训练类型定义必需字段
  const requiredFields = getRequiredFields(trainType)

  return {
    headers: tableHeaders,
    requiredFields,
    dataType: trainType,
    unit,
  }
}

// 判断是否为必需字段
function isRequiredField(header: string, trainType: TrainType): boolean {
  const requiredKeywords =
    trainType === "highSpeed"
      ? ["序号", "车次", "运行区段", "始发时间", "终到时间"]
      : ["序号", "车次", "运行区段", "始发时间", "终到时间"]

  return requiredKeywords.some((keyword) => header.includes(keyword))
}

// 获取必需字段列表
function getRequiredFields(trainType: TrainType): string[] {
  return trainType === "highSpeed"
    ? ["序号", "车次", "运行区段", "始发时间", "终到时间"]
    : ["序号", "车次", "运行区段", "始发时间", "终到时间"]
}

// 动态解析Excel文件
export async function parseDynamicExcelFile(
  file: File,
  trainType: TrainType,
  unit: TrainUnit,
  headerRowCount = 3,
): Promise<ParseResult & { mergedCells?: any[] }> {
  try {
    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: "array" })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]

    const rawJsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
    const processedJsonData = processMergedCells(worksheet, rawJsonData as any[][])
    const mergedCells = getMergedCellsInfo(worksheet)

    if (processedJsonData.length < headerRowCount + 1) {
      return {
        success: false,
        data: [],
        errors: ["文件数据不足，至少需要包含表头和一行数据"],
        recordCount: 0,
        schema: { headers: [], requiredFields: [], dataType: trainType, unit },
        mergedCells,
      }
    }

    // 使用最后一行表头作为字段名
    const headers = processedJsonData[headerRowCount - 1] as string[]
    const rows = processedJsonData.slice(headerRowCount) as any[][]

    // 创建动态表头结构
    const schema = createDynamicSchema(headers, rows, trainType, unit)

    // 检查必需字段
    const missingRequiredFields = schema.requiredFields.filter(
      (required) => !schema.headers.some((h) => h.label.includes(required)),
    )

    if (missingRequiredFields.length > 0) {
      return {
        success: false,
        data: [],
        errors: [`缺少必要字段: ${missingRequiredFields.join(", ")}`],
        recordCount: 0,
        schema,
        mergedCells,
      }
    }

    // 解析数据
    const data: DynamicTrainData[] = []
    const errors: string[] = []

    rows.forEach((row, index) => {
      try {
        const trainData: DynamicTrainData = {
          id: `${unit}_${trainType}_${Date.now()}_${index}`,
          unit, // 添加单位信息
        }

        // 动态添加所有字段
        schema.headers.forEach((header) => {
          const value = row[header.index]
          trainData[header.label] = value || ""
        })

        // 检查是否有关键标识字段（如车次）
        const hasKeyField = schema.headers.some((h) => h.label.includes("车次") && trainData[h.label])

        if (hasKeyField) {
          data.push(trainData)
        }
      } catch (error) {
        errors.push(`第${index + headerRowCount + 1}行数据解析失败`)
      }
    })

    return {
      success: data.length > 0,
      data,
      errors,
      recordCount: data.length,
      schema,
      mergedCells,
    }
  } catch (error) {
    return {
      success: false,
      data: [],
      errors: [`文件解析失败: ${error instanceof Error ? error.message : "未知错误"}`],
      recordCount: 0,
      schema: { headers: [], requiredFields: [], dataType: trainType, unit },
      mergedCells: [],
    }
  }
}

// 读取Excel文件并返回处理后的数据（用于预览）
export async function readExcelForPreview(file: File) {
  try {
    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: "array" })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]

    const rawJsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
    const processedJsonData = processMergedCells(worksheet, rawJsonData as any[][])
    const mergedCells = getMergedCellsInfo(worksheet)

    return {
      data: processedJsonData,
      mergedCells,
      sheetNames: workbook.SheetNames,
    }
  } catch (error) {
    console.error("读取Excel文件失败:", error)
    return {
      data: [],
      mergedCells: [],
      sheetNames: [],
    }
  }
}
