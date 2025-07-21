"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Trash2, Edit, Save, X, Settings, Info } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Alert, AlertDescription } from "@/components/ui/alert"
import type { OtherProductionRule } from "@/types/staffing-rules"

interface OtherProductionRulesConfigProps {
  rules: OtherProductionRule[]
  onChange: (rules: OtherProductionRule[]) => void
}

export function OtherProductionRulesConfig({ rules, onChange }: OtherProductionRulesConfigProps) {
  const [editingRule, setEditingRule] = useState<OtherProductionRule | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  const handleCreateNew = () => {
    const newRule: OtherProductionRule = {
      id: `other-rule-${Date.now()}`,
      name: "新规则",
      description: "",
      configType: "percentage",
      config: {
        percentage: 5,
        baseOn: "mainProduction"
      }
    }
    setEditingRule(newRule)
    setIsCreating(true)
  }

  const handleEdit = (rule: OtherProductionRule) => {
    setEditingRule({ ...rule })
    setIsCreating(false)
  }

  const handleSave = () => {
    if (!editingRule) return

    if (isCreating) {
      onChange([...rules, editingRule])
    } else {
      onChange(rules.map(r => r.id === editingRule.id ? editingRule : r))
    }

    setEditingRule(null)
    setIsCreating(false)
  }

  const handleCancel = () => {
    setEditingRule(null)
    setIsCreating(false)
  }

  const handleDelete = (id: string) => {
    if (confirm("确定要删除这个规则吗？")) {
      onChange(rules.filter(r => r.id !== id))
    }
  }

  const updateEditingRule = (updates: Partial<OtherProductionRule>) => {
    if (editingRule) {
      setEditingRule({ ...editingRule, ...updates })
    }
  }

  const updateConfig = (updates: Partial<OtherProductionRule['config']>) => {
    if (editingRule) {
      setEditingRule({
        ...editingRule,
        config: { ...editingRule.config, ...updates }
      })
    }
  }

  const updatePositions = (positionName: string, count: number) => {
    if (editingRule) {
      const positions = { ...editingRule.positions }
      if (count > 0) {
        positions[positionName] = count
      } else {
        delete positions[positionName]
      }
      setEditingRule({
        ...editingRule,
        positions
      })
    }
  }

  const getConfigDisplay = (rule: OtherProductionRule) => {
    switch (rule.configType) {
      case "segmented_percentage":
        const segments = rule.config.segments || {}
        const hsPercentage = segments.highSpeed?.percentage || 0
        const convPercentage = segments.conventional?.percentage || 0
        return `分段比例：高铁${hsPercentage}% + 普速${convPercentage}%`
      case "percentage":
        return `${rule.config.percentage}% (基于${rule.config.baseOn === 'mainProduction' ? '主要生产组' : '总生产人员'})`
      case "fixed":
        return `固定 ${rule.config.fixedCount} 人`
      case "formula":
        return `公式: ${rule.config.formula}`
      default:
        return "未配置"
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>其余生产规则配置</CardTitle>
          <div className="flex items-center space-x-2">
            <Badge variant="outline">{rules.length} 个规则</Badge>
            <Button onClick={handleCreateNew} size="sm" disabled={!!editingRule}>
              <Plus className="h-4 w-4 mr-1" />
              添加规则
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>


        {/* 规则列表 */}
        {rules.length > 0 ? (
          <div className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>规则名称</TableHead>
                  <TableHead>配置方式</TableHead>
                  <TableHead>具体岗位</TableHead>
                  <TableHead className="w-24">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{rule.name}</div>
                        {rule.description && (
                          <div className="text-sm text-muted-foreground">{rule.description}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {getConfigDisplay(rule)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {rule.positions && Object.keys(rule.positions).length > 0 ? (
                        <div className="space-y-1 text-sm">
                          {Object.entries(rule.positions).map(([position, count]) => (
                            <div key={position}>{position}: {count}人</div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">按比例自动计算</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <TooltipProvider>
                        <div className="flex items-center space-x-1">
                          <Button
                            onClick={() => handleEdit(rule)}
                            size="sm"
                            variant="ghost"
                            disabled={!!editingRule}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            onClick={() => handleDelete(rule.id)}
                            size="sm"
                            variant="ghost"
                            disabled={!!editingRule}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TooltipProvider>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            暂无其余生产规则，点击&ldquo;添加规则&rdquo;开始配置
          </div>
        )}

        {/* 编辑表单 */}
        {editingRule && (
          <div className="mt-6">
            <Separator className="mb-4" />
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">
                  {isCreating ? "创建新规则" : "编辑规则"}
                </h4>
                <div className="flex items-center space-x-2">
                  <Button onClick={handleSave} size="sm">
                    <Save className="h-4 w-4 mr-1" />
                    保存
                  </Button>
                  <Button onClick={handleCancel} size="sm" variant="outline">
                    <X className="h-4 w-4 mr-1" />
                    取消
                  </Button>
                </div>
              </div>

              {/* 基本信息 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="ruleName">规则名称</Label>
                  <Input
                    id="ruleName"
                    value={editingRule.name}
                    onChange={(e) => updateEditingRule({ name: e.target.value })}
                    placeholder="如：其余生产人员"
                  />
                </div>
                <div>
                  <Label htmlFor="ruleDesc">规则描述</Label>
                  <Input
                    id="ruleDesc"
                    value={editingRule.description || ""}
                    onChange={(e) => updateEditingRule({ description: e.target.value })}
                    placeholder="规则的详细描述"
                  />
                </div>
              </div>

              {/* 配置方式 */}
              <div>
                <Label>配置方式</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                  <div>
                    <Label htmlFor="configType">配置类型</Label>
                    <Select
                      value={editingRule.configType}
                      onValueChange={(value: "percentage" | "fixed" | "formula" | "segmented_percentage") => {
                        const newRule = { ...editingRule, configType: value }
                        
                        // 初始化segmented_percentage的segments配置
                        if (value === "segmented_percentage" && !editingRule.config.segments) {
                          newRule.config = {
                            ...editingRule.config,
                            segments: {
                              highSpeed: { percentage: 7 },
                              conventional: { percentage: 2.5 }
                            }
                          }
                        }
                        
                        updateEditingRule(newRule)
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">按比例</SelectItem>
                        <SelectItem value="segmented_percentage">分段比例</SelectItem>
                        <SelectItem value="fixed">固定人数</SelectItem>
                        <SelectItem value="formula">自定义公式</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {editingRule.configType === "percentage" && (
                    <>
                      <div>
                        <Label htmlFor="percentage">比例 (%)</Label>
                        <Input
                          id="percentage"
                          type="number"
                          step="0.1"
                          value={editingRule.config.percentage || ""}
                          onChange={(e) => updateConfig({
                            percentage: parseFloat(e.target.value) || 0
                          })}
                          placeholder="如：5"
                        />
                      </div>
                      <div>
                        <Label htmlFor="baseOn">基于</Label>
                        <Select
                          value={editingRule.config.baseOn || "mainProduction"}
                          onValueChange={(value: "mainProduction" | "totalProduction") => 
                            updateConfig({ baseOn: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="mainProduction">主要生产组</SelectItem>
                            <SelectItem value="totalProduction">总生产人员</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}

                  {editingRule.configType === "fixed" && (
                    <div>
                      <Label htmlFor="fixedCount">固定人数</Label>
                      <Input
                        id="fixedCount"
                        type="number"
                        value={editingRule.config.fixedCount || ""}
                        onChange={(e) => updateConfig({
                          fixedCount: parseInt(e.target.value) || 0
                        })}
                        placeholder="如：10"
                      />
                    </div>
                  )}

                  {editingRule.configType === "segmented_percentage" && (
                    <div className="md:col-span-2">
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* 高铁部分配置 */}
                          <div className="space-y-3">
                            <Label className="text-sm font-medium text-blue-600">高铁定员配置</Label>
                            <div>
                              <Label htmlFor="hsPercentage">比例 (%)</Label>
                              <Input
                                id="hsPercentage"
                                type="number"
                                step="0.1"
                                value={editingRule.config.segments?.highSpeed?.percentage || ""}
                                onChange={(e) => {
                                  const value = parseFloat(e.target.value) || 0
                                  updateConfig({
                                    segments: {
                                      ...editingRule.config.segments,
                                      highSpeed: {
                                        minValue: undefined,
                                        ...editingRule.config.segments?.highSpeed,
                                        percentage: value
                                      }
                                    }
                                  })
                                }}
                                placeholder="如：7"
                                className="mb-2"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <Label htmlFor="hsMinValue" className="text-xs">最小值(可选)</Label>
                                <Input
                                  id="hsMinValue"
                                  type="number"
                                  value={editingRule.config.segments?.highSpeed?.minValue || ""}
                                  onChange={(e) => {
                                    const value = e.target.value ? parseInt(e.target.value) : undefined
                                    updateConfig({
                                      segments: {
                                        ...editingRule.config.segments,
                                        highSpeed: {
                                          percentage: 0,
                                          ...editingRule.config.segments?.highSpeed,
                                          minValue: value
                                        }
                                      }
                                    })
                                  }}
                                  placeholder="最小人数"
                                  className="text-xs"
                                />
                              </div>
                              <div>
                                <Label htmlFor="hsMaxValue" className="text-xs">最大值(可选)</Label>
                                <Input
                                  id="hsMaxValue"
                                  type="number"
                                  value={editingRule.config.segments?.highSpeed?.maxValue || ""}
                                  onChange={(e) => {
                                    const value = e.target.value ? parseInt(e.target.value) : undefined
                                    updateConfig({
                                      segments: {
                                        ...editingRule.config.segments,
                                        highSpeed: {
                                          percentage: 0,
                                          ...editingRule.config.segments?.highSpeed,
                                          maxValue: value
                                        }
                                      }
                                    })
                                  }}
                                  placeholder="最大人数"
                                  className="text-xs"
                                />
                              </div>
                            </div>
                          </div>

                          {/* 普速部分配置 */}
                          <div className="space-y-3">
                            <Label className="text-sm font-medium text-green-600">普速定员配置</Label>
                            <div>
                              <Label htmlFor="convPercentage">比例 (%)</Label>
                              <Input
                                id="convPercentage"
                                type="number"
                                step="0.1"
                                value={editingRule.config.segments?.conventional?.percentage || ""}
                                onChange={(e) => {
                                  const value = parseFloat(e.target.value) || 0
                                  updateConfig({
                                    segments: {
                                      ...editingRule.config.segments,
                                      conventional: {
                                        minValue: undefined,
                                        ...editingRule.config.segments?.conventional,
                                        percentage: value
                                      }
                                    }
                                  })
                                }}
                                placeholder="如：2.5"
                                className="mb-2"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <Label htmlFor="convMinValue" className="text-xs">最小值(可选)</Label>
                                <Input
                                  id="convMinValue"
                                  type="number"
                                  value={editingRule.config.segments?.conventional?.minValue || ""}
                                  onChange={(e) => {
                                    const value = e.target.value ? parseInt(e.target.value) : undefined
                                    updateConfig({
                                      segments: {
                                        ...editingRule.config.segments,
                                        conventional: {
                                          percentage: 0,
                                          ...editingRule.config.segments?.conventional,
                                          minValue: value
                                        }
                                      }
                                    })
                                  }}
                                  placeholder="最小人数"
                                  className="text-xs"
                                />
                              </div>
                              <div>
                                <Label htmlFor="convMaxValue" className="text-xs">最大值(可选)</Label>
                                <Input
                                  id="convMaxValue"
                                  type="number"
                                  value={editingRule.config.segments?.conventional?.maxValue || ""}
                                  onChange={(e) => {
                                    const value = e.target.value ? parseInt(e.target.value) : undefined
                                    updateConfig({
                                      segments: {
                                        ...editingRule.config.segments,
                                        conventional: {
                                          percentage: 0,
                                          ...editingRule.config.segments?.conventional,
                                          maxValue: value
                                        }
                                      }
                                    })
                                  }}
                                  placeholder="最大人数"
                                  className="text-xs"
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* 计算预览 */}
                        {editingRule.config.segments && (
                          editingRule.config.segments.highSpeed?.percentage || 
                          editingRule.config.segments.conventional?.percentage
                        ) && (
                          <Alert>
                            <Info className="h-4 w-4" />
                            <AlertDescription>
                              <div className="space-y-1 text-sm">
                                <div className="font-medium">计算预览：</div>
                                {editingRule.config.segments.highSpeed?.percentage && (
                                  <div className="text-blue-600">
                                    高铁部分：定员数 × {editingRule.config.segments.highSpeed.percentage}%
                                    {editingRule.config.segments.highSpeed.minValue && ` (最小${editingRule.config.segments.highSpeed.minValue}人)`}
                                    {editingRule.config.segments.highSpeed.maxValue && ` (最大${editingRule.config.segments.highSpeed.maxValue}人)`}
                                  </div>
                                )}
                                {editingRule.config.segments.conventional?.percentage && (
                                  <div className="text-green-600">
                                    普速部分：定员数 × {editingRule.config.segments.conventional.percentage}%
                                    {editingRule.config.segments.conventional.minValue && ` (最小${editingRule.config.segments.conventional.minValue}人)`}
                                    {editingRule.config.segments.conventional.maxValue && ` (最大${editingRule.config.segments.conventional.maxValue}人)`}
                                  </div>
                                )}
                                <div className="font-medium text-gray-700">
                                  最终结果 = 高铁部分 + 普速部分
                                </div>
                              </div>
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    </div>
                  )}

                  {editingRule.configType === "formula" && (
                    <div className="md:col-span-2">
                      <Label htmlFor="formula">计算公式</Label>
                      <Input
                        id="formula"
                        value={editingRule.config.formula || ""}
                        onChange={(e) => updateConfig({
                          formula: e.target.value
                        })}
                        placeholder="如：主要生产组 * 0.05 + 固定值"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* 具体岗位配置 */}
              <div>
                <Label>具体岗位配置 (可选)</Label>
                <div className="mt-2 space-y-2">
                  {editingRule.positions && Object.entries(editingRule.positions).map(([position, count]) => (
                    <div key={position} className="flex items-center space-x-2">
                      <Input
                        value={position}
                        onChange={(e) => {
                          const newPositions = { ...editingRule.positions }
                          delete newPositions[position]
                          newPositions[e.target.value] = count
                          updateEditingRule({ positions: newPositions })
                        }}
                        placeholder="岗位名称"
                        className="flex-1"
                      />
                      <Input
                        type="number"
                        value={count}
                        onChange={(e) => updatePositions(position, parseInt(e.target.value) || 0)}
                        placeholder="人数"
                        className="w-24"
                      />
                      <Button
                        onClick={() => updatePositions(position, 0)}
                        size="sm"
                        variant="ghost"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  
                  <Button
                    onClick={() => updatePositions("新岗位", 1)}
                    size="sm"
                    variant="outline"
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    添加岗位
                  </Button>
                </div>
                <div className="text-sm text-muted-foreground mt-2">
                  如果不配置具体岗位，将按照配置方式自动计算总人数
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
