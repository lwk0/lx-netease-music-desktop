// 轻量翻译工具：默认使用免费、无需密钥的在线翻译接口，带内存缓存与多重兜底。
// 适用于「评论翻译」「歌手简介翻译」等场景。
//
// 后端优先级（按顺序尝试，任一成功即返回）：
//   1. CUSTOM_ENDPOINT  —— 若你配置了自建/第三方翻译代理（Lingva 兼容接口），优先使用；
//   2. Lingva 公共实例  —— Google 翻译的非官方代理，自动识别源语言，质量高；
//   3. MyMemory 公共接口 —— 自有服务器，中文环境通常可达（匿名额度约 500 字/天，超限会原样返回）。
//
// 重要：本工具统一使用 LX Music 自带的 httpFetch（底层 needle），会自动应用
// 「设置 → 网络」中配置的代理（common.proxy / envProxy）。这样才能在需要代理
// 才能访问外网的环境下正常工作（原生 fetch 默认不走应用代理）。
//
// 如需更高稳定 / 私有部署，把 CUSTOM_ENDPOINT 改成你的翻译服务地址即可
// （需为 Lingva 兼容格式：GET {ENDPOINT}/auto/{targetLang}/{text}）。
import { appSetting } from '@renderer/store/setting'
import { httpFetch } from '@renderer/utils/request'

// 可选：填入你自己的 Lingva 兼容翻译代理地址（留空则使用下方公共实例）
const CUSTOM_ENDPOINT = ''

// Lingva 公共实例列表（任意一个可用即可，依次尝试）
const LINGVA_ENDPOINTS = [
  'https://lingva.papiweb.eu/api/v1',
  'https://lingva.ml/api/v1',
  'https://translate.ignorantdream.com/api/v1',
]

// MyMemory 公共接口（兜底）
const MYMEMORY_ENDPOINT = 'https://api.mymemory.translated.net/get'

// 单个后端超时（毫秒），避免被墙的实例无限挂起拖垮整体
const REQUEST_TIMEOUT = 6000

const cache = new Map<string, string>()

interface LingvaResp { translation?: string }
interface MyMemoryResp {
  responseStatus?: number
  responseDetails?: string
  responseData?: { translatedText?: string }
}

function getTargetLang(): string {
  const id = (appSetting['common.langId'] ?? 'zh-cn') as string
  switch (id) {
    case 'zh-tw': return 'zh-TW'
    case 'en-us': return 'en'
    default: return 'zh-CN'
  }
}

// 粗略识别源语言，供 MyMemory 兜底使用（Lingva 使用 auto 自动识别，无需此步）
function detectSource(text: string): string {
  if (/[぀-ヿ]/.test(text)) return 'ja'
  if (/[가-힯]/.test(text)) return 'ko'
  if (/[一-鿿]/.test(text)) return 'zh-CN'
  return 'en'
}

// 用 httpFetch（走应用代理）发起 GET 并解析 JSON 响应
async function getJson(url: string): Promise<unknown> {
  const requestObj = httpFetch(url, {
    method: 'get',
    timeout: REQUEST_TIMEOUT,
  }) as unknown as { promise: Promise<{ body?: unknown }> }
  const resp = await requestObj.promise
  return resp?.body
}

async function viaLingva(endpoint: string, text: string, target: string): Promise<string> {
  const url = `${endpoint}/auto/${encodeURIComponent(target)}/${encodeURIComponent(text)}`
  const data = await getJson(url) as LingvaResp
  if (!data?.translation) throw new Error('lingva empty')
  return data.translation
}

async function viaMyMemory(text: string, target: string): Promise<string> {
  const source = detectSource(text)
  const url = `${MYMEMORY_ENDPOINT}?q=${encodeURIComponent(text)}&langpair=${encodeURIComponent(source)}|${encodeURIComponent(target)}`
  const raw = await getJson(url)
  if (raw == null) throw new Error('mymemory no response')
  let parsed: MyMemoryResp
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw)
    } catch {
      throw new Error('mymemory parse error')
    }
  } else {
    parsed = raw as MyMemoryResp
  }
  if (parsed?.responseStatus !== 200 || !parsed?.responseData?.translatedText) {
    throw new Error(parsed?.responseDetails ?? 'mymemory failed')
  }
  const translated = parsed.responseData.translatedText
  // 超额 / 不支持时 MyMemory 会原样返回原文，此时视为未翻译成功
  if (source !== target && translated.trim() === text.trim()) {
    throw new Error('mymemory returned original (quota/unsupported)')
  }
  return translated
}

/**
 * 翻译文本。优先使用自定义端点 / Lingva（自动识别源语言、质量高），失败则回退 MyMemory。
 * 同一文本 + 目标语言仅请求一次，结果缓存于内存。
 */
export async function translateText(text: string, target?: string): Promise<string> {
  const trimmed = (text ?? '').trim()
  if (!trimmed) return ''
  const tgt = target ?? getTargetLang()
  // 源语言与目标语言相同（如中文评论 → 中文界面），无需翻译，直接返回原文
  const src = detectSource(trimmed)
  if (src === tgt) return trimmed

  const key = `${tgt}::${trimmed}`
  const cached = cache.get(key)
  if (cached != null) return cached

  const tasks: Array<() => Promise<string>> = []
  if (CUSTOM_ENDPOINT) tasks.push(async() => viaLingva(CUSTOM_ENDPOINT, trimmed, tgt))
  for (const ep of LINGVA_ENDPOINTS) tasks.push(async() => viaLingva(ep, trimmed, tgt))
  tasks.push(async() => viaMyMemory(trimmed, tgt))

  let lastErr: unknown
  for (const run of tasks) {
    try {
      const result = await run()
      cache.set(key, result)
      return result
    } catch (err) {
      lastErr = err
    }
  }

  throw lastErr instanceof Error ? lastErr : new Error('translation failed')
}
