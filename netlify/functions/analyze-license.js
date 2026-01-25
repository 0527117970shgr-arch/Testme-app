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
3. החזר רק אובייקט JSON נקי, ללא הסברים

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
