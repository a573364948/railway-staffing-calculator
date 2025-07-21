"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import type {
  DynamicTrainData,
  DynamicTableSchema,
  TrainType,
  TrainUnit,
  UnitDataStats,
} from "@/types/dynamic-train-data"
import { TRAIN_UNITS } from "@/types/dynamic-train-data"

interface UnitData {
  highSpeedData: DynamicTrainData[]
  conventionalData: DynamicTrainData[]
  highSpeedSchema: DynamicTableSchema | null
  conventionalSchema: DynamicTableSchema | null
}

interface TrainDataContextType {
  // 按单位存储的数据
  unitData: Record<TrainUnit, UnitData>
  // 当前选中的单位
  currentUnit: TrainUnit
  setCurrentUnit: (unit: TrainUnit) => void
  // 数据操作方法
  addUnitData: (unit: TrainUnit, data: DynamicTrainData[], schema: DynamicTableSchema, type: TrainType) => void
  clearUnitData: (unit: TrainUnit, type?: TrainType) => void
  clearAllData: () => void
  // 获取统计信息
  getUnitStats: () => UnitDataStats[]
  // 获取当前单位数据
  getCurrentUnitData: () => UnitData
  // 获取指定单位的所有数据
  getDataByUnit: (unit: TrainUnit) => DynamicTrainData[]
  // 获取按序号分组的实际趟数
  getActualTrainCount: (trainData: DynamicTrainData[]) => number
  // 数据加载状态
  isDataLoaded: boolean
}

const TrainDataContext = createContext<TrainDataContextType | undefined>(undefined)

// 初始化单位数据结构
const createEmptyUnitData = (): UnitData => ({
  highSpeedData: [],
  conventionalData: [],
  highSpeedSchema: null,
  conventionalSchema: null,
})

// 本地存储键名
const STORAGE_KEY = "train-data-storage"

// 从localStorage加载数据
const loadFromStorage = (): Record<TrainUnit, UnitData> => {
  if (typeof window === "undefined") {
    return {
      beijing: createEmptyUnitData(),
      shijiazhuang: createEmptyUnitData(),
      tianjin: createEmptyUnitData(),
    }
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      // 验证数据结构
      if (parsed && typeof parsed === "object") {
        const result: Record<TrainUnit, UnitData> = {
          beijing: createEmptyUnitData(),
          shijiazhuang: createEmptyUnitData(),
          tianjin: createEmptyUnitData(),
        }

        // 恢复每个单位的数据
        Object.keys(result).forEach(unit => {
          if (parsed[unit]) {
            result[unit as TrainUnit] = {
              highSpeedData: parsed[unit].highSpeedData || [],
              conventionalData: parsed[unit].conventionalData || [],
              highSpeedSchema: parsed[unit].highSpeedSchema || null,
              conventionalSchema: parsed[unit].conventionalSchema || null,
            }
          }
        })

        return result
      }
    }
  } catch (error) {
    console.warn("Failed to load data from localStorage:", error)
  }

  return {
    beijing: createEmptyUnitData(),
    shijiazhuang: createEmptyUnitData(),
    tianjin: createEmptyUnitData(),
  }
}

// 保存数据到localStorage
const saveToStorage = (data: Record<TrainUnit, UnitData>) => {
  if (typeof window === "undefined") return

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch (error) {
    console.warn("Failed to save data to localStorage:", error)
  }
}

