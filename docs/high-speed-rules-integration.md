# 高铁定员规则配置与测算集成

## 功能概述

现在高铁定员规则配置页面已经与定员测算页面完全集成。当您在规则配置页面配置规则时，这些规则会自动同步到定员测算系统，无需手动操作。

## 主要改进

### 1. 自动同步机制
- 在规则配置页面创建、编辑、删除规则时，会自动同步到定员测算系统
- 切换铁路局时，对应的规则也会自动同步
- 导入规则数据时，也会自动同步当前铁路局的规则

### 2. 数据结构转换
- 自动将 `EnhancedHighSpeedRule` 转换为 `HighSpeedStaffingRule`
- 保持数据一致性和完整性
- 支持所有规则条件的正确映射

### 3. 用户体验改进
- 页面显示同步状态指示器
- 控制台输出同步成功信息
- 规则配置后立即可用于定员测算

## 使用流程

### 步骤1：配置规则
1. 进入"规则配置"页面
2. 选择对应的铁路局
3. 点击"新建规则"或使用"智能推荐"
4. 配置编组类型、运行时间限制和人员配置
5. 保存规则

### 步骤2：验证同步
- 保存规则后，页面会显示"已同步到定员测算"状态
- 控制台会输出同步成功信息

### 步骤3：使用规则进行测算
1. 进入"定员测算"页面
2. 选择"规则计算"模式
3. 选择对应的铁路局标准
4. 点击"开始计算"
5. 系统会使用您配置的规则进行定员计算

## 技术实现

### 转换函数
```typescript
const convertEnhancedRuleToStaffingRule = (enhancedRule: EnhancedHighSpeedRule): HighSpeedStaffingRule => {
  const conditions: HighSpeedStaffingRule['conditions'] = {
    formation: [enhancedRule.formationType]
  }

  if (enhancedRule.runningTimeLimit === 'under12') {
    conditions.runningTime = { max: 12 }
  } else if (enhancedRule.runningTimeLimit === 'over12') {
    conditions.runningTime = { min: 12 }
  }

  return {
    id: enhancedRule.id,
    name: enhancedRule.name,
    description: enhancedRule.description,
    conditions,
    staffing: {
      trainConductor: enhancedRule.staffing.trainConductor,
      trainAttendant: enhancedRule.staffing.trainAttendant,
      businessClassAttendant: enhancedRule.staffing.businessClassAttendant
    }
  }
}
```

### 同步机制
- 使用 `useStaffingRules` 上下文进行数据同步
- 在规则变化时自动调用 `syncRulesToStaffingContext`
- 支持创建新标准或更新现有标准

## 注意事项

1. **数据持久化**：规则配置数据存储在浏览器本地存储中
2. **铁路局切换**：切换铁路局时会自动同步对应的规则
3. **规则覆盖**：同步时会完全替换定员测算系统中的高铁规则
4. **错误处理**：如果同步失败，会在控制台输出错误信息

## 故障排除

### 问题1：规则没有同步到定员测算
- 检查控制台是否有错误信息
- 确认规则配置页面显示"已同步到定员测算"状态
- 尝试刷新页面重新加载

### 问题2：定员测算找不到规则
- 确认在定员测算页面选择了正确的铁路局标准
- 检查规则配置是否与列车数据匹配
- 验证编组类型和运行时间条件是否正确

### 问题3：数据不一致
- 清除浏览器本地存储重新配置
- 重新导入规则数据
- 检查数据格式是否正确

## 标准工时调整系数修复

### 问题描述
在定员测算中，标准工时调整组数的参数计算错误。当设置标准工时为166.6小时时，调整系数应该是1.0（166.6/166.6），但实际显示为0.957。

### 问题原因
- 基准工时被硬编码为174小时（广州局标准）
- 当使用北京局标准（166.6小时）时，系数 = 166.6/174 = 0.957
- 这导致组数被错误调整

### 解决方案
修改 `utils/high-speed-rule-engine.ts` 中的 `calculateAdjustmentFactor` 函数：

