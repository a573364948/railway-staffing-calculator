"use client"

import { createContext, useContext, useState, useEffect, type ReactNode, useCallback } from "react"
import type { StaffingStandard, RailwayBureau } from "@/types/staffing-rules"

interface StaffingRulesContextType {
  // 标准管理
  standards: StaffingStandard[]
  currentStandard: StaffingStandard | null
  setCurrentStandard: (standard: StaffingStandard) => void
  
  // CRUD操作
  createStandard: (standard: Omit<StaffingStandard, 'id' | 'createdAt' | 'updatedAt'>) => StaffingStandard
  updateStandard: (standard: StaffingStandard) => void
  deleteStandard: (id: string) => void
  duplicateStandard: (id: string) => Partial<StaffingStandard>
  
  // 数据加载状态
  isLoaded: boolean
  
  // 保存状态
  hasUnsavedChanges: boolean
  saveChanges: () => Promise<void>
}

const StaffingRulesContext = createContext<StaffingRulesContextType | undefined>(undefined)

// 本地存储键名
const STORAGE_KEY = "staffing-rules-storage"

// 创建空的默认标准（用户将通过界面创建自定义标准）
const getDefaultStandards = (): StaffingStandard[] => []

// 修复旧格式的预备率数据
const fixLegacyReserveRates = (standard: any): StaffingStandard => {
  if (standard.reserveRates && typeof standard.reserveRates.mainProduction === 'number') {
    console.log(`🔧 修复 ${standard.name} 的旧格式预备率数据`)
    return {
      ...standard,
      reserveRates: {
        ...standard.reserveRates,
        mainProduction: {
          beijing: standard.reserveRates.mainProduction,
          shijiazhuang: standard.reserveRates.mainProduction,
          tianjin: standard.reserveRates.mainProduction
        }
      }
    }
  }
  return standard
}

// 从localStorage加载数据
const loadFromStorage = (): StaffingStandard[] => {
  if (typeof window === "undefined") {
    return getDefaultStandards()
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map(item => {
          const fixed = fixLegacyReserveRates(item)
          return {
            ...fixed,
            createdAt: new Date(fixed.createdAt),
            updatedAt: new Date(fixed.updatedAt)
          }
        })
      }
    }
  } catch (error) {
    console.warn("Failed to load staffing rules from localStorage:", error)
  }

  return getDefaultStandards()
}

// 保存数据到localStorage
const saveToStorage = (standards: StaffingStandard[]) => {
  if (typeof window === "undefined") return

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(standards))
  } catch (error) {
    console.warn("Failed to save staffing rules to localStorage:", error)
  }
}

export function StaffingRulesProvider({ children }: { children: ReactNode }) {
  const [standards, setStandards] = useState<StaffingStandard[]>([])
  const [currentStandard, setCurrentStandard] = useState<StaffingStandard | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // 在客户端加载时从localStorage恢复数据
  useEffect(() => {
    const storedStandards = loadFromStorage()
    setStandards(storedStandards)
    if (storedStandards.length > 0) {
      setCurrentStandard(storedStandards[0])
    }
    setIsLoaded(true)
  }, [])

  const saveChanges = useCallback(async () => {
    if (isLoaded) {
      saveToStorage(standards)
      setHasUnsavedChanges(false)
      console.log("✅ 定员标准已保存")
    }
  }, [standards, isLoaded])

  const createStandard = (standardData: Omit<StaffingStandard, 'id' | 'createdAt' | 'updatedAt'>): StaffingStandard => {
    const newStandard: StaffingStandard = {
      ...standardData,
      id: `standard-${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    setStandards(prev => [...prev, newStandard])
    setCurrentStandard(newStandard)
    setHasUnsavedChanges(true)
    return newStandard
  }

  const updateStandard = (updatedStandard: StaffingStandard) => {
    const updated = {
      ...updatedStandard,
      updatedAt: new Date()
    }

    setStandards(prev => prev.map(s => s.id === updated.id ? updated : s))
    setCurrentStandard(updated)
    setHasUnsavedChanges(true)
  }

  const deleteStandard = (id: string) => {
    setStandards(prev => prev.filter(s => s.id !== id))
    if (currentStandard?.id === id) {
      const remaining = standards.filter(s => s.id !== id)
      setCurrentStandard(remaining.length > 0 ? remaining[0] : null)
    }
    setHasUnsavedChanges(true)
  }

  const duplicateStandard = (id: string): Partial<StaffingStandard> => {
    const original = standards.find(s => s.id === id)
    if (!original) throw new Error("Standard not found")

    return {
      ...original,
      id: undefined,
      name: `${original.name} (副本)`,
      createdAt: undefined,
      updatedAt: undefined
    }
  }

  return (
    <StaffingRulesContext.Provider
      value={{
        standards,
        currentStandard,
        setCurrentStandard,
        createStandard,
        updateStandard,
        deleteStandard,
        duplicateStandard,
        isLoaded,
        hasUnsavedChanges,
        saveChanges
      }}
    >
      {children}
    </StaffingRulesContext.Provider>
  )
}

export function useStaffingRules() {
  const context = useContext(StaffingRulesContext)
  if (context === undefined) {
    throw new Error("useStaffingRules must be used within a StaffingRulesProvider")
  }
  return context
}
