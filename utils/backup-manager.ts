// 备份和恢复管理器

import type { 
  BackupData, 
  BackupResult, 
  RestoreResult, 
  BackupValidation,
  BACKUP_VERSION 
} from '@/types/backup'
import type { DynamicTrainData } from '@/types/dynamic-train-data'

export class BackupManager {
  private static readonly BACKUP_VERSION = '1.0.0'
  private static readonly FILE_PREFIX = 'dingyuan-backup'
  
  // 创建完整系统备份
  static async createBackup(): Promise<BackupResult> {
    try {
      console.log('🔄 开始创建系统备份...')
      
      // 收集所有数据
      const backupData = await this.collectAllData()
      
      // 生成备份文件
      const fileName = this.generateFileName()
      const jsonString = JSON.stringify(backupData, null, 2)
      const fileSize = new Blob([jsonString]).size
      
      // 下载备份文件
      this.downloadBackupFile(jsonString, fileName)
      
      console.log('✅ 备份创建成功')
      
      return {
        success: true,
        message: '备份文件已成功创建并下载',
        fileName,
        fileSize,
        dataStats: {
          rulesCount: backupData.staffingRules.standards.length,
          trainDataCount: backupData.trainData.highSpeedData.length + backupData.trainData.conventionalData.length
        }
      }
    } catch (error) {
      console.error('❌ 备份创建失败:', error)
      return {
        success: false,
        message: `备份创建失败: ${error instanceof Error ? error.message : '未知错误'}`
      }
    }
  }
  
  // 收集所有需要备份的数据
  private static async collectAllData(): Promise<BackupData> {
    // 从localStorage读取数据（使用实际的key名称）
    const staffingRulesStorage = this.getLocalStorageData('staffing-rules-storage')
    const trainDataStorage = this.getLocalStorageData('train-data-storage')
    const themeData = this.getLocalStorageData('theme')
    
    console.log('🔍 读取localStorage数据:')
    console.log('  定员规则数据:', staffingRulesStorage ? `${JSON.stringify(staffingRulesStorage).length}字符` : '无数据')
    console.log('  列车数据:', trainDataStorage ? `${JSON.stringify(trainDataStorage).length}字符` : '无数据')
    
    // 处理定员规则数据结构
    // staffing-rules-storage 直接存储 StaffingStandard[] 数组
    const staffingStandards = Array.isArray(staffingRulesStorage) ? staffingRulesStorage : []
    
    // 处理列车数据结构
    // train-data-storage 存储按客运段分组的数据：{ beijing: UnitData, shijiazhuang: UnitData, tianjin: UnitData }
    let allHighSpeedData: any[] = []
    let allConventionalData: any[] = []
    let currentUnit = 'beijing'
    
    if (trainDataStorage && typeof trainDataStorage === 'object') {
      // 合并所有客运段的数据
      Object.entries(trainDataStorage).forEach(([unit, unitData]: [string, any]) => {
        if (unitData && typeof unitData === 'object') {
          if (Array.isArray(unitData.highSpeedData)) {
            allHighSpeedData.push(...unitData.highSpeedData)
          }
          if (Array.isArray(unitData.conventionalData)) {
            allConventionalData.push(...unitData.conventionalData)
          }
          // 使用第一个有数据的单位作为当前单位
          if ((unitData.highSpeedData?.length > 0 || unitData.conventionalData?.length > 0) && currentUnit === 'beijing') {
            currentUnit = unit
          }
        }
      })
    }
    
    // 计算统计信息
    const rulesCount = staffingStandards.length
    const trainDataCount = allHighSpeedData.length + allConventionalData.length
    
    console.log('📊 数据统计:')
    console.log(`  定员规则: ${rulesCount}个`)
    console.log(`  列车数据: ${trainDataCount}条`)
    console.log(`  高铁数据: ${allHighSpeedData.length}条`)
    console.log(`  普速数据: ${allConventionalData.length}条`)
    
    // 获取当前标准（从第一个标准或localStorage中获取）
    const currentStandardId = staffingStandards.length > 0 ? staffingStandards[0].id : null
    
    // 获取系统信息
    const systemInfo = this.getSystemInfo()
    const fileSize = this.estimateDataSize({
      staffingRules: staffingStandards,
      trainData: { allHighSpeedData, allConventionalData },
      systemConfig: { theme: themeData }
    })
    
    const backupData: BackupData = {
      metadata: {
        version: this.BACKUP_VERSION,
        createdAt: new Date().toISOString(),
        exportedBy: 'dingyuan-system',
        systemInfo,
        dataStats: {
          rulesCount,
          trainDataCount,
          totalSize: fileSize
        }
      },
      
      staffingRules: {
        standards: staffingStandards,
        currentStandardId
      },
      
      trainData: {
        highSpeedData: allHighSpeedData,
        conventionalData: allConventionalData,
        currentUnit: currentUnit as any,
        lastUpdated: new Date().toISOString()
      },
      
      systemConfig: {
        theme: themeData?.theme || 'default',
        preferences: themeData?.preferences || {}
      },
      
      userConfig: {
        headerMappings: this.getLocalStorageData('header-mappings') || {},
        customSettings: this.getLocalStorageData('custom-settings') || {}
      }
    }
    
    return backupData
  }
  
