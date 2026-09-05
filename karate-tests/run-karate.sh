#!/usr/bin/env bash
set -e

KARATE_VERSION="1.5.1"
JAR_NAME="karate-${KARATE_VERSION}.jar"
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ ! -f "${DIR}/karate-standalone/${JAR_NAME}" ]; then
    echo "[INFO] Downloading Karate Standalone JAR v${KARATE_VERSION}..."
    curl -L "https://github.com/karatelabs/karate/releases/download/v${KARATE_VERSION}/${JAR_NAME}" -o "${DIR}/karate-standalone/${JAR_NAME}"
fi

if [ -z "$1" ]; then
    echo "[INFO] Running all Karate test suites..."
    java -jar "${DIR}/karate-standalone/${JAR_NAME}" -T 1 "${DIR}/features" -o "${DIR}/reports"
else
    echo "[INFO] Running feature: $1"
    java -jar "${DIR}/karate-standalone/${JAR_NAME}" -T 1 "${DIR}/features/$1" -o "${DIR}/reports"
fi
