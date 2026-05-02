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

    let result;
    try {
      result = JSON.parse(raw);
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) result = JSON.parse(match[0]);
      else throw new Error('Invalid JSON');
    }

    res.status(200).json(result);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch recipe', detail: e.message });
  }
}
