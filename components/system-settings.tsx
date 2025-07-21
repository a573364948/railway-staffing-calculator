"use client"

import React, { useState, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import { 
  Download, 
  Upload, 
  Settings, 
  Database, 
  Shield, 
  AlertTriangle,
  CheckCircle,
  Info,
  FileText,
  HardDrive,
  Clock,
  Users
} from "lucide-react"
import { PageContainer } from "./page-container"
import { BackupManager } from "@/utils/backup-manager"
import type { BackupResult, RestoreResult, BackupValidation } from "@/types/backup"

export function SystemSettings() {
  const [isBackingUp, setIsBackingUp] = useState(false)
  const [isRestoring, setIsRestoring] = useState(false)
  const [backupResult, setBackupResult] = useState<BackupResult | null>(null)
  const [restoreResult, setRestoreResult] = useState<RestoreResult | null>(null)
  const [validation, setValidation] = useState<BackupValidation | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 处理备份操作
  const handleBackup = async () => {
    setIsBackingUp(true)
    setBackupResult(null)
    
    try {
      const result = await BackupManager.createBackup()
      setBackupResult(result)
    } catch (error) {
      setBackupResult({
        success: false,
        message: `备份失败: ${error instanceof Error ? error.message : '未知错误'}`
      })
    } finally {
      setIsBackingUp(false)
    }
  }

  // 处理文件选择
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setSelectedFile(file)
    setValidation(null)
    setRestoreResult(null)

    // 验证文件
    try {
      const validationResult = await BackupManager.validateBackupFile(file)
      setValidation(validationResult)
    } catch (error) {
      setValidation({
        isValid: false,
        version: 'unknown',
        errors: [`文件验证失败: ${error instanceof Error ? error.message : '未知错误'}`],
        warnings: [],
        preview: {
          rulesCount: 0,
          trainDataCount: 0,
          createdAt: 'unknown',
          systemInfo: 'unknown'
        }
      })
    }
  }

  // 处理恢复操作
  const handleRestore = async () => {
    if (!selectedFile || !validation?.isValid) return

    setIsRestoring(true)
    setRestoreResult(null)

    try {
      const result = await BackupManager.restoreBackup(selectedFile)
      setRestoreResult(result)
      
      if (result.success) {
        // 恢复成功后刷新页面
        setTimeout(() => {
          window.location.reload()
        }, 2000)
      }
    } catch (error) {
      setRestoreResult({
        success: false,
        message: `恢复失败: ${error instanceof Error ? error.message : '未知错误'}`
      })
    } finally {
      setIsRestoring(false)
    }
  }

  // 清除文件选择
  const clearFileSelection = () => {
    setSelectedFile(null)
    setValidation(null)
    setRestoreResult(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // 格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <PageContainer>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">系统设置</h1>
            <p className="text-muted-foreground mt-2">
              管理系统配置、数据备份和恢复
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="text-sm">
              <Database className="h-3 w-3 mr-1" />
              数据管理
            </Badge>
          </div>
        </div>

        {/* 数据备份部分 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <Download className="h-5 w-5" />
                <span>数据备份</span>
              </CardTitle>
              <Badge variant="secondary">导出数据</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground">
              备份包含所有导入的列车数据、配置的定员规则、系统设置等信息，建议定期备份以防数据丢失。
            </div>

            <div className="flex items-center space-x-4">
              <Button 
                onClick={handleBackup}
                disabled={isBackingUp}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isBackingUp ? (
                  <>
                    <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    创建备份中...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    创建完整备份
                  </>
                )}
              </Button>

              <div className="text-sm text-muted-foreground">
                备份文件将自动下载到您的设备
              </div>
            </div>

            {/* 备份进度 */}
            {isBackingUp && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>正在收集数据...</span>
                  <span>请稍候</span>
                </div>
                <Progress value={undefined} className="h-2" />
              </div>
            )}

            {/* 备份结果 */}
            {backupResult && (
              <Alert className={backupResult.success ? "border-green-500 bg-green-50" : "border-red-500 bg-red-50"}>
                <div className="flex items-center space-x-2">
                  {backupResult.success ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                  )}
                  <AlertDescription className="flex-1">
                    <div className="space-y-2">
                      <div>{backupResult.message}</div>
                      {backupResult.success && backupResult.dataStats && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3 p-3 bg-white rounded border">
                          <div className="flex items-center space-x-2">
                            <FileText className="h-4 w-4 text-blue-500" />
                            <div>
                              <div className="text-sm font-medium">{backupResult.dataStats.rulesCount}</div>
                              <div className="text-xs text-muted-foreground">定员规则</div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Database className="h-4 w-4 text-green-500" />
                            <div>
                              <div className="text-sm font-medium">{backupResult.dataStats.trainDataCount}</div>
                              <div className="text-xs text-muted-foreground">列车数据</div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <HardDrive className="h-4 w-4 text-purple-500" />
                            <div>
                              <div className="text-sm font-medium">{formatFileSize(backupResult.fileSize || 0)}</div>
                              <div className="text-xs text-muted-foreground">文件大小</div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </AlertDescription>
                </div>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* 数据恢复部分 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <Upload className="h-5 w-5" />
                <span>数据恢复</span>
              </CardTitle>
              <Badge variant="secondary">导入数据</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground">
              从备份文件恢复系统数据。<span className="text-red-600 font-medium">注意：恢复操作将覆盖当前所有数据，请谨慎操作。</span>
            </div>

            {/* 文件选择 */}
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  className="border-dashed"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  选择备份文件
                </Button>
                
                {selectedFile && (
                  <div className="flex items-center space-x-2">
                    <div className="text-sm">
                      已选择: <span className="font-medium">{selectedFile.name}</span>
                      <span className="text-muted-foreground ml-2">({formatFileSize(selectedFile.size)})</span>
                    </div>
                    <Button
                      onClick={clearFileSelection}
                      variant="ghost"
                      size="sm"
                    >
                      清除
                    </Button>
                  </div>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
            </div>

            {/* 文件验证结果 */}
            {validation && (
              <Alert className={validation.isValid ? "border-green-500 bg-green-50" : "border-red-500 bg-red-50"}>
                <div className="flex items-center space-x-2">
                  {validation.isValid ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                  )}
                  <AlertDescription className="flex-1">
                    <div className="space-y-3">
                      <div className="font-medium">
                        {validation.isValid ? "文件验证成功" : "文件验证失败"}
                      </div>
                      
                      {/* 错误信息 */}
                      {validation.errors.length > 0 && (
                        <div className="space-y-1">
                          <div className="text-sm font-medium text-red-600">错误：</div>
                          {validation.errors.map((error, index) => (
                            <div key={index} className="text-sm text-red-600">• {error}</div>
                          ))}
                        </div>
                      )}

                      {/* 警告信息 */}
                      {validation.warnings.length > 0 && (
                        <div className="space-y-1">
                          <div className="text-sm font-medium text-orange-600">警告：</div>
                          {validation.warnings.map((warning, index) => (
                            <div key={index} className="text-sm text-orange-600">• {warning}</div>
                          ))}
                        </div>
                      )}

                      {/* 预览信息 */}
                      {validation.isValid && (
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-3 bg-white rounded border">
                          <div className="flex items-center space-x-2">
                            <FileText className="h-4 w-4 text-blue-500" />
                            <div>
                              <div className="text-sm font-medium">{validation.preview.rulesCount}</div>
                              <div className="text-xs text-muted-foreground">定员规则</div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Database className="h-4 w-4 text-green-500" />
                            <div>
                              <div className="text-sm font-medium">{validation.preview.trainDataCount}</div>
                              <div className="text-xs text-muted-foreground">列车数据</div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Clock className="h-4 w-4 text-purple-500" />
                            <div>
                              <div className="text-sm font-medium">
                                {new Date(validation.preview.createdAt).toLocaleDateString()}
                              </div>
                              <div className="text-xs text-muted-foreground">创建日期</div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Settings className="h-4 w-4 text-gray-500" />
                            <div>
                              <div className="text-sm font-medium">v{validation.version}</div>
                              <div className="text-xs text-muted-foreground">备份版本</div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </AlertDescription>
                </div>
              </Alert>
            )}

            {/* 恢复按钮 */}
            {validation?.isValid && (
              <div className="flex items-center space-x-4">
                <Button 
                  onClick={handleRestore}
                  disabled={isRestoring}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {isRestoring ? (
                    <>
                      <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      恢复数据中...
                    </>
                  ) : (
                    <>
                      <Shield className="h-4 w-4 mr-2" />
                      确认恢复数据
                    </>
                  )}
                </Button>

                <div className="text-sm text-muted-foreground">
                  恢复完成后页面将自动刷新
                </div>
              </div>
            )}

            {/* 恢复进度 */}
            {isRestoring && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>正在恢复数据...</span>
                  <span>请稍候</span>
                </div>
                <Progress value={undefined} className="h-2" />
              </div>
            )}

            {/* 恢复结果 */}
            {restoreResult && (
              <Alert className={restoreResult.success ? "border-green-500 bg-green-50" : "border-red-500 bg-red-50"}>
                <div className="flex items-center space-x-2">
                  {restoreResult.success ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                  )}
                  <AlertDescription className="flex-1">
                    <div className="space-y-2">
                      <div>{restoreResult.message}</div>
                      
                      {restoreResult.success && restoreResult.restored && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3 p-3 bg-white rounded border">
                          <div className="flex items-center space-x-2">
                            <FileText className="h-4 w-4 text-blue-500" />
                            <div>
                              <div className="text-sm font-medium">{restoreResult.restored.rules}</div>
                              <div className="text-xs text-muted-foreground">已恢复规则</div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Database className="h-4 w-4 text-green-500" />
                            <div>
                              <div className="text-sm font-medium">{restoreResult.restored.trainData}</div>
                              <div className="text-xs text-muted-foreground">已恢复数据</div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Settings className="h-4 w-4 text-purple-500" />
                            <div>
                              <div className="text-sm font-medium">{restoreResult.restored.configs}</div>
                              <div className="text-xs text-muted-foreground">已恢复配置</div>
                            </div>
                          </div>
                        </div>
                      )}

                      {restoreResult.warnings && restoreResult.warnings.length > 0 && (
                        <div className="space-y-1 mt-3">
                          <div className="text-sm font-medium text-orange-600">注意事项：</div>
                          {restoreResult.warnings.map((warning, index) => (
                            <div key={index} className="text-sm text-orange-600">• {warning}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  </AlertDescription>
                </div>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* 使用说明 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Info className="h-5 w-5" />
              <span>使用说明</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="font-medium flex items-center space-x-2">
                  <Download className="h-4 w-4 text-blue-500" />
                  <span>备份功能</span>
                </h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• 包含所有导入的列车数据</li>
                  <li>• 包含所有配置的定员规则</li>
                  <li>• 包含系统设置和用户偏好</li>
                  <li>• 生成JSON格式的备份文件</li>
                  <li>• 建议定期备份重要数据</li>
                </ul>
              </div>
              
              <div className="space-y-3">
                <h4 className="font-medium flex items-center space-x-2">
                  <Upload className="h-4 w-4 text-green-500" />
                  <span>恢复功能</span>
                </h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• 支持版本兼容性检查</li>
                  <li>• 自动验证文件完整性</li>
                  <li>• 提供恢复前预览信息</li>
                  <li>• 恢复后自动刷新页面</li>
                  <li>• <span className="text-red-600">会覆盖当前所有数据</span></li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  )
}