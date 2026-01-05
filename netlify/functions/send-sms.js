import { request } from 'https';
import { Buffer } from 'buffer';

export const handler = async (event) => {
    // Enable CORS
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

    console.log("Function send-sms [HTTPS] started");

    try {
        const body = JSON.parse(event.body);
        const { name, phone, cartype, address, service, date, time } = body;

        // Use process.env directly
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

        // Helper to send single SMS using native HTTPS (Node Standard Lib)
        const sendOne = (msg) => {
            return new Promise((resolve, reject) => {
                let cleanPhone = msg.to.replace(/\D/g, '');
                if (cleanPhone.startsWith('0')) cleanPhone = '+972' + cleanPhone.substring(1);
                if (!cleanPhone.startsWith('+')) cleanPhone = '+' + cleanPhone;

                const postData = new URLSearchParams({
                    'To': cleanPhone,
                    'From': TWILIO_FROM_PHONE,
                    'Body': msg.body
                }).toString();

                const auth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');

                const options = {
                    hostname: 'api.twilio.com',
                    path: `/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
                    method: 'POST',
                    headers: {
                        'Authorization': `Basic ${auth}`,
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Content-Length': Buffer.byteLength(postData)
                    }
                };

                const req = request(options, (res) => {
                    let data = '';
                    res.on('data', (chunk) => data += chunk);
                    res.on('end', () => {
                        if (res.statusCode >= 200 && res.statusCode < 300) {
                            resolve(JSON.parse(data));
                        } else {
                            reject(new Error(`Twilio Status ${res.statusCode}: ${data}`));
                        }
                    });
                });

                req.on('error', (e) => reject(e));
                req.write(postData);
                req.end();
            });
        };

        // Send sequentially to avoid any promise complexity issues in old Node
        const results = [];
        for (const msg of messages) {
            try {
                const res = await sendOne(msg);
                results.push({ status: 'fulfilled', value: res });
            } catch (err) {
                console.error("SMS Failed:", err);
                results.push({ status: 'rejected', reason: err });
            }
        }

        const failures = results.filter(r => r.status === 'rejected');
        if (failures.length > 0 && failures.length === messages.length) {
            return {
                statusCode: 502,
                headers,
                body: JSON.stringify({ error: "All SMS failed", details: failures.map(f => f.reason.message) })
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
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: "Internal Server Error", details: error.message })
        };
    }
};
