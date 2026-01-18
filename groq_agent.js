// =============================================================================
// GROQ CLOUD LLM INTEGRATION (Ultra-Fast Inference)
// =============================================================================

// Get API key from localStorage or prompt user
let GROQ_API_KEY = localStorage.getItem('groq_api_key') || '';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile'; // Ultra-fast, high quality

// Prompt for API key if not set
if (!GROQ_API_KEY) {
    GROQ_API_KEY = prompt('Enter your Groq API key (get one free at https://console.groq.com):');
    if (GROQ_API_KEY) {
        localStorage.setItem('groq_api_key', GROQ_API_KEY);
    }
}

// =============================================================================
// GROQ API
// =============================================================================

async function queryGroq(prompt) {
    console.log('⚡ Groq query:', prompt.substring(0, 100) + '...');

    try {
        const response = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: GROQ_MODEL,
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.3,
                max_tokens: 800,
                top_p: 1,
                stream: false
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Groq Error ${response.status}:`, errorText);
            throw new Error(`Groq ${response.status}: ${errorText.substring(0, 100)}`);
        }

        const data = await response.json();

        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
            console.error('Invalid Groq response structure:', data);
            return null;
        }

        const result = data.choices[0].message.content.trim();
        console.log('✓ Groq response:', result.substring(0, 100) + '...');
        console.log(`⚡ Speed: ${data.usage?.total_tokens || 0} tokens in ${(data.usage?.queue_time || 0) + (data.usage?.prompt_time || 0) + (data.usage?.completion_time || 0)}s`);

        return result;
    } catch (error) {
        console.error('Groq error:', error);
        return null;
    }
}

// Test connection
async function testGroqConnection() {
    try {
        const response = await fetch('https://api.groq.com/openai/v1/models', {
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            console.log('✓ Groq connected:', data.data.map(m => m.id).slice(0, 5));
            return true;
        }
    } catch (error) {
        console.error('✗ Groq not available:', error.message);
        return false;
    }
    return false;
}

export { queryGroq, testGroqConnection };
