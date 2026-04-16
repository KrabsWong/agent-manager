#!/bin/bash

# Yes Sessions 安装脚本
# 一键下载、安装并自动移除 quarantine 标记

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 检查操作系统
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo -e "${RED}========================================${NC}"
    echo -e "${RED}  ❌ 不支持的操作系统${NC}"
    echo -e "${RED}========================================${NC}"
    echo ""
    echo -e "${YELLOW}Yes Sessions 目前仅支持 macOS。${NC}"
    echo ""
    echo "检测到您的操作系统: $OSTYPE"
    echo ""
    echo "其他平台的支持正在开发中，敬请期待！"
    echo ""
    echo -e "${BLUE}访问 GitHub 获取更多信息:${NC}"
    echo "https://github.com/KrabsWong/agent-manager"
    exit 1
fi

# 配置
REPO="KrabsWong/agent-manager"
APP_NAME="Yes-Sessions"
INSTALL_DIR="/Applications"

# 获取最新版本号
get_latest_version() {
    local version
    # 尝试从 GitHub API 获取最新 release 版本
    if command -v curl &> /dev/null; then
        version=$(curl -s "https://api.github.com/repos/${REPO}/releases/latest" | grep -o '"tag_name": "[^"]*"' | grep -o '[0-9]\+\.[0-9]\+\.[0-9]\+' | head -1)
    elif command -v wget &> /dev/null; then
        version=$(wget -qO- "https://api.github.com/repos/${REPO}/releases/latest" | grep -o '"tag_name": "[^"]*"' | grep -o '[0-9]\+\.[0-9]\+\.[0-9]\+' | head -1)
    fi
    
    if [ -z "$version" ]; then
        echo ""
        return 1
    fi
    
    echo "$version"
}

# 解析命令行参数
VERSION=""
while [[ $# -gt 0 ]]; do
    case $1 in
        -v|--version)
            VERSION="$2"
            shift 2
            ;;
        -h|--help)
            echo "Yes Sessions 安装脚本"
            echo ""
            echo "用法: $0 [选项]"
            echo ""
            echo "选项:"
            echo "  -v, --version <版本>    指定安装版本 (例如: 5.6.0)"
            echo "  -h, --help              显示此帮助信息"
            echo ""
            echo "示例:"
            echo "  $0                      # 安装最新版本"
            echo "  $0 -v 5.5.1             # 安装指定版本"
            echo ""
            echo "环境变量:"
            echo "  YS_VERSION              指定版本号 (优先级低于命令行参数)"
            echo ""
            exit 0
            ;;
        *)
            echo "未知选项: $1"
            echo "使用 '$0 --help' 查看帮助"
            exit 1
            ;;
    esac
done

# 优先使用命令行参数，其次是环境变量，最后自动获取最新版本
if [ -z "$VERSION" ]; then
    if [ -n "$YS_VERSION" ]; then
        VERSION="$YS_VERSION"
        echo -e "${BLUE}📌 使用环境变量指定的版本: ${VERSION}${NC}"
    else
        echo -e "${BLUE}🔍 正在获取最新版本...${NC}"
        VERSION=$(get_latest_version)
        if [ -z "$VERSION" ]; then
            echo -e "${RED}❌ 无法获取最新版本号${NC}"
            echo ""
            echo "可能的原因："
            echo "  1. 网络连接问题"
            echo "  2. GitHub API 限制"
            echo ""
            echo "解决方案："
            echo "  1. 手动指定版本安装:"
            echo "     curl -fsSL ... | bash -s -- -v 5.6.0"
            echo ""
            echo "  2. 设置环境变量:"
            echo "     YS_VERSION=5.6.0 curl -fsSL ... | bash"
            echo ""
            exit 1
        fi
        echo -e "${GREEN}✓ 最新版本: ${VERSION}${NC}"
    fi
fi

# 检测架构
ARCH=$(uname -m)
if [ "$ARCH" = "arm64" ]; then
    DMG_FILE="${APP_NAME}-${VERSION}-arm64.dmg"
    echo -e "${BLUE}检测到 Apple Silicon (M1/M2/M3/M4) 架构${NC}"
elif [ "$ARCH" = "x86_64" ]; then
    DMG_FILE="${APP_NAME}-${VERSION}-x64.dmg"
    echo -e "${BLUE}检测到 Intel 架构${NC}"
else
    echo -e "${RED}不支持的架构: $ARCH${NC}"
    exit 1
fi

