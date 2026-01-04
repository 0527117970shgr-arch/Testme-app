import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { OpenAIEmbeddings, ChatOpenAI } from "@langchain/openai";

// import { PineconeStore } from "@langchain/pinecone";
// import { Pinecone } from "@pinecone-database/pinecone";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import dotenv from 'dotenv';

dotenv.config();

// Simple Cosine Similarity Function
function cosineSimilarity(vecA, vecB) {
    let dotProduct = 0.0;
    let normA = 0.0;
    let normB = 0.0;
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export const handler = async (event, context) => {
    // Only allow POST
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { query, documentText } = JSON.parse(event.body);

        if (!process.env.OPENAI_API_KEY) {
            throw new Error("Missing OPENAI_API_KEY environment variable.");
        }

        console.log(`[Smart Agent] Processing query: "${query}"`);

        // 1. Text Splitting
        const splitter = new RecursiveCharacterTextSplitter({
            chunkSize: 1000,
            chunkOverlap: 200,
        });
        const docs = await splitter.createDocuments([documentText || ""]);
        console.log(`[Smart Agent] Split into ${docs.length} chunks.`);

        // 2. Create Embeddings (Try/Catch for Quota/API errors)
        let vectors, queryVector;
        try {
            const embeddings = new OpenAIEmbeddings();
            vectors = await embeddings.embedDocuments(docs.map(d => d.pageContent));
            queryVector = await embeddings.embedQuery(query);
        } catch (embedError) {
            console.error("Embedding Error (likely quota):", embedError.message);
            // Fallback to Mock if embeddings fail
            throw new Error("AI_SERVICE_UNAVAILABLE");
        }

        // 3. Similarity Search (Custom Implementation)
        const scoredDocs = docs.map((doc, i) => ({
            content: doc.pageContent,
            score: cosineSimilarity(vectors[i], queryVector),
            id: i
        }));

        scoredDocs.sort((a, b) => b.score - a.score);
        const topDocs = scoredDocs.slice(0, 3);

        const contextText = topDocs.map(d => d.content).join("\n\n---\n\n");

        // 4. Citations
        const citations = topDocs.map((d) => ({
            id: d.id,
            text: d.content.substring(0, 100) + "...",
            score: d.score
        }));

        // 5. Generate Answer
        const chat = new ChatOpenAI({
            modelName: "gpt-3.5-turbo",
            temperature: 0.2,
        });

        const systemPrompt = `You are a helpful AI assistant. Answer the user's question based ONLY on the following context. 
If the answer is not in the context, say "I cannot find the answer in the document."
Include specific references to the text where possible.

Context:
${contextText}`;

        const response = await chat.invoke([
            new SystemMessage(systemPrompt),
            new HumanMessage(query),
        ]);

        console.log("[Smart Agent] Answer generated.");

        return {
            statusCode: 200,
            body: JSON.stringify({
                answer: response.content,
                citations: citations
            })
        };

    } catch (error) {
        console.error("Smart Agent Error:", error);

        // Fallback Mock Response for specific errors
        if (error.message.includes("AI_SERVICE_UNAVAILABLE") || error.message.includes("429") || error.message.includes("quota")) {
            return {
                statusCode: 200,
                body: JSON.stringify({
                    answer: "[System] The AI service is currently unavailable (Quota Exceeded on API Key). \n\nHere is a mock answer based on your query: \nThe document seems to contain information relevant to your query. (This is a placeholder).",
                    citations: [],
                    isFallback: true
                })
            };
        }

        return {
            statusCode: 500,
            body: JSON.stringify({
                error: "Internal Server Error",
                message: error.message
            })
        };
    }
};
