# 设置Playwright使用Microsoft Edge浏览器
$env:PLAYWRIGHT_BROWSER = "msedge"
$env:PLAYWRIGHT_CHANNEL = "msedge" 
$env:PLAYWRIGHT_BROWSER_NAME = "chromium"

Write-Host "Playwright浏览器已设置为Microsoft Edge" -ForegroundColor Green
Write-Host "环境变量:" -ForegroundColor Yellow
Write-Host "  PLAYWRIGHT_BROWSER: $env:PLAYWRIGHT_BROWSER" -ForegroundColor Cyan
Write-Host "  PLAYWRIGHT_CHANNEL: $env:PLAYWRIGHT_CHANNEL" -ForegroundColor Cyan
Write-Host "  PLAYWRIGHT_BROWSER_NAME: $env:PLAYWRIGHT_BROWSER_NAME" -ForegroundColor Cyan

# 验证Edge浏览器是否可用
Write-Host "`n检查Edge浏览器..." -ForegroundColor Yellow
try {
    $edgePath = Get-Command msedge -ErrorAction Stop
    Write-Host "✓ Microsoft Edge已找到: $($edgePath.Source)" -ForegroundColor Green
} catch {
    Write-Host "✗ 未找到Microsoft Edge浏览器" -ForegroundColor Red
}

Write-Host "`n现在可以使用Claude Code进行测试" -ForegroundColor Green