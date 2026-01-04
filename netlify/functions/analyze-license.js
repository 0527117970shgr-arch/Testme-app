import { OpenAI } from 'openai';
import 'dotenv/config';

export const handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Make sure to use POST.' };
    }

    try {
        const { imageBase64 } = JSON.parse(event.body);

        if (!process.env.OPENAI_API_KEY) {
            console.error("Missing OPENAI_API_KEY");
            return {
                statusCode: 500,
                body: JSON.stringify({ error: "Server configuration error: Missing API Key" })
            };
        }

        if (!imageBase64) {
            return { statusCode: 400, body: JSON.stringify({ error: "Missing image Base64 data" }) };
        }

        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });

        // Prompt for GPT-4 Vision
        const prompt = `
        Analyze this image of an Israeli vehicle license (Rishayon Rechev).
        Extract these SPECIFIC fields in JSON format:
        1. "licensePlate" - The vehicle number (XXX-XX-XXX or similar).
        2. "carType" - The car model/make (e.g., Mazda 3, Toyota Corolla). Look for "סוג" or "תוצר".
        3. "licenseExpiry" - The "Valid Until / בתוקף עד" date (DD/MM/YYYY).
        4. "name" - The Owner Name (בעלים). Usually at the top right.

        CRITICAL SCANNING INSTRUCTIONS:
        - Owner Name (בעלים): This is CRITICAL. Look for Hebrew text under "בעלים" matching a person's name (e.g., "וייסמן מרדכי").
        - Expiry (בתוקף עד): Look specifically for the date next to "בתוקף עד". If you see 2026/2025, that is it.
        - Car Type (דגם/סוג): Look for the model name (e.g. Mazda 3).

        Return ONLY raw JSON.
        Example: { "licensePlate": "123-45-678", "carType": "Mazda 3", "licenseExpiry": "01/01/2025", "name": "ישראל ישראלי" }
        `;

        const response = await openai.chat.completions.create({
            model: "gpt-4-turbo",
            messages: [
                {
                    role: "user",
                    content: [
                        { type: "text", text: prompt },
                        {
                            type: "image_url",
                            image_url: {
                                "url": `data:image/jpeg;base64,${imageBase64}`,
                            },
                        },
                    ],
                },
            ],
            max_tokens: 300,
        });

        const content = response.choices[0].message.content;
        console.log("OpenAI Vision Response:", content);

        // Clean formatting if GPT returns markdown blocks
        const cleanedContent = content.replace(/```json/g, '').replace(/```/g, '').trim();
        const extracted = JSON.parse(cleanedContent);

        return {
            statusCode: 200,
            body: JSON.stringify({
                text: "Analyzed via OpenAI",
                extracted: {
                    licensePlate: extracted.licensePlate,
                    testDate: extracted.testDate || extracted.licenseExpiry,
                    name: extracted.name,
                    licenseExpiry: extracted.licenseExpiry,
                    carType: extracted.carType || extracted.model
                }
            })
        };

    } catch (error) {
        console.error("Analyze-License Function Error:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: `Function Error: ${error.message}` })
        };
    }
};
