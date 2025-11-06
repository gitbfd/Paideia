// src/lib/embeddings.ts
// Placeholder: wire your provider of choice here (OpenAI, etc.)
export async function embedText(text: string): Promise<number[]> {
  // Example (pseudo—replace with your actual client):
  // const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
  // const { data } = await client.embeddings.create({ model: 'text-embedding-3-small', input: text });
  // return data[0].embedding;
  throw new Error('embedText not implemented: connect your embedding provider.');
}
