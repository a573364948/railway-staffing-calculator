// 保存状态指示器组件

import React from 'react'
import { CheckCircle, AlertCircle, Loader2, Clock } from 'lucide-react'
import { Badge } from './badge'

interface SaveStatusIndicatorProps {
  isSaving: boolean
  hasUnsavedChanges: boolean
}

export function SaveStatusIndicator({
  isSaving,
  hasUnsavedChanges,
}: SaveStatusIndicatorProps) {
  
  // 保存中状态
  if (isSaving) {
    return (
      <Badge variant="outline" className="animate-pulse border-blue-300 text-blue-600">
        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
        正在保存...
      </Badge>
    )
  }
  
  // 有未保存更改
  if (hasUnsavedChanges) {
    return (
      <Badge variant="outline" className="border-orange-300 bg-orange-50 text-orange-700">
        <Clock className="h-3 w-3 mr-1" />
        有未保存更改
      </Badge>
    )
  }
  
  // 已保存状态
  return (
    <Badge variant="outline" className="border-green-300 bg-green-50 text-green-700">
      <CheckCircle className="h-3 w-3 mr-1" />
      已保存
    </Badge>
  )
}