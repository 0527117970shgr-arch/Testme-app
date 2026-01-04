import { OpenAI } from 'openai';

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
        Extract the following fields in JSON format:
        - licensePlate: The license plate number (digits, maybe hyphens).
        - name: The owner's name (Hebrew).
        - testDate: The valid until date or test date (DD/MM/YYYY).
        - licenseExpiry: The license expiry date (DD/MM/YYYY).

        Return ONLY raw JSON, no markdown formatting.
        Example: { "licensePlate": "123-45-678", "name": "ישראל ישראלי", "testDate": "01/01/2025" }
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
                    licenseExpiry: extracted.licenseExpiry
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
