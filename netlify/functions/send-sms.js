// Native fetch is available in Node 18+ on Netlify
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import 'dotenv/config';

// Initialize Firebase Admin (Singleton pattern)
// Note: We need FIREBASE_SERVICE_ACCOUNT env var which contains the JSON 
// OR we can rely on standard Env variables if configured.
// For simplicity in this environment, if service account json is not available, we might skip template fetching
// BUT since we need to read from Firestore (backend), we need admin privileges.
// If FIREBASE_SERVICE_ACCOUNT is not set, we will use a default template.

// Mocking Firebase Admin Init for now if keys are missing to avoid crash, 
// assuming user will add FIREBASE_SERVICE_ACCOUNT later or we use client params.
// Actually, let's just use the provided params for now and a basic template, 
// improving complexity later if keys exist.

export const handler = async (event) => {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { name, phone, cartype, address, service, date, time } = JSON.parse(event.body);

        const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
        const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
        const TWILIO_FROM_PHONE = process.env.TWILIO_FROM_PHONE;
        const ADMIN_PHONE = process.env.ADMIN_PHONE; // The admin who receives the SMS

        if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM_PHONE) {
            console.error("Missing Twilio Configuration");
            return { statusCode: 500, body: JSON.stringify({ error: "Missing server configuration" }) };
        }

        // 1. Send Admin Notification
        const adminMsg = `הזמנה חדשה (TestMe)!\nלקוח: ${name}\nטלפון: ${phone}\nרכב: ${cartype}\nשירות: ${service}\nמועד: ${date} ${time}`;

        await sendSms(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_PHONE, ADMIN_PHONE, adminMsg);

        // 2. Send Client Confirmation
        // Default template if DB fetch fails or logic not ready
        const clientMsg = `היי ${name},\nתודה שבחרת ב-TestMe! קיבלנו את הזמנתך ל${service} לרכב ${cartype}.\nאנו ניצור איתך קשר בקרוב לתיאום סופי.\nצוות TestMe`;

        // We catch errors here so admin msg success is not overshadowed by client msg failure (e.g. invalid phone)
        try {
            await sendSms(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_PHONE, phone, clientMsg);
        } catch (clientError) {
            console.error("Failed to send Client SMS:", clientError);
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ success: true, message: "SMS sent" })
        };

    } catch (error) {
        console.error("Function Error:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Internal Server Error" })
        };
    }
};

async function sendSms(sid, token, from, to, body) {
    if (!to) return;

    // Clean phone number: If starts with 0, replace with +972
    let cleanPhone = to.replace(/\D/g, '');
    if (cleanPhone.startsWith('0')) {
        cleanPhone = '+972' + cleanPhone.substring(1);
    } else if (!cleanPhone.startsWith('972')) {
        // Assume IL if not present? Or leave as is if starts with +
        // Let's assume input might be 052...
    }
    // Ensure + prefix
    if (!cleanPhone.startsWith('+')) cleanPhone = '+' + cleanPhone;

    const params = new URLSearchParams();
    params.append('To', cleanPhone);
    params.append('From', from);
    params.append('Body', body);

    console.log(`Sending SMS to ${cleanPhone}: ${body}`);

    // Using fetch to Twilio API
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
        method: 'POST',
        headers: {
            'Authorization': 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'),
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Twilio Error: ${text}`);
    }
    return response.json();
}
