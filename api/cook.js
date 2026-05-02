export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { dish } = req.body;
  if (!dish) return res.status(400).json({ error: 'Missing dish' });

  const apiKey = process.env.LLM_API_KEY;
  const model = process.env.LLM_MODEL || 'gpt-4o-mini';
  const baseUrl = process.env.LLM_BASE_URL;

  if (!apiKey) return res.status(500).json({ error: 'LLM API key not configured' });

  const prompt = `你是一位像王刚、小高姐一样的美食博主，精通中原（河南）家常菜的烹饪。请为"${dish}"写一份详细的厨房实战做法。

输出必须是合法 JSON，不要加 markdown 代码块，不要任何解释文字。

JSON 结构严格如下：
{
  "tip": "一句话饮食建议，15字以内（如：焦底香脆，趁热吃）",
  "recipe": {
    "materials": [
      {"name": "食材名", "amount": "具体用量（如300克、2勺）"}
    ],
    "steps": [
      {"title": "步骤名（不超过4个字）", "desc": "详细操作说明（40-60字）", "why": "为什么要这样做（20字以内）", "heat": "火候/时间（如中火3分钟、小火慢炖1小时）"}
    ],
    "tips": ["小贴士1", "小贴士2", "小贴士3"]
  }
}

要求：
1. 食材用量必须具体，禁止写"适量""少许"，必须给出数字
2. 每步描述要像美食博主一样详细：先做什么、要注意什么、为什么这样做
3. 火候精确到温度（几成热）或时间（几分钟）
4. 突出河南地方特色和传统技法
5. 语气亲切实用，像美食博主面对面教你做菜
6. 步骤控制在4-6步，每步描述40-60字
7. why字段解释这步操作的目的（如"冷水下锅，血沫才能充分析出"）
8. 小贴士至少3条，要实用、具体，不是泛泛而谈`;

  try {
    const endpoint = baseUrl
      ? baseUrl.replace(/\/$/, '') + '/chat/completions'
      : 'https://api.openai.com/v1/chat/completions';

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: '你是一位中原（河南）菜系的家庭烹饪专家，像王刚、小高姐一样的美食博主。输出必须是合法JSON，不要markdown代码块，不要任何解释文字。同一道菜每次输出要保持一致。' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.2,
        max_tokens: 800
      })
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(502).json({ error: 'LLM API error', detail: err });
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content || '';

    const result = safeJsonParse(raw);
    if (!result) throw new Error('Invalid JSON: ' + raw.slice(0, 200));

    // Normalize: ensure recipe object exists
    if (!result.recipe) {
      result.recipe = {
        materials: [{ name: '主料', amount: '300克' }],
        steps: [{ title: '烹制', desc: '按个人口味烹饪至熟', why: '火候到位味道自然好', heat: '中火' }],
        tips: ['食材预处理做足，炒菜才顺手', '调味分两次，中间尝咸淡']
      };
    }
    if (!result.tip) {
      result.tip = '用心烹饪，味道自然不会差';
    }

    res.status(200).json(result);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch recipe', detail: e.message });
  }
}

function safeJsonParse(str) {
  if (!str) return null;

  // 1. Direct parse
  try { return JSON.parse(str); } catch {}

  // 2. Strip markdown code blocks
  let clean = str.replace(/```json\s*/gi, '').replace(/```\s*$/g, '').trim();
  try { return JSON.parse(clean); } catch {}

  // 3. Extract first { ... } block (greedy)
  const match = clean.match(/\{[\s\S]*\}/);
  if (match) {
    try { return JSON.parse(match[0]); } catch {}
    clean = match[0];
  }

  // 4. Fix common LLM JSON errors
  // 4a. Remove trailing commas before } or ]
  let fixed = clean.replace(/,\s*([}\]])/g, '$1');
  // 4b. Fix missing commas between adjacent }{
  fixed = fixed.replace(/([}\]])\s*([{\[])/g, '$1,$2');
  // 4c. Fix unescaped quotes inside strings (aggressive but works for CJK content)
  fixed = fixed.replace(/"([^"\\]*?)"([^,}\]:\s])/g, (m, p1, p2) => {
    // If the quote is followed by something that doesn't look like JSON syntax,
    // it might be an unescaped quote inside a string
    if (p2 === '"') return m; // already escaped or valid
    return '"' + p1 + '\\"' + p2;
  });
  try { return JSON.parse(fixed); } catch {}

  // 5. Last resort: use Function constructor (safer than eval)
  try {
    return (new Function('return ' + clean))();
  } catch {}

  return null;
}
