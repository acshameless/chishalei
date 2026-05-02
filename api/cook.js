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

  const prompt = `你是一位中原（河南）菜系的家庭烹饪专家，擅长把复杂的馆子菜变成厨房小白也能上手做的家常版。

请为"${dish}"写一份家庭做法，输出必须是合法的 JSON，不要加 markdown 代码块标记，不要加任何解释文字。

JSON 结构严格如下：
{
  "materials": [
    {"name": "食材名", "amount": "具体用量（如300克、2勺）"}
  ],
  "steps": [
    {"title": "步骤小标题（不超过4个字）", "desc": "详细操作，控制在25字以内", "heat": "火候/时间（如中火3分钟、小火慢炖1小时）"}
  ],
  "tips": ["小贴士1", "小贴士2"]
}

要求：
1. 食材用量必须具体，禁止写"适量""少许"
2. 步骤控制在3-5步，每步标题不超过4个字，描述不超过25字
3. 突出河南地方特色和家常做法
4. 汤面类必须说明汤底做法；油炸类必须说明油温（几成热）；面食必须说明和面/醒面要点
5. 语气朴实，像邻居阿姨教你做菜`;

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
          { role: 'system', content: '你是一位中原（河南）菜系的家庭烹饪专家。输出必须是合法JSON，不要markdown代码块，不要任何解释文字。同一道菜每次输出要保持一致。' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.2,
        max_tokens: 600
      })
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(502).json({ error: 'LLM API error', detail: err });
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content || '';

    // 尝试解析 JSON，如果失败返回原始文本让前端处理
    let recipe;
    try {
      recipe = JSON.parse(raw);
    } catch {
      // 尝试提取 JSON 块
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) recipe = JSON.parse(match[0]);
      else recipe = raw;
    }

    res.status(200).json({ recipe });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch recipe', detail: e.message });
  }
}
