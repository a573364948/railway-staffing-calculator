// 自动保存Hook - 统一保存机制

import { useEffect, useRef, useState } from 'react'
import { useCallback } from 'react'

interface AutoSaveOptions {
  delay?: number // 延迟时间，默认1000ms
  onSave?: () => Promise<void> | void
  onError?: (error: Error) => void
}

interface AutoSaveState {
  isSaving: boolean
  hasUnsavedChanges: boolean
  lastSaved: Date | null
  saveError: string | null
}

export function useAutoSave(options: AutoSaveOptions) {
  const { delay = 1000, onSave, onError } = options
  const [state, setState] = useState<AutoSaveState>({
    isSaving: false,
    hasUnsavedChanges: false,
    lastSaved: null,
    saveError: null
  })
  
  const timeoutRef = useRef<NodeJS.Timeout>()
  const pendingChangesRef = useRef(false)
  
  // 触发保存
  const triggerSave = useCallback(async () => {
    if (!onSave) return
    
    setState(prev => ({ ...prev, isSaving: true, saveError: null }))
    
    try {
      await onSave()
      setState(prev => ({
        ...prev,
        isSaving: false,
        hasUnsavedChanges: false,
        lastSaved: new Date(),
        saveError: null
      }))
      pendingChangesRef.current = false
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '保存失败'
      setState(prev => ({
        ...prev,
        isSaving: false,
        saveError: errorMsg
      }))
      onError?.(error instanceof Error ? error : new Error(errorMsg))
    }
  }, [onSave, onError])
  
  // 标记有变更
  const markChanged = useCallback(() => {
    setState(prev => ({ ...prev, hasUnsavedChanges: true, saveError: null }))
    pendingChangesRef.current = true
    
    // 清除之前的定时器
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    
    // 设置新的延迟保存
    timeoutRef.current = setTimeout(() => {
      triggerSave()
    }, delay)
  }, [delay, triggerSave])
  
  // 立即保存
  const saveNow = useCallback(async () => {
    // 清除定时器
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    
    await triggerSave()
  }, [triggerSave])
  
  // 清理定时器
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])
  
  return {
    ...state,
    markChanged,
    saveNow,
    canSave: state.hasUnsavedChanges && !state.isSaving
  }
}