# Kimi 服务响应速度测试脚本

param(
    [int]$TestCount = 5,
    [int]$DelayBetweenTests = 3
)

Write-Host "🚀 Kimi 服务响应速度测试" -ForegroundColor Cyan
Write-Host "测试次数: $TestCount" -ForegroundColor Yellow
Write-Host "测试间隔: $DelayBetweenTests 秒" -ForegroundColor Yellow
Write-Host "=" * 50 -ForegroundColor Gray
Write-Host ""

$results = @()
$testQuestions = @(
    "你好",
    "今天天气怎么样？",
    "请简单介绍一下自己",
    "1+1等于多少？",
    "请说一个笑话"
)

for ($i = 1; $i -le $TestCount; $i++) {
    $question = $testQuestions[($i - 1) % $testQuestions.Length]
    
    Write-Host "📝 测试 $i/$TestCount - 问题: '$question'" -ForegroundColor Green
    
    # 记录开始时间
    $startTime = Get-Date
    
    try {
        # 执行 claude-kimi 命令并捕获输出
        $output = & claude-kimi --print $question 2>&1
        
        # 记录结束时间
        $endTime = Get-Date
        $duration = ($endTime - $startTime).TotalSeconds
        
        # 检查是否有错误
        $hasError = $output -match "API Error|rate_limit|429"
        $hasRetry = $output -match "Retrying"
        
        # 提取实际响应内容（去除错误信息）
        $response = ($output | Where-Object { $_ -notmatch "API Error|Retrying|使用 Kimi 服务" }) -join " "
        $responseLength = $response.Length
        
        $result = [PSCustomObject]@{
            Test = $i
            Question = $question
            Duration = [math]::Round($duration, 2)
            HasError = $hasError
            HasRetry = $hasRetry
            ResponseLength = $responseLength
            Status = if ($hasError) { "❌ 错误" } elseif ($hasRetry) { "⚠️ 重试" } else { "✅ 成功" }
        }
        
        $results += $result
        
        Write-Host "   ⏱️  响应时间: $($result.Duration) 秒" -ForegroundColor $(if ($duration -lt 3) { "Green" } elseif ($duration -lt 10) { "Yellow" } else { "Red" })
        Write-Host "   📊 状态: $($result.Status)" -ForegroundColor $(if ($hasError) { "Red" } elseif ($hasRetry) { "Yellow" } else { "Green" })
        Write-Host "   📝 响应长度: $responseLength 字符" -ForegroundColor Cyan
        
        if ($response.Length -gt 0 -and $response.Length -lt 100) {
            Write-Host "   💬 响应预览: $($response.Substring(0, [math]::Min(50, $response.Length)))..." -ForegroundColor Gray
        }
        
    } catch {
        $endTime = Get-Date
        $duration = ($endTime - $startTime).TotalSeconds
        
        $result = [PSCustomObject]@{
            Test = $i
            Question = $question
            Duration = [math]::Round($duration, 2)
            HasError = $true
            HasRetry = $false
            ResponseLength = 0
            Status = "❌ 异常"
        }
        
        $results += $result
        
        Write-Host "   ❌ 测试异常: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    Write-Host ""
    
    # 在测试之间等待
    if ($i -lt $TestCount) {
        Write-Host "⏳ 等待 $DelayBetweenTests 秒..." -ForegroundColor Yellow
        Start-Sleep $DelayBetweenTests
    }
}

# 统计分析
Write-Host "📊 测试结果统计" -ForegroundColor Cyan
Write-Host "=" * 50 -ForegroundColor Gray

$successfulTests = $results | Where-Object { -not $_.HasError }
$errorTests = $results | Where-Object { $_.HasError }
$retryTests = $results | Where-Object { $_.HasRetry }

Write-Host "✅ 成功测试: $($successfulTests.Count)/$TestCount" -ForegroundColor Green
Write-Host "❌ 错误测试: $($errorTests.Count)/$TestCount" -ForegroundColor Red
Write-Host "⚠️  重试测试: $($retryTests.Count)/$TestCount" -ForegroundColor Yellow

if ($successfulTests.Count -gt 0) {
    $avgDuration = [math]::Round(($successfulTests | Measure-Object Duration -Average).Average, 2)
    $minDuration = [math]::Round(($successfulTests | Measure-Object Duration -Minimum).Minimum, 2)
    $maxDuration = [math]::Round(($successfulTests | Measure-Object Duration -Maximum).Maximum, 2)
    
    Write-Host ""
    Write-Host "⏱️  响应时间统计:" -ForegroundColor Cyan
    Write-Host "   平均: $avgDuration 秒" -ForegroundColor White
    Write-Host "   最快: $minDuration 秒" -ForegroundColor Green
    Write-Host "   最慢: $maxDuration 秒" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "📋 详细结果表格:" -ForegroundColor Cyan
$results | Format-Table Test, Question, Duration, Status, ResponseLength -AutoSize

Write-Host "🏁 测试完成！" -ForegroundColor Green
