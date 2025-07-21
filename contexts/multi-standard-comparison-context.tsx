"use client"

import React, { createContext, useContext, useReducer, ReactNode } from 'react'
import type { RailwayBureau } from '@/types'

export interface ComparisonResult {
  standardId: string
  standardName: string
  bureauId?: string
  bureauName?: string
  highSpeed: {
    totalStaff: number
    details: any
    unmatchedCount: number
  }
  conventional: {
    totalStaff: number
    details: any
    unmatchedCount: number
  }
  otherProduction: {
    totalStaff: number
    details: any
  }
  summary: {
    totalStaff: number
    coverageRate: number
    unmatchedTrains: number
  }
}

export interface MultiStandardComparisonState {
  selectedStandards: string[]
  selectedBureaus: RailwayBureau[]
  comparisonResults: Record<string, ComparisonResult> | null
  bureauGroupedResults: Record<string, Record<string, ComparisonResult>> | null
  displayMode: 'merged' | 'grouped'
  isCalculating: boolean
  lastCalculationTime: Date | null
}

type MultiStandardComparisonAction =
  | { type: 'TOGGLE_STANDARD'; payload: string }
  | { type: 'CLEAR_ALL_STANDARDS' }
  | { type: 'SET_SELECTED_STANDARDS'; payload: string[] }
  | { type: 'TOGGLE_BUREAU'; payload: RailwayBureau }
  | { type: 'SET_SELECTED_BUREAUS'; payload: RailwayBureau[] }
  | { type: 'SET_COMPARISON_RESULTS'; payload: Record<string, ComparisonResult> | null }
  | { type: 'SET_BUREAU_GROUPED_RESULTS'; payload: Record<string, Record<string, ComparisonResult>> | null }
  | { type: 'SET_DISPLAY_MODE'; payload: 'merged' | 'grouped' }
  | { type: 'SET_IS_CALCULATING'; payload: boolean }
  | { type: 'RESET_STATE' }

const initialState: MultiStandardComparisonState = {
  selectedStandards: [],
  selectedBureaus: [],
  comparisonResults: null,
  bureauGroupedResults: null,
  displayMode: 'grouped',
  isCalculating: false,
  lastCalculationTime: null
}

function multiStandardComparisonReducer(
  state: MultiStandardComparisonState,
  action: MultiStandardComparisonAction
): MultiStandardComparisonState {
  switch (action.type) {
    case 'TOGGLE_STANDARD': {
      const standardId = action.payload
      const isSelected = state.selectedStandards.includes(standardId)
      
      if (isSelected) {
        return {
          ...state,
          selectedStandards: state.selectedStandards.filter(id => id !== standardId),
          comparisonResults: null // 清空结果，因为选择发生了变化
        }
      } else {
        // 限制最多选择5个标准
        if (state.selectedStandards.length >= 5) {
          return state
        }
        return {
          ...state,
          selectedStandards: [...state.selectedStandards, standardId],
          comparisonResults: null
        }
      }
    }

    case 'CLEAR_ALL_STANDARDS':
      return {
        ...state,
        selectedStandards: [],
        comparisonResults: null
      }

    case 'SET_SELECTED_STANDARDS':
      return {
        ...state,
        selectedStandards: action.payload.slice(0, 5), // 限制最多5个
        comparisonResults: null
      }

    case 'TOGGLE_BUREAU': {
      const bureau = action.payload
      const isSelected = state.selectedBureaus.includes(bureau)
      
      if (isSelected) {
        return {
          ...state,
          selectedBureaus: state.selectedBureaus.filter(b => b !== bureau),
          comparisonResults: null
        }
      } else {
        return {
          ...state,
          selectedBureaus: [...state.selectedBureaus, bureau],
          comparisonResults: null
        }
      }
    }

    case 'SET_SELECTED_BUREAUS':
      return {
        ...state,
        selectedBureaus: action.payload,
        comparisonResults: null
      }

    case 'SET_COMPARISON_RESULTS':
      return {
        ...state,
        comparisonResults: action.payload,
        lastCalculationTime: action.payload ? new Date() : null
      }

    case 'SET_BUREAU_GROUPED_RESULTS':
      return {
        ...state,
        bureauGroupedResults: action.payload,
        lastCalculationTime: action.payload ? new Date() : null
      }

    case 'SET_DISPLAY_MODE':
      return {
        ...state,
        displayMode: action.payload
      }

    case 'SET_IS_CALCULATING':
      return {
        ...state,
        isCalculating: action.payload
      }

    case 'RESET_STATE':
      return initialState

    default:
      return state
  }
}

