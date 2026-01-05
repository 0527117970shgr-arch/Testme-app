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

    // Helper to compress image before sending
    const compressImage = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 1000;
                    const scaleSize = MAX_WIDTH / img.width;
                    const width = (img.width > MAX_WIDTH) ? MAX_WIDTH : img.width;
                    const height = (img.width > MAX_WIDTH) ? (img.height * scaleSize) : img.height;

                    canvas.width = width;
                    canvas.height = height;

                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
                    resolve(dataUrl.split(',')[1]);
                };
                img.onerror = (err) => reject(err);
            };
            reader.onerror = (err) => reject(err);
        });
    };

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setLicenseImage(file);

        setStatus('ocr_processing');
        setOcrProgress(10);

        try {
            console.log("Compressing image...");
            const base64Image = await compressImage(file);
            console.log("Compression complete. Sending to OCR...");
            setOcrProgress(30);

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

            const { licensePlate, testDate, name, licenseExpiry, carType } = result.extracted || {};

            // Helper to parse DD/MM/YYYY to YYYY-MM-DD
            const parseDate = (dateStr) => {
                if (!dateStr) return '';
                // Try converting DD/MM/YYYY to YYYY-MM-DD
                const parts = dateStr.split('/');
                if (parts.length === 3) {
                    // Assuming day/month/year
                    const [day, month, year] = parts;
                    // Pad with zeros if needed
                    const pad = (n) => n.toString().padStart(2, '0');
                    return `${year}-${pad(month)}-${pad(day)}`;
                }
                return dateStr; // Return as is if format doesn't match
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

            // Alert user based on strict validation
            const validPlate = licensePlate && (licensePlate.length === 7 || licensePlate.length === 8);

            if (validPlate) {
                alert(`OCR Success!\nDetected:\nPlate: ${licensePlate}\nName: ${name || 'N/A'}\nExpiry: ${formattedExpiry || 'N/A'}`);
            } else if (licensePlate) {
                // Plate found but invalid length (should have been nullified by backend but just in case)
                alert(`OCR Warning: Detected plate "${licensePlate}" is invalid (must be 7-8 digits). Please correct manually.`);
            } else {
                alert("OCR Scan: Could not identify a valid 7-8 digit license plate. Please enter details manually or retake photo without glare.");
            }
            setStatus('');

        } catch (err) {
            console.error("OCR/Base64 Error:", err);
            alert("Error scanning image. Please fill details manually.");
            setStatus('');
        }
    };

    const sendSmsToAdmin = async (data) => {
        try {
            // Strip heavy image data before sending to SMS function (reduces payload size)
            // eslint-disable-next-line no-unused-vars
            const { licenseImage, licenseImageUrl, ...smsData } = data;

            await fetch('/.netlify/functions/send-sms', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(smsData)
            });
        } catch (error) {
            console.error("Network Error calling Function:", error);
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

                <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'block', margin: '15px auto' }} />

                {licenseImage && (
                    <div style={{ textAlign: 'center', margin: '10px 0' }}>
                        <p style={{ fontSize: '0.8rem', marginBottom: '5px' }}>Preview:</p>
                        <img
                            src={URL.createObjectURL(licenseImage)}
                            alt="License Preview"
                            style={{ maxWidth: '100%', maxHeight: '150px', borderRadius: '5px', border: '1px solid #ccc' }}
                        />
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
