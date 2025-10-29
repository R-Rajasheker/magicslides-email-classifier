const OpenAI = require('openai');

function mockClassify(emails) {
  const categories = ["Important", "Promotions", "Marketing", "Social", "Spam", "General"];
  const classifications = {};
  for (const e of emails) {
    classifications[e.id] = categories[Math.floor(Math.random() * categories.length)];
  }
  return classifications;
}

module.exports = async function(req, res) {
  try {
    const { openaiKey, emails } = req.body;

    if (!openaiKey) {
      return res.status(400).json({ error: 'openaiKey required' });
    }
    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json({ error: 'emails array required' });
    }

    // If MOCK_CLASSIFY=true in .env, skip OpenAI and use mock/dummy classifications always (for demo/dev)
    if (process.env.MOCK_CLASSIFY === "true") {
      const classifications = mockClassify(emails);
      return res.json({
        classifications,
        raw: "FALLBACK: dummy/mock classifications due to MOCK_CLASSIFY=true"
      });
    }

    // Production: real OpenAI classify
    const client = new OpenAI({ apiKey: openaiKey });

    const prompt =
      `You are given a list of emails (subject, from, snippet). Classify each into one of the categories: Important, Promotions, Social, Marketing, Spam, General. Respond as JSON mapping message id -> category.\n` +
      `Example:\n{ "id1": "Important", "id2": "Spam" }\n\nEmails:\n` +
      emails
        .map(
          (e) =>
            `ID:${e.id}\nFrom:${e.from}\nSubject:${e.subject}\nSnippet:${e.snippet}\n---`
        )
        .join('\n');

    let text = "";

    try {
      const response = await client.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'You are a helpful email classifier.' },
          { role: 'user', content: prompt },
        ],
        max_tokens: 800,
      });
      text = response.choices?.[0]?.message?.content || '';
    } catch (error) {
      // On quota or billing error, fallback to mock classification
      if (
        error?.response?.data?.error?.message?.includes("quota") ||
        error?.response?.data?.error?.message?.includes("billing") ||
        (error?.message && error.message.includes("quota"))
      ) {
        const classifications = mockClassify(emails);
        return res.json({
          classifications,
          raw: "FALLBACK: dummy classifications due to OpenAI quota/billing error.",
          warning: error?.response?.data?.error?.message || error.message
        });
      } else {
        // For other OpenAI errors
        return res.status(500).json({
          error: error?.response?.data?.error?.message || error.message || "OpenAI API failure"
        });
      }
    }

    // Try to parse GPT result (robust against extra text)
    let parsed = {};
    try {
      const start = text.indexOf('{');
      const jsonText = start >= 0 ? text.substring(start) : text;
      parsed = JSON.parse(jsonText);
    } catch (err) {
      const lines = text.split(/\r?\n/).filter(Boolean);
      for (const l of lines) {
        const m = l.match(/^\s*"?([^":]+)"?\s*[:\-]\s*("?)([^"]+?)\2\s*$/);
        if (m) parsed[m[1].trim()] = m[3].trim();
      }
    }

    res.json({ classifications: parsed, raw: text });
  } catch (error) {
    console.error('Error in /classify:', error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
};
