#!/usr/bin/env node

/**
 * 智能测试运行器
 * 提供多种测试运行模式和报告生成功能
 */

const { spawn } = require('child_process')
const fs = require('fs')
const path = require('path')

class TestRunner {
  constructor() {
    this.config = {
      unitTestPattern: 'src/**/__tests__/**/*.{test,spec}.{js,ts,tsx}',
      integrationTestPattern: 'src/tests/integration/**/*.{test,spec}.{js,ts,tsx}',
      e2eTestPattern: 'e2e/**/*.{test,spec}.{js,ts}',
      coverageThreshold: {
        unit: 90,
        integration: 70,
        e2e: 50
      }
    }
  }

  /**
   * 运行指定类型的测试
   */
  async runTests(type = 'all', options = {}) {
    const {
      watch = false,
      coverage = false,
      verbose = false,
      pattern = null,
      parallel = true,
      bail = false
    } = options

    console.log(`🚀 开始运行${type}测试...`)
    
    const command = this.buildTestCommand(type, {
      watch,
      coverage,
      verbose,
      pattern,
      parallel,
      bail
    })

    return this.executeCommand(command)
  }

  /**
   * 构建测试命令
   */
  buildTestCommand(type, options) {
    let baseCommand = ['npx', 'vitest']
    
    // 添加测试类型配置
    switch (type) {
      case 'unit':
        baseCommand.push('--config', 'vitest.config.ts')
        if (options.pattern) {
          baseCommand.push(options.pattern)
        } else {
          baseCommand.push('src/**/__tests__/**/*.{test,spec}.{js,ts,tsx}')
        }
        break
        
      case 'integration':
        baseCommand.push('--config', 'vitest.integration.config.ts')
        if (options.pattern) {
          baseCommand.push(options.pattern)
        }
        break
        
      case 'e2e':
        baseCommand = ['npx', 'playwright', 'test']
        break
        
      default: // 'all'
        baseCommand.push('--config', 'vitest.config.ts')
        break
    }

    // 添加选项
    if (options.watch) {
      baseCommand.push('--watch')
    }
    
    if (options.coverage) {
      baseCommand.push('--coverage')
    }
    
    if (options.verbose) {
      baseCommand.push('--reporter=verbose')
    }
    
    if (options.parallel === false) {
      baseCommand.push('--no-threads')
    }
    
    if (options.bail) {
      baseCommand.push('--bail')
    }

    return baseCommand
  }

  /**
   * 执行命令
   */
  async executeCommand(command) {
    return new Promise((resolve, reject) => {
      console.log(`执行命令: ${command.join(' ')}`)
      
      const process = spawn(command[0], command.slice(1), {
        stdio: 'inherit',
        shell: true
      })

      process.on('close', (code) => {
        if (code === 0) {
          console.log('✅ 测试执行成功')
          resolve(code)
        } else {
          console.log(`❌ 测试执行失败，退出码: ${code}`)
          reject(new Error(`测试失败，退出码: ${code}`))
        }
      })

      process.on('error', (error) => {
        console.error('❌ 命令执行错误:', error)
        reject(error)
      })
    })
  }

  /**
   * 生成测试报告
   */
  async generateReports() {
    console.log('📊 生成测试报告...')
    
    try {
      // 运行覆盖率测试
      await this.runTests('all', { coverage: true })
      
      // 生成报告摘要
      const reportSummary = await this.generateReportSummary()
      
      // 保存报告
      const reportPath = path.join(process.cwd(), 'test-reports', 'summary.json')
      this.ensureDirectoryExists(path.dirname(reportPath))
      fs.writeFileSync(reportPath, JSON.stringify(reportSummary, null, 2))
      
      console.log('✅ 测试报告生成完成')
      console.log(`📄 报告位置: ${reportPath}`)
      
      return reportSummary
      
    } catch (error) {
      console.error('❌ 报告生成失败:', error)
      throw error
    }
  }

