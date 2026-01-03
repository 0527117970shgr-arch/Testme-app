import React, { useState } from 'react';
import { db, storage } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import Tesseract from 'tesseract.js';

const BookingForm = () => {
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        address: '',
        carType: '',
        service: 'טסט שנתי',
        date: '',
        time: '',
        licensePlate: '',
        testDate: ''
    });
    const [status, setStatus] = useState(''); // 'submitting', 'success', 'error', 'ocr_processing'
    const [submittedData, setSubmittedData] = useState(null);
    const [licenseImage, setLicenseImage] = useState(null);
    const [ocrProgress, setOcrProgress] = useState(0);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setLicenseImage(file);

        // Start OCR
        setStatus('ocr_processing');
        setOcrProgress(0);

        try {
            const result = await Tesseract.recognize(
                file,
                'heb', // Hebrew language
                {
                    logger: m => {
                        if (m.status === 'recognizing text') {
                            setOcrProgress(Math.floor(m.progress * 100));
                        }
                    }
                }
            );

            const text = result.data.text;
            console.log("OCR Extracted Text:", text);

            // Basic extraction logic (Naive approach)
            // Trying to find sequences of numbers for license plate
            // and Hebrew names for the owner

            const lines = text.split('\n');
            let potentialPlate = '';
            let potentialDate = '';

            // Regex for date DD/MM/YYYY or DD.MM.YYYY
            const dateRegex = /\b(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})\b/;

            lines.forEach(line => {
                const cleanLine = line.trim();
                // License plate: often 7 or 8 digits, maybe with dashes
                if (/^\d{7,8}$/.test(cleanLine.replace(/-/g, ''))) {
                    potentialPlate = cleanLine.replace(/-/g, '');
                }

                // Expiry Date extraction
                const dateMatch = cleanLine.match(dateRegex);
                if (dateMatch) {
                    // Normalize to YYYY-MM-DD for input[type="date"]
                    // Assuming DD/MM/YYYY
                    let day = dateMatch[1];
                    let month = dateMatch[2];
                    let year = dateMatch[3];

                    if (year.length === 2) year = '20' + year;
                    if (day.length === 1) day = '0' + day;
                    if (month.length === 1) month = '0' + month;

                    potentialDate = `${year}-${month}-${day}`;
                }
            });

            // Updating form with best guesses
            setFormData(prev => ({
                ...prev,
                licensePlate: potentialPlate || prev.licensePlate,
                testDate: potentialDate || prev.testDate
            }));

            alert(`סריקה הושלמה! \nאנא וודא שהפרטים (כולל תוקף רישיון) נכונים.`);
            setStatus('');

        } catch (err) {
            console.error(err);
            alert("שגיאה בסריקת הקובץ. אנא מלא את הפרטים ידנית.");
            setStatus('');
        }
    };

    const sendSmsToAdmin = async (data) => {
        console.log("Sending order to Netlify Function...");

        try {
            const response = await fetch('/.netlify/functions/send-sms', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: data.name,
                    phone: data.phone,
                    cartype: data.carType,
                    address: data.address,
                    service: data.service,
                    date: data.date,
                    time: data.time
                })
            });

            const result = await response.json();

            if (response.ok) {
                console.log("SMS sent via Function:", result);
            } else {
                console.error("Failed to send SMS via Function:", result);
            }
        } catch (error) {
            console.error("Network Error calling Function:", error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatus('submitting');

        try {
            let licenseImageUrl = '';

            if (licenseImage) {
                const storageRef = ref(storage, `licenses/${Date.now()}_${licenseImage.name}`);
                await uploadBytes(storageRef, licenseImage);
                licenseImageUrl = await getDownloadURL(storageRef);
            }

            const docData = {
                ...formData,
                licenseImageUrl,
                timestamp: new Date(),
                status: 'חדש'
            };

            await addDoc(collection(db, "bookings"), docData);

            // Send SMS to Admin
            await sendSmsToAdmin(formData);

            setStatus('success');
            setSubmittedData(docData);
            setFormData({ name: '', phone: '', address: '', carType: '', service: 'טסט שנתי', date: '', time: '', licensePlate: '' });
            setLicenseImage(null);
        } catch (error) {
            console.error("Error adding document: ", error);
            setStatus('error');
        }
    };

    if (status === 'success' && submittedData) {
        return (
            <div className="fade-in" style={{ maxWidth: '600px', margin: '0 auto', padding: '2rem', backgroundColor: 'var(--color-bg-light)', borderRadius: 'var(--border-radius)', boxShadow: 'var(--shadow-md)', textAlign: 'center' }}>
                <h2 style={{ color: '#4CAF50', marginBottom: '1rem' }}>ההזמנה התקבלה בהצלחה!</h2>
                <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>✅</div>
                <p style={{ fontSize: '1.2rem', marginBottom: '2rem' }}>קיבלנו את הפרטים וניצור איתך קשר בהקדם.</p>

                <h3 style={{ borderBottom: '2px solid var(--color-primary)', display: 'inline-block', paddingBottom: '0.5rem', marginBottom: '1.5rem' }}>סיכום הזמנה</h3>

                <div style={{ textAlign: 'right', display: 'grid', gap: '1rem', backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px' }}>
                    <div><strong>שם:</strong> {submittedData.name}</div>
                    <div><strong>טלפון:</strong> {submittedData.phone}</div>
                    <div><strong>כתובת איסוף:</strong> {submittedData.address}</div>
                    <div><strong>סוג רכב:</strong> {submittedData.carType}</div>
                    <div><strong>מספר רכב:</strong> {submittedData.licensePlate}</div>
                    <div><strong>שירות:</strong> {submittedData.service}</div>
                    <div><strong>מועד מועדף:</strong> {submittedData.date} בשעה {submittedData.time}</div>
                </div>

                <button onClick={() => { setStatus(''); setSubmittedData(null); }} style={{
                    marginTop: '2rem',
                    backgroundColor: 'var(--color-secondary)',
                    color: 'var(--color-white)',
                    padding: '10px 20px',
                    border: 'none',
                    borderRadius: '50px',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                }}>
                    הזמן שירות נוסף
                </button>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: '500px', margin: '0 auto', padding: '2rem', backgroundColor: 'var(--color-bg-light)', borderRadius: 'var(--border-radius)', boxShadow: 'var(--shadow-md)' }}>
            <h3 style={{ textAlign: 'center', color: 'var(--color-primary)', marginBottom: '1.5rem' }}>הזמנת שירות חדש</h3>

            <div style={{ marginBottom: '1.5rem', padding: '15px', border: '2px dashed #ccc', borderRadius: '8px', textAlign: 'center', backgroundColor: '#f9f9f9' }}>
                <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>📸 צלם או העלה רישיון רכב</label>
                <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'block', margin: '0 auto' }} />
                {status === 'ocr_processing' && <p style={{ color: 'blue', marginTop: '5px' }}>מפענח טקסט... {ocrProgress}%</p>}
                <p style={{ fontSize: '0.8rem', color: '#666', marginTop: '5px' }}>המערכת תנסה למלא את הפרטים אוטומטית</p>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <input
                    type="text"
                    name="name"
                    placeholder="שם מלא *"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    style={{ padding: '10px', borderRadius: '5px', border: '1px solid #ddd', fontSize: '1rem' }}
                />
                <input
                    type="tel"
                    name="phone"
                    placeholder="מספר טלפון *"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                    style={{ padding: '10px', borderRadius: '5px', border: '1px solid #ddd', fontSize: '1rem' }}
                />
                <input
                    type="text"
                    name="address"
                    placeholder="כתובת איסוף *"
                    value={formData.address}
                    onChange={handleChange}
                    required
                    style={{ padding: '10px', borderRadius: '5px', border: '1px solid #ddd', fontSize: '1rem' }}
                />
                <input
                    type="text"
                    name="carType"
                    placeholder="סוג רכב (יצרן ודגם) *"
                    value={formData.carType}
                    onChange={handleChange}
                    required
                    style={{ padding: '10px', borderRadius: '5px', border: '1px solid #ddd', fontSize: '1rem' }}
                />
                <input
                    type="text"
                    name="licensePlate"
                    placeholder="מספר רכב"
                    value={formData.licensePlate}
                    onChange={handleChange}
                    style={{ padding: '10px', borderRadius: '5px', border: '1px solid #ddd', fontSize: '1rem' }}
                />

                <div style={{ padding: '10px', backgroundColor: '#e9f7ef', borderRadius: '5px', border: '1px solid #c8e6c9' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem', color: '#2e7d32', fontWeight: 'bold' }}>תוקף רישיון (לצורך תזכורת):</label>
                    <input
                        type="date"
                        name="testDate"
                        value={formData.testDate}
                        onChange={handleChange}
                        style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ddd', fontSize: '1rem' }}
                    />
                </div>
                <select
                    name="service"
                    value={formData.service}
                    onChange={handleChange}
                    style={{ padding: '10px', borderRadius: '5px', border: '1px solid #ddd', fontSize: '1rem' }}
                >
                    <option value="טסט שנתי">טסט שנתי</option>
                    <option value="שירותי מכונאות">שירותי מכונאות</option>
                    <option value="שירותי פחחות">שירותי פחחות</option>
                </select>

                <div style={{ display: 'flex', gap: '10px' }}>
                    <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem' }}>תאריך מועדף:</label>
                        <input
                            type="date"
                            name="date"
                            value={formData.date}
                            onChange={handleChange}
                            required
                            style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ddd', fontSize: '1rem' }}
                        />
                    </div>
                    <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem' }}>שעה מועדפת:</label>
                        <input
                            type="time"
                            name="time"
                            value={formData.time}
                            onChange={handleChange}
                            required
                            style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ddd', fontSize: '1rem' }}
                        />
                    </div>
                </div>

                <button type="submit" disabled={status === 'submitting' || status === 'ocr_processing'} style={{
                    backgroundColor: 'var(--color-primary)',
                    color: 'var(--color-secondary)',
                    padding: '12px',
                    border: 'none',
                    borderRadius: '5px',
                    fontWeight: 'bold',
                    fontSize: '1.1rem',
                    marginTop: '10px',
                    cursor: 'pointer',
                    opacity: (status === 'submitting' || status === 'ocr_processing') ? 0.7 : 1
                }}>
                    {status === 'submitting' ? 'שולח...' : 'הזמן שירות'}
                </button>
            </form>
            {status === 'error' && <p style={{ textAlign: 'center', marginTop: '1rem', color: 'red' }}>אירעה שגיאה בשליחת ההזמנה.</p>}
        </div>
    );
};

export default BookingForm;
