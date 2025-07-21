# Claude API 包装脚本
# 支持自定义 API 端点

param(
    [Parameter(Mandatory=$true)]
    [string]$Message,
    
    [string]$BaseUrl = "https://api.anthropic.com",
    [string]$ApiKey = "",
    [string]$Model = "claude-3-5-sonnet-20241022"
)

function Invoke-ClaudeAPI {
    param(
        [string]$BaseUrl,
        [string]$ApiKey,
        [string]$Model,
        [string]$Message
    )
    
    $headers = @{
        "Content-Type" = "application/json"
        "x-api-key" = $ApiKey
        "anthropic-version" = "2023-06-01"
    }
    
    $body = @{
        model = $Model
        max_tokens = 4000
        messages = @(
            @{
                role = "user"
                content = $Message
            }
        )
    } | ConvertTo-Json -Depth 10
    
    $url = "$BaseUrl/v1/messages"
    
    try {
        Write-Host "Calling API: $url" -ForegroundColor Yellow
        Write-Host "Using model: $Model" -ForegroundColor Yellow
        Write-Host ""

        $response = Invoke-RestMethod -Uri $url -Method POST -Headers $headers -Body $body

        Write-Host "Claude Response:" -ForegroundColor Green
        Write-Host $response.content[0].text
        
    } catch {
        Write-Host "API call failed:" -ForegroundColor Red
        Write-Host $_.Exception.Message -ForegroundColor Red

        if ($_.Exception.Response) {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $responseBody = $reader.ReadToEnd()
            Write-Host "Error details: $responseBody" -ForegroundColor Red
        }
    }
}

# 调用 API
Invoke-ClaudeAPI -BaseUrl $BaseUrl -ApiKey $ApiKey -Model $Model -Message $Message
