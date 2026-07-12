# Navigate to the AI service directory
$ServiceDir = Join-Path -Path $PSScriptRoot -ChildPath "..\ai_service"
Set-Location -Path $ServiceDir

Write-Host "🐍 Setting up Python RAG Service environment..." -ForegroundColor Cyan

# Create Virtual Environment if not exists
if (-not (Test-Path -Path ".venv")) {
    Write-Host "Creating Virtual Environment (.venv)..." -ForegroundColor Yellow
    python -m venv .venv
    if (-not $?) {
        Write-Error "Failed to create Python Virtual Environment."
        Exit 1
    }
}

# Install requirements
Write-Host "Installing dependencies from requirements.txt (This might take a minute)..." -ForegroundColor Yellow
& ".\.venv\Scripts\pip" install -r requirements.txt --prefer-binary
if (-not $?) {
    Write-Error "Failed to install dependencies."
    Exit 1
}

# Run FastAPI server
Write-Host "🚀 Launching FastAPI RAG Server on http://127.0.0.1:8000..." -ForegroundColor Green
& ".\.venv\Scripts\python" main.py
