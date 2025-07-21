// 备份和恢复功能相关类型定义

import type { StaffingStandard } from './staffing-rules'
import type { DynamicTrainData } from './dynamic-train-data'

// 备份文件格式版本
export const BACKUP_VERSION = '1.0.0'

// 备份数据结构
export interface BackupData {
  // 元数据
  metadata: {
    version: string
    createdAt: string
    exportedBy: string
    systemInfo: {
      appVersion: string
      browserInfo: string
    }
    dataStats: {
      rulesCount: number
      trainDataCount: number
      totalSize: string
    }
  }

  // 定员规则数据
  staffingRules: {
    standards: StaffingStandard[]
    currentStandardId: string | null
  }

  // 列车数据
  trainData: {
    highSpeedData: DynamicTrainData[]
    conventionalData: DynamicTrainData[]
    currentUnit: string
    lastUpdated: string
  }

  // 系统配置
  systemConfig: {
    theme: string
    preferences: {
      [key: string]: any
    }
  }

  // 用户自定义配置
  userConfig: {
    headerMappings: {
      [key: string]: any
    }
    customSettings: {
      [key: string]: any
    }
  }
}

// 备份操作结果
export interface BackupResult {
  success: boolean
  message: string
  fileName?: string
  fileSize?: number
  dataStats?: {
    rulesCount: number
    trainDataCount: number
  }
}

// 恢复操作结果
export interface RestoreResult {
  success: boolean
  message: string
  warnings?: string[]
  restored?: {
    rules: number
    trainData: number
    configs: number
  }
}

// 备份文件验证结果
export interface BackupValidation {
  isValid: boolean
  version: string
  errors: string[]
  warnings: string[]
  preview: {
    rulesCount: number
    trainDataCount: number
    createdAt: string
    systemInfo: string
  }
}