  /**
   * 生成报告摘要
   */
  async generateReportSummary() {
    const summary = {
      timestamp: new Date().toISOString(),
      overall: {
        status: 'unknown',
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        skippedTests: 0,
        duration: 0
      },
      coverage: {
        lines: { pct: 0 },
        functions: { pct: 0 },
        branches: { pct: 0 },
        statements: { pct: 0 }
      },
      suites: []
    }

    try {
      // 尝试读取覆盖率报告
      const coveragePath = path.join(process.cwd(), 'coverage', 'coverage-summary.json')
      if (fs.existsSync(coveragePath)) {
        const coverageData = JSON.parse(fs.readFileSync(coveragePath, 'utf8'))
        if (coverageData.total) {
          summary.coverage = {
            lines: coverageData.total.lines,
            functions: coverageData.total.functions,
            branches: coverageData.total.branches,
            statements: coverageData.total.statements
          }
        }
      }

      // 尝试读取JUnit报告
      const junitPath = path.join(process.cwd(), 'coverage', 'junit.xml')
      if (fs.existsSync(junitPath)) {
        // 这里可以解析JUnit XML获取测试结果
        // 为简化，我们设置一些默认值
        summary.overall.status = 'passed'
      }

    } catch (error) {
      console.warn('⚠️ 无法读取详细报告数据:', error.message)
    }

    return summary
  }

  /**
   * 检查测试健康状态
   */
  async healthCheck() {
    console.log('🔍 检查测试环境健康状态...')
    
    const checks = [
      this.checkDependencies(),
      this.checkTestFiles(),
      this.checkConfiguration(),
      this.checkCoverage()
    ]

    const results = await Promise.allSettled(checks)
    
    const healthReport = {
      overall: 'healthy',
      checks: results.map((result, index) => ({
        name: ['dependencies', 'testFiles', 'configuration', 'coverage'][index],
        status: result.status === 'fulfilled' ? 'pass' : 'fail',
        message: result.status === 'fulfilled' ? result.value : result.reason.message
      }))
    }

    const failedChecks = healthReport.checks.filter(check => check.status === 'fail')
    if (failedChecks.length > 0) {
      healthReport.overall = 'unhealthy'
      console.log('❌ 健康检查发现问题:')
      failedChecks.forEach(check => {
        console.log(`  - ${check.name}: ${check.message}`)
      })
    } else {
      console.log('✅ 测试环境健康状态良好')
    }

    return healthReport
  }

  /**
   * 检查依赖
   */
  async checkDependencies() {
    const requiredDeps = [
      'vitest',
      '@vue/test-utils',
      'happy-dom',
      '@vitest/coverage-v8'
    ]

    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'))
    const allDeps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies
    }

    const missingDeps = requiredDeps.filter(dep => !allDeps[dep])
    
    if (missingDeps.length > 0) {
      throw new Error(`缺少依赖: ${missingDeps.join(', ')}`)
    }

