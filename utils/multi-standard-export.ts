import * as XLSX from 'xlsx'
import type { ComparisonResult } from '@/contexts/multi-standard-comparison-context'
import type { StaffingStandard } from '@/types'
import { MultiStandardCalculator } from './multi-standard-calculator'

// 岗位名称映射表（与组件中的保持一致）
const POSITION_NAME_MAP: Record<string, string> = {
  // 高铁岗位
  trainConductor: '列车长',
  trainAttendant: '乘务员',
  businessClassAttendant: '商务座乘务员',
  total: '合计',

  // 普速岗位
  conductor: '列车长',
  attendant: '乘务员',
  seatCar: '硬座乘务员',
  hardSleeper: '硬卧乘务员',
  softSleeper: '软卧乘务员',
  diningCar: '餐车乘务员',
  operationConductor: '运转车长',
  translator: '翻译',
  baggageStaff: '行李员',
  diningCarStaff: '餐车人员',
  salesStaff: '售货人员',

  // 额外人员
  broadcaster: '广播员',
  trainDutyOfficer: '值班员',

  // 其他可能的岗位
  chiefConductor: '列车长',
  assistant: '乘务员',
  security: '乘警',
}

// 获取中文岗位名称的辅助函数
const getPositionDisplayName = (positionKey: string): string => {
  return POSITION_NAME_MAP[positionKey] || positionKey
}

export class MultiStandardExporter {
  private calculator: MultiStandardCalculator

  constructor() {
    this.calculator = new MultiStandardCalculator()
  }

  /**
   * 导出多标准对比报告为Excel文件
   */
  exportComparisonReport(
    results: Record<string, ComparisonResult>,
    standards: StaffingStandard[],
    filename?: string
  ) {
    const workbook = XLSX.utils.book_new()

    // 添加汇总对比表
    this.addSummarySheet(workbook, results, standards)

    // 添加详细差异分析表
    this.addDifferenceAnalysisSheet(workbook, results, standards)

    // 添加高铁定员对比表
    this.addHighSpeedComparisonSheet(workbook, results, standards)

    // 添加普速定员对比表
    this.addConventionalComparisonSheet(workbook, results, standards)

    // 添加其余生产对比表
    this.addOtherProductionComparisonSheet(workbook, results, standards)

    // 添加参数对比表
    this.addParameterComparisonSheet(workbook, standards)

    // 导出文件
    const defaultFilename = `多标准对比分析_${new Date().toISOString().split('T')[0]}.xlsx`
    XLSX.writeFile(workbook, filename || defaultFilename)
  }

  /**
   * 添加汇总对比表
   */
  private addSummarySheet(
    workbook: XLSX.WorkBook,
    results: Record<string, ComparisonResult>,
    standards: StaffingStandard[]
  ) {
    const data = [
      // 表头
      [
        '标准名称',
        '标准工时(h)',
        '高铁定员',
        '普速定员',
        '其余生产',
        '总定员',
        '覆盖率(%)',
        '未匹配车次',
        '与基准差异',
        '差异百分比(%)'
      ]
    ]

    const baseResult = results[standards[0]?.id]
    const baseTotalStaff = baseResult?.summary.totalStaff || 0

    // 添加数据行
    standards.forEach((standard, index) => {
      const result = results[standard.id]
      if (!result) return

      const totalStaff = result.summary.totalStaff
      const difference = totalStaff - baseTotalStaff
      const differencePercent = baseTotalStaff > 0 ? (difference / baseTotalStaff * 100) : 0

      data.push([
        standard.name,
        standard.standardWorkHours,
        result.highSpeed.totalStaff,
        result.conventional.totalStaff,
        result.otherProduction.totalStaff,
        totalStaff,
        Math.round(result.summary.coverageRate * 100),
        result.summary.unmatchedTrains,
        index === 0 ? '基准' : difference,
        index === 0 ? '-' : Math.round(differencePercent * 100) / 100
      ])
    })

    const worksheet = XLSX.utils.aoa_to_sheet(data)
    
    // 设置列宽
    worksheet['!cols'] = [
      { wch: 20 }, // 标准名称
      { wch: 12 }, // 标准工时
      { wch: 12 }, // 高铁定员
      { wch: 12 }, // 普速定员
      { wch: 12 }, // 其余生产
      { wch: 12 }, // 总定员
      { wch: 12 }, // 覆盖率
      { wch: 12 }, // 未匹配车次
      { wch: 12 }, // 与基准差异
      { wch: 15 }  // 差异百分比
    ]

    XLSX.utils.book_append_sheet(workbook, worksheet, '汇总对比')
  }

