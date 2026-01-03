import React, { useState } from 'react';
import { db } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';

const BookingForm = () => {
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        address: '',
        carType: '',
        service: 'טסט שנתי',
        date: '',
        time: ''
    });
    const [status, setStatus] = useState(''); // 'submitting', 'success', 'error'
    const [submittedData, setSubmittedData] = useState(null);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const sendSmsToAdmin = async (data) => {
        console.log("Sending order to Netlify Function...");

        try {
            // Call our own backend function (relative path)
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
            await addDoc(collection(db, "bookings"), {
                ...formData,
                timestamp: new Date(),
                status: 'חדש'
            });

            // Send SMS to Admin
            await sendSmsToAdmin(formData);

            setStatus('success');
            setSubmittedData(formData);
            setFormData({ name: '', phone: '', address: '', carType: '', service: 'טסט שנתי', date: '', time: '' });
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

                <button type="submit" disabled={status === 'submitting'} style={{
                    backgroundColor: 'var(--color-primary)',
                    color: 'var(--color-secondary)',
                    padding: '12px',
                    border: 'none',
                    borderRadius: '5px',
                    fontWeight: 'bold',
                    fontSize: '1.1rem',
                    marginTop: '10px',
                    cursor: 'pointer',
                    opacity: status === 'submitting' ? 0.7 : 1
                }}>
                    {status === 'submitting' ? 'שולח...' : 'הזמן שירות'}
                </button>
            </form>
            {status === 'error' && <p style={{ textAlign: 'center', marginTop: '1rem', color: 'red' }}>אירעה שגיאה בשליחת ההזמנה.</p>}
        </div>
    );
};

export default BookingForm;