const MultiStandardComparisonContext = createContext<{
  state: MultiStandardComparisonState
  dispatch: React.Dispatch<MultiStandardComparisonAction>
} | undefined>(undefined)

export function MultiStandardComparisonProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(multiStandardComparisonReducer, initialState)

  return (
    <MultiStandardComparisonContext.Provider value={{ state, dispatch }}>
      {children}
    </MultiStandardComparisonContext.Provider>
  )
}

export function useMultiStandardComparison() {
  const context = useContext(MultiStandardComparisonContext)
  if (context === undefined) {
    throw new Error('useMultiStandardComparison must be used within a MultiStandardComparisonProvider')
  }

  const { state, dispatch } = context

  return {
    // State
    selectedStandards: state.selectedStandards,
    selectedBureaus: state.selectedBureaus,
    comparisonResults: state.comparisonResults,
    bureauGroupedResults: state.bureauGroupedResults,
    displayMode: state.displayMode,
    isCalculating: state.isCalculating,
    lastCalculationTime: state.lastCalculationTime,

    // Computed values
    canCalculate: state.selectedStandards.length >= 2 && state.selectedBureaus.length > 0,
    hasResults: state.comparisonResults !== null || state.bureauGroupedResults !== null,

    // Actions for standards
    toggleStandard: (standardId: string) => {
      dispatch({ type: 'TOGGLE_STANDARD', payload: standardId })
    },
    clearAllStandards: () => {
      dispatch({ type: 'CLEAR_ALL_STANDARDS' })
    },
    setSelectedStandards: (standards: string[]) => {
      dispatch({ type: 'SET_SELECTED_STANDARDS', payload: standards })
    },

    // Actions for bureaus
    toggleBureau: (bureau: RailwayBureau) => {
      dispatch({ type: 'TOGGLE_BUREAU', payload: bureau })
    },
    setSelectedBureaus: (bureaus: RailwayBureau[]) => {
      dispatch({ type: 'SET_SELECTED_BUREAUS', payload: bureaus })
    },

    // Actions for results
    setComparisonResults: (results: Record<string, ComparisonResult> | null) => {
      dispatch({ type: 'SET_COMPARISON_RESULTS', payload: results })
    },
    setBureauGroupedResults: (results: Record<string, Record<string, ComparisonResult>> | null) => {
      dispatch({ type: 'SET_BUREAU_GROUPED_RESULTS', payload: results })
    },
    setDisplayMode: (mode: 'merged' | 'grouped') => {
      dispatch({ type: 'SET_DISPLAY_MODE', payload: mode })
    },
    setIsCalculating: (isCalculating: boolean) => {
      dispatch({ type: 'SET_IS_CALCULATING', payload: isCalculating })
    },

    // Utility actions
    resetState: () => {
      dispatch({ type: 'RESET_STATE' })
    },

    // Helper functions
    getResultsForStandard: (standardId: string): ComparisonResult | null => {
      return state.comparisonResults?.[standardId] || null
    },
    getBureauResultsForStandard: (bureauId: string, standardId: string): ComparisonResult | null => {
      return state.bureauGroupedResults?.[bureauId]?.[standardId] || null
    },

    getAllResults: (): ComparisonResult[] => {
      if (!state.comparisonResults) return []
      return Object.values(state.comparisonResults)
    },

    getComparisonSummary: () => {
      if (!state.comparisonResults) return null
      
      const results = Object.values(state.comparisonResults)
      const minTotal = Math.min(...results.map(r => r.summary.totalStaff))
      const maxTotal = Math.max(...results.map(r => r.summary.totalStaff))
      const avgTotal = results.reduce((sum, r) => sum + r.summary.totalStaff, 0) / results.length
      const totalRange = maxTotal - minTotal
      const avgCoverageRate = results.reduce((sum, r) => sum + r.summary.coverageRate, 0) / results.length

      return {
        standardCount: results.length,
        minTotal,
        maxTotal,
        avgTotal: Math.round(avgTotal),
        totalRange,
        avgCoverageRate: Math.round(avgCoverageRate * 100) / 100,
        hasSignificantDifference: totalRange > avgTotal * 0.1 // 差异超过平均值的10%视为显著差异
      }
    }
  }
}

// 导出类型
export type { MultiStandardComparisonState, MultiStandardComparisonAction }