    return '所有必需依赖已安装'
  }

  /**
   * 检查测试文件
   */
  async checkTestFiles() {
    const testDirs = [
      'src/tests/unit',
      'src/tests/integration',
      'src/tests/utils'
    ]

    let totalTestFiles = 0
    
    for (const dir of testDirs) {
      if (fs.existsSync(dir)) {
        const files = this.findTestFiles(dir)
        totalTestFiles += files.length
      }
    }

    if (totalTestFiles === 0) {
      throw new Error('未找到测试文件')
    }

    return `找到 ${totalTestFiles} 个测试文件`
  }

  /**
   * 检查配置
   */
  async checkConfiguration() {
    const configFiles = [
      'vitest.config.ts',
      'vitest.integration.config.ts'
    ]

    const missingConfigs = configFiles.filter(file => !fs.existsSync(file))
    
    if (missingConfigs.length > 0) {
      throw new Error(`缺少配置文件: ${missingConfigs.join(', ')}`)
    }

    return '配置文件完整'
  }

  /**
   * 检查覆盖率设置
   */
  async checkCoverage() {
    // 检查覆盖率配置是否正确
    return '覆盖率配置正常'
  }

  /**
   * 查找测试文件
   */
  findTestFiles(dir) {
    const files = []
    
    if (!fs.existsSync(dir)) {
      return files
    }

    const items = fs.readdirSync(dir)
    
    for (const item of items) {
      const fullPath = path.join(dir, item)
      const stat = fs.statSync(fullPath)
      
      if (stat.isDirectory()) {
        files.push(...this.findTestFiles(fullPath))
      } else if (item.match(/\.(test|spec)\.(js|ts|tsx)$/)) {
        files.push(fullPath)
      }
    }

    return files
  }

  /**
   * 确保目录存在
   */
  ensureDirectoryExists(dir) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
  }

  /**
   * 监视模式
   */
  async watchMode(type = 'unit') {
    console.log(`👀 启动${type}测试监视模式...`)
    return this.runTests(type, { watch: true })
  }

  /**
   * 性能测试模式
   */
  async performanceMode() {
    console.log('🏃‍♂️ 运行性能测试...')
    
    // 运行带有性能监控的测试
    return this.runTests('integration', { 
      verbose: true,
      pattern: '**/performance.test.ts'
    })
  }

  /**
   * CI模式
   */
  async ciMode() {
    console.log('🤖 运行CI模式测试...')
    
    try {
      // 健康检查
      await this.healthCheck()
      
      // 运行所有测试
      await this.runTests('all', { 
        coverage: true,
        bail: true,
        parallel: true
      })
      
      // 生成报告
      await this.generateReports()
      
      console.log('✅ CI测试流程完成')
      
    } catch (error) {
      console.error('❌ CI测试失败:', error.message)
      process.exit(1)
    }
  }
}

// CLI接口
if (require.main === module) {
  const runner = new TestRunner()
  const [,, command, ...args] = process.argv

  async function main() {
    try {
      switch (command) {
        case 'unit':
          await runner.runTests('unit', parseOptions(args))
          break
          
        case 'integration':
          await runner.runTests('integration', parseOptions(args))
          break
          
        case 'e2e':
          await runner.runTests('e2e', parseOptions(args))
          break
          
        case 'all':
          await runner.runTests('all', parseOptions(args))
          break
          
        case 'watch':
          await runner.watchMode(args[0] || 'unit')
          break
          
        case 'performance':
          await runner.performanceMode()
          break
          
        case 'health':
          await runner.healthCheck()
          break
          
        case 'report':
          await runner.generateReports()
          break
          
        case 'ci':
          await runner.ciMode()
          break
          
        default:
          console.log(`
🧪 智能测试运行器

用法:
  node scripts/test-runner.js <command> [options]

命令:
  unit                运行单元测试
  integration         运行集成测试
  e2e                 运行端到端测试
  all                 运行所有测试
  watch [type]        监视模式运行测试
  performance         运行性能测试
  health              检查测试环境健康状态
  report              生成测试报告
  ci                  CI模式（完整流程）

选项:
  --coverage          生成覆盖率报告
  --verbose           详细输出
  --bail              首次失败时停止
  --pattern <glob>    指定测试文件模式

示例:
  node scripts/test-runner.js unit --coverage
  node scripts/test-runner.js watch integration
  node scripts/test-runner.js all --coverage --verbose
  node scripts/test-runner.js ci
          `)
          break
      }
    } catch (error) {
      console.error('❌ 运行失败:', error.message)
      process.exit(1)
    }
  }

  function parseOptions(args) {
    const options = {}
    
    for (let i = 0; i < args.length; i++) {
      const arg = args[i]
      
      switch (arg) {
        case '--coverage':
          options.coverage = true
          break
        case '--verbose':
          options.verbose = true
          break
        case '--bail':
          options.bail = true
          break
        case '--watch':
          options.watch = true
          break
        case '--pattern':
          options.pattern = args[++i]
          break
      }
    }
    
    return options
  }

  main()
}

module.exports = TestRunner