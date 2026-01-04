import React, { useState } from 'react';
import { db, storage } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";


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

    // Image pre-processing handled by Server now for stability


    // Helper to convert file to Base64
    const convertFileToBase64 = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result.split(',')[1]); // remove data:image/jpeg;base64,
            reader.onerror = error => reject(error);
        });
    };

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setLicenseImage(file);

        setStatus('ocr_processing');
        setOcrProgress(10);

        try {
            // 1. Convert to Base64 (No Upload yet)
            console.log("Converting image to Base64...");
            const base64Image = await convertFileToBase64(file);
            setOcrProgress(30);

            // 2. Call Google Vision via Netlify Function (Pass Base64)
            console.log("Sending Base64 to OCR...");
            const response = await fetch('/.netlify/functions/analyze-license', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ imageBase64: base64Image })
            });

            const result = await response.json();
            setOcrProgress(100);

            if (!response.ok) {
                throw new Error(result.error || "Failed to analyze image");
            }

            console.log("OCR Result:", result);

            // 3. Extraction Logic
            const { licensePlate, testDate } = result.extracted || {};

            setFormData(prev => ({
                ...prev,
                licensePlate: licensePlate || prev.licensePlate,
                testDate: testDate || prev.testDate
            }));

            // Alert user
            if (licensePlate || testDate) {
                alert(`סריקה הושלמה! \nזיהינו מספר רכב: ${licensePlate || 'לא זוהה'} \nתוקף: ${testDate || 'לא זוהה'}`);
            } else {
                alert("הסריקה הושלמה, אך לא זיהינו פרטים בבירור. אנא מלא ידנית.");
            }
            setStatus('');

        } catch (err) {
            console.error("OCR/Base64 Error:", err);
            alert("שגיאה בסריקת התמונה. \nאל דאגה, ניתן למלא את הפרטים ידנית ולשלוח את הטופס.");
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
                body: JSON.stringify(data)
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
        console.log('Starting submission...');

        // Validation: License Plate (Allow dashes, but check for 7-8 digits)
        const cleanPlate = formData.licensePlate.replace(/\D/g, ''); // Remove non-digits
        if (formData.licensePlate && (cleanPlate.length < 7 || cleanPlate.length > 9)) {
            alert("מספר רכב לא תקין (חייב להכיל 7-9 ספרות).");
            return;
        }

        // Update state with clean plate before sending
        const finalData = { ...formData, licensePlate: cleanPlate };

        setStatus('submitting');

        try {
            // Robust Image Logic:
            // If we have a URL from OCR, use it.
            // If not, but we have a file (maybe user skipped OCR or it failed), try to upload now.
            let finalImageUrl = finalData.licenseImageUrl || '';

            if (!finalImageUrl && licenseImage) {
                try {
                    console.log("Uploading image during submit...");
                    const storageRef = ref(storage, `licenses/${Date.now()}_${licenseImage.name}`);
                    await uploadBytes(storageRef, licenseImage);
                    finalImageUrl = await getDownloadURL(storageRef);
                } catch (uploadEffect) {
                    console.error("Failed to upload image during submit. Proceeding without image.", uploadEffect);
                    // Proceed anyway!
                }
            }

            const docData = {
                ...finalData,
                licenseImageUrl: finalImageUrl,
                timestamp: new Date(),
                status: 'חדש'
            };

            await addDoc(collection(db, "bookings"), docData);

            // Send SMS to Admin (Fire and forget-ish, or at least don't block success)
            try {
                await sendSmsToAdmin(finalData);
            } catch (smsError) {
                console.error("SMS Warning: Failed to send notification, but order is saved.", smsError);
            }

            console.log('Submission complete');
            setStatus('success');
            setSubmittedData(docData);
            setFormData({ name: '', phone: '', address: '', carType: '', service: 'טסט שנתי', date: '', time: '', licensePlate: '', testDate: '', licenseImageUrl: '' });
            setLicenseImage(null);
        } catch (error) {
            console.error("Error adding document: ", error);
            setStatus('error');
            alert("אירעה שגיאה בשליחת הטופס. נסה שוב.");
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

            <div style={{ marginBottom: '1.5rem', padding: '15px', border: '2px dashed #2196F3', borderRadius: '8px', textAlign: 'center', backgroundColor: '#e3f2fd' }}>
                <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold', fontSize: '1.1rem' }}>📸 סריקת רישיון רכב (חדש!)</label>

                <div style={{ fontSize: '0.9rem', marginBottom: '10px', color: '#555', textAlign: 'right', display: 'inline-block' }}>
                    <div>✨ <strong>הוראות לסריקה מוצלחת:</strong></div>
                    <div>1. וודא שאין השתקפות (פלאש) על הטקסט</div>
                    <div>2. צלם את הרישיון מקרוב ובצורה ישרה</div>
                    <div>3. תמונות מטושטשות לא ייקלטו</div>
                </div>

                <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'block', margin: '15px auto' }} />
                {status === 'ocr_processing' && <p style={{ color: 'blue', marginTop: '5px', fontWeight: 'bold' }}>מעבד תמונה... (אנא המתן)</p>}
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
