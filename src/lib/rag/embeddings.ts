// src/lib/rag/embeddings.ts
// OpenAI embedding provider
// NOTE: Requires an OpenAI API key (get one at https://platform.openai.com/api-keys)
// Add it to your .env.local file as: OPENAI_API_KEY=your_key_here

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
// Using OpenAI's text-embedding-3-small model (1536 dims default, but we'll request 768 to match your DB)
// Alternative: 'text-embedding-ada-002' (1536 dims, older model)
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || 'text-embedding-3-small';

export async function embedText(text: string): Promise<number[]> {
  try {
    // API key is required
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is required. Get one at https://platform.openai.com/api-keys and add it to .env.local');
    }

    // OpenAI has a token limit, but we'll let their API handle truncation
    // The text-embedding-3-small model supports up to 8191 tokens
    
    const url = 'https://api.openai.com/v1/embeddings';
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    };

    // Request 768 dimensions to match your database schema
    const requestBody = {
      model: EMBEDDING_MODEL,
      input: text,
      dimensions: 768, // Match your database vector(768)
    };

    console.log(`[EMBEDDINGS] Calling OpenAI API: ${EMBEDDING_MODEL}`);
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
    });

    const responseText = await response.text();

    if (!response.ok) {
      // Try to parse error JSON
      try {
        const errorJson = JSON.parse(responseText);
        if (errorJson.error) {
          const errorMsg = errorJson.error.message || errorJson.error;
          console.error(`[EMBEDDINGS] OpenAI API error (${response.status}):`, errorMsg);
          throw new Error(`OpenAI API error (${response.status}): ${errorMsg}`);
        }
      } catch (parseErr) {
        // Not JSON, use raw text
      }
      
      // Handle 401 Unauthorized
      if (response.status === 401) {
        throw new Error('OpenAI API authentication failed. Please check your OPENAI_API_KEY in .env.local');
      }
      
      console.error(`[EMBEDDINGS] OpenAI API error (${response.status}):`, responseText.substring(0, 500));
      throw new Error(`OpenAI API error (${response.status}): ${responseText.substring(0, 200)}`);
    }

    const data = JSON.parse(responseText);
    
    // OpenAI returns: { data: [{ embedding: [numbers] }] }
    if (data.data && Array.isArray(data.data) && data.data.length > 0) {
      const embedding = data.data[0].embedding;
      
      if (Array.isArray(embedding)) {
        // Ensure it's exactly 768 dimensions (should be if dimensions parameter worked)
        if (embedding.length !== 768) {
          if (embedding.length < 768) {
            // Pad with zeros
            return [...embedding, ...new Array(768 - embedding.length).fill(0)];
          } else {
            // Truncate (shouldn't happen if dimensions param worked)
            return embedding.slice(0, 768);
          }
        }
        return embedding;
      }
    }

    throw new Error('Unexpected response format from OpenAI API');
  } catch (error: any) {
    // If it's a known error, re-throw it
    if (error.message && (error.message.includes('OpenAI') || error.message.includes('OPENAI_API_KEY'))) {
      throw error;
    }
    // Otherwise wrap it
    throw new Error(`Embedding generation failed: ${error.message || 'Unknown error'}`);
  }
}

