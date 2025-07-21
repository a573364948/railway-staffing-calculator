# 普速规则增加额外人员配置功能

## 修改概述

根据用户需求，在普速规则配置中增加了两个新的配置选项：
1. **额外人员配置**：可勾选是否增加额外的广播员或列车值班员
2. **行李员配置**：当列车有行李车时，可设置整列车配备的行李员总数

## 修改范围

### 1. 数据结构修改 (`types/staffing-rules.ts`)

#### 更新 `ConventionalStaffingRule` 接口：

```typescript
// 修改前
staffing: {
  baggageAttendant: number // 行李员
  broadcaster?: string     // 广播员（如"由列车员兼任"）
  trainDutyOfficer?: string // 列车值班员（如"由列车员兼任"）
}

// 修改后
staffing: {
  baggageAttendant: number // 行李员（按行李车数量配置）
  
  // 额外人员配置
  additionalStaff?: {
    broadcaster?: number     // 额外广播员人数（0表示由列车员兼任）
    trainDutyOfficer?: number // 额外列车值班员人数（0表示由列车员兼任）
  }

  // 行李员配置（当有行李车时）
  baggageStaffConfig?: {
    enabled: boolean         // 是否启用行李员配置
    staffPerTrain: number    // 每列车配备的行李员总数
  }
}
```

### 2. 组件功能修改 (`conventional-rules-config.tsx`)

#### 新增更新函数：
- `updateAdditionalStaff()` - 更新额外人员配置
- `updateBaggageStaffConfig()` - 更新行李员配置

#### 数据兼容性处理：
- 更新 `ensureRuleDataStructure()` 函数，兼容旧数据格式
- 自动将旧的字符串类型转换为新的数字类型配置

## 新增功能详解

### 1. 额外人员配置

#### 功能描述：
- 可以选择增加额外的专职广播员或列车值班员
- 0表示由列车员兼任（默认情况）
- 1+表示配备专职人员

#### 界面配置：
```typescript
// 额外广播员
<Input
  type="number"
  min="0"
  max="2"
  value={editingRule.staffing.additionalStaff?.broadcaster || 0}
/>

// 额外列车值班员
<Input
  type="number"
  min="0"
  max="2"
  value={editingRule.staffing.additionalStaff?.trainDutyOfficer || 0}
/>
```

#### 业务逻辑：
- **0人**：由列车员兼任（传统做法）
- **1人**：配备1名专职人员
- **2人**：配备2名专职人员（特殊情况）

### 2. 行李员配置

#### 功能描述：
- 当列车有行李车时，可以启用行李员配置
- 设置整列车配备的行李员总数
- 不按行李车数量计算，而是按整列车配置

#### 界面配置：
```typescript
// 启用开关
<input
  type="checkbox"
  checked={editingRule.staffing.baggageStaffConfig?.enabled || false}
/>

// 人数配置
<Input
  type="number"
  min="0"
  max="5"
  value={editingRule.staffing.baggageStaffConfig?.staffPerTrain || 1}
/>
```

#### 业务逻辑：
- **启用状态**：只有勾选启用时才会应用此配置
- **人数设置**：设置整列车的行李员总数（0-5人）
- **优先级**：此配置优先于按行李车数量计算的方式

## 默认值设置

### 新建规则默认值：
```typescript
additionalStaff: {
  broadcaster: 0,      // 默认由列车员兼任
  trainDutyOfficer: 0  // 默认由列车员兼任
},
baggageStaffConfig: {
  enabled: baggageCarCount > 0, // 有行李车时自动启用
  staffPerTrain: baggageCarCount > 0 ? 1 : 0 // 默认每列车1个行李员
}
```

### 智能推荐默认值：
- 根据列车类型和行李车数量自动设置合理的默认值
- 国际联运列车可能需要更多专职人员

## 显示效果

### 规则卡片显示：
- 只显示非零的额外人员配置
- 显示行李员配置状态
- 简洁明了的信息展示

```typescript
// 显示额外广播员（仅当>0时）
{(safeRule.staffing.additionalStaff?.broadcaster || 0) > 0 && (
  <div>额外广播员: {safeRule.staffing.additionalStaff?.broadcaster}人</div>
)}

// 显示行李员配置（仅当启用时）
{safeRule.staffing.baggageStaffConfig?.enabled && (
  <div>每列车行李员: {safeRule.staffing.baggageStaffConfig?.staffPerTrain}人</div>
)}
```

## 数据兼容性

### 向后兼容：
- 自动处理旧数据格式
- 将旧的字符串类型 `broadcaster` 和 `trainDutyOfficer` 转换为新格式
- 保持现有规则的正常运行

### 数据迁移：
```typescript
// 兼容旧数据格式
additionalStaff: rule.staffing.additionalStaff || {
  broadcaster: 0,
  trainDutyOfficer: 0
},
baggageStaffConfig: rule.staffing.baggageStaffConfig || {
  enabled: (rule.conditions?.baggageCarCount || 0) > 0,
  staffPerTrain: (rule.conditions?.baggageCarCount || 0) > 0 ? 1 : 0
}
```

## 使用场景

### 额外人员配置适用场景：
1. **长途列车**：需要专职广播员提供更好的服务
2. **重要线路**：需要专职列车值班员确保安全
3. **特殊列车**：如旅游专列、商务列车等

### 行李员配置适用场景：
1. **行李车较多**：需要统一配置行李员数量
2. **特殊运输**：邮政、包裹运输等
3. **灵活配置**：根据实际需要调整人员配置

## 总结

此次修改成功实现了用户需求，增加了普速规则配置的灵活性：
- ✅ 支持额外广播员和列车值班员配置
- ✅ 支持按整列车配置行李员数量
- ✅ 保持向后兼容性
- ✅ 提供直观的用户界面
- ✅ 智能的默认值设置

这些新功能让普速列车的定员配置更加贴近实际业务需求，提高了配置的灵活性和准确性。
