export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { dish } = req.body;
  if (!dish) return res.status(400).json({ error: 'Missing dish' });

  const provider = process.env.LLM_PROVIDER || 'openai';
  const apiKey = process.env.LLM_API_KEY;
  const model = process.env.LLM_MODEL || 'gpt-4o-mini';

  if (!apiKey) return res.status(500).json({ error: 'LLM API key not configured' });

  const prompt = `你是一位在河南做了四十年饭的老师傅，擅长家常中原菜。请为"${dish}"写一份详细但简洁的家庭做法。

要求：
1. 【材料】列出所需食材和用量（家庭常见食材，用量明确）
2. 【步骤】分步骤说明，每步不超过30字，共3-5步
3. 【火候】说明关键火候/时间（如"中火炸3分钟"、"小火慢炖1小时"）
4. 【小贴士】1-2句老师傅的私房建议
5. 总字数控制在250字以内
6. 语气亲切，像老师傅面对面教徒弟

注意：
- 汤面类要说明汤底做法
- 油炸类要说明油温（几成热）
- 面食要说明和面/醒面要点
- 肉类要说明去腥/腌制方法`;

  try {
    let endpoint;
    switch (provider) {
      case 'openai':
        endpoint = 'https://api.openai.com/v1/chat/completions';
        break;
      case 'deepseek':
        endpoint = 'https://api.deepseek.com/v1/chat/completions';
        break;
      case 'siliconflow':
        endpoint = 'https://api.siliconflow.cn/v1/chat/completions';
        break;
      default:
        endpoint = process.env.LLM_BASE_URL || 'https://api.openai.com/v1/chat/completions';
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 500
      })
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(502).json({ error: 'LLM API error', detail: err });
    }

    const data = await response.json();
    const recipe = data.choices?.[0]?.message?.content || '';
    res.status(200).json({ recipe });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch recipe', detail: e.message });
  }
}
