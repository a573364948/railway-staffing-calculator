export type TrainUnit = "beijing" | "shijiazhuang" | "tianjin"

export const TRAIN_UNITS = {
  beijing: "北京客运段",
  shijiazhuang: "石家庄客运段",
  tianjin: "天津客运段",
} as const

// 动态数据结构，支持任意字段
export interface DynamicTrainData {
  id: string
  unit: TrainUnit // 添加单位字段
  [key: string]: any // 支持任意字段名
}

export interface TableHeader {
  key: string
  label: string
  index: number
  isRequired?: boolean
  dataType?: "text" | "number" | "time" | "date"
}

export interface DynamicTableSchema {
  headers: TableHeader[]
  requiredFields: string[]
  dataType: TrainType
  unit: TrainUnit // 添加单位字段
}

export type TrainType = "highSpeed" | "conventional"

export interface ParseResult {
  success: boolean
  data: DynamicTrainData[]
  errors: string[]
  recordCount: number
  schema: DynamicTableSchema
}

// 单位数据统计
export interface UnitDataStats {
  unit: TrainUnit
  unitName: string
  highSpeedCount: number
  conventionalCount: number
  totalCount: number
  lastUpdated?: Date
}
