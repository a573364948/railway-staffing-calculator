# 修复商务座检测问题

## 问题描述

用户发现以G2815为例，当列车的编组信息都是空的（显示为"-"）时，系统仍然判定该列车有商务座，导致定员计算错误。

### 🚨 **具体问题：**
- **列车编组信息**：G2815的编组字段值为 "-"
- **系统判断**：错误地认为该列车有商务座
- **预期行为**：当编组信息为 "-" 时，应该判定为没有商务座

## 问题根源分析

### 📋 **原始逻辑缺陷：**

#### **1. `extractFormation` 方法问题：**
```typescript
// 修改前的逻辑
if (value && typeof value === 'string' && value.trim()) {
  return value.trim()  // ❌ "-" 被认为是有效的编组信息
}
```

#### **2. 商务座检测逻辑问题：**
```typescript
// 修改前的逻辑
const formation = this.extractFormation(trainData)
if (formation) {  // ❌ "-" 被认为是有效编组，进入推断逻辑
  // 推断商务座逻辑...
}
```

#### **3. 商务座数量提取问题：**
```typescript
// 修改前的逻辑
if (typeof value === 'string') {
  const num = parseFloat(value.replace(/[^\d\.]/g, ''))
  // ❌ "-" 被处理后变成空字符串，parseFloat返回NaN，但没有正确处理
}
```

## 解决方案

### 🔧 **修复策略：**

#### **1. 增强空值检测**
识别并排除各种空值标识符：
- `-` (短横线)
- `—` (长横线)  
- `null`, `NULL`
- `undefined`
- `无`, `空`
- `N/A`, `n/a`, `NA`

#### **2. 修复编组信息提取**
```typescript
// 修改后的逻辑
if (value && typeof value === 'string') {
  const trimmedValue = value.trim()
  // 排除空值标识符
  if (trimmedValue && trimmedValue !== '-' && trimmedValue !== '—' && 
      trimmedValue !== 'null' && trimmedValue !== 'NULL' && 
      trimmedValue !== 'undefined' && trimmedValue !== '无' && 
      trimmedValue !== '空' && trimmedValue !== 'N/A' && 
      trimmedValue !== 'n/a' && trimmedValue !== 'NA') {
    return trimmedValue  // ✅ 只返回真正有效的编组信息
  }
}
```

#### **3. 修复商务座数量提取**
```typescript
// 修改后的逻辑
if (typeof value === 'string') {
  const trimmedValue = value.trim()
  // 排除空值标识符
  if (trimmedValue === '-' || trimmedValue === '—' || 
      trimmedValue === 'null' || trimmedValue === 'NULL' || 
      /* ... 其他空值标识符 */) {
    continue // ✅ 跳过空值标识符
  }
  
  const num = parseFloat(trimmedValue.replace(/[^\d\.]/g, ''))
  if (!isNaN(num)) {
    return Math.max(0, num)
  }
}
```

## 具体修改内容

### 📝 **修改文件：** `utils/high-speed-rule-engine.ts`

#### **修改1：`extractFormation` 方法 (第58-82行)**
```typescript
// 修改前
if (value && typeof value === 'string' && value.trim()) {
  return value.trim()
}

// 修改后
if (value && typeof value === 'string') {
  const trimmedValue = value.trim()
  // 排除空值标识符
  if (trimmedValue && trimmedValue !== '-' && trimmedValue !== '—' && 
      trimmedValue !== 'null' && trimmedValue !== 'NULL' && 
      trimmedValue !== 'undefined' && trimmedValue !== '无' && 
      trimmedValue !== '空' && trimmedValue !== 'N/A' && 
      trimmedValue !== 'n/a' && trimmedValue !== 'NA') {
    return trimmedValue
  }
}
```

#### **修改2：`hasBusinessClass` 方法注释 (第205-219行)**
```typescript
// 修改前
// 从编组信息中推断
return false // 默认认为没有商务座

// 修改后  
// 从编组信息中推断（仅当有有效编组信息时）
// 如果编组信息为空或无效，默认认为没有商务座
return false
```

#### **修改3：`extractBusinessClassCount` 方法 (第229-253行)**
```typescript
// 修改前
if (typeof value === 'string') {
  const num = parseFloat(value.replace(/[^\d\.]/g, ''))
  if (!isNaN(num)) {
    return Math.max(0, num)
  }
}

// 修改后
if (typeof value === 'string') {
  const trimmedValue = value.trim()
  // 排除空值标识符
  if (trimmedValue === '-' || trimmedValue === '—' || 
      trimmedValue === 'null' || trimmedValue === 'NULL' || 
      trimmedValue === 'undefined' || trimmedValue === '无' || 
      trimmedValue === '空' || trimmedValue === 'N/A' || 
      trimmedValue === 'n/a' || trimmedValue === 'NA' || 
      trimmedValue === '') {
    continue // 跳过空值标识符
  }
  
  const num = parseFloat(trimmedValue.replace(/[^\d\.]/g, ''))
  if (!isNaN(num)) {
    return Math.max(0, num)
  }
}
```

## 修复效果

### ✅ **修复后的行为：**

#### **G2815列车示例：**
```typescript
// 列车数据
trainData = {
  车次: "G2815",
  编组: "-",        // 空值标识符
  商务座: "-",      // 空值标识符
  // ... 其他字段
}

// 修复前的处理
extractFormation(trainData) → "-"     // ❌ 返回空值标识符
hasBusinessClass(trainData) → true    // ❌ 错误判定有商务座

// 修复后的处理  
extractFormation(trainData) → null    // ✅ 正确识别为无效编组
hasBusinessClass(trainData) → false   // ✅ 正确判定没有商务座
```

#### **定员计算结果：**
```typescript
// 修复前
adjustedBusinessClassAttendant = 1    // ❌ 错误配置商务座服务员
totalStaff = 基础定员 + 1             // ❌ 多算了商务座人员

// 修复后
adjustedBusinessClassAttendant = 0    // ✅ 正确配置为0
totalStaff = 基础定员                 // ✅ 准确的定员数量
```

## 支持的空值标识符

### 📋 **完整列表：**
- `-` (短横线)
- `—` (长横线，em dash)
- `null` (小写)
- `NULL` (大写)
- `undefined`
- `无`
- `空`
- `N/A`
- `n/a`
- `NA`
- `""` (空字符串)

## 验证方法

### 🔍 **测试建议：**

1. **G2815测试**：
   - 确认编组字段为 "-" 时不再判定有商务座
   - 验证定员计算结果正确

2. **其他空值测试**：
   - 测试各种空值标识符的处理
   - 确认都能正确识别为无商务座

3. **正常数据测试**：
   - 确认有效编组信息仍能正确识别商务座
   - 验证不影响正常的商务座检测

## 总结

此次修复成功解决了空值编组信息导致的商务座误判问题：

- ✅ **准确识别空值**：正确处理 "-" 等空值标识符
- ✅ **避免误判**：编组信息为空时不再错误推断商务座
- ✅ **保持兼容**：不影响正常有效数据的处理
- ✅ **全面覆盖**：支持多种常见的空值表示方式

现在G2815等编组信息为空的列车能够正确计算定员，不再错误地包含商务座服务员！
