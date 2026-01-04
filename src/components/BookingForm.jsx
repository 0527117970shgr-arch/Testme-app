import React, { useState } from 'react';
import { db, storage } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';
// import { ref, uploadBytes, getDownloadURL } from "firebase/storage";


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
        testDate: '',
        licenseExpiry: ''
    });
    const [status, setStatus] = useState(''); // 'submitting', 'success', 'error', 'ocr_processing'
    const [submittedData, setSubmittedData] = useState(null);
    const [licenseImage, setLicenseImage] = useState(null);
    const [ocrProgress, setOcrProgress] = useState(0);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    // Image pre-processing handled by Server now for stability


    // Helper to compress image before sending (Avoids Netlify 6MB body limit)
    const compressImage = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 1000; // Resize to max 1000px width (per user request)
                    const scaleSize = MAX_WIDTH / img.width;
                    const width = (img.width > MAX_WIDTH) ? MAX_WIDTH : img.width;
                    const height = (img.width > MAX_WIDTH) ? (img.height * scaleSize) : img.height;

                    canvas.width = width;
                    canvas.height = height;

                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    // Compress to JPEG 0.7 quality
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
                    resolve(dataUrl.split(',')[1]); // Remove prefix
                };
                img.onerror = (err) => reject(err);
            };
            reader.onerror = (err) => reject(err);
        });
    };

    // ... (rest of component) ...

    const docData = {
        ...finalData,
        licenseImageUrl: finalImageUrl,
        timestamp: new Date(),
        status: 'חדש',
        reminderQueueDate: finalData.licenseExpiry ? (() => {
            // Calculate date 14 days before expiry
            const d = new Date(finalData.licenseExpiry);
            d.setDate(d.getDate() - 14);
            return d.toISOString().split('T')[0];
        })() : null,
        reminderSent: false
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
    setFormData({ name: '', phone: '', address: '', carType: '', service: 'טסט שנתי', date: '', time: '', licensePlate: '', testDate: '', licenseExpiry: '', licenseImageUrl: '' });
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
