// Native fetch is available in Node 18+ on Netlify

export const handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Make sure to use POST.' };
    }

    try {
        const { imageBase64 } = JSON.parse(event.body);
        const apiKey = process.env.GOOGLE_CLOUD_API_KEY;

        if (!apiKey) {
            console.error("Missing Google Cloud API Key");
            return {
                statusCode: 500,
                body: JSON.stringify({ error: "Server configuration error: Missing API Key" })
            };
        }

        const requestBody = {
            requests: [
                {
                    image: {
                        content: imageBase64
                    },
                    features: [
                        {
                            type: "DOCUMENT_TEXT_DETECTION", // Better for dense documents
                            maxResults: 1
                        }
                    ],
                    imageContext: {
                        languageHints: ["he", "en"]
                    }
                }
            ]
        };

        const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("Google Vision API Error:", data);
            return {
                statusCode: response.status,
                body: JSON.stringify(data)
            };
        }

        const fullText = data.responses[0]?.fullTextAnnotation?.text || "";

        // --- Server-Side Parsing Logic ---
        const cleanedText = fullText.replace(/[^\w\s\u0590-\u05FF./-]/g, ' '); // Keep He, En, Digits, dots, dashes, slashes
        const lines = cleanedText.split('\n');

        let detectedPlate = null;
        let detectedDate = null;

        // Regex for Israeli License Plate: 7-9 digits (User requested 7-9)
        // We look for standalone sequences to avoid phone numbers if possible, 
        // but often plates are just 7-8 digits. 
        // We prioritize 7 or 8.
        const plateRegex = /\b\d{7,9}\b/;
        const dateRegex = /\b(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})\b/;

        // Scan tokens instead of just lines incase of bad newlines
        const tokens = cleanedText.split(/\s+/);

        for (const token of tokens) {
            const cleanToken = token.replace(/\D/g, '');
            if (!detectedPlate && (cleanToken.length >= 7 && cleanToken.length <= 9)) {
                detectedPlate = cleanToken;
            }

            // For date, we need the original punctuation
            const dateMatch = token.match(dateRegex);
            if (!detectedDate && dateMatch) {
                let day = dateMatch[1];
                let month = dateMatch[2];
                let year = dateMatch[3];

                // Normalize 2-digit year (assume 20xx)
                if (year.length === 2) year = '20' + year;
                if (day.length === 1) day = '0' + day;
                if (month.length === 1) month = '0' + month;

                detectedDate = `${year}-${month}-${day}`;
            }
        }

        return {
            statusCode: 200,
            body: JSON.stringify({
                text: fullText,
                extracted: {
                    licensePlate: detectedPlate,
                    testDate: detectedDate
                }
            })
        };

    } catch (error) {
        console.error("Analyze-License Function CRITICAL Error:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: `Function Error: ${error.message}` })
        };
    }
};
