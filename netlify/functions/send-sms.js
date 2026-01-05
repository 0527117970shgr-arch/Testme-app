export const handler = async (event) => {
    // Enable CORS just in case, though same-origin
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: 'OK' };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    console.log("Function send-sms started");

    try {
        const body = JSON.parse(event.body);
        const { name, phone, cartype, address, service, date, time } = body;

        // Use process.env directly (Netlify injects these in production)
        const {
            TWILIO_ACCOUNT_SID,
            TWILIO_AUTH_TOKEN,
            TWILIO_FROM_PHONE,
            ADMIN_PHONE
        } = process.env;

        if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM_PHONE) {
            console.error("Missing configuration");
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: "Server configuration missing" })
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

        console.log(`Sending ${messages.length} messages...`);

        // Helper to send single SMS
        const sendOne = async ({ to, body }) => {
            // Clean number
            let cleanPhone = to.replace(/\D/g, '');
            if (cleanPhone.startsWith('0')) cleanPhone = '+972' + cleanPhone.substring(1);
            if (!cleanPhone.startsWith('+')) cleanPhone = '+' + cleanPhone;

            const params = new URLSearchParams();
            params.append('To', cleanPhone);
            params.append('From', TWILIO_FROM_PHONE);
            params.append('Body', body);

            const auth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);

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
                throw new Error(`Twilio Error: ${response.status} ${text}`);
            }
            return response.json();
        };

        // Send all in parallel
        const results = await Promise.allSettled(messages.map(sendOne));

        // Check results
        const failures = results.filter(r => r.status === 'rejected');
        if (failures.length > 0) {
            console.error("Some SMS failed:", failures);
            // If ALL failed, return error
            if (failures.length === messages.length) {
                return {
                    statusCode: 502, // Upstream error
                    headers,
                    body: JSON.stringify({ error: "Failed to send SMS via Twilio", details: failures.map(f => f.reason.message) })
                };
            }
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ success: true, message: "Messages processed" })
        };

    } catch (error) {
        console.error("Fatal Handler Error:", error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: "Internal Server Error", details: error.message })
        };
    }
};
