#!/bin/bash

# ==============================================================================
# EzCloud Frontend Testing Suite
# 完整的前端测试运行脚本，包括单元测试和集成测试
# ==============================================================================

set -e  # 遇到错误时立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 显示帮助信息
show_help() {
    echo "EzCloud Frontend Testing Suite"
    echo ""
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  --unit              只运行单元测试"
    echo "  --integration       只运行集成测试"
    echo "  --all               运行所有测试（默认）"
    echo "  --coverage          生成覆盖率报告"
    echo "  --ui                以UI模式运行测试"
    echo "  --watch             以监视模式运行测试"
    echo "  --ci                CI模式（静默运行，生成报告）"
    echo "  --help              显示此帮助信息"
    echo ""
    echo "示例:"
    echo "  $0                  # 运行所有测试"
    echo "  $0 --unit          # 只运行单元测试"
    echo "  $0 --coverage      # 运行所有测试并生成覆盖率"
    echo "  $0 --ui            # 以UI模式运行测试"
    echo "  $0 --ci            # CI模式运行"
}

# 检查依赖
check_dependencies() {
    log_info "检查依赖包..."
    
    if ! command -v npm &> /dev/null; then
        log_error "npm 未安装"
        exit 1
    fi
    
    if [ ! -f "package.json" ]; then
        log_error "package.json 未找到，请在项目根目录运行此脚本"
        exit 1
    fi
    
    if [ ! -d "node_modules" ]; then
        log_warning "node_modules 未找到，正在安装依赖..."
        npm ci
    fi
    
    log_success "依赖检查完成"
}

# 清理之前的测试结果
cleanup_previous_results() {
    log_info "清理之前的测试结果..."
    
    # 清理覆盖率报告
    rm -rf coverage/
    
    # 清理测试输出文件
    rm -f junit.xml
    rm -f test-results.json
    
    log_success "清理完成"
}

# 运行单元测试
run_unit_tests() {
    log_info "运行单元测试..."
    
    if [ "$UI_MODE" = true ]; then
        npm run test:ui
    elif [ "$WATCH_MODE" = true ]; then
        npm run test:watch
    elif [ "$COVERAGE_MODE" = true ]; then
        npm run test:coverage
    else
        npm run test:run
    fi
    
    if [ $? -eq 0 ]; then
        log_success "单元测试通过"
    else
        log_error "单元测试失败"
        exit 1
    fi
}

# 运行集成测试
run_integration_tests() {
    log_info "运行集成测试..."
    
    if [ "$UI_MODE" = true ]; then
        npm run test:integration:ui
    elif [ "$COVERAGE_MODE" = true ]; then
        npm run test:integration:coverage
    else
        npm run test:integration:run
    fi
    
    if [ $? -eq 0 ]; then
        log_success "集成测试通过"
    else
        log_error "集成测试失败"
        exit 1
    fi
}

# 运行所有测试
run_all_tests() {
    log_info "运行所有测试..."
    
    if [ "$COVERAGE_MODE" = true ]; then
        npm run test:all:coverage
    else
        npm run test:all
    fi
    
    if [ $? -eq 0 ]; then
        log_success "所有测试通过"
    else
        log_error "测试失败"
        exit 1
    fi
}

# 运行TypeScript类型检查
run_type_check() {
    log_info "运行TypeScript类型检查..."
    
    npm run test:tsc
    
    if [ $? -eq 0 ]; then
        log_success "TypeScript类型检查通过"
    else
        log_error "TypeScript类型检查失败"
        return 1
    fi
}

# 生成测试报告
generate_reports() {
    log_info "生成测试报告..."
    
    # 创建报告目录
    mkdir -p reports
    
    # 复制覆盖率报告
    if [ -d "coverage" ]; then
        cp -r coverage reports/
        log_success "覆盖率报告已复制到 reports/coverage/"
    fi
    
    # 生成测试摘要
    cat > reports/test-summary.md << EOF
# EzCloud Frontend 测试报告

## 测试执行时间
- 开始时间: $(date)
- 测试类型: $TEST_TYPE

## 测试覆盖率
$(if [ -f "coverage/lcov-report/index.html" ]; then echo "- 覆盖率报告: [查看详细报告](coverage/lcov-report/index.html)"; else echo "- 未生成覆盖率报告"; fi)

## 测试文件统计
- 单元测试文件: $(find src -name "*.test.ts" -o -name "*.spec.ts" | wc -l)
- 集成测试文件: $(find src/tests/integration -name "*.test.ts" | wc -l)

## 组件测试覆盖情况
$(if [ -f "coverage/lcov-report/index.html" ]; then echo "详细的组件测试覆盖情况请查看覆盖率报告"; else echo "请运行带有覆盖率选项的测试来查看详细情况"; fi)
EOF
    
    log_success "测试报告已生成到 reports/test-summary.md"
}

