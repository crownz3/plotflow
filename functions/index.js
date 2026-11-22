/**
 * PlotFlow AI — Cloud Functions Backend
 * Securely proxies Google Gemini AI requests without exposing the API key to the client.
 */

const { onRequest } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp();
}

exports.generatePlotflowAI = onRequest({ cors: true }, async (req, res) => {
  // Set CORS headers
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!geminiApiKey) {
    res.status(500).json({ error: 'GEMINI_API_KEY environment variable is not configured.' });
    return;
  }

  const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`;

  try {
    const { task, payload, prompt: customPrompt } = req.body || {};
    const language = payload?.language || 'English';

    let systemInstruction = `You are PlotFlow AI, an elite real estate sales coach and copywriting assistant designed for professional property brokers in India.
Provide practical, crisp, high-converting real estate content using Indian market terminology (Lakhs, Crores, sq.ft., Vastu, Patta, RERA, registration).
Never use emojis excessively—keep it sophisticated, clear, and action-oriented.
CRITICAL MANDATORY LANGUAGE REQUIREMENT:
You MUST generate 100% of your entire output strictly in "${language}". All section titles, step numbers, psychological reframe, ROI points, advice, and scripts must be in "${language}". Do NOT output English headings or explanations if ${language} is selected.
- If language is 'Tamil': Output 100% in authentic professional Tamil script (தமிழ்).
- If language is 'Tanglish': Output conversational Tamil phonetically typed in English alphabet (Latin script), mixing standard English real estate terms (e.g., 'Sir, intha plot DTCP approved, 40ft road connectivity super-ah iruku...').
- If language is 'Hindi': Output 100% in authentic professional Hindi script (हिंदी / Devanagari).
- If language is 'Hinglish': Output conversational Hindi phonetically typed in English alphabet (Latin script) (e.g., 'Namaste ji, ye property DTCP approved hai aur location bohot prime hai...').
- If language is 'Telugu': Output 100% in authentic Telugu script (తెలుగు).
- If language is 'Kannada': Output 100% in authentic Kannada script (ಕನ್ನಡ).
- If language is 'English': Output in standard professional Indian English.`;

    let prompt = customPrompt || '';

    if (task === 'property_pitch') {
      const { property, tone } = payload || {};
      prompt = `Generate a ${tone || 'whatsapp'} real estate sales pitch for this property:
Title: ${property?.title || 'Prime Property'}
Type: ${property?.propertyType || 'Plot'}
Price: ₹${property?.price ? Number(property.price).toLocaleString('en-IN') : 'Competitive'}
Area: ${property?.area || ''} ${property?.areaUnit || 'sqft'}
Location: ${property?.location?.locality || ''}, ${property?.location?.city || ''}
Facing: ${property?.facing || 'East'}
Amenities: ${(property?.amenities || []).join(', ') || 'Gated community, blacktop roads'}

Format requirements:
- If tone is 'whatsapp': Craft an engaging WhatsApp broadcast message with key bullet points, price per sqft, proximity highlights, and a strong call-to-action to book a site inspection.
- If tone is 'portal': Write a compelling 99acres / MagicBricks SEO-rich listing description highlighting connectivity and investment appreciation.
- If tone is 'luxury': Write an executive investor summary highlighting rental yields and capital gains.`;

    } else if (task === 'objection_handling') {
      const { objectionCategory, concernNotes, propertyTitle, propertyPrice, buyerName } = payload || {};
      prompt = `Act as an expert real estate broker negotiation coach. A prospective buyer named ${buyerName || 'the buyer'} inspected "${propertyTitle || 'the property'}" (Price: ₹${propertyPrice ? Number(propertyPrice).toLocaleString('en-IN') : 'Market Rate'}) and raised the following objection:
Objection Category: ${objectionCategory || 'Price / Budget'}
Buyer's Specific Concern: "${concernNotes || 'Says the price is too high'}"

Provide a tactical response containing:
1. Psychological Reframe: How to validate their concern without discounting the asset.
2. Market & ROI Data Points: How to justify the price with appreciation, road connectivity, or micro-market demand.
3. Word-for-Word Closing Script: Exactly what the broker should say on the phone or WhatsApp to book a final negotiation meeting.`;

    } else if (task === 'buyer_matching') {
      const { buyerConcern, buyerBudget, preferredLocality, properties } = payload || {};
      prompt = `Analyze this buyer's past drop-off objection and preferences against available property listings:
Buyer Drop-off Reason: "${buyerConcern || 'Previous property exceeded budget'}"
Buyer Target Budget: ₹${buyerBudget ? Number(buyerBudget).toLocaleString('en-IN') : 'Flexible'}
Preferred Locality: ${preferredLocality || 'Any prime locality'}

Available Listings:
${JSON.stringify((properties || []).slice(0, 5).map(p => ({ id: p.id, title: p.title, price: p.price, locality: p.location?.locality, size: p.area })))}

Identify the best matching property for this buyer, explain why it solves their past objection, and generate a 2-line personalized pitch to send them.`;

    } else if (task === 'expense_audit') {
      const { weeklyData, monthlyData, totalExpenses, totalBrokerage } = payload || {};
      prompt = `Perform an executive financial audit for this real estate agency:
Total Sales & Marketing Expenses: ₹${totalExpenses || 0}
Total Closed Gross Brokerage: ₹${totalBrokerage || 0}
Weekly Expenses: This week ₹${weeklyData?.thisWeekTotal || 0} vs Last week ₹${weeklyData?.lastWeekTotal || 0}
Monthly Expenses: This month ₹${monthlyData?.thisMonthTotal || 0} vs Last month ₹${monthlyData?.lastMonthTotal || 0}

Provide:
1. Cost of Sales Health Check: Assess whether marketing spend is healthy relative to revenue.
2. Budget Leakage Warnings: Point out any red flags (e.g., high ad spend with low visit conversions).
3. 2 Tactical Recommendations: Concrete steps the principal broker can take this week to increase ROI.`;
    }

    if (!prompt.trim()) {
      res.status(400).json({ error: 'Missing prompt or task payload' });
      return;
    }

    // Call Google Gemini API
    const geminiPayload = {
      contents: [
        {
          role: 'user',
          parts: [{ text: `${systemInstruction}\n\nTask:\n${prompt}` }]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1200
      }
    };

    const response = await fetch(geminiEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geminiPayload)
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Gemini API Error:', errText);
      res.status(response.status).json({ error: 'Gemini API failed', details: errText });
      return;
    }

    const data = await response.json();
    const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated.';

    res.status(200).json({
      success: true,
      result: candidateText,
      model: 'gemini-1.5-flash',
      task
    });

  } catch (err) {
    console.error('PlotFlow AI Cloud Function error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

