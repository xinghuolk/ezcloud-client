/**
 * EzCloud 应用配置预加载插件
 * 在应用启动时预加载所有配置，确保组件可以同步访问
 */

import type { VueroPlugin } from '/@src/utils/plugins'
import { useAppConfig } from '/@src/stores/app-config'

// 开发环境类型扩展
declare global {
  interface Window {
    __showConfig?: () => void
  }
}

/**
 * 显示配置错误页面
 */
function showConfigurationError(missingConfigs: string[]) {
  document.body.innerHTML = `
    <div style="
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      margin: 0;
      padding: 20px;
    ">
      <div style="
        background: white;
        border-radius: 12px;
        padding: 40px;
        box-shadow: 0 20px 40px rgba(0,0,0,0.1);
        max-width: 600px;
        width: 100%;
        text-align: center;
      ">
        <div style="
          background: #fee;
          border: 2px solid #f87171;
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 24px;
        ">
          <h1 style="
            color: #dc2626;
            margin: 0 0 16px 0;
            font-size: 24px;
            font-weight: 600;
          ">⚠️ 应用配置缺失</h1>
          <p style="
            color: #7f1d1d;
            margin: 0;
            font-size: 16px;
            line-height: 1.5;
          ">
            以下关键配置项缺失，应用无法正常启动：
          </p>
        </div>
        
        <div style="
          background: #fef7ff;
          border-left: 4px solid #a855f7;
          padding: 16px;
          margin: 20px 0;
          text-align: left;
        ">
          <h3 style="
            color: #581c87;
            margin: 0 0 12px 0;
            font-size: 16px;
          ">缺失的配置项：</h3>
          <ul style="
            color: #7c2d12;
            margin: 0;
            padding-left: 20px;
          ">
            ${missingConfigs.map(config => `<li style="margin: 4px 0;">${config}</li>`).join('')}
          </ul>
        </div>

        <div style="
          background: #f0f9ff;
          border-left: 4px solid #0ea5e9;
          padding: 16px;
          margin: 20px 0;
          text-align: left;
        ">
          <h3 style="
            color: #0c4a6e;
            margin: 0 0 12px 0;
            font-size: 16px;
          ">解决方案：</h3>
          <ol style="
            color: #0c4a6e;
            margin: 0;
            padding-left: 20px;
            line-height: 1.6;
          ">
            <li>检查 <code>.env</code> 环境文件是否包含所需配置项</li>
            <li>确认 Docker 容器环境变量是否正确传递</li>
            <li>验证 <code>/config.json</code> 文件是否正确生成</li>
            <li>重启容器或重新加载页面</li>
          </ol>
        </div>
        
        <button onclick="location.reload()" style="
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 6px;
          padding: 12px 24px;
          font-size: 16px;
          cursor: pointer;
          transition: background 0.2s;
        " onmouseover="this.style.background='#2563eb'" onmouseout="this.style.background='#3b82f6'">
          🔄 重新加载页面
        </button>
      </div>
    </div>
  `
}

/**
 * 显示致命错误页面
 */
function showFatalError(errorMessage: string) {
  document.body.innerHTML = `
    <div style="
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: linear-gradient(135deg, #dc2626 0%, #7f1d1d 100%);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      margin: 0;
      padding: 20px;
    ">
      <div style="
        background: white;
        border-radius: 12px;
        padding: 40px;
        box-shadow: 0 20px 40px rgba(0,0,0,0.2);
        max-width: 600px;
        width: 100%;
        text-align: center;
      ">
        <div style="
          color: #dc2626;
          font-size: 48px;
          margin-bottom: 20px;
        ">💥</div>
        
        <h1 style="
          color: #dc2626;
          margin: 0 0 16px 0;
          font-size: 28px;
          font-weight: 600;
        ">应用启动失败</h1>
        
        <div style="
          background: #fef2f2;
          border: 2px solid #fca5a5;
          border-radius: 8px;
          padding: 20px;
          margin: 20px 0;
        ">
          <p style="
            color: #7f1d1d;
            margin: 0;
            font-size: 16px;
            line-height: 1.5;
            font-family: 'Consolas', 'Monaco', monospace;
            background: #fff5f5;
            padding: 12px;
            border-radius: 4px;
            border: 1px solid #fca5a5;
          ">${errorMessage}</p>
        </div>
        
        <div style="
          text-align: left;
          margin: 24px 0;
          color: #374151;
          line-height: 1.6;
        ">
          <h3 style="color: #1f2937; margin-bottom: 12px;">可能的原因：</h3>
          <ul style="margin: 0; padding-left: 20px;">
            <li>Docker 容器环境变量未正确配置</li>
            <li>配置文件加载超时或网络问题</li>
            <li>容器启动脚本执行失败</li>
            <li>关键服务依赖未就绪</li>
          </ul>
        </div>
        
        <div style="display: flex; gap: 12px; justify-content: center;">
          <button onclick="location.reload()" style="
            background: #dc2626;
            color: white;
            border: none;
            border-radius: 6px;
            padding: 12px 20px;
            font-size: 16px;
            cursor: pointer;
          ">🔄 重新加载</button>
          
          <button onclick="window.open('/config.json', '_blank')" style="
            background: #6b7280;
            color: white;
            border: none;
            border-radius: 6px;
            padding: 12px 20px;
            font-size: 16px;
            cursor: pointer;
          ">🔍 查看配置</button>
        </div>
      </div>
    </div>
  `
}

const appConfigPlugin: VueroPlugin = async ({ app, pinia }) => {
  console.log('🔧 初始化应用配置插件...')

  // 获取配置store实例
  const appConfig = useAppConfig(pinia)

  // VITE环境变量模式 - 配置已在构建时确定
  try {
    console.log('⏳ 验证应用配置...')
    console.log('✅ 应用配置验证完成')
    
    // 严格验证关键配置项
    const missingConfigs = []
    
    if (!appConfig.recaptchaSiteKey) {
      missingConfigs.push('RECAPTCHA_SITE_KEY')
    }
    
    if (!appConfig.recaptchaV2SiteKey) {
      missingConfigs.push('RECAPTCHA_V2_SITE_KEY')  
    }

    if (missingConfigs.length > 0) {
      const errorMsg = `关键配置缺失: ${missingConfigs.join(', ')}`
      console.error('❌', errorMsg)
      
      // 显示用户友好的错误页面
      showConfigurationError(missingConfigs)
      throw new Error(errorMsg)
    }
    
    console.log('✅ 关键配置项验证通过')

  } catch (error) {
    // 配置加载或验证失败，阻止应用启动
    console.error('❌ 应用配置初始化失败，无法启动应用:', error)
    
    // 显示错误页面而不是继续启动
    showFatalError(error instanceof Error ? error.message : '配置初始化失败')
    
    // 抛出错误阻止应用继续初始化
    throw error
  }

  // 添加全局属性，方便开发调试
  if (import.meta.env.DEV) {
    app.config.globalProperties.$config = appConfig
    
    // VITE模式下无需重载（构建时确定）
    window.__showConfig = () => {
      console.log('📋 当前配置:', {
        recaptchaSiteKey: appConfig.recaptchaSiteKey,
        recaptchaV2SiteKey: appConfig.recaptchaV2SiteKey,
        apiBaseUrl: appConfig.apiBaseUrl,
        wsBaseUrl: appConfig.wsBaseUrl
      })
    }
  }

  console.log('✅ 应用配置插件初始化完成')
}

// 类型扩展已在文件顶部声明

export default appConfigPlugin