  // 从localStorage读取数据
  private static getLocalStorageData(key: string): any {
    try {
      const data = localStorage.getItem(key)
      return data ? JSON.parse(data) : null
    } catch (error) {
      console.warn(`读取 ${key} 数据失败:`, error)
      return null
    }
  }
  
  // 获取系统信息
  private static getSystemInfo() {
    return {
      appVersion: '1.0.0', // 可以从package.json读取
      browserInfo: `${navigator.userAgent.substring(0, 100)}...`
    }
  }
  
  // 估算数据大小
  private static estimateDataSize(data: any): string {
    const jsonString = JSON.stringify(data)
    const sizeInBytes = new Blob([jsonString]).size
    
    if (sizeInBytes < 1024) {
      return `${sizeInBytes} B`
    } else if (sizeInBytes < 1024 * 1024) {
      return `${(sizeInBytes / 1024).toFixed(1)} KB`
    } else {
      return `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`
    }
  }
  
  // 生成备份文件名
  private static generateFileName(): string {
    const now = new Date()
    const timestamp = now.toISOString().replace(/[:.]/g, '-').substring(0, 19)
    return `${this.FILE_PREFIX}-${timestamp}.json`
  }
  
  // 下载备份文件
  private static downloadBackupFile(content: string, fileName: string) {
    const blob = new Blob([content], { type: 'application/json;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    link.style.display = 'none'
    
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    // 清理URL对象
    setTimeout(() => URL.revokeObjectURL(url), 100)
  }
  
  // 验证备份文件
  static async validateBackupFile(file: File): Promise<BackupValidation> {
    try {
      const content = await this.readFileContent(file)
      const data = JSON.parse(content) as BackupData
      
      const errors: string[] = []
      const warnings: string[] = []
      
      // 验证必需字段
      if (!data.metadata) {
        errors.push('缺少备份元数据')
      } else {
        if (!data.metadata.version) {
          errors.push('缺少版本信息')
        } else if (data.metadata.version !== this.BACKUP_VERSION) {
          warnings.push(`版本不匹配：备份文件版本 ${data.metadata.version}，当前系统版本 ${this.BACKUP_VERSION}`)
        }
        
        if (!data.metadata.createdAt) {
          warnings.push('缺少创建时间信息')
        }
      }
      
      if (!data.staffingRules) {
        errors.push('缺少定员规则数据')
      }
      
      if (!data.trainData) {
        errors.push('缺少列车数据')
      }
      
      // 验证数据结构
      if (data.staffingRules && !Array.isArray(data.staffingRules.standards)) {
        errors.push('定员规则数据格式错误')
      }
      
      if (data.trainData) {
        if (!Array.isArray(data.trainData.highSpeedData)) {
          warnings.push('高铁数据格式异常')
        }
        if (!Array.isArray(data.trainData.conventionalData)) {
          warnings.push('普速数据格式异常')
        }
      }
      
      return {
        isValid: errors.length === 0,
        version: data.metadata?.version || 'unknown',
        errors,
        warnings,
        preview: {
          rulesCount: data.staffingRules?.standards?.length || 0,
          trainDataCount: (data.trainData?.highSpeedData?.length || 0) + 
                         (data.trainData?.conventionalData?.length || 0),
          createdAt: data.metadata?.createdAt || 'unknown',
          systemInfo: data.metadata?.systemInfo?.appVersion || 'unknown'
        }
      }
    } catch (error) {
      return {
        isValid: false,
        version: 'unknown',
        errors: [`文件解析失败: ${error instanceof Error ? error.message : '未知错误'}`],
        warnings: [],
        preview: {
          rulesCount: 0,
          trainDataCount: 0,
          createdAt: 'unknown',
          systemInfo: 'unknown'
        }
      }
    }
  }
  
  // 恢复备份数据
  static async restoreBackup(file: File): Promise<RestoreResult> {
    try {
      console.log('🔄 开始恢复备份...')
      
      // 验证文件
      const validation = await this.validateBackupFile(file)
      if (!validation.isValid) {
        return {
          success: false,
          message: `备份文件验证失败: ${validation.errors.join(', ')}`
        }
      }
      
      // 读取并解析数据
      const content = await this.readFileContent(file)
      const data = JSON.parse(content) as BackupData
      
      // 恢复数据
      const restored = await this.restoreAllData(data)
      
      console.log('✅ 备份恢复成功')
      
      return {
        success: true,
        message: '备份数据已成功恢复',
        warnings: validation.warnings,
        restored
      }
    } catch (error) {
      console.error('❌ 备份恢复失败:', error)
      return {
        success: false,
        message: `备份恢复失败: ${error instanceof Error ? error.message : '未知错误'}`
      }
    }
  }
  
  // 恢复所有数据到localStorage
  private static async restoreAllData(data: BackupData) {
    let restoredRules = 0
    let restoredTrainData = 0
    let restoredConfigs = 0
    
    try {
      // 恢复定员规则数据
      if (data.staffingRules && data.staffingRules.standards) {
        // 使用实际的localStorage key名称
        localStorage.setItem('staffing-rules-storage', JSON.stringify(data.staffingRules.standards))
        console.log(`✅ 恢复定员规则: ${data.staffingRules.standards.length}个`)
        restoredRules = data.staffingRules.standards.length
      }
      
      // 恢复列车数据
      if (data.trainData) {
        // 构造按客运段分组的数据结构
        const currentUnit = data.trainData.currentUnit || 'beijing'
        const trainDataByUnit = {
          beijing: { highSpeedData: [] as DynamicTrainData[], conventionalData: [] as DynamicTrainData[] },
          shijiazhuang: { highSpeedData: [] as DynamicTrainData[], conventionalData: [] as DynamicTrainData[] },
          tianjin: { highSpeedData: [] as DynamicTrainData[], conventionalData: [] as DynamicTrainData[] }
        }
        
        // 将数据分配到当前单位
        if (data.trainData.highSpeedData || data.trainData.conventionalData) {
          trainDataByUnit[currentUnit as keyof typeof trainDataByUnit] = {
            highSpeedData: data.trainData.highSpeedData || [],
            conventionalData: data.trainData.conventionalData || []
          }
        }
        
        localStorage.setItem('train-data-storage', JSON.stringify(trainDataByUnit))
        console.log(`✅ 恢复列车数据: 高铁${data.trainData.highSpeedData?.length || 0}条, 普速${data.trainData.conventionalData?.length || 0}条`)
        restoredTrainData = (data.trainData.highSpeedData?.length || 0) + (data.trainData.conventionalData?.length || 0)
      }
      
      // 恢复系统配置
      if (data.systemConfig) {
        localStorage.setItem('theme', JSON.stringify({
          theme: data.systemConfig.theme,
          preferences: data.systemConfig.preferences
        }))
        restoredConfigs++
      }
      
      // 恢复用户配置
      if (data.userConfig) {
        if (data.userConfig.headerMappings) {
          localStorage.setItem('header-mappings', JSON.stringify(data.userConfig.headerMappings))
          restoredConfigs++
        }
        
        if (data.userConfig.customSettings) {
          localStorage.setItem('custom-settings', JSON.stringify(data.userConfig.customSettings))
          restoredConfigs++
        }
      }
      
      return {
        rules: restoredRules,
        trainData: restoredTrainData,
        configs: restoredConfigs
      }
    } catch (error) {
      console.error('数据恢复过程中出错:', error)
      throw new Error(`数据恢复失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }
  
  // 读取文件内容
  private static readFileContent(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      
      reader.onload = (event) => {
        if (event.target?.result) {
          resolve(event.target.result as string)
        } else {
          reject(new Error('文件读取失败'))
        }
      }
      
      reader.onerror = () => {
        reject(new Error('文件读取错误'))
      }
      
      reader.readAsText(file, 'utf-8')
    })
  }
}