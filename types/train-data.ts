export interface HighSpeedTrainData {
  id: string
  序号: string // 序号
  车型: string // 车型
  编组: string // 编组
  车次: string // 车次
  运行区段: string // 运行区段
  接班: string // 接班
  乘务员: string // 乘务员
  始发时间: string // 始发时间
  终到时间: string // 终到时间
  单程工时: string // 单程工时
  往返工时: string // 往返工时
  宿营地: string // 宿营地
  人员配备: string // 人员配备
  司机: string // 司机
  副司机: string // 副司机
  乘务: string // 乘务
  机械师: string // 机械师
  随车机械师: string // 随车机械师
  乘警: string // 乘警
  列车长: string // 列车长
  乘务员2: string // 乘务员（第二个）
  餐车: string // 餐车
  备注: string // 备注
}

// 保持普速数据结构，但也可以根据需要调整
export interface ConventionalTrainData {
  id: string
  序号: string
  类别: string
  车次: string
  运行区段: string
  始发时间: string
  终到时间: string
  编组详情: string
  配备人数: string
  备注: string
}

export type TrainType = "highSpeed" | "conventional"

export interface ParseResult {
  success: boolean
  data: HighSpeedTrainData[] | ConventionalTrainData[]
  errors: string[]
  recordCount: number
}