```typescript
private calculateAdjustmentFactor(originalGroupCount: number): number {
  // 调整系数计算：当前标准工时 / 基准标准工时
  // 基准工时设为 166.6（北京局标准），这是系统的基准标准工时
  const standardWorkHours = this.standard.standardWorkHours
  const baseWorkHours = 166.6 // 系统基准工时（北京局标准）

  if (standardWorkHours && baseWorkHours) {
    return standardWorkHours / baseWorkHours
  }

  return 1 // 默认不调整
}
```

### 修复结果
- **北京局标准（166.6小时）**：调整系数 = 1.000 ✅
- **广州局标准（174小时）**：调整系数 = 1.044
- **其他标准**：按比例正确调整

## 按客运段分别设置预备率功能

### 功能概述
现在支持针对三个客运段（北京客运段、石家庄客运段、天津客运段）分别设置主要生产组预备率，而不是所有客运段使用相同的预备率。

### 数据结构变更

**原始结构**：
```typescript
reserveRates: {
  mainProduction: number    // 统一预备率，如8%
  otherProduction: number   // 其余生产预备率，如6%
}
```

**新结构**：
```typescript
reserveRates: {
  mainProduction: {
    beijing: number         // 北京客运段预备率，如8%
    shijiazhuang: number    // 石家庄客运段预备率，如8%
    tianjin: number         // 天津客运段预备率，如8%
  }
  otherProduction: number   // 其余生产预备率（全局统一），如6%
}
```

### 界面改进
- **规则配置页面**：主要生产组预备率改为三个独立输入框
- **标准配置页面**：同样支持按客运段分别设置
- **清晰的标签**：每个输入框明确标注对应的客运段

### 使用方法
1. 进入规则配置页面或标准配置页面
2. 在"主要生产组预备率"部分，分别为三个客运段设置不同的预备率
3. 保存配置后，系统会根据不同客运段应用相应的预备率

### 默认配置示例
- **北京局标准**：
  - 北京客运段：8%
  - 石家庄客运段：8%
  - 天津客运段：8%
- **广州局标准**：
  - 北京客运段：8%
  - 石家庄客运段：7%
  - 天津客运段：9%

### 向后兼容
系统会自动处理旧数据格式的兼容性，确保现有配置不会丢失。

## 移除重复配置功能

### 问题描述
在规则配置页面中，基础配置（标准工时、预备率）出现了重复设置：
- 主配置页面（`staffing-rules-config.tsx`）有一套基础配置
- 高铁定员规则栏（`enhanced-high-speed-rules-b.tsx`）下也有一套重复配置

### 解决方案
移除了高铁定员规则组件中的重复基础配置，保持配置的统一性：

#### 移除的重复内容：
1. **铁路局和标准管理** Card 整个部分
2. **标准工时配置** 输入框
3. **预备率配置** 输入框（三个客运段的分别设置）
4. **标准描述** 输入框
5. **相关的状态管理和函数**：
   - `BureauStandard` 接口
   - `bureauStandards` 状态
   - `currentBureau` 本地状态
   - `isEditingStandard` 状态
   - `updateStandard` 函数
   - `handleClearAllData` 函数
   - `handleExportData` 函数
   - `handleImportData` 函数

#### 保留的内容：
- ✅ 高铁规则配置功能
- ✅ 智能推荐功能
- ✅ 规则同步到定员测算的功能
- ✅ 规则的增删改查功能

#### 数据来源调整：
- 现在从 `StaffingRulesContext` 获取当前铁路局信息
- 使用 `currentStaffingStandard` 替代本地的 `currentBureauStandard`

### 最终效果
- **消除重复**：基础配置只在主配置页面设置
- **保持功能**：高铁规则配置功能完全保留
- **统一管理**：所有基础参数（标准工时、预备率）在一个地方统一管理
- **简化界面**：高铁规则配置页面更加专注于规则本身

## 后续优化

1. 添加规则验证机制
2. 支持规则版本管理
3. 增加批量操作功能
4. 优化用户界面和交互体验
5. 考虑将基准工时设为可配置参数
6. 在定员计算中实际应用不同客运段的预备率
