import React, { useState } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import { useLanguage } from '../context/LanguageContext';

const BookingForm = () => {
    const { t, language } = useLanguage();
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        address: '',
        carType: '',
        service: 'test', // defaulting to key instead of Hebrew string
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

    // Enhanced compression: Max 1600px, better quality
    const compressImage = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_SIZE = 1600; // Max width/height

                    let width = img.width;
                    let height = img.height;

                    // Calculate new dimensions while maintaining aspect ratio
                    if (width > height) {
                        if (width > MAX_SIZE) {
                            height = Math.round((height * MAX_SIZE) / width);
                            width = MAX_SIZE;
                        }
                    } else {
                        if (height > MAX_SIZE) {
                            width = Math.round((width * MAX_SIZE) / height);
                            height = MAX_SIZE;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;

                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    // Use higher quality (0.85 instead of 0.7)
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
                    resolve(dataUrl.split(',')[1]);
                };
                img.onerror = (err) => reject(new Error('Failed to load image'));
            };
            reader.onerror = (err) => reject(new Error('Failed to read file'));
        });
    };

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setLicenseImage(file);

        setStatus('ocr_processing');
        setOcrProgress(10);

        try {
            console.log("Processing file:", file.name, "Type:", file.type);

            const handleFileChange = async (e) => {
                const file = e.target.files[0];
                if (!file) return;

                // Validate file type
                const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
                if (!validTypes.includes(file.type)) {
                    alert("סוג קובץ לא נתמך. אנא העלה תמונה או PDF.");
                    return;
                }

                // Validate file size (max 10MB)
                if (file.size > 10 * 1024 * 1024) {
                    alert("הקובץ גדול מדי. מקסימום 10MB.");
                    return;
                }

                setLicenseImage(file);
                setStatus('ocr_processing');
                setOcrProgress(10);

                try {
                    console.log("📄 Processing file:", file.name, "Type:", file.type, "Size:", (file.size / 1024).toFixed(2), "KB");

                    let base64Data;
                    let mimeType = file.type;

                    if (file.type === 'application/pdf') {
                        console.log("🔄 Converting PDF to base64...");
                        const reader = new FileReader();
                        base64Data = await new Promise((resolve, reject) => {
                            reader.onload = () => {
                                const base64 = reader.result.split(',')[1];
                                resolve(base64);
                            };
                            reader.onerror = () => reject(new Error('Failed to read PDF'));
                            reader.readAsDataURL(file);
                        });
                        setOcrProgress(30);
                    } else {
                        console.log("🖼️  Compressing image...");
                        base64Data = await compressImage(file);
                        console.log("✅ Compression complete. New size:", (base64Data.length * 0.75 / 1024).toFixed(2), "KB");
                        setOcrProgress(30);
                    }

                    // Retry logic with timeout
                    const analyzeWithRetry = async (retries = 2) => {
                        for (let attempt = 1; attempt <= retries; attempt++) {
                            try {
                                console.log(`🚀 Attempt ${attempt}/${retries}: Sending to OCR...`);

                                const controller = new AbortController();
                                const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

                                const response = await fetch('/.netlify/functions/analyze-license', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                        imageBase64: base64Data,
                                        fileType: mimeType,
                                        fileName: file.name
                                    }),
                                    signal: controller.signal
                                });

                                clearTimeout(timeoutId);

                                console.log("📡 Response status:", response.status, response.statusText);

                                if (!response.ok) {
                                    const errorText = await response.text();
                                    console.error("❌ Server error:", errorText);
                                    throw new Error(`Server returned ${response.status}: ${errorText}`);
                                }

                                const result = await response.json();
                                console.log("✅ OCR Result:", result);

                                return result; // Success

                            } catch (err) {
                                console.error(`⚠️  Attempt ${attempt} failed:`, err.message);
                                if (attempt === retries) throw err;
                                await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s before retry
                            }
                        }
                    };

                    const result = await analyzeWithRetry();
                    setOcrProgress(100);

                    if (result.error) {
                        console.error("🔴 OCR Error:", result.error);
                        alert(`שגיאה בזיהוי: ${result.error}\n\nטיפים:\n- ודא שהתמונה ברורה ומוארת\n- נסה לצלם שוב בזווית ישרה\n- וודא שזה רישיון רכב ישראלי`);
                        setStatus('');
                        return;
                    }

                    console.log("📋 OCR Result:", result);

                    const { licensePlate, testDate, name, licenseExpiry, carType } = result.extracted || {};

                    // Helper to parse DD/MM/YYYY to YYYY-MM-DD
                    const parseDate = (dateStr) => {
                        if (!dateStr) return '';
                        const parts = dateStr.split('/');
                        if (parts.length === 3) {
                            const [day, month, year] = parts;
                            const pad = (n) => n.toString().padStart(2, '0');
                            return `${year}-${pad(month)}-${pad(day)}`;
                        }
                        return dateStr;
                    };

                    const formattedExpiry = parseDate(licenseExpiry || testDate);

                    setFormData(prev => ({
                        ...prev,
                        licensePlate: licensePlate || prev.licensePlate,
                        testDate: formattedExpiry || prev.testDate,
                        name: name || prev.name,
                        licenseExpiry: formattedExpiry || prev.licenseExpiry,
                        carType: carType || prev.carType
                    }));

                    const validPlate = licensePlate && (licensePlate.length === 7 || licensePlate.length === 8);

                    if (validPlate) {
                        alert(`✅ זיהוי הצליח!\n\nמספר רכב: ${licensePlate}\nבעלים: ${name || 'לא זוהה'}\nתוקף: ${formattedExpiry || 'לא זוהה'}\nדגם: ${carType || 'לא זוהה'}`);
                    } else if (licensePlate) {
                        alert(`⚠️  זוהה מספר רכב לא תקין: "${licensePlate}"\n\nהמספר חייב להיות 7-8 ספרות. אנא תקן ידנית.`);
                    } else {
                        alert("⚠️  לא זוהה מספר רכב.\n\nאנא הזן את המספר ידנית או נסה לצלם שוב.");
                    }
                    setStatus('');

                } catch (err) {
                    console.error("🔴 OCR/Processing Error:", err);
                    console.error("Error details:", err.stack);

                    let userMessage = "שגיאה בסריקת הקובץ.";
                    if (err.name === 'AbortError') {
                        userMessage = "הזמן הקצוב פג. נסה שוב עם תמונה קטנה יותר.";
                    } else if (err.message.includes('Failed to fetch')) {
                        userMessage = "בעיית חיבור לשרת. בדוק את החיבור לאינטרנט.";
                    }

                    alert(`❌ ${userMessage}\n\nשגיאה טכנית: ${err.message}\n\nאנא מלא את הפרטים ידנית.`);
                    setStatus('');
                }
            };

            const sendSmsToAdmin = async (data) => {
                try {
                    // Strip heavy image data before sending to SMS function (reduces payload size)
                    // eslint-disable-next-line no-unused-vars
                    const { licenseImage, licenseImageUrl, ...smsData } = data;

                    const response = await fetch('/api/send-sms', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(smsData)
                    });

                    const result = await response.json();
                    console.log("SMS API Response:", result);

                    if (!result.success) {
                        console.error("SMS sending failed:", result.error || result.data);
                    } else if (result.mocked) {
                        console.warn("SMS was mocked (missing credentials)");
                    } else {
                        console.log("SMS sent successfully:", result);
                    }
                } catch (error) {
                    console.error("Network Error calling SMS Function:", error);
                }
            };

            const handleSubmit = async (e) => {
                e.preventDefault();

                // Validation: License Plate
                const cleanPlate = formData.licensePlate.replace(/\D/g, '');
                if (formData.licensePlate && (cleanPlate.length < 7 || cleanPlate.length > 9)) {
                    alert("Invalid License Plate (must be 7-9 digits).");
                    return;
                }

                const finalData = { ...formData, licensePlate: cleanPlate };
                setStatus('submitting');

                try {
                    // Note: service is stored as key (test, mechanic, bodywork) or we map it?
                    // For now storing the key is fine, AdminDashboard will need to handle it or we map here.
                    // Let's map it to Hebrew for backward compatibility with Admin if needed, or stick to English keys.
                    // The User requested localization, so internal data can be English or Hebrew. 
                    // Let's actually map the service key to the *translated* Hebrew string for the DB, 
                    // so the Admin (who is likely Hebrew speaking) sees Hebrew?
                    // Actually, better to store English keys 'annual_test', 'mechanic', 'bodywork' and translate in Admin.
                    // BUT, existing data is 'טסט שנתי'. So let's stick to mapping the key back to Hebrew for DB consistency.

                    const serviceMap = {
                        'test': 'טסט שנתי',
                        'mechanic': 'שירותי מכונאות',
                        'bodywork': 'שירותי פחחות'
                    };

                    // Compress image to Base64 for storage (Max 500KB usually safe for Firestore)
                    let imageBase64 = '';
                    if (licenseImage) {
                        try {
                            // We reuse compressImage but ensure we get the full Data URL or handle the split result
                            // compressImage returns result.split(',')[1] (raw base64)
                            // We want the prefix for display
                            const rawBase64 = await compressImage(licenseImage);
                            imageBase64 = `data:image/jpeg;base64,${rawBase64}`;
                        } catch (err) {
                            console.error("Compression failed:", err);
                        }
                    }

                    const dbData = {
                        ...finalData,
                        service: serviceMap[finalData.service] || finalData.service,
                        licenseImage: imageBase64, // Store directly in DB
                        timestamp: new Date(),
                        status: 'חדש',
                        reminderQueueDate: finalData.licenseExpiry ? (() => {
                            try {
                                const d = new Date(finalData.licenseExpiry);
                                if (isNaN(d.getTime())) return null;
                                d.setDate(d.getDate() - 14);
                                return d.toISOString().split('T')[0];
                            } catch (e) {
                                return null;
                            }
                        })() : null,
                        reminderSent: false
                    };

                    await addDoc(collection(db, "bookings"), dbData);

                    try {
                        await sendSmsToAdmin(dbData);
                    } catch (smsError) {
                        console.error("SMS Warning:", smsError);
                    }

                    setStatus('success');
                    setSubmittedData(dbData); // Use dbData so summary uses Hebrew service name? Or use finalData? 
                    // Let's use dbData for simple display, or we could translate back in the summary.
                    // For the summary view, we want to show the user the language they speak.
                    setFormData({ name: '', phone: '', address: '', carType: '', service: 'test', date: '', time: '', licensePlate: '', testDate: '', licenseExpiry: '' });
                    setLicenseImage(null);
                } catch (error) {
                    console.error("Error adding document: ", error);
                    setStatus('error');
                    alert(language === 'he' ? "אירעה שגיאה בשליחת הטופס." : "Error submitting form.");
                }
            };

            if (status === 'success' && submittedData) {
                return (
                    <div className="fade-in" style={{ maxWidth: '600px', margin: '0 auto', padding: '2rem', backgroundColor: 'var(--color-bg-light)', borderRadius: 'var(--border-radius)', boxShadow: 'var(--shadow-md)', textAlign: 'center' }}>
                        <h2 style={{ color: '#4CAF50', marginBottom: '1rem' }}>{t('success.title')}</h2>
                        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>✅</div>
                        <p style={{ fontSize: '1.2rem', marginBottom: '2rem' }}>{t('success.subtitle')}</p>

                        <h3 style={{ borderBottom: '2px solid var(--color-primary)', display: 'inline-block', paddingBottom: '0.5rem', marginBottom: '1.5rem' }}>{t('success.summary')}</h3>

                        <div style={{ textAlign: language === 'he' ? 'right' : 'left', display: 'grid', gap: '1rem', backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px' }}>
                            <div><strong>{t('success.labels.name')}</strong> {submittedData.name}</div>
                            <div><strong>{t('success.labels.phone')}</strong> {submittedData.phone}</div>
                            <div><strong>{t('success.labels.address')}</strong> {submittedData.address}</div>
                            <div><strong>{t('success.labels.carType')}</strong> {submittedData.carType}</div>
                            <div><strong>{t('success.labels.licensePlate')}</strong> {submittedData.licensePlate}</div>
                            <div><strong>{t('success.labels.service')}</strong> {submittedData.service}</div>
                            <div><strong>{t('success.labels.date')}</strong> {submittedData.date} {submittedData.time}</div>
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
                            {t('success.new_order')}
                        </button>
                    </div>
                );
            }

            return (
                <div style={{ maxWidth: '500px', margin: '0 auto', padding: '2rem', backgroundColor: 'var(--color-bg-light)', borderRadius: 'var(--border-radius)', boxShadow: 'var(--shadow-md)' }}>
                    <h3 style={{ textAlign: 'center', color: 'var(--color-primary)', marginBottom: '1.5rem' }}>{t('form.title')}</h3>

                    <div style={{ marginBottom: '1.5rem', padding: '15px', border: '2px dashed #2196F3', borderRadius: '8px', textAlign: 'center', backgroundColor: '#e3f2fd' }}>
                        <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold', fontSize: '1.1rem' }}>{t('form.scan_title')}</label>

                        <div style={{ fontSize: '0.9rem', marginBottom: '10px', color: '#555', textAlign: language === 'he' ? 'right' : 'left', display: 'inline-block' }}>
                            <div><strong>{t('form.scan_instructions.title')}</strong></div>
                            <div>{t('form.scan_instructions.step1')}</div>
                            <div>{t('form.scan_instructions.step2')}</div>
                            <div>{t('form.scan_instructions.step3')}</div>
                        </div>

                        <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,image/*,application/pdf" onChange={handleFileChange} style={{ display: 'block', margin: '15px auto' }} />

                        {licenseImage && (
                            <div style={{ textAlign: 'center', margin: '10px 0' }}>
                                <p style={{ fontSize: '0.8rem', marginBottom: '5px' }}>Preview:</p>
                                {licenseImage.type === 'application/pdf' ? (
                                    <div style={{ padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '5px', border: '1px solid #ccc' }}>
                                        <span>📄 {licenseImage.name}</span>
                                        <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '5px' }}>
                                            PDF מוכן לניתוח
                                        </div>
                                    </div>
                                ) : (
                                    <img
                                        src={URL.createObjectURL(licenseImage)}
                                        alt="License Preview"
                                        style={{ maxWidth: '100%', maxHeight: '150px', borderRadius: '5px', border: '1px solid #ccc' }}
                                    />
                                )}
                            </div>
                        )}

                        {status === 'ocr_processing' && <p style={{ color: 'blue', marginTop: '5px', fontWeight: 'bold' }}>{t('form.processing')}</p>}
                    </div>

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <input
                            type="text"
                            name="name"
                            placeholder={t('form.labels.name')}
                            value={formData.name}
                            onChange={handleChange}
                            required
                            style={{ padding: '10px', borderRadius: '5px', border: '1px solid #ddd', fontSize: '1rem' }}
                        />
                        <input
                            type="tel"
                            name="phone"
                            placeholder={t('form.labels.phone')}
                            value={formData.phone}
                            onChange={handleChange}
                            required
                            style={{ padding: '10px', borderRadius: '5px', border: '1px solid #ddd', fontSize: '1rem', direction: 'ltr' }}
                        />
                        <input
                            type="text"
                            name="address"
                            placeholder={t('form.labels.address')}
                            value={formData.address}
                            onChange={handleChange}
                            required
                            style={{ padding: '10px', borderRadius: '5px', border: '1px solid #ddd', fontSize: '1rem' }}
                        />
                        <input
                            type="text"
                            name="carType"
                            placeholder={t('form.labels.carType')}
                            value={formData.carType}
                            onChange={handleChange}
                            required
                            style={{ padding: '10px', borderRadius: '5px', border: '1px solid #ddd', fontSize: '1rem' }}
                        />
                        <input
                            type="text"
                            name="licensePlate"
                            placeholder={t('form.labels.licensePlate')}
                            value={formData.licensePlate}
                            onChange={handleChange}
                            style={{ padding: '10px', borderRadius: '5px', border: '1px solid #ddd', fontSize: '1rem', direction: 'ltr' }}
                        />

                        <div style={{ padding: '10px', backgroundColor: '#e9f7ef', borderRadius: '5px', border: '1px solid #c8e6c9' }}>
                            <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem', color: '#2e7d32', fontWeight: 'bold' }}>{t('form.labels.licenseExpiry')}</label>
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
                            <option value="test">{t('form.services.test')}</option>
                            <option value="mechanic">{t('form.services.mechanic')}</option>
                            <option value="bodywork">{t('form.services.bodywork')}</option>
                        </select>

                        <div style={{ display: 'flex', gap: '10px' }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem' }}>{t('form.labels.date')}</label>
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
                                <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem' }}>{t('form.labels.time')}</label>
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
                            {status === 'submitting' ? t('form.sending') : t('form.submit')}
                        </button>
                    </form>
                    {status === 'error' && <p style={{ textAlign: 'center', marginTop: '1rem', color: 'red' }}>Error sending order.</p>}
                </div>
            );
        };

        export default BookingForm;
