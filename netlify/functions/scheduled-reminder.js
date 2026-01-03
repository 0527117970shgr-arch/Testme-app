import { schedule } from '@netlify/functions';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc, query, where } from 'firebase/firestore';
// Native fetch is available in Node 18+ on Netlify

// Since we are in a serverless function, we need to polyfill fetch for older node versions 
// or trust that Node 18+ has it. Netlify usually uses modern Node. 
// We will use standard fetch.

export const handler = schedule("@daily", async (event) => {
    console.log("--- Daily Reminder Cron Job Started ---");

    // Initialize Firebase (Singleton pattern for Functions)
    const firebaseConfig = {
        apiKey: "AIzaSyAsh3nK954FgQ7zx9DAtB633rVCmkgltaU", // Public key, safe to hardcode or env
        authDomain: "test-me-c0c85.firebaseapp.com",
        projectId: "test-me-c0c85",
        storageBucket: "test-me-c0c85.firebasestorage.app",
        messagingSenderId: "359439157388",
        appId: "1:359439157388:web:1ef1c4969fcdc030d853a9"
    };

    let app;
    if (!getApps().length) {
        app = initializeApp(firebaseConfig);
    } else {
        app = getApp();
    }
    const db = getFirestore(app);

    try {
        // 1. Get SMS Template from Settings
        let smsTemplate = 'שלום [Customer Name], תזכורת: בעוד שבועיים יפוג תוקף הרישיון לרכב [License Plate]. אל תשכח לבצע טסט!';
        const settingsRef = doc(db, "settings", "sms");
        const settingsSnap = await getDoc(settingsRef);
        if (settingsSnap.exists()) {
            smsTemplate = settingsSnap.data().template;
        }

        // 2. Calculate Target Date (Today + 14 Days)
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + 14);
        const targetDateString = targetDate.toISOString().split('T')[0]; // YYYY-MM-DD

        console.log(`Checking for bookings with Test Date: ${targetDateString}`);

        // 3. Query Bookings
        const bookingsRef = collection(db, "bookings");
        const q = query(bookingsRef, where("testDate", "==", targetDateString));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            console.log("No bookings found expiring on this date.");
            return { statusCode: 200, body: "No reminders needed." };
        }

        console.log(`Found ${querySnapshot.size} bookings to remind.`);

        // 4. Send SMS for each
        const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
        const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
        const TWILIO_FROM_PHONE = process.env.TWILIO_FROM_PHONE;

        const results = [];

        for (const docSnap of querySnapshot.docs) {
            const booking = docSnap.data();
            const phone = booking.phone;

            // Format Message
            let message = smsTemplate
                .replace('[Customer Name]', booking.name || 'לקוח')
                .replace('[License Plate]', booking.licensePlate || 'הרכב');

            console.log(`Sending reminder to ${booking.name} (${phone})...`);

            try {
                const params = new URLSearchParams();
                params.append('To', phone); // Using the customer's phone now, not admin!
                params.append('From', TWILIO_FROM_PHONE);
                params.append('Body', message);

                const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`, {
                    method: 'POST',
                    headers: {
                        'Authorization': 'Basic ' + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`),
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    body: params
                });

                if (response.ok) {
                    results.push({ id: docSnap.id, status: 'sent' });
                } else {
                    const err = await response.text();
                    console.error(`Failed to send to ${phone}:`, err);
                    results.push({ id: docSnap.id, status: 'failed', error: err });
                }

            } catch (e) {
                console.error(`Error sending to ${phone}:`, e);
                results.push({ id: docSnap.id, status: 'error', error: e.message });
            }
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Job completed", results })
        };

    } catch (error) {
        console.error("Cron Job Error:", error);
        return { statusCode: 500, body: String(error) };
    }
});
