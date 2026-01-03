const fetch = require('node-fetch');

exports.handler = async (event) => {
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
                            type: "TEXT_DETECTION",
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

        return {
            statusCode: 200,
            body: JSON.stringify({ text: fullText })
        };

    } catch (error) {
        console.error("Function Error:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.toString() })
        };
    }
};
