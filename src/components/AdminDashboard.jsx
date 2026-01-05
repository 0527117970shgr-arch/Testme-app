import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, updateDoc, doc, getDoc, setDoc } from 'firebase/firestore';
import { useLanguage } from '../context/LanguageContext';

const AdminDashboard = () => {
    console.log("AdminDashboard Component Mounted");
    const { language } = useLanguage(); // Using language to determine text direction/labels if needed

    // Simple translation map for Admin specific terms not in the main dictionary yet, 
    // or we can add them to translations.js. For speed, I'll put hebrew/english here or standard texts.
    // Actually, let's keep it simple. The Admin is likely Hebrew, but we support LTR.
    // I will translate the main headers to English if language is 'en'.

    const adminTranslations = {
        he: {
            title: 'לוח בקרה - ניהול הזמנות',
            settings: '⚙️ הגדרות תזכורות',
            refresh: 'רענן נתונים 🔄',
            loginTitle: 'כניסה למנהלים',
            loginBtn: 'כנס',
            logout: 'התנתק',
            table: {
                date: 'תאריך הזמנה',
                client: 'לקוח',
                contact: 'פרטי קשר',
                car: 'רכב וכתובת',
                expiry: 'תוקף טסט',
                sms: 'תזכורת SMS',
                service: 'שירות',
                status: 'סטטוס'
            },
            status: {
                new: 'חדש',
                in_progress: 'בטיפול',
                completed: 'הושלם',
                cancelled: 'בוטל'
            }
        },
        en: {
            title: 'Admin Dashboard - Order Management',
            settings: '⚙️ Reminder Settings',
            refresh: 'Refresh Data 🔄',
            loginTitle: 'Admin Login',
            loginBtn: 'Login',
            logout: 'Logout',
            table: {
                date: 'Order Date',
                client: 'Client',
                contact: 'Contact Info',
                car: 'Car & Address',
                expiry: 'License Expiry',
                sms: 'SMS Reminder',
                service: 'Service',
                status: 'Status'
            },
            status: {
                new: 'New',
                in_progress: 'In Progress',
                completed: 'Completed',
                cancelled: 'Cancelled'
            }
        }
    };

    const tAdmin = adminTranslations[language] || adminTranslations.he;

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
            alert('Incorrect password');
        }
    };

    const updateStatus = async (id, newStatus) => {
        try {
            const bookingRef = doc(db, "bookings", id);
            await updateDoc(bookingRef, { status: newStatus });
            setBookings(bookings.map(b => b.id === id ? { ...b, status: newStatus } : b));
        } catch (error) {
            console.error("Error updating status: ", error);
            alert("Error updating status");
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
        const text = `Hi ${booking.name}, regarding your order for ${booking.service}...`;
        return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
    };

    if (!isAuthenticated) {
        return (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
                <h2>{tAdmin.loginTitle}</h2>
                <form onSubmit={handleLogin} style={{ marginTop: '1rem' }}>
                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        style={{ padding: '10px', fontSize: '1rem' }}
                    />
                    <button type="submit" style={{ padding: '10px 20px', marginLeft: '10px', fontSize: '1rem', backgroundColor: 'var(--color-primary)', border: 'none', cursor: 'pointer' }}>{tAdmin.loginBtn}</button>
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
            alert("Settings saved!");
            setShowSettings(false);
        } catch (error) {
            console.error("Error saving settings: ", error);
            alert("Error saving settings");
        }
    };

    return (
        <div style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2>{tAdmin.title}</h2>
                <div>
                    <button onClick={() => setShowSettings(!showSettings)} style={{ padding: '5px 15px', marginLeft: '10px', cursor: 'pointer', backgroundColor: '#607d8b', color: 'white', border: 'none', borderRadius: '4px' }}>
                        {tAdmin.settings}
                    </button>
                    <button onClick={fetchBookings} style={{ padding: '5px 15px', cursor: 'pointer' }}>{tAdmin.refresh}</button>
                </div>
            </div>

            {/* Settings Modal/Panel */}
            {showSettings && (
                <div className="fade-in" style={{
                    marginBottom: '20px', padding: '20px', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: '#f9f9f9'
                }}>
                    <h3>Edit SMS Template</h3>
                    <p style={{ fontSize: '0.9rem', color: '#666' }}>Tags: [Customer Name], [License Plate]</p>
                    <textarea
                        value={smsTemplate}
                        onChange={(e) => setSmsTemplate(e.target.value)}
                        style={{ width: '100%', minHeight: '80px', padding: '10px', marginTop: '10px', fontSize: '1rem' }}
                    />
                    <div style={{ marginTop: '10px', textAlign: 'left' }}>
                        <button onClick={saveSettings} style={{ padding: '8px 20px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Save</button>
                        <button onClick={() => setShowSettings(false)} style={{ padding: '8px 20px', backgroundColor: '#f44336', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', marginLeft: '10px' }}>Close</button>
                    </div>
                </div>
            )}

            {loading ? <p>Loading data...</p> : (
                <div style={{ overflowX: 'auto', boxShadow: '0 0 10px rgba(0,0,0,0.1)', borderRadius: '8px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: language === 'he' ? 'right' : 'left', minWidth: '900px', backgroundColor: 'white' }}>
                        <thead>
                            <tr style={{ backgroundColor: 'var(--color-secondary)', color: 'var(--color-white)' }}>
                                <th style={{ padding: '15px' }}>{tAdmin.table.date}</th>
                                <th style={{ padding: '15px' }}>{tAdmin.table.client}</th>
                                <th style={{ padding: '15px' }}>{tAdmin.table.contact}</th>
                                <th style={{ padding: '15px' }}>{tAdmin.table.car}</th>
                                <th style={{ padding: '15px' }}>{tAdmin.table.expiry}</th>
                                <th style={{ padding: '15px' }}>{tAdmin.table.sms}</th>
                                <th style={{ padding: '15px' }}>{tAdmin.table.service}</th>
                                <th style={{ padding: '15px' }}>{tAdmin.table.status}</th>
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
                                        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                                            {(booking.licenseImage || booking.licenseImageUrl) && (
                                                <button
                                                    onClick={() => {
                                                        const img = booking.licenseImage || booking.licenseImageUrl;
                                                        const w = window.open("");
                                                        w.document.write(`<img src="${img}" style="max-width:100%"/>`);
                                                    }}
                                                    title="View License"
                                                    style={{
                                                        background: 'none',
                                                        border: 'none',
                                                        cursor: 'pointer',
                                                        padding: 0
                                                    }}
                                                >
                                                    {/* Thumbnail preview */}
                                                    <img
                                                        src={booking.licenseImage || booking.licenseImageUrl}
                                                        alt="License"
                                                        style={{ width: '40px', height: '30px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #ccc' }}
                                                    />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                    <td style={{ padding: '15px', color: '#d32f2f', fontWeight: 'bold' }}>
                                        {booking.licenseExpiry || booking.testDate || '-'}
                                    </td>
                                    <td style={{ padding: '15px' }}>
                                        {booking.reminderSent ? (
                                            <span style={{ color: 'green', fontWeight: 'bold' }}>✅ Sent</span>
                                        ) : (
                                            booking.reminderQueueDate ? (
                                                <span style={{ color: 'orange' }}>⏳ {booking.reminderQueueDate}</span>
                                            ) : '-'
                                        )}
                                    </td>
                                    <td style={{ padding: '15px' }}>{booking.service}<br />{booking.date} {booking.time}</td>
                                    <td style={{ padding: '15px' }}>
                                        <div style={{ display: 'flex', gap: '5px' }}>
                                            <select
                                                value={booking.status || 'חדש'}
                                                onChange={(e) => updateStatus(booking.id, e.target.value)}
                                                style={{
                                                    padding: '5px',
                                                    borderRadius: '4px',
                                                    border: '1px solid #ddd',
                                                    backgroundColor: getStatusColor(booking.status || 'חדש'),
                                                    color: 'white',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                <option value="חדש" style={{ color: 'black' }}>{tAdmin.status.new}</option>
                                                <option value="בטיפול" style={{ color: 'black' }}>{tAdmin.status.in_progress}</option>
                                                <option value="הושלם" style={{ color: 'black' }}>{tAdmin.status.completed}</option>
                                                <option value="בוטל" style={{ color: 'black' }}>{tAdmin.status.cancelled}</option>
                                            </select>

                                            <button
                                                onClick={() => {
                                                    const msg = prompt(`Send SMS to ${booking.name}:`, "שלום, הרכב שלך מוכן.");
                                                    if (msg) {
                                                        const to = booking.phone.replace(/\D/g, '').replace(/^0/, '972');
                                                        fetch('/.netlify/functions/send-sms', {
                                                            method: 'POST',
                                                            headers: { 'Content-Type': 'application/json' },
                                                            body: JSON.stringify({
                                                                to: to,
                                                                customMessage: msg
                                                            })
                                                        })
                                                            .then(res => res.json())
                                                            .then(data => {
                                                                if (data.success) alert("SMS Sent!");
                                                                else alert("Error sending SMS: " + (data.errors || data.error));
                                                            })
                                                            .catch(err => alert("Network Error: " + err.message));
                                                    }
                                                }}
                                                title="Send SMS"
                                                style={{
                                                    padding: '5px 10px',
                                                    borderRadius: '4px',
                                                    border: 'none',
                                                    backgroundColor: '#2196F3',
                                                    color: 'white',
                                                    cursor: 'pointer',
                                                    fontSize: '0.9rem'
                                                }}
                                            >
                                                ✉️
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )
            }
        </div >
    );
};

export default AdminDashboard;
