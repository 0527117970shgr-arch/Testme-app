import { OpenAI } from 'openai';
import 'dotenv/config';

export const handler = async (event) => {
    const startTime = Date.now();

    // CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };

    // Handle preflight
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed. Use POST.' })
        };
    }

    try {
        const { imageBase64, fileType, fileName } = JSON.parse(event.body);

        console.log(`📄 Processing: ${fileName || 'Unknown'}, Type: ${fileType}, Size: ${(imageBase64?.length * 0.75 / 1024).toFixed(2)}KB`);

        if (!process.env.OPENAI_API_KEY) {
            console.error("❌ Missing OPENAI_API_KEY");
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: "Server configuration error: Missing API Key" })
            };
        }

        if (!imageBase64) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: "Missing image/PDF data" })
            };
        }

        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
            timeout: 45000, // 45 second timeout
        });

        // Enhanced OCR Prompt for Israeli Vehicle Licenses (PDF & Image Support)
        const prompt = `
אתה מומחה OCR וניתוח מסמכים הממוקד ברישיונות רכב ישראליים.

תמיכה בפורמטים:
- אתה תקבל קבצים מסוגים שונים: תמונות (JPG, PNG, WEBP) או PDF
- אם זה PDF, נתח את כל התוכן הוויזואלי והטקסטואלי שבו
- התמקד בעמוד הראשון אם יש מספר עמודים

עמידות לסריקות:
- עליך להיות מסוגל לקרוא טקסט גם אם הסריקה הפוכה, נטויה או בתנאי תאורה קשים
- טפל בסריקות מטושטשות, צילומים בתוך רכב, או מסמכים מקופלים
- עבור ברישיון מימין לשמאל (כיוון עברי)

הנחיות קריטיות:
1. זהו רישיון רכב ישראלי (Rishayon Rechev)
2. יש לחלץ נתונים בדיוק מקסימלי
3. החזר רק אובייקט JSON נקי, ללא הסברים או markdown

שדות לחילוץ:
- licensePlate (מספר רכב): בדרך כלל 7 או 8 ספרות. זהו השדה החשוב ביותר. חפש בתיבה הצהובה או תחת "מספר רכב".
  * תיקון: אם אתה רואה אותיות O, I, Z, S - החלף אותן ב-0, 1, 7, 5 בהתאמה
  * סינון: הסר מקפים ורווחים. החזר רק ספרות
  * אם המספר אינו 7-8 ספרות אחרי ניקוי, החזר null
  
- name (בעלות): שם בעל הרכב הרשום (מופיע בדרך כלל בפינה הימנית העליונה או תחת "בעלים")

- licenseExpiry (תוקף הרישיון): התאריך המופיע תחת "בתוקף עד" בפורמט DD/MM/YYYY

- carType (דגם רכב): למשל: מאזדה 3, טויוטה קורולה

- testDate (תאריך מבחן): התאריך תחת "תאריך מבחן" בפורמט DD/MM/YYYY

ולידציה:
- אם הקובץ מטושטש מדי או אינו רישיון רכב, החזר:
  {"error": "הקובץ לא ברור מספיק או אינו רישיון רכב. אנא צלם/סרוק שוב בתאורה טובה יותר"}

פורמט הפלט (מבנה מדויק - ללא קשר לפורמט הקובץ):
{
  "licensePlate": "12345678",
  "name": "ישראל ישראלי",
  "licenseExpiry": "20/05/2026",
  "carType": "טויוטה קאמרי",
  "testDate": "20/05/2026"
}

דגשים לדיוק:
- שים לב להבדל בין 0 לאות O במספרים
- מספר הרכב הוא הנתון החשוב ביותר לזיהוי
- וודא שהתאריך בפורמט DD/MM/YYYY
- בדוק הצלבה בין licenseExpiry ו-testDate לוודא דיוק השנה

נתח את קובץ רישיון הרכב הישראלי הזה (תמונה או PDF) וחלץ את הנתונים:`;

        console.log("🚀 Sending to OpenAI Vision...");

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
                                "url": `data:${fileType || 'image/jpeg'};base64,${imageBase64}`,
                            },
                        },
                    ],
                },
            ],
            max_tokens: 500,
        });

        const content = response.choices[0].message.content;
        console.log("✅ OpenAI Response:", content);

        // Clean formatting if GPT returns markdown blocks
        const cleanedContent = content.replace(/```json/g, '').replace(/```/g, '').trim();

        let extracted;
        try {
            extracted = JSON.parse(cleanedContent);
        } catch (parseErr) {
            console.error("❌ JSON Parse Error:", parseErr);
            console.error("Raw content:", cleanedContent);
            throw new Error("הAI החזיר תשובה שאינה JSON תקין. נסה שוב.");
        }

        const processingTime = Date.now() - startTime;
        console.log(`⏱️  Processing completed in ${processingTime}ms`);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                text: "Analyzed via OpenAI",
                extracted: {
                    licensePlate: extracted.licensePlate,
                    testDate: extracted.testDate || extracted.licenseExpiry,
                    name: extracted.name,
                    licenseExpiry: extracted.licenseExpiry,
                    carType: extracted.carType || extracted.model
                },
                processingTime
            })
        };

    } catch (error) {
        const processingTime = Date.now() - startTime;
        console.error("🔴 Function Error:", error);
        console.error("Stack:", error.stack);

        let userMessage = "שגיאת שרת פנימית";
        if (error.code === 'ETIMEDOUT' || error.name === 'TimeoutError') {
            userMessage = "הזמן הקצוב פג. הקובץ אולי גדול מדי או מורכב מדי.";
        } else if (error.message.includes('API')) {
            userMessage = "שגיאה בתקשורת עם שירות הAI";
        } else if (error.message.includes('JSON')) {
            userMessage = error.message;
        }

        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: userMessage,
                details: error.message,
                processingTime
            })
        };
    }
};
