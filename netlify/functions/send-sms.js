import axios from 'axios';

export const handler = async (event) => {
    // Enable CORS
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: 'OK' };
    }

    try {
        const body = JSON.parse(event.body);
        const { name, phone, cartype, service, date, time, customMessage, to } = body;

        // Logic to construct the message content based on input
        // (Adapted from previous version to maintain functionality with Frontend)
        let messageToSend = "";
        let phoneToSend = "";

        if (customMessage && to) {
            messageToSend = customMessage;
            phoneToSend = to;
        } else {
            // Default flow
            if (phone) {
                phoneToSend = phone;
                messageToSend = `היי ${name},\nתודה שבחרת ב-TestMe! קיבלנו את הזמנתך ל${service} לרכב ${cartype}.\nאנו ניצור איתך קשר בקרוב לתיאום סופי.\nצוות TestMe`;
            } else {
                throw new Error("Missing phone number");
            }
        }

        const cleanPhone = phoneToSend.replace(/\D/g, '');
        // Ensure 05 formatting if missing (User's snippet didn't have this, but it's critical for Israel)
        /* Keeping user's logic mostly pure but safety check doesn't hurt */
        let finalPhone = cleanPhone;
        if (finalPhone.startsWith('972')) finalPhone = '0' + finalPhone.substring(3);
        if (finalPhone.length === 9 && !finalPhone.startsWith('0')) finalPhone = '0' + finalPhone;

        // הכתובת המדויקת מהתיעוד הרשמי ששלחתי
        const url = "https://api.sms4free.co.il/ApiSMS/v2/SendSMS";

        const data = {
            key: "OFL4Wshku",
            user: "OFL4Wshku",
            pass: "OFL4Wshku",
            sender: "TestMe",
            recipient: finalPhone,
            msg: messageToSend
        };

        console.log("Sending SMS via API endpoint: api.sms4free.co.il");
        console.log("Payload:", JSON.stringify(data));

        // שליחה ב-POST עם JSON כפי שמופיע בתיעוד
        const response = await axios.post(url, data, {
            headers: { 'Content-Type': 'application/json' }
        });

        console.log("Response from SMS4Free:", response.data);

        return {
            statusCode: 200,
            headers, // Added CORS headers back
            body: JSON.stringify({ success: true, count: response.data })
        };
    } catch (error) {
        console.error("API Error:", error.response ? error.response.data : error.message);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ success: false, error: error.message, details: error.response ? error.response.data : null })
        };
    }
};
