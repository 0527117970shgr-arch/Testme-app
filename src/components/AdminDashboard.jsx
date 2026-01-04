import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, updateDoc, doc, getDoc, setDoc } from 'firebase/firestore';

const AdminDashboard = () => {
    console.log("AdminDashboard Component Mounted");
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');

    // Settings Logic (Moved up to avoid conditional hook error)
    const [showSettings, setShowSettings] = useState(false);
    const [smsTemplate, setSmsTemplate] = useState('שלום [Customer Name], תזכורת: בעוד שבועיים יפוג תוקף הרישיון לרכב [License Plate]. אל תשכח לבצע טסט!');

    useEffect(() => {
        if (isAuthenticated) {
            fetchBookings();
            fetchSettings();
        }
    }, [isAuthenticated]);

    const fetchBookings = async () => {
        try {
            const querySnapshot = await getDocs(collection(db, "bookings"));
            const bookingsData = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));

            bookingsData.sort((a, b) => {
                if (a.timestamp && b.timestamp) {
                    return b.timestamp.seconds - a.timestamp.seconds;
                }
                return 0;
            });

            setBookings(bookingsData);
            setLoading(false);
        } catch (error) {
            console.error("Error fetching bookings: ", error);
            setLoading(false);
        }
    };

    const handleLogin = (e) => {
        e.preventDefault();
        if (password === 'admin123') {
            setIsAuthenticated(true);
        } else {
            alert('סיסמה שגויה');
        }
    };

    const updateStatus = async (id, newStatus) => {
        try {
            const bookingRef = doc(db, "bookings", id);
            await updateDoc(bookingRef, { status: newStatus });
            setBookings(bookings.map(b => b.id === id ? { ...b, status: newStatus } : b));
        } catch (error) {
            console.error("Error updating status: ", error);
            alert("שגיאה בעדכון הסטטוס");
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'חדש': return 'orange';
            case 'בטיפול': return '#2196F3';
            case 'הושלם': return '#4CAF50';
            case 'בוטל': return '#f44336';
            default: return 'gray';
        }
    };

    // Helper to format WhatsApp link
    const getWhatsAppLink = (booking) => {
        const phone = booking.phone.replace(/\D/g, '').replace(/^0/, '972');
        const text = `שלום ${booking.name}, אנחנו מטפלים בהזמנתך ל${booking.service} מתאריך ${booking.date}. הרכב בטיפול!`;
        return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
    };

    if (!isAuthenticated) {
        return (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
                <h2>כניסה למנהלים</h2>
                <form onSubmit={handleLogin} style={{ marginTop: '1rem' }}>
                    <input
                        type="password"
                        placeholder="סיסמה"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        style={{ padding: '10px', fontSize: '1rem' }}
                    />
                    <button type="submit" style={{ padding: '10px 20px', marginLeft: '10px', fontSize: '1rem', backgroundColor: 'var(--color-primary)', border: 'none', cursor: 'pointer' }}>כנס</button>
                </form>
            </div>
        );
    }

    // Settings Logic moved to top


    const fetchSettings = async () => {
        try {
            // In a real app we might have a dedicated collection. using 'settings/sms' doc
            const docRef = doc(db, "settings", "sms");
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                setSmsTemplate(docSnap.data().template);
            }
        } catch (error) {
            console.error("Error fetching settings: ", error);
        }
    };

    const saveSettings = async () => {
        try {
            await setDoc(doc(db, "settings", "sms"), { template: smsTemplate });
            alert("הגדרות נשמרו בהצלחה!");
            setShowSettings(false);
        } catch (error) {
            console.error("Error saving settings: ", error);
            alert("שגיאה בשמירת הגדרות");
        }
    };

    return (
        <div style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2>לוח בקרה - ניהול הזמנות</h2>
                <div>
                    <button onClick={() => setShowSettings(!showSettings)} style={{ padding: '5px 15px', marginLeft: '10px', cursor: 'pointer', backgroundColor: '#607d8b', color: 'white', border: 'none', borderRadius: '4px' }}>
                        ⚙️ הגדרות תזכורות
                    </button>
                    <button onClick={fetchBookings} style={{ padding: '5px 15px', cursor: 'pointer' }}>רענן נתונים 🔄</button>
                </div>
            </div>

            {/* Settings Modal/Panel */}
            {showSettings && (
                <div className="fade-in" style={{
                    marginBottom: '20px', padding: '20px', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: '#f9f9f9'
                }}>
                    <h3>עריכת תבנית SMS לתזכורת</h3>
                    <p style={{ fontSize: '0.9rem', color: '#666' }}>השתמש בתגיות: [Customer Name], [License Plate]</p>
                    <textarea
                        value={smsTemplate}
                        onChange={(e) => setSmsTemplate(e.target.value)}
                        style={{ width: '100%', minHeight: '80px', padding: '10px', marginTop: '10px', fontSize: '1rem' }}
                    />
                    <div style={{ marginTop: '10px', textAlign: 'left' }}>
                        <button onClick={saveSettings} style={{ padding: '8px 20px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>שמור הגדרות</button>
                        <button onClick={() => setShowSettings(false)} style={{ padding: '8px 20px', backgroundColor: '#f44336', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', marginLeft: '10px' }}>סגור</button>
                    </div>
                </div>
            )}

            {loading ? <p>טוען נתונים...</p> : (
                <div style={{ overflowX: 'auto', boxShadow: '0 0 10px rgba(0,0,0,0.1)', borderRadius: '8px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', minWidth: '900px', backgroundColor: 'white' }}>
                        <thead>
                            <tr style={{ backgroundColor: 'var(--color-secondary)', color: 'var(--color-white)' }}>
                                <th style={{ padding: '15px' }}>תאריך הזמנה</th>
                                <th style={{ padding: '15px' }}>לקוח</th>
                                <th style={{ padding: '15px' }}>פרטי קשר</th>
                                <th style={{ padding: '15px' }}>רכב וכתובת</th>
                                <th style={{ padding: '15px' }}>תוקף טסט</th>
                                <th style={{ padding: '15px' }}>תזכורת SMS</th>
                                <th style={{ padding: '15px' }}>שירות</th>
                                <th style={{ padding: '15px' }}>סטטוס</th>
                            </tr>
                        </thead>
                        <tbody>
                            {bookings.map(booking => (
                                <tr key={booking.id} style={{ borderBottom: '1px solid #ddd' }}>
                                    <td style={{ padding: '15px' }}>
                                        {booking.timestamp ? new Date(booking.timestamp.seconds * 1000).toLocaleDateString() : '-'}
                                        <br />
                                        <small style={{ color: '#888' }}>
                                            {booking.timestamp ? new Date(booking.timestamp.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                        </small>
                                    </td>
                                    <td style={{ padding: '15px', fontWeight: 'bold' }}>{booking.name}</td>
                                    <td style={{ padding: '15px' }}>
                                        <a href={`tel:${booking.phone}`} style={{ display: 'block' }}>{booking.phone}</a>
                                        <a href={getWhatsAppLink(booking)} target="_blank" rel="noreferrer" style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '5px',
                                            marginTop: '5px',
                                            color: '#25D366',
                                            fontWeight: 'bold',
                                            textDecoration: 'none',
                                            padding: '2px 8px',
                                            border: '1px solid #25D366',
                                            borderRadius: '50px',
                                            fontSize: '0.8rem'
                                        }}>
                                            WhatsApp 💬
                                        </a>
                                    </td>
                                    <td style={{ padding: '15px' }}>
                                        <div>{booking.carType}</div>
                                        <div style={{ fontSize: '0.9em', color: '#666' }}>{booking.address}</div>
                                        {booking.licensePlate && <div style={{ fontWeight: 'bold' }}>{booking.licensePlate}</div>}
                                        {booking.licenseImageUrl && (
                                            <a href={booking.licenseImageUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.8rem', color: 'blue', textDecoration: 'underline' }}>
                                                📷 הצג רישיון
                                            </a>
                                        )}
                                    </td>
                                    <td style={{ padding: '15px', color: '#d32f2f', fontWeight: 'bold' }}>
                                        {booking.licenseExpiry || booking.testDate || '-'}
                                    </td>
                                    <td style={{ padding: '15px' }}>
                                        {booking.reminderSent ? (
                                            <span style={{ color: 'green', fontWeight: 'bold' }}>✅ נשלח</span>
                                        ) : (
                                            booking.reminderQueueDate ? (
                                                <span style={{ color: 'orange' }}>⏳ מתוזמן ל-{booking.reminderQueueDate}</span>
                                            ) : '-'
                                        )}
                                    </td>
                                    <td style={{ padding: '15px' }}>{booking.service}<br />{booking.date} {booking.time}</td>
                                    <td style={{ padding: '15px' }}>
                                        <select
                                            value={booking.status || 'חדש'}
                                            onChange={(e) => updateStatus(booking.id, e.target.value)}
                                            style={{
                                                padding: '5px',
                                                borderRadius: '20px',
                                                border: 'none',
                                                backgroundColor: getStatusColor(booking.status || 'חדש'),
                                                color: 'white',
                                                fontWeight: 'bold',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            <option value="חדש" style={{ color: 'black' }}>חדש</option>
                                            <option value="בטיפול" style={{ color: 'black' }}>בטיפול</option>
                                            <option value="הושלם" style={{ color: 'black' }}>הושלם</option>
                                            <option value="בוטל" style={{ color: 'black' }}>בוטל</option>
                                        </select>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