  /**
   * 添加差异分析表
   */
  private addDifferenceAnalysisSheet(
    workbook: XLSX.WorkBook,
    results: Record<string, ComparisonResult>,
    standards: StaffingStandard[]
  ) {
    const analysis = this.calculator.generateDifferenceAnalysis(results, standards)
    
    const data = [
      ['多标准对比差异分析报告'],
      ['生成时间', new Date().toLocaleString()],
      [''],
      ['1. 基本统计'],
      ['对比标准数量', standards.length],
      ['总定员范围', `${Math.min(...Object.values(results).map(r => r.summary.totalStaff))} - ${Math.max(...Object.values(results).map(r => r.summary.totalStaff))}`],
      ['平均覆盖率', `${Math.round(Object.values(results).reduce((sum, r) => sum + r.summary.coverageRate, 0) / Object.values(results).length * 100)}%`],
      [''],
      ['2. 关键差异因素']
    ]

    // 添加关键差异因素
    analysis.keyFactors.forEach((factor, index) => {
      data.push([
        `因素${index + 1}`,
        factor.description,
        factor.impact,
        factor.details
      ])
    })

    data.push([''])
    data.push(['3. 数据完整性说明'])
    data.push(['数据说明', '各标准均按其自身配置进行客观计算'])
    data.push(['计算原则', '不对任何标准进行价值判断或比较优劣'])
    data.push(['差异原因', '仅提供客观的配置参数和规则差异说明'])

    const worksheet = XLSX.utils.aoa_to_sheet(data)
    worksheet['!cols'] = [
      { wch: 15 },
      { wch: 30 },
      { wch: 15 },
      { wch: 50 }
    ]

    XLSX.utils.book_append_sheet(workbook, worksheet, '差异分析')
  }

  /**
   * 添加高铁定员对比表
   */
  private addHighSpeedComparisonSheet(
    workbook: XLSX.WorkBook,
    results: Record<string, ComparisonResult>,
    standards: StaffingStandard[]
  ) {
    // 获取所有岗位
    const allPositions = new Set<string>()
    Object.values(results).forEach(result => {
      if (result.highSpeed.details?.positionSummary) {
        Object.keys(result.highSpeed.details.positionSummary).forEach(pos => 
          allPositions.add(pos)
        )
      }
    })

    const positionArray = Array.from(allPositions)
    
    // 构建表头
    const headers = [
      '标准名称',
      '总定员',
      '匹配车次',
      '未匹配车次',
      '覆盖率(%)',
      ...positionArray.map(position => getPositionDisplayName(position))
    ]

    const data = [headers]

    // 添加数据行
    standards.forEach(standard => {
      const result = results[standard.id]
      if (!result) return

      const highSpeedResult = result.highSpeed
      const matchedTrains = highSpeedResult.details?.matchedTrains?.length || 0
      const unmatchedCount = highSpeedResult.unmatchedCount
      const coverageRate = matchedTrains + unmatchedCount > 0 
        ? Math.round(matchedTrains / (matchedTrains + unmatchedCount) * 100)
        : 0

      const row = [
        standard.name,
        highSpeedResult.totalStaff,
        matchedTrains,
        unmatchedCount,
        coverageRate,
        ...positionArray.map(position => 
          highSpeedResult.details?.positionSummary?.[position] || 0
        )
      ]

      data.push(row)
    })

    const worksheet = XLSX.utils.aoa_to_sheet(data)
    
    // 设置列宽
    worksheet['!cols'] = [
      { wch: 20 }, // 标准名称
      { wch: 12 }, // 总定员
      { wch: 12 }, // 匹配车次
      { wch: 12 }, // 未匹配车次
      { wch: 12 }, // 覆盖率
      ...positionArray.map(() => ({ wch: 10 })) // 各岗位
    ]

    XLSX.utils.book_append_sheet(workbook, worksheet, '高铁定员对比')
  }