export function TrainDataProvider({ children }: { children: ReactNode }) {
  // 初始化时使用空数据，避免hydration错误
  const [unitData, setUnitData] = useState<Record<TrainUnit, UnitData>>({
    beijing: createEmptyUnitData(),
    shijiazhuang: createEmptyUnitData(),
    tianjin: createEmptyUnitData(),
  })
  const [currentUnit, setCurrentUnit] = useState<TrainUnit>("beijing")
  const [isDataLoaded, setIsDataLoaded] = useState(false)

  // 在客户端加载时从localStorage恢复数据
  useEffect(() => {
    const storedData = loadFromStorage()
    setUnitData(storedData)
    setIsDataLoaded(true)
  }, [])

  // 当数据变化时自动保存到localStorage（但跳过初始加载）
  useEffect(() => {
    if (isDataLoaded) {
      saveToStorage(unitData)
    }
  }, [unitData, isDataLoaded])

  const addUnitData = (unit: TrainUnit, data: DynamicTrainData[], schema: DynamicTableSchema, type: TrainType) => {
    setUnitData((prev) => ({
      ...prev,
      [unit]: {
        ...prev[unit],
        [type === "highSpeed" ? "highSpeedData" : "conventionalData"]: [
          ...prev[unit][type === "highSpeed" ? "highSpeedData" : "conventionalData"],
          ...data,
        ],
        [type === "highSpeed" ? "highSpeedSchema" : "conventionalSchema"]: schema,
      },
    }))
  }

  const clearUnitData = (unit: TrainUnit, type?: TrainType) => {
    setUnitData((prev) => ({
      ...prev,
      [unit]: {
        ...prev[unit],
        ...(type === "highSpeed" || !type ? { highSpeedData: [], highSpeedSchema: null } : {}),
        ...(type === "conventional" || !type ? { conventionalData: [], conventionalSchema: null } : {}),
      },
    }))
  }

  const clearAllData = () => {
    const emptyData = {
      beijing: createEmptyUnitData(),
      shijiazhuang: createEmptyUnitData(),
      tianjin: createEmptyUnitData(),
    }
    setUnitData(emptyData)
    // 立即清除localStorage
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY)
    }
  }

  // 按序号分组计算实际趟数的辅助函数
  const getActualTrainCount = (trainData: DynamicTrainData[]): number => {
    if (trainData.length === 0) return 0
    
    // 按序号分组
    const groupedBySequence = trainData.reduce((acc, train) => {
      const sequence = train['序号'] || train['sequence'] || train['编号'] || train['id'] || train['index'] || 'unknown'
      const seqKey = sequence.toString().trim()
      if (!acc[seqKey]) {
        acc[seqKey] = []
      }
      acc[seqKey].push(train)
      return acc
    }, {} as Record<string, DynamicTrainData[]>)
    
    // 返回序号组数（实际趟数）
    return Object.keys(groupedBySequence).length
  }

  const getUnitStats = (): UnitDataStats[] => {
    return Object.entries(unitData).map(([unit, data]) => {
      const highSpeedCount = getActualTrainCount(data.highSpeedData)
      const conventionalCount = getActualTrainCount(data.conventionalData)
      
      return {
        unit: unit as TrainUnit,
        unitName: TRAIN_UNITS[unit as TrainUnit],
        highSpeedCount,
        conventionalCount,
        totalCount: highSpeedCount + conventionalCount,
        lastUpdated: new Date(),
      }
    })
  }

  const getCurrentUnitData = (): UnitData => {
    return unitData[currentUnit]
  }

  const getDataByUnit = (unit: TrainUnit): DynamicTrainData[] => {
    const data = unitData[unit]
    if (!data) return []
    
    // 合并高铁和普速数据，并添加 trainType 字段
    const highSpeedData = data.highSpeedData.map(train => ({
      ...train,
      trainType: '高铁'
    }))
    const conventionalData = data.conventionalData.map(train => ({
      ...train,
      trainType: '普速'
    }))
    
    return [...highSpeedData, ...conventionalData]
  }

  return (
    <TrainDataContext.Provider
      value={{
        unitData,
        currentUnit,
        setCurrentUnit,
        addUnitData,
        clearUnitData,
        clearAllData,
        getUnitStats,
        getCurrentUnitData,
        getDataByUnit,
        getActualTrainCount,
        isDataLoaded,
      }}
    >
      {children}
    </TrainDataContext.Provider>
  )
}

export function useTrainData() {
  const context = useContext(TrainDataContext)
  if (context === undefined) {
    throw new Error("useTrainData must be used within a TrainDataProvider")
  }
  return context
}

// 导出TRAIN_UNITS供其他组件使用
export { TRAIN_UNITS }
