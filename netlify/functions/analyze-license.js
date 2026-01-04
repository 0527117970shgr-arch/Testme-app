// Native fetch is available in Node 18+ on Netlify

export const handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Make sure to use POST.' };
    }

    try {
        const { imageBase64 } = JSON.parse(event.body); // Back to Base64
        const apiKey = process.env.GOOGLE_CLOUD_API_KEY;

        if (!apiKey) {
            console.error("Missing Google Cloud API Key");
            return {
                statusCode: 500,
                body: JSON.stringify({ error: "Server configuration error: Missing API Key" })
            };
        }

        if (!imageBase64) {
            return { statusCode: 400, body: JSON.stringify({ error: "Missing image Base64 data" }) };
        }

        // Use Base64 directly
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
        // Clean text but keep Hebrew letters, English letters, digits, and common punctuation
        const cleanedText = fullText.replace(/[^\w\s\u0590-\u05FF./-]/g, ' ');

        let detectedPlate = null;
        let detectedDate = null;
        let detectedName = null;

        // Regex for Israeli License Plate: 7-9 digits
        // Allow dashes in the match, then strip them
        const plateRegex = /\b\d{2,3}[-]?\d{2,3}[-]?\d{2,3}\b|\b\d{7,9}\b/;

        // Regex for Date (DD/MM/YYYY or DD.MM.YY)
        const dateRegex = /\b(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})\b/;

        // Looser Name Heuristic: Look for "שם" or "לכבוד" followed by Hebrew words
        const nameRegex = /(?:שם|לכבוד)[:\s]+([\u0590-\u05FF\s']{3,20})/;

        const lines = fullText.split('\n'); // Work with original lines for context

        for (const line of lines) {
            const cleanLine = line.trim();

            // Name Extraction (Basic Heuristic)
            if (!detectedName) {
                const nameMatch = cleanLine.match(nameRegex);
                if (nameMatch) {
                    detectedName = nameMatch[1].trim();
                }
            }

            // License Plate Extraction
            if (!detectedPlate) {
                const plateMatch = cleanLine.match(plateRegex);
                if (plateMatch) {
                    const digits = plateMatch[0].replace(/\D/g, '');
                    if (digits.length >= 7 && digits.length <= 9) {
                        detectedPlate = digits;
                    }
                }
            }

            // Date Extraction
            if (!detectedDate) {
                const dateMatch = cleanLine.match(dateRegex);
                if (dateMatch) {
                    let day = dateMatch[1];
                    let month = dateMatch[2];
                    let year = dateMatch[3];

                    // Normalize 2-digit year (assume 20xx)
                    if (year.length === 2) year = '20' + year;
                    if (day.length === 1) day = '0' + day;
                    if (month.length === 1) month = '0' + month;

                    // Basic validation for reasonable date
                    if (parseInt(month) <= 12 && parseInt(day) <= 31) {
                        detectedDate = `${year}-${month}-${day}`;
                    }
                }
            }
        }

        return {
            statusCode: 200,
            body: JSON.stringify({
                text: fullText,
                extracted: {
                    licensePlate: detectedPlate,
                    testDate: detectedDate,
                    name: detectedName
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
