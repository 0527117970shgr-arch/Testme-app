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

        // Prompt for GPT-4 Vision with Strict Protocols
        const prompt = `
        Analyze this image of an Israeli vehicle license (Rishayon Rechev).
        Follow this strict protocol:
        
        1. **Structure Detection**: Locate headers 'מספר רכב' (Vehicle Number), 'דגם' (Model), 'בעלים' (Owner), 'בתוקף עד' (Valid Until), 'תאריך מבחן' (Test Date).
        
        2. **Value Extraction Rules**:
           - **licensePlate**: Look for the number inside the yellow box or under 'מספר רכב'. IT MUST BE 7 OR 8 DIGITS. 
             * CORRECTION: If you see letters 'O', 'I', 'Z', 'S', replace them with '0', '1', '7', '5' respectively. 
             * FILTER: Remove any hyphens or spaces. Return ONLY digits.
           - **carType**: The model name (e.g., 'Mazda 3', 'Toyota Corolla').
           - **licenseExpiry**: The date under 'בתוקף עד' (Valid Until). Format: DD/MM/YYYY.
           - **testDate**: The date under 'תאריך מבחן'. Format: DD/MM/YYYY.
           - **name**: The owner's name. Usually very top right or under 'בעלים'.

        3. **Validation**:
           - If 'licensePlate' found is NOT 7 or 8 digits after cleaning, set it to null. Do not guess.
           - Cross-reference 'licenseExpiry' and 'testDate' to ensure year accuracy if possible.

        Return ONLY raw JSON.
        Example: { "licensePlate": "12345678", "carType": "Mazda 3", "licenseExpiry": "01/01/2025", "name": "ישראל ישראלי" }
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