  /**
   * 添加普速定员对比表
   */
  private addConventionalComparisonSheet(
    workbook: XLSX.WorkBook,
    results: Record<string, ComparisonResult>,
    standards: StaffingStandard[]
  ) {
    // 获取所有岗位
    const allPositions = new Set<string>()
    Object.values(results).forEach(result => {
      if (result.conventional.details?.positionSummary) {
        Object.keys(result.conventional.details.positionSummary).forEach(pos => 
          allPositions.add(pos)
        )
      }
    })

    const positionArray = Array.from(allPositions)
    
    // 构建表头
    const headers = [
      '标准名称',
      '总定员',
      '匹配车次',
      '未匹配车次',
      '覆盖率(%)',
      ...positionArray.map(position => getPositionDisplayName(position))
    ]

    const data = [headers]

    // 添加数据行
    standards.forEach(standard => {
      const result = results[standard.id]
      if (!result) return

      const conventionalResult = result.conventional
      const matchedTrains = conventionalResult.details?.matchedTrains?.length || 0
      const unmatchedCount = conventionalResult.unmatchedCount
      const coverageRate = matchedTrains + unmatchedCount > 0 
        ? Math.round(matchedTrains / (matchedTrains + unmatchedCount) * 100)
        : 0

      const row = [
        standard.name,
        conventionalResult.totalStaff,
        matchedTrains,
        unmatchedCount,
        coverageRate,
        ...positionArray.map(position => 
          conventionalResult.details?.positionSummary?.[position] || 0
        )
      ]

      data.push(row)
    })

    const worksheet = XLSX.utils.aoa_to_sheet(data)
    
    // 设置列宽
    worksheet['!cols'] = [
      { wch: 20 }, // 标准名称
      { wch: 12 }, // 总定员
      { wch: 12 }, // 匹配车次
      { wch: 12 }, // 未匹配车次
      { wch: 12 }, // 覆盖率
      ...positionArray.map(() => ({ wch: 10 })) // 各岗位
    ]

    XLSX.utils.book_append_sheet(workbook, worksheet, '普速定员对比')
  }

  /**
   * 添加其余生产对比表
   */
  private addOtherProductionComparisonSheet(
    workbook: XLSX.WorkBook,
    results: Record<string, ComparisonResult>,
    standards: StaffingStandard[]
  ) {
    // 获取所有岗位
    const allPositions = new Set<string>()
    Object.values(results).forEach(result => {
      if (result.otherProduction.details?.positionBreakdown) {
        Object.keys(result.otherProduction.details.positionBreakdown).forEach(pos => 
          allPositions.add(pos)
        )
      }
    })

    const positionArray = Array.from(allPositions)
    
    // 构建表头
    const headers = [
      '标准名称',
      '总定员',
      '计算方法',
      '基准高铁定员',
      '基准普速定员',
      ...positionArray.map(position => getPositionDisplayName(position))
    ]

    const data = [headers]

    // 添加数据行
    standards.forEach(standard => {
      const result = results[standard.id]
      if (!result) return

      const otherResult = result.otherProduction
      
      const row = [
        standard.name,
        otherResult.totalStaff,
        otherResult.details?.calculationMethod || '',
        otherResult.details?.baseStaffNumbers?.highSpeed || 0,
        otherResult.details?.baseStaffNumbers?.conventional || 0,
        ...positionArray.map(position => 
          otherResult.details?.positionBreakdown?.[position] || 0
        )
      ]

      data.push(row)
    })

    const worksheet = XLSX.utils.aoa_to_sheet(data)
    
    // 设置列宽
    worksheet['!cols'] = [
      { wch: 20 }, // 标准名称
      { wch: 12 }, // 总定员
      { wch: 15 }, // 计算方法
      { wch: 12 }, // 基准高铁定员
      { wch: 12 }, // 基准普速定员
      ...positionArray.map(() => ({ wch: 10 })) // 各岗位
    ]

    XLSX.utils.book_append_sheet(workbook, worksheet, '其余生产对比')
  }

  /**
   * 添加参数对比表
   */
  private addParameterComparisonSheet(
    workbook: XLSX.WorkBook,
    standards: StaffingStandard[]
  ) {
    const data = [
      [
        '标准名称',
        '标准工时(h)',
        '北京预备率(%)',
        '石家庄预备率(%)',
        '天津预备率(%)',
        '其余生产预备率(%)',
        '高铁规则数量',
        '普速规则数量',
        '其余生产规则数量'
      ]
    ]

    // 添加数据行
    standards.forEach(standard => {
      data.push([
        standard.name,
        standard.standardWorkHours,
        Math.round(standard.reserveRates.mainProduction.beijing * 100),
        Math.round(standard.reserveRates.mainProduction.shijiazhuang * 100),
        Math.round(standard.reserveRates.mainProduction.tianjin * 100),
        Math.round(standard.reserveRates.otherProduction * 100),
        standard.highSpeedRules.length,
        standard.conventionalRules.length,
        standard.otherProductionRules.length
      ])
    })

    const worksheet = XLSX.utils.aoa_to_sheet(data)
    
    // 设置列宽
    worksheet['!cols'] = [
      { wch: 20 }, // 标准名称
      { wch: 12 }, // 标准工时
      { wch: 15 }, // 北京预备率
      { wch: 15 }, // 石家庄预备率
      { wch: 15 }, // 天津预备率
      { wch: 18 }, // 其余生产预备率
      { wch: 15 }, // 高铁规则数量
      { wch: 15 }, // 普速规则数量
      { wch: 18 }  // 其余生产规则数量
    ]

    XLSX.utils.book_append_sheet(workbook, worksheet, '参数对比')
  }

