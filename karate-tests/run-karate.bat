@echo off
set KARATE_VERSION=1.5.1
set JAR_NAME=karate-%KARATE_VERSION%.jar

if not exist "%~dp0karate-standalone\%JAR_NAME%" (
    echo [INFO] Downloading Karate Standalone JAR v%KARATE_VERSION%...
    curl -L "https://github.com/karatelabs/karate/releases/download/v%KARATE_VERSION%/%JAR_NAME%" -o "%~dp0karate-standalone\%JAR_NAME%"
)

if "%~1"=="" (
    echo [INFO] Running all Karate test suites...
    java -jar "%~dp0karate-standalone\%JAR_NAME%" -T 1 "%~dp0features" -o "%~dp0reports"
) else (
    echo [INFO] Running feature: %1
    java -jar "%~dp0karate-standalone\%JAR_NAME%" -T 1 "%~dp0features\%1" -o "%~dp0reports"
)
