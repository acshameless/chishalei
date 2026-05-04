const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const API_KEY = process.env.LLM_API_KEY || '';
const BASE_URL = (process.env.LLM_BASE_URL || 'https://api.deepseek.com').replace(/\/$/, '');
const MODEL = process.env.LLM_MODEL || 'deepseek-chat';

// 通用 HTTP POST，兼容 fetch 不可用的旧 Node 版本
function httpPostJSON(url, headers, body) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? require('https') : require('http');
    const u = new (require('url').URL)(url);
    const opts = {
      hostname: u.hostname, port: u.port || (url.startsWith('https') ? 443 : 80),
      path: u.pathname + u.search, method: 'POST', headers,
      timeout: 30000
    };
    const req = lib.request(opts, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error('HTTP ' + res.statusCode + ': ' + data.slice(0, 300)));
        } else {
          try { resolve(JSON.parse(data)); } catch (e) { reject(new Error('Invalid JSON: ' + data.slice(0, 200))); }
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });
    req.write(body);
    req.end();
  });
}

exports.main = async (event, context) => {
  const { dish } = event;
  if (!dish) return { error: 'Missing dish' };
  if (!API_KEY) return { error: 'LLM_API_KEY not configured in cloud environment variables' };

  const prompt = `你是一位像王刚、小高姐一样的美食博主，精通中原（河南）家常菜的烹饪。请为"${dish}"写一份详细的厨房实战做法。

输出必须是合法 JSON，不要加 markdown 代码块，不要任何解释文字。

JSON 结构严格如下：
{
  "tip": "一句话饮食建议，15字以内",
  "recipe": {
    "materials": [{"name": "食材名", "amount": "具体用量"}],
    "steps": [{"title": "步骤名", "desc": "详细操作说明", "why": "原因", "heat": "火候/时间"}],
    "tips": ["小贴士1", "小贴士2", "小贴士3"]
  }
}`;

  try {
    const data = await httpPostJSON(BASE_URL + '/chat/completions', {
      'Authorization': 'Bearer ' + API_KEY,
      'Content-Type': 'application/json'
    }, JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: '你是一位中原（河南）菜系的烹饪专家。输出必须是合法JSON，不要markdown代码块，不要解释文字。' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.2,
      max_tokens: 1500
    }));

    const raw = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';
    const result = safeJsonParse(raw);
    if (!result) throw new Error('Invalid JSON response: ' + raw.slice(0, 200));

    if (!result.recipe) {
      result.recipe = {
        materials: [{ name: '主料', amount: '300克' }],
        steps: [{ title: '烹制', desc: '按个人口味烹饪至熟', why: '火候到位味道自然好', heat: '中火' }],
        tips: ['食材预处理做足，炒菜才顺手', '调味分两次，中间尝咸淡']
      };
    }
    if (!result.tip) result.tip = '用心烹饪，味道自然不会差';

    return result;
  } catch (e) {
    return { error: 'Failed to fetch recipe', detail: e.message };
  }
};

function safeJsonParse(str) {
  if (!str) return null;
  try { return JSON.parse(str); } catch {}

  let clean = str.replace(/```json\s*/gi, '').replace(/```\s*$/g, '').trim();
  try { return JSON.parse(clean); } catch {}

  const match = clean.match(/\{[\s\S]*\}/);
  if (match) {
    try { return JSON.parse(match[0]); } catch {}
    clean = match[0];
  }

  let fixed = clean.replace(/,\s*([}\]])/g, '$1');
  fixed = fixed.replace(/([}\]])\s*([{\[])/g, '$1,$2');
  try { return JSON.parse(fixed); } catch {}

  try { return (new Function('return ' + clean))(); } catch {}
  return null;
}