  /**
   * 生成JSON格式的对比数据
   */
  generateJSONExport(
    results: Record<string, ComparisonResult>,
    standards: StaffingStandard[]
  ) {
    const exportData = this.calculator.generateExportData(results, standards)
    
    const jsonString = JSON.stringify(exportData, null, 2)
    const blob = new Blob([jsonString], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    
    const link = document.createElement('a')
    link.href = url
    link.download = `多标准对比数据_${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    URL.revokeObjectURL(url)
  }

  /**
   * 生成PDF报告（需要额外的PDF库支持）
   */
  async generatePDFReport(
    results: Record<string, ComparisonResult>,
    standards: StaffingStandard[]
  ) {
    // 这里可以集成PDF生成库，如jsPDF
    console.log('PDF导出功能待开发，可使用Excel格式导出')
    
    // 临时实现：生成HTML报告并打印为PDF
    const htmlContent = this.generateHTMLReport(results, standards)
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(htmlContent)
      printWindow.document.close()
      printWindow.print()
    }
  }

  /**
   * 生成HTML报告内容
   */
  private generateHTMLReport(
    results: Record<string, ComparisonResult>,
    standards: StaffingStandard[]
  ): string {
    const analysis = this.calculator.generateDifferenceAnalysis(results, standards)
    
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>多标准对比分析报告</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        h1 { color: #2563eb; border-bottom: 2px solid #2563eb; }
        h2 { color: #1f2937; margin-top: 30px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f3f4f6; font-weight: bold; }
        .highlight { background-color: #fef3c7; }
        .summary-card { background: #f9fafb; padding: 15px; margin: 10px 0; border-left: 4px solid #2563eb; }
        @media print { body { margin: 20px; } }
    </style>
</head>
<body>
    <h1>多标准定员对比分析报告</h1>
    <div class="summary-card">
        <p><strong>生成时间：</strong>${new Date().toLocaleString()}</p>
        <p><strong>对比标准数量：</strong>${standards.length}</p>
        <p><strong>分析客运段：</strong>北京、石家庄、天津客运段</p>
    </div>

    <h2>1. 汇总对比</h2>
    <table>
        <tr>
            <th>标准名称</th>
            <th>高铁定员</th>
            <th>普速定员</th>
            <th>其余生产</th>
            <th>总定员</th>
            <th>覆盖率</th>
        </tr>
        ${standards.map(standard => {
          const result = results[standard.id]
          if (!result) return ''
          
          return `
        <tr>
            <td>${standard.name}</td>
            <td>${result.highSpeed.totalStaff}</td>
            <td>${result.conventional.totalStaff}</td>
            <td>${result.otherProduction.totalStaff}</td>
            <td><strong>${result.summary.totalStaff}</strong></td>
            <td>${Math.round(result.summary.coverageRate * 100)}%</td>
        </tr>
          `
        }).join('')}
    </table>

    <h2>2. 关键差异因素</h2>
    ${analysis.keyFactors.map((factor, index) => `
    <div class="summary-card">
        <p><strong>因素${index + 1}：</strong>${factor.description}</p>
        <p><strong>影响程度：</strong>${factor.impact}</p>
        <p><strong>详细说明：</strong>${factor.details}</p>
    </div>
    `).join('')}

    <h2>3. 数据说明</h2>
    <div class="summary-card">
        <p><strong>计算原则：</strong>各标准均按其自身配置进行客观计算，不对任何标准进行价值判断</p>
        <p><strong>差异说明：</strong>差异来源于不同标准的配置参数、规则设置和适用范围差异</p>
        <p><strong>数据完整性：</strong>所有数据均基于实际车次信息和标准规则进行计算</p>
    </div>

    <p style="margin-top: 40px; color: #6b7280; font-size: 12px;">
        本报告由定员测算系统自动生成，详细数据请参考Excel导出文件。
    </p>
</body>
</html>
    `
  }
}