"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Plus, Save, Copy, Trash2, Settings, Eye, ChevronDown, ChevronRight, Loader2, Expand, Minimize, CheckCircle, AlertCircle, Clock, Search, Filter } from "lucide-react"
import { SaveStatusIndicator } from "@/components/ui/save-status-indicator"
import { PageContainer } from "./page-container"
import { EnhancedHighSpeedRulesB } from "./enhanced-high-speed-rules-b"
import { ConventionalRulesConfig } from "./staffing-rules/conventional-rules-config"
import { OtherProductionRulesConfig } from "./staffing-rules/other-production-rules-config"
import { useStaffingRules } from "@/contexts/staffing-rules-context"
import type { StaffingStandard, RailwayBureau } from "@/types/staffing-rules"
import { RAILWAY_BUREAUS } from "@/types/staffing-rules"

export function StaffingRulesConfig() {
  const { 
    standards, 
    currentStandard, 
    setCurrentStandard,
    createStandard,
    updateStandard,
    deleteStandard,
    duplicateStandard,
    hasUnsavedChanges,
    saveChanges,
  } = useStaffingRules()

  const [editingStandard, setEditingStandard] = useState<Partial<StaffingStandard> | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [expandedSections, setExpandedSections] = useState({
    basic: false, // 基础配置默认收缩
    highSpeed: false,
    conventional: false,
    otherProduction: false
  })

  // 初始化编辑状态
  useEffect(() => {
    if (currentStandard) {
      setEditingStandard({ ...currentStandard })
    } else {
      setEditingStandard(null)
    }
  }, [currentStandard])

  // 统一的更新函数
  const updateEditingStandard = (updates: Partial<StaffingStandard>) => {
    const newStandard = { ...(editingStandard || {}), ...updates }
    setEditingStandard(newStandard)
    if (newStandard.id) {
      updateStandard(newStandard as StaffingStandard)
    }
  }

  const handleCreateNew = () => {
    const newStandard: Partial<StaffingStandard> = {
      name: "新建标准",
      bureau: "custom",
      standardWorkHours: 174,
      description: "",
      reserveRates: {
        mainProduction: {
          beijing: 8,
          shijiazhuang: 8,
          tianjin: 8
        },
        otherProduction: 5
      },
      highSpeedRules: [],
      conventionalRules: [],
      otherProductionRules: []
    }
    setEditingStandard(newStandard)
  }

  const handleSave = async () => {
    if (!editingStandard) return

    setIsSaving(true)
    try {
      if (editingStandard.id) {
        // 更新现有标准
        await saveChanges()
      } else {
        // 创建新标准
        const created = createStandard(editingStandard as Omit<StaffingStandard, 'id' | 'createdAt' | 'updatedAt'>)
        setEditingStandard(created) // 更新编辑状态为已创建的标准
        await saveChanges()
      }
    } catch (error) {
      console.error('保存失败:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setEditingStandard(null)
    // 如果取消，则恢复到当前已保存的标准
    if (currentStandard) {
      setEditingStandard({ ...currentStandard })
    }
  }

  const handleDuplicate = () => {
    if (currentStandard) {
      const duplicated = duplicateStandard(currentStandard.id)
      setEditingStandard(duplicated)
    }
  }

  const handleDeleteCurrent = () => {
    if (currentStandard && confirm(`确定要删除"${currentStandard.name}"吗？`)) {
      deleteStandard(currentStandard.id)
      setEditingStandard(null)
    }
  }

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  // 全部展开
  const expandAll = () => {
    setExpandedSections({
      basic: true,
      highSpeed: true,
      conventional: true,
      otherProduction: true
    })
  }

  // 全部收缩
  const collapseAll = () => {
    setExpandedSections({
      basic: false,
      highSpeed: false,
      conventional: false,
      otherProduction: false
    })
  }

  // 智能展开模式 - 只展开当前编辑的区域
  const smartExpand = (targetSection: keyof typeof expandedSections) => {
    setExpandedSections({
      basic: targetSection === 'basic',
      highSpeed: targetSection === 'highSpeed',
      conventional: targetSection === 'conventional',
      otherProduction: targetSection === 'otherProduction'
    })
  }

  // 配置完整度检查
  const getConfigCompleteness = (standard: Partial<StaffingStandard> | null) => {
    if (!standard) return { basic: 'empty', rules: 'empty', overall: 'empty' }
    
    // 基础配置完整度
    const basicComplete = !!(
      standard.name && 
      standard.bureau && 
      standard.standardWorkHours && 
      standard.reserveRates?.mainProduction &&
      standard.reserveRates?.otherProduction !== undefined
    )
    
    // 规则配置完整度
    const hasHighSpeedRules = (standard.highSpeedRules?.length || 0) > 0
    const hasConventionalRules = (standard.conventionalRules?.length || 0) > 0
    const hasOtherProductionRules = (standard.otherProductionRules?.length || 0) > 0
    
    const rulesComplete = hasHighSpeedRules && hasConventionalRules && hasOtherProductionRules
    const rulesPartial = hasHighSpeedRules || hasConventionalRules || hasOtherProductionRules
    
    return {
      basic: basicComplete ? 'complete' : 'incomplete',
      rules: rulesComplete ? 'complete' : rulesPartial ? 'partial' : 'empty',
      overall: (basicComplete && rulesComplete) ? 'complete' : 
               (basicComplete || rulesPartial) ? 'partial' : 'empty',
      stats: {
        highSpeed: standard.highSpeedRules?.length || 0,
        conventional: standard.conventionalRules?.length || 0,
        otherProduction: standard.otherProductionRules?.length || 0,
        total: (standard.highSpeedRules?.length || 0) + 
               (standard.conventionalRules?.length || 0) + 
               (standard.otherProductionRules?.length || 0)
      }
    }
  }

  const currentData = editingStandard
  const completeness = getConfigCompleteness(currentData)

  // 获取状态指示组件
  const getStatusBadge = (status: string, label: string) => {
    switch (status) {
      case 'complete':
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
            <CheckCircle className="h-3 w-3 mr-1" />
            {label}完成
          </Badge>
        )
      case 'partial':
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
            <Clock className="h-3 w-3 mr-1" />
            {label}部分
          </Badge>
        )
      case 'incomplete':
        return (
          <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-300">
            <AlertCircle className="h-3 w-3 mr-1" />
            {label}待完善
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="text-gray-500 border-gray-300">
            <Clock className="h-3 w-3 mr-1" />
            {label}未配置
          </Badge>
        )
    }
  }

  return (
    <PageContainer>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">定员规则配置</h1>
            <p className="text-muted-foreground mt-2">
              配置各铁路局的客运乘务定员标准和规则
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="text-sm">
              {standards.length} 个标准
            </Badge>
          </div>
        </div>

        {/* 标准管理区域 */}
        <Card className="border-2 border-blue-200 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2 text-blue-900">
                <Settings className="h-5 w-5 text-blue-600" />
                <span>铁路局标准管理</span>
              </CardTitle>
              <div className="flex items-center space-x-2">
                <SaveStatusIndicator
                  isSaving={isSaving}
                  hasUnsavedChanges={hasUnsavedChanges}
                />
                <Button onClick={handleCreateNew} size="sm" variant="outline">
                  <Plus className="h-4 w-4 mr-1" />
                  新建标准
                </Button>
                {currentStandard && (
                  <>
                    <Button onClick={handleDuplicate} size="sm" variant="outline">
                      <Copy className="h-4 w-4 mr-1" />
                      复制
                    </Button>
                    <Button onClick={handleDeleteCurrent} size="sm" variant="outline">
                      <Trash2 className="h-4 w-4 mr-1" />
                      删除
                    </Button>
                  </>
                )}
                {(editingStandard || hasUnsavedChanges) && (
                  <>
                    <Button 
                      onClick={handleSave} 
                      size="sm" 
                      disabled={isSaving || !hasUnsavedChanges}
                      className="bg-green-600 hover:bg-green-700 disabled:opacity-50"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          保存中...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-1" />
                          {hasUnsavedChanges ? '保存更改' : '已保存'}
                        </>
                      )}
                    </Button>
                    <Button onClick={handleCancel} size="sm" variant="outline">
                      取消
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <Label>选择标准</Label>
                <Select
                  value={currentStandard?.id || ""}
                  onValueChange={(value) => {
                    if (hasUnsavedChanges) {
                      if (confirm("您有未保存的更改，确定要切换吗？")) {
                        const standard = standards.find(s => s.id === value)
                        if (standard) setCurrentStandard(standard)
                      }
                    } else {
                      const standard = standards.find(s => s.id === value)
                      if (standard) setCurrentStandard(standard)
                    }
                  }}
                  disabled={editingStandard && !editingStandard.id}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="请选择定员标准" />
                  </SelectTrigger>
                  <SelectContent>
                    {standards.map((standard) => (
                      <SelectItem key={standard.id} value={standard.id}>
                        {standard.name} ({standard.standardWorkHours}h)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {currentData && (
                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                  <span>标准工时: {currentData.standardWorkHours}h</span>
                  <span>主要生产预备率: 北京{currentData.reserveRates?.mainProduction?.beijing || 8}% 石家庄{currentData.reserveRates?.mainProduction?.shijiazhuang || 8}% 天津{currentData.reserveRates?.mainProduction?.tianjin || 8}%</span>
                  <span>其余生产预备率: {currentData.reserveRates?.otherProduction}%</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 配置内容区域 */}
        {currentData && (
          <div className="space-y-6">
            {/* 折叠控制面板 */}
            <Card className="border-slate-200">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-slate-600">配置状态:</span>
                    {getStatusBadge(completeness.overall, '整体')}
                    <Badge variant="outline" className="text-xs">
                      {completeness.stats.total} 条规则
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {Object.values(expandedSections).filter(Boolean).length}/4 已展开
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={expandAll}
                      className="text-xs"
                    >
                      <Expand className="h-3 w-3 mr-1" />
                      全部展开
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={collapseAll}
                      className="text-xs"
                    >
                      <Minimize className="h-3 w-3 mr-1" />
                      全部收缩
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => smartExpand('basic')}
                      className="text-xs"
                    >
                      智能模式
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
            {/* 基础配置 */}
            <Card className="border-l-4 border-l-orange-400 shadow-md hover:shadow-lg transition-shadow">
              <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50">
                <div 
                  className="flex items-center justify-between cursor-pointer hover:bg-orange-100/50 p-2 rounded-md transition-colors"
                  onClick={() => toggleSection('basic')}
                >
                  <CardTitle className="flex items-center space-x-2 text-orange-900">
                    {expandedSections.basic ? 
                      <ChevronDown className="h-4 w-4 text-orange-600" /> : 
                      <ChevronRight className="h-4 w-4 text-orange-600" />
                    }
                    <span>基础配置</span>
                  </CardTitle>
                  <div className="flex items-center space-x-2">
                    {getStatusBadge(completeness.basic, '基础')}
                    <Badge variant="secondary" className="bg-red-100 text-red-700 border-red-300">必填</Badge>
                  </div>
                </div>
              </CardHeader>
              {expandedSections.basic && (
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">标准名称</Label>
                      <Input
                        id="name"
                        value={currentData.name || ""}
                        onChange={(e) => updateEditingStandard({ name: e.target.value })}
                        placeholder="如：北京局标准"
                      />
                    </div>
                    <div>
                      <Label htmlFor="bureau">所属铁路局</Label>
                      <Select
                        value={currentData.bureau || "custom"}
                        onValueChange={(value: RailwayBureau) => updateEditingStandard({ bureau: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(RAILWAY_BUREAUS).map(([key, label]) => (
                            <SelectItem key={key} value={key}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="workHours">标准工时 (小时/月)</Label>
                      <Input
                        id="workHours"
                        type="number"
                        step="0.1"
                        value={currentData.standardWorkHours || 174}
                        onChange={(e) => updateEditingStandard({ standardWorkHours: parseFloat(e.target.value) || 0 })}
                        placeholder="166.6"
                      />
                    </div>
                    <div>
                      <Label htmlFor="description">描述</Label>
                      <Input
                        id="description"
                        value={currentData.description || ""}
                        onChange={(e) => updateEditingStandard({ description: e.target.value })}
                        placeholder="标准描述"
                      />
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <Label>预备率配置</Label>

                    {/* 主要生产组预备率 - 按客运段分别设置 */}
                    <div className="mt-4">
                      <Label className="text-base font-medium">主要生产组预备率（%）</Label>
                      <p className="text-sm text-muted-foreground mb-3">针对三个客运段分别设置预备率</p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="beijing-main-rate">北京客运段</Label>
                          <Input
                            id="beijing-main-rate"
                            type="number"
                            step="0.1"
                            value={currentData.reserveRates?.mainProduction?.beijing || 8}
                            onChange={(e) => updateEditingStandard({
                              reserveRates: {
                                ...editingStandard?.reserveRates,
                                mainProduction: {
                                  ...editingStandard?.reserveRates?.mainProduction,
                                  beijing: parseFloat(e.target.value) || 0
                                }
                              }
                            })}
                            placeholder="8"
                          />
                        </div>
                        <div>
                          <Label htmlFor="shijiazhuang-main-rate">石家庄客运段</Label>
                          <Input
                            id="shijiazhuang-main-rate"
                            type="number"
                            step="0.1"
                            value={currentData.reserveRates?.mainProduction?.shijiazhuang || 8}
                            onChange={(e) => updateEditingStandard({
                              reserveRates: {
                                ...editingStandard?.reserveRates,
                                mainProduction: {
                                  ...editingStandard?.reserveRates?.mainProduction,
                                  shijiazhuang: parseFloat(e.target.value) || 0
                                }
                              }
                            })}
                            placeholder="8"
                          />
                        </div>
                        <div>
                          <Label htmlFor="tianjin-main-rate">天津客运段</Label>
                          <Input
                            id="tianjin-main-rate"
                            type="number"
                            step="0.1"
                            value={currentData.reserveRates?.mainProduction?.tianjin || 8}
                            onChange={(e) => updateEditingStandard({
                              reserveRates: {
                                ...editingStandard?.reserveRates,
                                mainProduction: {
                                  ...editingStandard?.reserveRates?.mainProduction,
                                  tianjin: parseFloat(e.target.value) || 0
                                }
                              }
                            })}
                            placeholder="8"
                          />
                        </div>
                      </div>
                    </div>

                    {/* 其余生产预备率 */}
                    <div className="mt-4">
                      <Label htmlFor="otherReserve">其余生产预备率 (%)</Label>
                      <Input
                        id="otherReserve"
                        type="number"
                        step="0.1"
                        min="0"
                        value={currentData.reserveRates?.otherProduction ?? 5}
                        onChange={(e) => updateEditingStandard({
                          reserveRates: {
                            ...editingStandard?.reserveRates,
                            otherProduction: parseFloat(e.target.value) || 0
                          }
                        })}
                        className="max-w-xs"
                        placeholder="5"
                      />
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>

            {/* 规则配置标签页 */}
            <div className="bg-gradient-to-br from-slate-50 to-gray-100 p-6 rounded-lg border shadow-sm">
              <Tabs defaultValue="highSpeed" className="space-y-4">
                <TabsList className="grid w-full grid-cols-3 bg-white shadow-sm border">
                  <TabsTrigger value="highSpeed" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white flex items-center justify-center space-x-2">
                    <span>高铁定员规则</span>
                    <Badge variant="outline" className="bg-blue-50 text-blue-600 text-xs">
                      {completeness.stats.highSpeed}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger value="conventional" className="data-[state=active]:bg-green-500 data-[state=active]:text-white flex items-center justify-center space-x-2">
                    <span>普速定员规则</span>
                    <Badge variant="outline" className="bg-green-50 text-green-600 text-xs">
                      {completeness.stats.conventional}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger value="otherProduction" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white flex items-center justify-center space-x-2">
                    <span>其余生产规则</span>
                    <Badge variant="outline" className="bg-purple-50 text-purple-600 text-xs">
                      {completeness.stats.otherProduction}
                    </Badge>
                  </TabsTrigger>
                </TabsList>

              <TabsContent value="highSpeed">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-medium text-blue-900">高铁动车组定员规则</h3>
                        <Badge variant="outline" className="bg-blue-100 text-blue-700">
                          {completeness.stats.highSpeed} 条规则
                        </Badge>
                      </div>
                      {completeness.stats.highSpeed === 0 && (
                        <Badge variant="outline" className="text-orange-600 border-orange-300">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          待配置
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="relative">
                        <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <Input 
                          placeholder="搜索规则..." 
                          className="pl-9 w-48 h-8 text-sm"
                        />
                      </div>
                      <Button variant="outline" size="sm">
                        <Filter className="h-3 w-3 mr-1" />
                        筛选
                      </Button>
                    </div>
                  </div>
                  <EnhancedHighSpeedRulesB />
                </div>
              </TabsContent>

              <TabsContent value="conventional">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-medium text-green-900">普速列车定员规则</h3>
                        <Badge variant="outline" className="bg-green-100 text-green-700">
                          {completeness.stats.conventional} 条规则
                        </Badge>
                      </div>
                      {completeness.stats.conventional === 0 && (
                        <Badge variant="outline" className="text-orange-600 border-orange-300">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          待配置
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="relative">
                        <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <Input 
                          placeholder="搜索规则..." 
                          className="pl-9 w-48 h-8 text-sm"
                        />
                      </div>
                      <Button variant="outline" size="sm">
                        <Filter className="h-3 w-3 mr-1" />
                        筛选
                      </Button>
                    </div>
                  </div>
                  <ConventionalRulesConfig
                    rules={currentData.conventionalRules || []}
                    onChange={(rules) => updateEditingStandard({ conventionalRules: rules })}
                  />
                </div>
              </TabsContent>

              <TabsContent value="otherProduction">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-medium text-purple-900">其余生产岗位规则</h3>
                        <Badge variant="outline" className="bg-purple-100 text-purple-700">
                          {completeness.stats.otherProduction} 条规则
                        </Badge>
                      </div>
                      {completeness.stats.otherProduction === 0 && (
                        <Badge variant="outline" className="text-orange-600 border-orange-300">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          待配置
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="relative">
                        <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <Input 
                          placeholder="搜索规则..." 
                          className="pl-9 w-48 h-8 text-sm"
                        />
                      </div>
                      <Button variant="outline" size="sm">
                        <Filter className="h-3 w-3 mr-1" />
                        筛选
                      </Button>
                    </div>
                  </div>
                  <OtherProductionRulesConfig
                    rules={currentData.otherProductionRules || []}
                    onChange={(rules) => updateEditingStandard({ otherProductionRules: rules })}
                  />
                </div>
              </TabsContent>
              </Tabs>
            </div>
          </div>
        )}

        {/* 空状态 */}
        {!currentData && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Eye className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">暂无定员标准</h3>
              <p className="text-muted-foreground mb-4">请创建或选择一个定员标准开始配置</p>
              <Button onClick={handleCreateNew}>
                <Plus className="h-4 w-4 mr-2" />
                创建第一个标准
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </PageContainer>
  )
}
