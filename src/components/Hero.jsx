import React from 'react';
import { Link } from 'react-router-dom';

const Hero = () => {
    return (
        <section style={{
            textAlign: 'center',
            padding: '4rem 2rem',
            backgroundColor: 'var(--color-secondary)',
            color: 'var(--color-white)',
            minHeight: '60vh',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            position: 'relative',
            overflow: 'hidden'
        }}>
            <h1 className="fade-in" style={{
                fontSize: '3.5rem',
                marginBottom: '1rem',
                color: 'var(--color-primary)',
                animationDelay: '0.1s'
            }}>
                שירותי רכב – עד הבית!
            </h1>
            <p className="fade-in" style={{
                fontSize: '1.5rem',
                maxWidth: '700px',
                margin: '0 auto 2rem',
                opacity: '0',
                animationFillMode: 'forwards',
                animationDelay: '0.4s'
            }}>
                חוסכים לך את כאב הראש ובזבוז הזמן. <br />
                אנחנו נאסוף את הרכב לטסט, טיפול או תיקון – ונחזיר אותו עד אליך.
            </p>

            <div className="fade-in" style={{
                display: 'flex',
                gap: '1rem',
                flexWrap: 'wrap',
                justifyContent: 'center',
                opacity: '0',
                animationFillMode: 'forwards',
                animationDelay: '0.7s'
            }}>
                <Link to="/booking" style={{
                    backgroundColor: 'var(--color-primary)',
                    color: 'var(--color-secondary)',
                    padding: '1rem 2.5rem',
                    borderRadius: '50px',
                    fontSize: '1.2rem',
                    fontWeight: 'bold',
                    transition: 'transform 0.2s',
                    display: 'inline-block',
                    textDecoration: 'none'
                }}>
                    הזמן שירות עכשיו
                </Link>
                <a href="tel:02-6404000" style={{
                    border: '2px solid var(--color-primary)',
                    color: 'var(--color-primary)',
                    padding: '1rem 2.5rem',
                    borderRadius: '50px',
                    fontSize: '1.2rem',
                    fontWeight: 'bold'
                }}>
                    02-6404000 📞
                </a>
            </div>
        </section>
    );
};

export default Hero;