# CI模式特殊处理
run_ci_mode() {
    log_info "以CI模式运行测试..."
    
    # 设置CI环境变量
    export CI=true
    export NODE_ENV=test
    
    # 运行类型检查
    run_type_check || {
        log_error "TypeScript类型检查失败，CI构建终止"
        exit 1
    }
    
    # 运行所有测试并生成覆盖率
    COVERAGE_MODE=true
    run_all_tests
    
    # 生成报告
    generate_reports
    
    log_success "CI模式测试完成"
}

# 显示测试统计信息
show_test_stats() {
    log_info "测试统计信息:"
    
    # 统计测试文件数量
    UNIT_TEST_COUNT=$(find src -name "*.test.ts" -o -name "*.spec.ts" | grep -v integration | wc -l)
    INTEGRATION_TEST_COUNT=$(find src/tests/integration -name "*.test.ts" 2>/dev/null | wc -l)
    COMPONENT_COUNT=$(find src/components -name "*.vue" | wc -l)
    STORE_COUNT=$(find src/stores -name "*.ts" | wc -l)
    
    echo "  • 单元测试文件: $UNIT_TEST_COUNT"
    echo "  • 集成测试文件: $INTEGRATION_TEST_COUNT"  
    echo "  • Vue组件: $COMPONENT_COUNT"
    echo "  • Pinia stores: $STORE_COUNT"
    
    if [ -f "coverage/coverage-summary.json" ]; then
        echo "  • 覆盖率摘要:"
        node -e "
            const summary = require('./coverage/coverage-summary.json');
            const total = summary.total;
            console.log('    - 行覆盖率: ' + total.lines.pct + '%');
            console.log('    - 函数覆盖率: ' + total.functions.pct + '%');  
            console.log('    - 分支覆盖率: ' + total.branches.pct + '%');
            console.log('    - 语句覆盖率: ' + total.statements.pct + '%');
        " 2>/dev/null || echo "    - 覆盖率数据不可用"
    fi
}

# 主函数
main() {
    local TEST_TYPE="all"
    local UI_MODE=false
    local WATCH_MODE=false
    local COVERAGE_MODE=false
    local CI_MODE=false
    
    # 解析命令行参数
    while [[ $# -gt 0 ]]; do
        case $1 in
            --unit)
                TEST_TYPE="unit"
                shift
                ;;
            --integration)
                TEST_TYPE="integration"
                shift
                ;;
            --all)
                TEST_TYPE="all"
                shift
                ;;
            --coverage)
                COVERAGE_MODE=true
                shift
                ;;
            --ui)
                UI_MODE=true
                shift
                ;;
            --watch)
                WATCH_MODE=true
                shift
                ;;
            --ci)
                CI_MODE=true
                shift
                ;;
            --help)
                show_help
                exit 0
                ;;
            *)
                log_error "未知选项: $1"
                show_help
                exit 1
                ;;
        esac
    done
    
    # 显示开始信息
    echo "================================="
    echo "EzCloud Frontend Testing Suite"
    echo "================================="
    echo ""
    
    # 检查依赖
    check_dependencies
    
    # 清理之前的结果
    cleanup_previous_results
    
    # 根据模式运行测试
    if [ "$CI_MODE" = true ]; then
        run_ci_mode
    else
        case $TEST_TYPE in
            "unit")
                run_unit_tests
                ;;
            "integration")
                run_integration_tests
                ;;
            "all")
                if [ "$UI_MODE" = true ] || [ "$WATCH_MODE" = true ]; then
                    log_warning "UI/Watch模式下只能运行单元测试，集成测试请单独运行"
                    run_unit_tests
                else
                    run_all_tests
                fi
                ;;
        esac
        
        # 生成报告（非UI/Watch模式）
        if [ "$UI_MODE" = false ] && [ "$WATCH_MODE" = false ]; then
            generate_reports
        fi
    fi
    
    # 显示统计信息
    show_test_stats
    
    log_success "测试执行完成!"
}

# 执行主函数
main "$@"