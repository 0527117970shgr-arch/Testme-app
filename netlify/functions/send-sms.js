export const handler = async (event) => {
    // Enable CORS
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: 'OK' };
    }

    console.log("Function send-sms [Fetch V4] started");

    try {
        const body = JSON.parse(event.body);
        const { name, phone, cartype, service, date, time } = body;

        // Clean env vars (remove potential quotes or whitespace)
        const cleanEnv = (key) => process.env[key] ? process.env[key].replace(/["']/g, '').trim() : '';

        const TWILIO_ACCOUNT_SID = cleanEnv('TWILIO_ACCOUNT_SID');
        const TWILIO_AUTH_TOKEN = cleanEnv('TWILIO_AUTH_TOKEN');
        const TWILIO_FROM_PHONE = cleanEnv('TWILIO_FROM_PHONE');
        const ADMIN_PHONE = cleanEnv('ADMIN_PHONE');

        if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM_PHONE) {
            console.error("Missing Twilio Configuration");
            // Return 200 so fontend doesn't panic, but log error
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ success: false, error: "Server configuration missing" })
            };
        }

        const messages = [];

        // 1. Prepare Admin Message
        if (ADMIN_PHONE) {
            messages.push({
                to: ADMIN_PHONE,
                body: `הזמנה חדשה (TestMe)!\nלקוח: ${name}\nטלפון: ${phone}\nרכב: ${cartype}\nשירות: ${service}\nמועד: ${date} ${time}`
            });
        }

        // 2. Prepare Client Message
        if (phone) {
            messages.push({
                to: phone,
                body: `היי ${name},\nתודה שבחרת ב-TestMe! קיבלנו את הזמנתך ל${service} לרכב ${cartype}.\nאנו ניצור איתך קשר בקרוב לתיאום סופי.\nצוות TestMe`
            });
        }

        // Helper to send single SMS via Fetch
        const sendOne = async (msg) => {
            let cleanPhone = msg.to.replace(/\D/g, '');
            if (cleanPhone.startsWith('0')) cleanPhone = '+972' + cleanPhone.substring(1);
            if (!cleanPhone.startsWith('+')) cleanPhone = '+' + cleanPhone;

            const params = new URLSearchParams();
            params.append('To', cleanPhone);
            params.append('From', TWILIO_FROM_PHONE);
            params.append('Body', msg.body);

            // Use global Buffer for Auth
            const auth = global.Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');

            const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`, {
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: params
            });

            if (!response.ok) {
                const text = await response.text();
                throw new Error(`${response.status}: ${text}`);
            }
            return response.json();
        };

        // Send sequentially
        const errors = [];
        for (const msg of messages) {
            try {
                await sendOne(msg);
            } catch (err) {
                console.error("SMS Failed:", err.message);
                errors.push(err.message);
            }
        }

        if (errors.length > 0) {
            return {
                statusCode: 200, // Return 200 even on partial failure to avoid "Crash" UI
                headers,
                body: JSON.stringify({ success: false, errors: errors })
            };
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ success: true, message: "Messages processed" })
        };

    } catch (error) {
        console.error("Fatal Handler Error:", error);
        return {
            statusCode: 500, // Real crash
            headers,
            body: JSON.stringify({ error: "Internal Server Error", details: error.message })
        };
    }
};
