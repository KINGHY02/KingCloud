@echo off
cls
title KingCloud

cd /d "%~dp0"

if exist "node_modules" (
    echo 启动 KingCloud...
    npm start
) else (
    echo 正在安装依赖，请稍候...
    npm install
    if errorlevel 1 (
        echo 依赖安装失败，请检查网络连接并重试。
        pause
        exit /b 1
    )
    echo 依赖安装成功，启动 KingCloud...
    npm start
)

pause