# 下载 URL
DOWNLOAD_URL="https://github.com/${REPO}/releases/download/v${VERSION}/${DMG_FILE}"
TEMP_DIR=$(mktemp -d)
DMG_PATH="${TEMP_DIR}/${DMG_FILE}"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  正在安装 Yes Sessions v${VERSION}${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 检查是否已安装
if [ -d "${INSTALL_DIR}/${APP_NAME}.app" ]; then
    echo -e "${YELLOW}⚠️  检测到已安装的旧版本${NC}"
    read -p "是否先卸载旧版本? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${BLUE}正在卸载旧版本...${NC}"
        rm -rf "${INSTALL_DIR}/${APP_NAME}.app"
        echo -e "${GREEN}✓ 旧版本已卸载${NC}"
    fi
    echo ""
fi

# 下载
echo -e "${BLUE}📥 正在下载...${NC}"
echo "URL: ${DOWNLOAD_URL}"

if command -v curl &> /dev/null; then
    curl -L --progress-bar -o "${DMG_PATH}" "${DOWNLOAD_URL}"
elif command -v wget &> /dev/null; then
    wget --progress=bar:force -O "${DMG_PATH}" "${DOWNLOAD_URL}"
else
    echo -e "${RED}错误: 需要 curl 或 wget${NC}"
    exit 1
fi

if [ ! -f "${DMG_PATH}" ]; then
    echo -e "${RED}错误: 下载失败${NC}"
    exit 1
fi

echo -e "${GREEN}✓ 下载完成${NC}"
echo ""

# 计算文件大小
FILE_SIZE=$(du -h "${DMG_PATH}" | cut -f1)
echo -e "${BLUE}📦 文件大小: ${FILE_SIZE}${NC}"
echo ""

# 挂载 DMG
echo -e "${BLUE}📂 正在挂载 DMG...${NC}"
MOUNT_OUTPUT=$(hdiutil attach "${DMG_PATH}" -nobrowse -quiet)
MOUNT_POINT=$(echo "$MOUNT_OUTPUT" | grep "Apple_HFS\|Apple_APFS" | awk '{print $3}')

if [ -z "$MOUNT_POINT" ]; then
    # 尝试另一种方式查找挂载点
    MOUNT_POINT=$(echo "$MOUNT_OUTPUT" | tail -1 | awk '{print $3}')
fi

if [ ! -d "$MOUNT_POINT" ]; then
    echo -e "${RED}错误: 无法挂载 DMG${NC}"
    hdiutil detach "${DMG_PATH}" -quiet 2>/dev/null || true
    exit 1
fi

echo -e "${GREEN}✓ 已挂载到: ${MOUNT_POINT}${NC}"
echo ""

# 查找 App
APP_PATH=$(find "$MOUNT_POINT" -name "*.app" -maxdepth 1 | head -n 1)

if [ -z "$APP_PATH" ]; then
    echo -e "${RED}错误: 在 DMG 中未找到应用${NC}"
    hdiutil detach "$MOUNT_POINT" -quiet 2>/dev/null || true
    exit 1
fi

APP_BASENAME=$(basename "$APP_PATH")
echo -e "${BLUE}📝 找到应用: ${APP_BASENAME}${NC}"
echo ""

# 复制到 Applications
echo -e "${BLUE}📋 正在安装到 ${INSTALL_DIR}...${NC}"
cp -R "${APP_PATH}" "${INSTALL_DIR}/"

if [ ! -d "${INSTALL_DIR}/${APP_BASENAME}" ]; then
    echo -e "${RED}错误: 安装失败${NC}"
    hdiutil detach "$MOUNT_POINT" -quiet 2>/dev/null || true
    exit 1
fi

echo -e "${GREEN}✓ 应用已复制${NC}"
echo ""

# 关键步骤：移除 quarantine 标记
echo -e "${BLUE}🔓 正在移除安全隔离标记...${NC}"
xattr -cr "${INSTALL_DIR}/${APP_BASENAME}"
echo -e "${GREEN}✓ 安全标记已移除${NC}"
echo ""

# 卸载 DMG
echo -e "${BLUE}📤 正在卸载 DMG...${NC}"
hdiutil detach "$MOUNT_POINT" -quiet
echo -e "${GREEN}✓ DMG 已卸载${NC}"
echo ""

# 清理临时文件
echo -e "${BLUE}🧹 正在清理临时文件...${NC}"
rm -rf "$TEMP_DIR"
echo -e "${GREEN}✓ 清理完成${NC}"
echo ""

# 安装完成
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  ✅ 安装成功!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}应用已安装到: ${INSTALL_DIR}/${APP_BASENAME}${NC}"
echo ""
echo -e "${YELLOW}你可以:${NC}"
echo -e "  1. 在 Launchpad 中找到 Yes Sessions"
echo -e "  2. 在 Applications 文件夹中双击打开"
echo -e "  3. 使用 Spotlight (Cmd+Space) 搜索 'Yes Sessions'"
echo ""
echo -e "${BLUE}首次启动可能需要几秒钟加载数据库...${NC}"
echo ""

# 询问是否立即打开
read -p "是否立即打开应用? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    open "${INSTALL_DIR}/${APP_BASENAME}"
    echo -e "${GREEN}🚀 正在启动 Yes Sessions...${NC}"
fi

echo ""
echo -e "${GREEN}感谢使用 Yes Sessions!${NC}"
echo -e "${BLUE}GitHub: https://github.com/${REPO}${NC}"
