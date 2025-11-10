
import React, { useState, useEffect, useRef, useMemo } from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleGenAI, Type, Modality } from "@google/genai";
import html2canvas from 'html2canvas';


// Audio helper functions
function decode(base64) {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

async function decodeAudioData(
    data,
    ctx,
    sampleRate,
    numChannels
) {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

    for (let channel = 0; channel < numChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        for (let i = 0; i < frameCount; i++) {
            channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
        }
    }
    return buffer;
}


const Certificate = ({ name, topic, onDownload }) => {
    const [backgroundImage, setBackgroundImage] = useState('');
    const [isBgLoading, setIsBgLoading] = useState(true);

    useEffect(() => {
        const generateBgImage = async () => {
            setIsBgLoading(true);
            try {
                const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
                const response = await ai.models.generateImages({
                    model: 'imagen-4.0-generate-001',
                    prompt: 'An elegant, professional certificate background with subtle, abstract digital patterns, like a circuit board or network grid. Deep blue and cyan color palette, high resolution, formal, high-tech aesthetic.',
                    config: {
                      numberOfImages: 1,
                      outputMimeType: 'image/jpeg'
                    }
                });
                const base64ImageBytes = response.generatedImages[0].image.imageBytes;
                const imageUrl = `data:image/jpeg;base64,${base64ImageBytes}`;
                setBackgroundImage(imageUrl);
            } catch (error) {
                console.error("Certificate background generation failed:", error);
                // On error, we'll just fall back to the CSS background
            } finally {
                setIsBgLoading(false);
            }
        };

        generateBgImage();
    }, []);

    const date = useMemo(() => new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    }), []);
    
    const certificateId = useMemo(() => `CGAI-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`, []);

    return (
        <div className="certificate-v2-wrapper">
            <div id="certificate" className="certificate-v2">
                {isBgLoading && (
                    <div className="certificate-loader">
                        <div className="mini-spinner"></div>
                        <span>Generating unique background...</span>
                    </div>
                )}
                {backgroundImage && (
                    <img src={backgroundImage} alt="Certificate Background" className="certificate-bg-image" />
                )}

                <div className="certificate-v2-header cert-anim-1">
                    <h1 className="cert-title">Certificate of Achievement</h1>
                    <p className="cert-subtitle">This certificate is proudly presented to</p>
                </div>
                <div className="certificate-v2-body">
                    <h2 className="cert-recipient cert-anim-2">{name}</h2>
                    <p className="cert-desc cert-anim-3">for demonstrating exceptional understanding and commitment to</p>
                    <h3 className="cert-topic cert-anim-4">{topic}</h3>
                </div>
                <div className="certificate-v2-footer">
                    <div className="cert-details cert-anim-5">
                        <div className="cert-signature">
                            <span>Dr. Lexi Byte</span>
                            <hr />
                            <span>Head of Cybersecurity Education, CyberGuard AI</span>
                        </div>
                        <div className="cert-date">
                            <span>{date}</span>
                            <hr />
                            <span>Date of Achievement</span>
                        </div>
                    </div>
                     <div className="cert-seal-wrapper cert-anim-6">
                        <svg className="cert-seal" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
                            <defs>
                                <linearGradient id="sealGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" style={{stopColor: '#007BFF', stopOpacity: 1}} />
                                    <stop offset="100%" style={{stopColor: '#00BFFF', stopOpacity: 1}} />
                                </linearGradient>
                            </defs>
                            <path fill="url(#sealGradient)" d="M100,10 C149.7,10 190,50.3 190,100 C190,149.7 149.7,190 100,190 C50.3,190 10,149.7 10,100 C10,50.3 50.3,10 100,10 Z M129.5,52.8 C127.3,51.1 124.6,50 121.8,50 C116.8,50 112.8,53.2 111.4,57.8 L100,120 L88.6,57.8 C87.2,53.2 83.2,50 78.2,50 C75.4,50 72.7,51.1 70.5,52.8 L50,68.2 L50,131.8 L70.5,147.2 C72.7,148.9 75.4,150 78.2,150 C83.2,150 87.2,146.8 88.6,142.2 L100,80 L111.4,142.2 C112.8,146.8 116.8,150 121.8,150 C124.6,150 127.3,148.9 129.5,147.2 L150,131.8 L150,68.2 L129.5,52.8 Z" />
                             <text x="100" y="110" textAnchor="middle" fontSize="60" fill="white" fontWeight="bold">AI</text>
                        </svg>
                    </div>
                </div>
                 <div className="cert-id cert-anim-7">Certificate ID: {certificateId}</div>
            </div>
            <button onClick={onDownload} className="download-cert-btn">
                <span role="img" aria-label="download">📥</span> Download Certificate
            </button>
        </div>
    );
};
const MatchThePairsQuestion = ({ q, qIndex, userAnswer, onAnswerChange }) => {
    const [activePremise, setActivePremise] = useState(null);

    // Memoize shuffled options to prevent re-shuffling on every render
    const shuffledOptions = useMemo(() => [...q.options].sort(() => Math.random() - 0.5), [q.options]);

    const currentAnswers = userAnswer || {};
    const matchedOptions = Object.values(currentAnswers);

    const handlePremiseClick = (premise) => {
        if (currentAnswers[premise]) return; // Already matched, do nothing.
        setActivePremise(premise);
    };

    const handleOptionClick = (option) => {
        if (matchedOptions.includes(option)) return; // Already matched, do nothing.
        if (activePremise) {
            const newAnswers = { ...currentAnswers, [activePremise]: option };
            onAnswerChange(qIndex, newAnswers);
            setActivePremise(null);
        }
    };
    
    const pairColors = ['#0d3d56', '#592c2c', '#544d2e', '#2c5234', '#59324c', '#59442e', '#2e492c'];
    const premiseColorMap = Object.keys(currentAnswers).reduce((acc, premise, index) => {
        acc[premise] = pairColors[index % pairColors.length];
        return acc;
    }, {});
    const optionColorMap = Object.entries(currentAnswers).reduce((acc, [premise, option]) => {
        acc[option as string] = premiseColorMap[premise];
        return acc;
    }, {});

    return (
        <div className="match-pairs-container">
            <div className="match-column">
                {q.premises.map((premise, pIndex) => (
                    <button
                        type="button"
                        key={pIndex}
                        className={`match-item-btn ${activePremise === premise ? 'selected' : ''} ${currentAnswers[premise] ? 'matched' : ''}`}
                        onClick={() => handlePremiseClick(premise)}
                        disabled={!!currentAnswers[premise]}
                        style={{ backgroundColor: currentAnswers[premise] ? premiseColorMap[premise] : undefined }}
                    >
                        {premise}
                    </button>
                ))}
            </div>
            <div className="match-column">
                {shuffledOptions.map((option, oIndex) => (
                    <button
                        type="button"
                        key={oIndex}
                        className={`match-item-btn ${matchedOptions.includes(option) ? 'matched' : ''}`}
                        onClick={() => handleOptionClick(option)}
                        disabled={matchedOptions.includes(option)}
                        style={{ backgroundColor: matchedOptions.includes(option) ? optionColorMap[option] : undefined }}
                    >
                        {option}
                    </button>
                ))}
            </div>
        </div>
    );
};

const QuizSkeleton = () => (
    <div className="quiz-skeleton">
        <div className="skeleton-line title"></div>
        <div className="skeleton-line text"></div>
        <div className="skeleton-line text short"></div>
        <div className="skeleton-line subtitle"></div>
        <div className="skeleton-line text"></div>
        <div className="skeleton-line text"></div>
        <div className="skeleton-line text short"></div>
         <div className="skeleton-line subtitle"></div>
        <div className="skeleton-line text"></div>
        <div className="skeleton-line text"></div>
    </div>
);

const CreatorProfile = () => (
    <div className="creator-profile-card">
        <img src="https://i.ibb.co/6wmz62v/Sir-Iyke-Profile.png" alt="Nwaiwu Chibuzor .I., Ethical Hacker/SOC Analyst" className="profile-picture" />
        <div className="profile-info">
            <h3>Nwaiwu Chibuzor .I.</h3>
            <p>Ethical Hacker / SOC Analyst</p>
            <div className="profile-rating">
                <span>★★★★★</span> 5.0
            </div>
        </div>
    </div>
);

const Testimonials = () => (
    <div className="testimonials-container">
        <blockquote>
            <p>"CyberGuard AI is a game-changer for our security awareness training. The ability to generate realistic phishing scenarios and incident response drills is incredible. Our team's readiness has improved significantly."</p>
            <footer>- Jane Doe, CISO at TechCorp</footer>
        </blockquote>
        <blockquote>
            <p>"As a penetration tester, I use this platform to create CTF-style challenges. The 'Penetration Tester' persona generates creative and technically accurate problems. It's a fantastic tool for skill development."</p>
            <footer>- John Smith, Senior Security Consultant</footer>
        </blockquote>
        <blockquote>
            <p>"This app helped me pass my Security+ exam. The detailed explanations for complex topics like cryptography and network security were invaluable. It’s the best cybersecurity study partner you could ask for."</p>
            <footer>- Alex Johnson, Cybersecurity Student</footer>
        </blockquote>
    </div>
);

const ContactInfo = () => (
    <div className="contact-info-card">
        <h4>Contact Information</h4>
        <ul>
            <li><strong>Name:</strong> Nwaiwu Chibuzor .I.</li>
            <li><strong>Email:</strong> siriyke947@gmail.com</li>
            <li><strong>Tel:</strong> +2349039141836</li>
            <li><strong>Office:</strong> 113 Lagos Street, Umudiagu Mbeiri, Owerri, Imo State, Nigeria</li>
        </ul>
    </div>
);


const Chatbot = ({ isOpen, onClose, parseMarkdown }) => {
    const [messages, setMessages] = useState([
        { role: 'model', text: 'Hello! I am the CyberGuard AI Assistant. How can I help you with your cybersecurity training or our platform today?' }
    ]);
    const [userInput, setUserInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const chatHistoryRef = useRef(null);

    // Speech-to-Text state and refs
    const [isListening, setIsListening] = useState(false);
    const recognitionRef = useRef(null);
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const isSpeechSupported = !!SpeechRecognition;


    useEffect(() => {
        if (chatHistoryRef.current) {
            chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight;
        }
    }, [messages, isLoading]);

     // Setup Speech Recognition
    useEffect(() => {
        if (!isSpeechSupported) {
            console.warn("Speech recognition is not supported by this browser.");
            return;
        }
        
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.lang = 'en-US';
        recognition.interimResults = false;

        recognition.onresult = (event) => {
            const transcript = event.results[event.results.length - 1][0].transcript;
            setUserInput(transcript);
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            setIsListening(false);
        };
        
        recognition.onend = () => {
            setIsListening(false);
        };
        
        recognition.onstart = () => {
            setIsListening(true);
        };


        recognitionRef.current = recognition;
    }, [isSpeechSupported]);

    const handleToggleListening = () => {
        if (!recognitionRef.current) return;

        if (isListening) {
            recognitionRef.current.stop();
        } else {
            setUserInput('');
            try {
                recognitionRef.current.start();
            } catch(e) {
                console.error("Could not start speech recognition:", e);
                setIsListening(false);
            }
        }
    };


    const getSystemInstruction = () => {
        return `You are a helpful, friendly, and professional AI assistant for the "CyberGuard AI" application. Your name is CyBot.
        
        **Your Core Functions:**
        1.  Answer user questions about the features of the CyberGuard AI app.
        2.  Provide helpful tips on how to use the app effectively for cybersecurity education and training.
        3.  If the user asks for "contact", "email", "phone", or similar, respond conversationally that you are providing the contact information. For example: "Of course, here is the contact information for the development team." The app will display the actual information card.
        4.  If the user asks about the "creator", "developer", "who made this", or "Nwaiwu Chibuzor", respond conversationally. For example: "CyberGuard AI was created by Nwaiwu Chibuzor .I., a talented Ethical Hacker and SOC Analyst with a passion for using technology to advance cybersecurity education." The app will display his profile card.
        5.  If the user asks for "reviews", "testimonials", or "what do people say", respond positively. For example: "The platform has been praised by cybersecurity professionals and students for its impact on training and skill development! Here's what some of them are saying." The app will display the testimonials.
        6.  For any other questions, be helpful, concise, and maintain a professional and encouraging tone. Keep answers brief and to the point.
        `;
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!userInput.trim()) return;

        const newUserMessage = { role: 'user', text: userInput };
        let newMessages = [...messages, newUserMessage];
        
        // Check for keywords and add system messages to render special components
        if (userInput.match(/contact|email|phone/i)) {
            newMessages.push({ role: 'system', type: 'contact' });
        }
        if (userInput.match(/creator|developer|who made|nwaiwu chibuzor/i)) {
            newMessages.push({ role: 'system', type: 'creator' });
        }
        if (userInput.match(/review|testimonial|people say/i)) {
            newMessages.push({ role: 'system', type: 'testimonials' });
        }
        
        setMessages(newMessages);
        setUserInput('');
        setIsLoading(true);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const chat = ai.chats.create({
                model: 'gemini-2.5-pro',
                config: { systemInstruction: getSystemInstruction() },
                history: messages.filter(m => m.role !== 'system').map(m => ({
                    role: m.role,
                    parts: [{ text: m.text }]
                }))
            });

            const response = await chat.sendMessage({ message: userInput });
            
            setMessages(prev => [...prev, { role: 'model', text: response.text }]);

        } catch (err) {
            console.error(err);
            setMessages(prev => [...prev, { role: 'model', text: "I'm sorry, I encountered an error. Please try again." }]);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="chatbot-container animate-in">
            <div className="chatbot-header">
                <h3>CyberGuard AI Assistant</h3>
                <button onClick={onClose} className="close-btn">&times;</button>
            </div>
            <div className="chatbot-messages" ref={chatHistoryRef}>
                {messages.map((msg, index) => {
                    if (msg.role === 'system') {
                        if(msg.type === 'creator') return <CreatorProfile key={`sys-${index}`} />;
                        if(msg.type === 'testimonials') return <Testimonials key={`sys-${index}`} />;
                        if(msg.type === 'contact') return <ContactInfo key={`sys-${index}`} />;
                        return null;
                    }
                    return (
                        <div key={index} className={`message ${msg.role === 'user' ? 'message-user' : 'message-model'}`}>
                           {parseMarkdown(msg.text)}
                        </div>
                    );
                })}
                {isLoading && (
                    <div className="message message-model">
                        <div className="typing-indicator">
                            <span></span><span></span><span></span>
                        </div>
                    </div>
                )}
            </div>
            <form className="chatbot-input-form" onSubmit={handleSendMessage}>
                 {isSpeechSupported && (
                    <button
                        type="button"
                        onClick={handleToggleListening}
                        className={`mic-btn ${isListening ? 'listening' : ''}`}
                        aria-label={isListening ? 'Stop recording' : 'Use microphone'}
                        title={isListening ? 'Stop recording' : 'Use microphone'}
                    >
                        {isListening ? '...' : '🎤'}
                    </button>
                )}
                <input
                    type="text"
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    placeholder={isListening ? 'Listening...' : "Ask about a security concept..."}
                    aria-label="Chat input"
                    disabled={isListening}
                />
                <button type="submit" aria-label="Send message" disabled={isLoading || isListening}>➤</button>
            </form>
        </div>
    );
};

const Header = ({ view, setView, theme, setTheme, userName }) => {
    const getInitials = (name) => {
        if (!name) return '👤';
        const initials = name.trim().split(' ').map(n => n[0]).join('').toUpperCase();
        return initials.substring(0, 2);
    };

    return (
        <header className="eco-header animate-in">
            <div className="logo">
                <h1><span className="logo-icon">🛡️</span> CyberGuard AI</h1>
            </div>
            <nav className="site-nav">
                <button className={`nav-link ${view === 'generator' ? 'active' : ''}`} onClick={() => setView('generator')}>
                    Training Generator
                </button>
                <button className={`nav-link ${view === 'exam' ? 'active' : ''}`} onClick={() => setView('exam')}>
                    Certification Exam
                </button>
                <button className={`nav-link ${view === 'about' ? 'active' : ''}`} onClick={() => setView('about')}>
                    About & Contact
                </button>
            </nav>
            <div className="header-controls">
                <div className="theme-switch-wrapper">
                  <label className="theme-switch" htmlFor="checkbox">
                    <input type="checkbox" id="checkbox" onChange={() => setTheme(theme === 'light' ? 'dark' : 'light')} checked={theme === 'dark'} />
                    <div className="slider round"></div>
                  </label>
                </div>
                <div className="user-profile" title={userName || 'User'}>
                    {getInitials(userName)}
                </div>
            </div>
        </header>
    );
};


const Footer = ({ setView }) => {
    return (
        <footer className="site-footer">
            <div className="footer-content">
                <div className="footer-section about">
                    <h3 className="footer-logo">CyberGuard AI 🛡️</h3>
                    <p>Building the next generation of cyber defenders through intelligent, on-demand training and certification.</p>
                </div>
                <div className="footer-section links">
                    <h3>Quick Links</h3>
                    <ul>
                        <li><a href="#" onClick={(e) => { e.preventDefault(); setView('generator'); }}>Training Generator</a></li>
                        <li><a href="#" onClick={(e) => { e.preventDefault(); setView('exam'); }}>Certification Exam</a></li>
                        <li><a href="#" onClick={(e) => { e.preventDefault(); setView('about'); }}>About & Contact</a></li>
                    </ul>
                </div>
                <div className="footer-section social">
                    <h3>Join the Conversation</h3>
                    <div className="social-icons">
                        {/* Replace # with actual links */}
                        <a href="#" aria-label="Facebook"><i className="fab fa-facebook-f"></i></a>
                        <a href="#" aria-label="Twitter"><i className="fab fa-twitter"></i></a>
                        <a href="#" aria-label="LinkedIn"><i className="fab fa-linkedin-in"></i></a>
                        <a href="#" aria-label="GitHub"><i className="fab fa-github"></i></a>
                    </div>
                </div>
            </div>
            <div className="footer-bottom">
                &copy; {new Date().getFullYear()} CyberGuard AI | Created by Nwaiwu Chibuzor .I.
            </div>
        </footer>
    );
};

const AboutContactPage = () => {
    const [formStatus, setFormStatus] = useState('');

    const handleContactSubmit = (e) => {
        e.preventDefault();
        setFormStatus('sending');
        // Simulate API call
        setTimeout(() => {
            setFormStatus('sent');
            e.target.reset();
        }, 1500);
    };

    return (
        <div className="page-container about-contact-page animate-in">
            <section className="about-section content-card">
                <h2>About CyberGuard AI</h2>
                <p className="mission-statement">
                   Our mission is to democratize cybersecurity education. CyberGuard AI provides individuals, academic institutions, and organizations with a powerful tool to instantly create bespoke training materials and assessments. We believe that continuous, adaptive learning is the key to building a resilient digital future.
                </p>
                <div className="founder-profile">
                    <h3>Meet the Creator</h3>
                    <CreatorProfile />
                </div>
                 <div className="testimonials-section">
                    <h3>What Our Users Say</h3>
                    <Testimonials />
                </div>
            </section>
            
            <section className="contact-section content-card">
                <h2>Get In Touch</h2>
                <div className="contact-layout">
                    <div className="contact-form-container">
                        <p>Have a question, suggestion, or partnership inquiry? We'd love to hear from you. Fill out the form below, and our team will get back to you as soon as possible.</p>
                        <form className="contact-form" onSubmit={handleContactSubmit}>
                            <div className="form-group">
                                <label htmlFor="contact-name">Full Name</label>
                                <input type="text" id="contact-name" name="name" required />
                            </div>
                            <div className="form-group">
                                <label htmlFor="contact-email">Email Address</label>
                                <input type="email" id="contact-email" name="email" required />
                            </div>
                            <div className="form-group">
                                <label htmlFor="contact-message">Message</label>
                                <textarea id="contact-message" name="message" rows="5" required></textarea>
                            </div>
                            <button type="submit" disabled={formStatus === 'sending'}>
                                {formStatus === 'sending' ? 'Sending...' : 'Send Message'}
                            </button>
                            {formStatus === 'sent' && <p className="form-success-msg">Thank you! Your message has been sent.</p>}
                        </form>
                    </div>
                    <div className="contact-info-container">
                        <ContactInfo />
                    </div>
                </div>
            </section>
        </div>
    );
};

const GeneratorView = ({
    handleGenerateQuiz, isLoading, quizGenerationError,
    level, setLevel, difficulty, setDifficulty, topic, setTopic, aiPersona, setAiPersona,
    questionTypes, setQuestionTypes, advancedFeatures, setAdvancedFeatures, optionalInstructions, setOptionalInstructions,
    handleCheckboxChange
}) => {
    const ALL_QUESTION_TYPES = ['Multiple Choice', 'Match the Following', 'Fill in the Blanks', 'True or False'];
    const ALL_ADVANCED_FEATURES = ['Hints', 'Smart Feedback', 'Challenge Quest', 'Fun Theme', 'Positive Feedback', 'Image Prompts', 'TPR Activity', 'Follow-up Activity'];
    const ALL_AI_PERSONAS = ['The SOC Analyst', 'The Penetration Tester', 'The Threat Intelligence Expert', 'The CISO', 'The Incident Responder'];
    const ALL_LEVELS = ['All', 'SOC Analysis', 'SIEM Security Analyst', 'All in Cybersecurity', 'All Logs', 'SOAR', 'Red and Blue Teams', 'Master\'s', 'PHD'];

    return (
        <div className="page-container generator-view">
            <div className="form-container content-card animate-in">
                <h2>Create a Training Module</h2>
                <form onSubmit={handleGenerateQuiz}>
                    <div className="form-group">
                        <label htmlFor="level">Educational Level</label>
                        <select id="level" value={level} onChange={e => setLevel(e.target.value)}>
                            {ALL_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label htmlFor="difficulty">Difficulty Level</label>
                        <select id="difficulty" value={difficulty} onChange={e => setDifficulty(e.target.value)}>
                            <option>Easy</option>
                            <option>Medium</option>
                            <option>Hard</option>
                            <option>Expert</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label htmlFor="topic">Training Topic</label>
                        <input id="topic" type="text" value={topic} onChange={e => setTopic(e.target.value)} required />
                    </div>
                    <div className="form-group">
                        <label htmlFor="ai-persona">AI Persona</label>
                        <select id="ai-persona" value={aiPersona} onChange={e => setAiPersona(e.target.value)}>
                            {ALL_AI_PERSONAS.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Question Types</label>
                        <div className="checkbox-group-header">
                           <button type="button" className="select-all-btn" onClick={() => setQuestionTypes(ALL_QUESTION_TYPES)}>Select All</button>
                           <button type="button" className="select-all-btn" onClick={() => setQuestionTypes([])}>Deselect All</button>
                        </div>
                        <div className="checkbox-group">
                            {ALL_QUESTION_TYPES.map(type => (
                                <label key={type}>
                                    <input
                                        type="checkbox"
                                        value={type}
                                        checked={questionTypes.includes(type)}
                                        onChange={e => handleCheckboxChange(e, setQuestionTypes, questionTypes)}
                                    /> 
                                    <span className="checkmark"></span>
                                    {type}
                                </label>
                            ))}
                        </div>
                    </div>
                    <div className="form-group">
                        <label>Advanced Features</label>
                         <div className="checkbox-group-header">
                           <button type="button" className="select-all-btn" onClick={() => setAdvancedFeatures(ALL_ADVANCED_FEATURES)}>Select All</button>
                           <button type="button" className="select-all-btn" onClick={() => setAdvancedFeatures([])}>Deselect All</button>
                        </div>
                        <div className="checkbox-group">
                            {ALL_ADVANCED_FEATURES.map(feature => (
                                <label key={feature}>
                                    <input
                                        type="checkbox"
                                        value={feature}
                                        checked={advancedFeatures.includes(feature)}
                                        onChange={e => handleCheckboxChange(e, setAdvancedFeatures, advancedFeatures)}
                                    />
                                    <span className="checkmark"></span>
                                    {feature}
                                </label>
                            ))}
                        </div>
                    </div>
                    <div className="form-group">
                        <label htmlFor="instructions">Optional Instructions (e.g., scenario)</label>
                        <textarea id="instructions" value={optionalInstructions} onChange={e => setOptionalInstructions(e.target.value)} placeholder="e.g., Frame this as an incident response scenario for a financial institution." />
                    </div>
                    <button type="submit" disabled={isLoading}>
                        {isLoading ? 'Generating...' : '🛡️ Generate Training'}
                    </button>
                    {quizGenerationError && <div className="error-message" style={{marginTop: '1rem'}}>{quizGenerationError}</div>}
                </form>
            </div>
             <div className="quiz-container-placeholder content-card animate-in">
                <h2>Generated Lesson Plan Preview</h2>
                {isLoading && <QuizSkeleton />}
                {!isLoading && <p className="placeholder-text">Your professionally formatted, AI-generated lesson plan will be created after you click "Generate Training".</p>}
            </div>
        </div>
    );
};

const GeneratedQuizView = ({ quizData, onBack }) => {
    const [showAnswers, setShowAnswers] = useState(false);
    
    const handlePrint = () => {
        window.print();
    };

    if (!quizData) return null;

    const { title, targetLevel, learningObjective, quiz, advancedFeaturesContent } = quizData;

    return (
        <div className="page-container generated-quiz-view animate-in">
            <div className="quiz-actions-header no-print">
                <button className="back-btn" onClick={onBack}>&larr; Back to Generator</button>
                <div className="actions-right">
                    <label className="toggle-answers">
                        <input type="checkbox" checked={showAnswers} onChange={() => setShowAnswers(!showAnswers)} />
                        <span className="slider"></span>
                        Show Answers
                    </label>
                    <button className="print-btn" onClick={handlePrint}>🖨️ Print Lesson</button>
                </div>
            </div>
            <div id="printable-quiz" className="quiz-paper">
                <div className="quiz-paper-header">
                    <h1>{title || 'Generated Quiz'}</h1>
                    <div className="quiz-meta">
                        <span><strong>Level:</strong> {targetLevel || 'N/A'}</span>
                        <span><strong>Topic:</strong> {quizData.topic || 'N/A'}</span>
                    </div>
                </div>

                <div className="quiz-paper-section">
                    <h3>Learning Objective</h3>
                    <p>{learningObjective || 'No objective provided.'}</p>
                </div>
                
                <div className="quiz-paper-section">
                    <h3>Quiz Questions</h3>
                    {quiz?.map((q, index) => (
                        <div className="quiz-question-card" key={index}>
                            <p><strong>{q.questionNumber || index + 1}. {q.questionText}</strong></p>
                            {q.questionType === 'Multiple Choice' && q.options && (
                                <ul className="mc-options">
                                    {q.options.map((opt, i) => <li key={i}>{opt}</li>)}
                                </ul>
                            )}
                             {q.questionType === 'Fill in the Blanks' && (
                                <div className="fill-blank-space"></div>
                            )}
                             {q.questionType === 'Match the Following' && (
                                <div className="match-display">
                                    <div className="match-column-display">
                                        <strong>Premises</strong>
                                        <ul>{q.premises?.map((p, i) => <li key={`p-${i}`}>{p}</li>)}</ul>
                                    </div>
                                     <div className="match-column-display">
                                        <strong>Options</strong>
                                        <ul>{q.options?.map((o, i) => <li key={`o-${i}`}>{o}</li>)}</ul>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {advancedFeaturesContent && Object.values(advancedFeaturesContent).some(v => v) && (
                     <div className="quiz-paper-section">
                        <h3>Follow-up & Activities</h3>
                        {Object.entries(advancedFeaturesContent).map(([key, value]) => {
                            if (!value) return null;
                            const title = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                            return (
                                <div key={key}>
                                    <h4>{title}</h4>
                                    <p>{value}</p>
                                </div>
                            );
                        })}
                    </div>
                )}
                
                <div className={`answer-key-section ${showAnswers ? 'visible' : ''}`}>
                    <h3>Answer Key</h3>
                    {quiz?.map((q, index) => (
                        <div className="answer-card" key={`ans-${index}`}>
                             <p><strong>{q.questionNumber || index + 1}. Correct Answer:</strong> {q.answer}</p>
                             <p><strong>Explanation:</strong> {q.explanation || 'No explanation provided.'}</p>
                             {q.imagePrompt && <p className="image-prompt-note"><em>[Image Suggestion: {q.imagePrompt}]</em></p>}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const ExamView = ({
    topic, parseMarkdown,
    userName, setUserName, isGeneratingExam, examError, examQuestions, userAnswers, isExamSubmitted,
    examScore, studyGuide, isGeneratingStudyGuide, explanationStates, hintStates, audioStates,
    isRetryMode, questionsToRetryIndices,
    handleGenerateStudyGuide, handleStartExam, handleSubmitExam, handleAnswerChange,
    handleDownloadCertificate, isAnswerCorrect, handleRetryIncorrect, setExamQuestions, setIsExamSubmitted,
    handleGetHint, handleGetExplanation, handlePlayAudio
}) => {
    const ExamProgress = () => {
        const currentQuestions = isRetryMode ? examQuestions.filter((_, i) => questionsToRetryIndices.includes(i)) : examQuestions;
        const currentAnsweredCount = Object.keys(userAnswers).filter(key => {
            const qIndex = parseInt(key, 10);
            return isRetryMode ? questionsToRetryIndices.includes(qIndex) : true;
        }).length;
        
        const totalQuestions = isRetryMode ? questionsToRetryIndices.length : examQuestions.length;
        const progressPercentage = totalQuestions > 0 ? (currentAnsweredCount / totalQuestions) * 100 : 0;
    
        if (examQuestions.length === 0) return null;

        return (
            <div className="exam-progress-container">
                <div className="progress-bar">
                    <div className="progress-bar-fill" style={{ width: `${progressPercentage}%` }}></div>
                </div>
                <span className="progress-text">{currentAnsweredCount} / {totalQuestions} Answered</span>
            </div>
        );
    };

    return (
        <div className="page-container exam-view">
            <div className="exam-main-container content-card animate-in">
                 <h2>Certification Exam</h2>
                 {!examQuestions.length && !isExamSubmitted ? (
                    <div className="exam-intro">
                        <p>Ready to validate your skills? This exam is based on the last topic you generated: <strong>{topic}</strong>.</p>
                        <p>Enter your full name as you'd like it to appear on your certificate.</p>
                        <div className="study-guide-section">
                            <button onClick={handleGenerateStudyGuide} disabled={isGeneratingStudyGuide}>
                                {isGeneratingStudyGuide ? 'Building Guide...' : '📚 Generate AI Study Guide'}
                            </button>
                            {isGeneratingStudyGuide && <div className="loading-spinner small"></div>}
                            {studyGuide && <div className="study-guide-content fade-in">{parseMarkdown(studyGuide)}</div>}
                        </div>
                        <form onSubmit={handleStartExam} className="start-exam-form">
                            <div className="form-group">
                                <label htmlFor="userName">Full Name for Certificate</label>
                                <input id="userName" type="text" value={userName} onChange={e => setUserName(e.target.value)} required />
                            </div>
                            <button type="submit" disabled={isGeneratingExam || !userName}>
                                {isGeneratingExam ? 'Generating Exam...' : '🚀 Start Certification Exam'}
                            </button>
                            {isGeneratingExam && <div className="loading-spinner"></div>}
                            {examError && <div className="error-message" style={{marginTop: '1rem'}}>{examError}</div>}
                        </form>
                    </div>
                 ) : !isExamSubmitted ? (
                    <form onSubmit={handleSubmitExam} className="fade-in">
                        <h3>{isRetryMode ? `Retrying ${questionsToRetryIndices.length} Incorrect Questions` : `Exam on: ${topic}`}</h3>
                        <ExamProgress />
                        {examQuestions.map((q, qIndex) => {
                            if (isRetryMode && !questionsToRetryIndices.includes(qIndex)) {
                                return (
                                    <div key={qIndex} className="exam-question answered-correctly">
                                        <p>✓ {qIndex + 1}. {q.prompt || q.question}</p>
                                    </div>
                                );
                            }
                            return (
                            <div key={qIndex} className="exam-question">
                                <p>{qIndex + 1}. {q.type === 'fill-in-the-blank' ? q.question.replace('____', '______') : (q.prompt || q.question)}</p>
                                {q.type === 'multiple-choice' && (
                                    <div className="exam-options">
                                        {q.options.map((option, oIndex) => {
                                            const audioKey = `${qIndex}-${oIndex}`;
                                            const audioStatus = audioStates[audioKey];
                                            return (
                                                <label key={oIndex} className="option-label">
                                                    <input type="radio" name={`question-${qIndex}`} value={option} onChange={(e) => handleAnswerChange(qIndex, e.target.value)} required />
                                                    <span>{option}</span>
                                                    <button 
                                                        type="button" 
                                                        className="audio-btn" 
                                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handlePlayAudio(option, audioKey); }}
                                                        disabled={audioStatus === 'loading'}
                                                        aria-label={`Play audio for ${option}`}
                                                    >
                                                        {audioStatus === 'loading' ? <div className="mini-spinner"></div> : '🔊'}
                                                    </button>
                                                </label>
                                            )
                                        })}
                                    </div>
                                )}
                                {q.type === 'fill-in-the-blank' && (
                                    <input type="text" className="fill-blank-input" onChange={(e) => handleAnswerChange(qIndex, e.target.value)} required />
                                )}
                                {q.type === 'match-the-following' && (
                                    <div className="match-question">
                                        <div className="match-premises">
                                            {q.premises.map((premise, pIndex) => <div key={pIndex} className="match-item">{premise}</div>)}
                                        </div>
                                        <div className="match-options">
                                            {q.premises.map((premise, pIndex) => (
                                                <select key={pIndex} defaultValue="" onChange={(e) => handleAnswerChange(qIndex, {...(userAnswers[qIndex] || {}), [premise]: e.target.value})} required>
                                                    <option value="" disabled>Select a match...</option>
                                                    {q.options.map((option, oIndex) => <option key={oIndex} value={option}>{option}</option>)}
                                                </select>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {q.type === 'match-the-pairs' && (
                                    <MatchThePairsQuestion 
                                        q={q} 
                                        qIndex={qIndex} 
                                        userAnswer={userAnswers[qIndex]}
                                        onAnswerChange={handleAnswerChange}
                                    />
                                )}
                            </div>
                            )
                        })}
                        <button type="submit">Submit Exam</button>
                    </form>
                 ) : (
                    <div className="exam-results">
                        <h2>Exam Results</h2>
                        <p>Congratulations on completing the exam, {userName}!</p>
                        <p className={`score ${examScore >= 80 ? 'pass' : 'fail'}`}>Your Score: {examScore.toFixed(0)}%</p>
                        {examScore >= 80 ? (
                            <>
                                <p>You have passed! Your dedication to mastering cybersecurity concepts is commendable.</p>
                                <Certificate name={userName} topic={topic} onDownload={handleDownloadCertificate} />
                            </>
                        ) : (
                            <>
                                <p>A score of 80% is required to pass. Review your answers below, get explanations from the AI Professor, and try again!</p>
                                <div className="results-actions">
                                    <button onClick={() => { setExamQuestions([]); setIsExamSubmitted(false); }} className="try-again-btn">
                                        <span role="img" aria-label="retry">🔄</span> Try Again (New Exam)
                                    </button>
                                    <button onClick={handleRetryIncorrect} className="retry-incorrect-btn">
                                        <span role="img" aria-label="pencil">✏️</span> Retry Incorrect Questions
                                    </button>
                                </div>
                            </>
                        )}
                        <div className="exam-review">
                            <h3>Review Your Answers</h3>
                            {examQuestions.map((q, qIndex) => {
                                const isCorrect = isAnswerCorrect(q, qIndex);
                                const userAudioKey = `review-${qIndex}-user`;
                                const correctAudioKey = `review-${qIndex}-correct`;
                                const questionAudioKey = `review-${qIndex}-question`;

                                let userDisplayAnswer, userAudioAnswer, correctDisplayAnswer, correctAudioAnswer;

                                if (q.type === 'match-the-following' || q.type === 'match-the-pairs') {
                                    userDisplayAnswer = q.premises.map(p => `"${p}" -> "${userAnswers[qIndex]?.[p] || ' '}"`).join(', ');
                                    userAudioAnswer = q.premises.map(p => `${p} matches ${userAnswers[qIndex]?.[p] || 'unanswered'}`).join('. ');
                                    correctDisplayAnswer = Object.entries(q.answers).map(([p,o]) => `"${p}" -> "${o}"`).join(', ');
                                    correctAudioAnswer = Object.entries(q.answers).map(([p,o]) => `${p} matches ${o}`).join('. ');
                                } else {
                                    userDisplayAnswer = `"${userAnswers[qIndex] || ''}"`;
                                    userAudioAnswer = userAnswers[qIndex] || '';
                                    correctDisplayAnswer = `"${q.answer}"`;
                                    correctAudioAnswer = q.answer || '';
                                }
                                
                                return (
                                <div key={qIndex} className={`exam-question-review ${isCorrect ? 'correct' : 'incorrect'}`}>
                                    <div className="question-header">
                                        <strong>Question {qIndex + 1}: {q.prompt || q.question}</strong>
                                        <button
                                            type="button"
                                            className="audio-btn"
                                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); handlePlayAudio(q.prompt || q.question, questionAudioKey); }}
                                            disabled={audioStates[questionAudioKey] === 'loading'}
                                            aria-label={`Play audio for question ${qIndex + 1}`}
                                        >
                                            {audioStates[questionAudioKey] === 'loading' ? <div className="mini-spinner"></div> : '🔊'}
                                        </button>
                                    </div>
                                    
                                    {!isCorrect && (
                                        <div className="answer-line">
                                            <strong>Your Answer:</strong>
                                            <span>{userDisplayAnswer}</span>
                                             <button 
                                                type="button" 
                                                className="audio-btn" 
                                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handlePlayAudio(userAudioAnswer, userAudioKey); }}
                                                disabled={audioStates[userAudioKey] === 'loading'}
                                                aria-label={`Play audio for your answer`}
                                            >
                                                {audioStates[userAudioKey] === 'loading' ? <div className="mini-spinner"></div> : '🔊'}
                                            </button>
                                        </div>
                                    )}
                                    
                                    <div className="answer-line">
                                        <strong>Correct Answer:</strong>
                                        <span>{correctDisplayAnswer}</span>
                                        <button 
                                            type="button" 
                                            className="audio-btn" 
                                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); handlePlayAudio(correctAudioAnswer, correctAudioKey); }}
                                            disabled={audioStates[correctAudioKey] === 'loading'}
                                            aria-label={`Play audio for the correct answer`}
                                        >
                                            {audioStates[correctAudioKey] === 'loading' ? <div className="mini-spinner"></div> : '🔊'}
                                        </button>
                                    </div>

                                    {!isCorrect && (
                                        <div className="ai-professor">
                                            {!hintStates[qIndex]?.text && (
                                                <button onClick={() => handleGetHint(qIndex)} disabled={hintStates[qIndex]?.status === 'loading'}>
                                                    {hintStates[qIndex]?.status === 'loading' ? <div className="mini-spinner"></div> : '💡 Get a Hint'}
                                                </button>
                                            )}
                                            {hintStates[qIndex]?.status === 'success' && <div className="hint-content fade-in">{parseMarkdown(hintStates[qIndex].text)}</div>}
                                            {hintStates[qIndex]?.status === 'error' && <div className="error-message small">{hintStates[qIndex].text}</div>}

                                            {hintStates[qIndex]?.text && (
                                                <button onClick={() => handleGetExplanation(qIndex)} disabled={explanationStates[qIndex]?.status === 'loading'}>
                                                    {explanationStates[qIndex]?.status === 'loading' ? <div className="mini-spinner"></div> : '🤔 Show Full Explanation'}
                                                </button>
                                            )}
                                            {explanationStates[qIndex]?.status === 'success' && <div className="explanation-content fade-in">{parseMarkdown(explanationStates[qIndex].text)}</div>}
                                            {explanationStates[qIndex]?.status === 'error' && <div className="error-message small">{explanationStates[qIndex].text}</div>}
                                        </div>
                                    )}
                                </div>
                                );
                            })}
                        </div>
                    </div>
                 )}
            </div>
        </div>
    );
}

const App = () => {
    // General App State
    const [view, setView] = useState('generator'); // 'generator', 'exam', 'about', 'generated-quiz'
    const [theme, setTheme] = useState('dark');
    const [isChatOpen, setIsChatOpen] = useState(false);


    // Quiz Generator State
    const [level, setLevel] = useState('All');
    const [difficulty, setDifficulty] = useState('Medium');
    const [topic, setTopic] = useState('Phishing Attack Vectors');
    const [aiPersona, setAiPersona] = useState('The SOC Analyst');
    const [questionTypes, setQuestionTypes] = useState(['Multiple Choice', 'True or False']);
    const [advancedFeatures, setAdvancedFeatures] = useState([]);
    const [optionalInstructions, setOptionalInstructions] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [quizGenerationError, setQuizGenerationError] = useState(null);
    const [generatedQuizData, setGeneratedQuizData] = useState(null);

    // Final Exam State
    const [userName, setUserName] = useState('');
    const [isGeneratingExam, setIsGeneratingExam] = useState(false);
    const [examError, setExamError] = useState(null);
    const [examQuestions, setExamQuestions] = useState([]);
    const [userAnswers, setUserAnswers] = useState({});
    const [isExamSubmitted, setIsExamSubmitted] = useState(false);
    const [examScore, setExamScore] = useState(0);
    const [studyGuide, setStudyGuide] = useState('');
    const [isGeneratingStudyGuide, setIsGeneratingStudyGuide] = useState(false);
    const [explanationStates, setExplanationStates] = useState({});
    const [hintStates, setHintStates] = useState({});
    const [audioStates, setAudioStates] = useState({});
    const outputAudioContextRef = useRef(null);
    const [isRetryMode, setIsRetryMode] = useState(false);
    const [questionsToRetryIndices, setQuestionsToRetryIndices] = useState([]);


    useEffect(() => {
        document.body.className = theme;
    }, [theme]);

    const handleCheckboxChange = (e, setState, state) => {
        const { value, checked } = e.target;
        if (checked) {
            setState([...state, value]);
        } else {
            setState(state.filter(item => item !== value));
        }
    };
    
    const getPersonaInstructions = (persona) => {
        switch (persona) {
            case 'The SOC Analyst':
                return "Adopt the persona of a seasoned Security Operations Center (SOC) Analyst. Your tone should be vigilant, precise, and practical. Frame questions around log analysis, alert triage, and identifying indicators of compromise (IOCs). Emphasize the importance of quick, accurate detection.";
            case 'The Penetration Tester':
                return "Adopt the persona of an ethical hacker/penetration tester. Your tone should be offensive-minded, creative, and technical. Questions should focus on identifying vulnerabilities, exploitation techniques, and post-exploitation maneuvers. Think like an attacker to test the user's defensive knowledge.";
            case 'The Threat Intelligence Expert':
                return "Adopt the persona of a Cyber Threat Intelligence (CTI) expert. Your tone should be strategic, analytical, and forward-looking. Frame questions around threat actor TTPs (Tactics, Techniques, and Procedures), attribution, and the intelligence lifecycle. Focus on understanding the 'who, what, and why' behind attacks.";
            case 'The CISO':
                return "Adopt the persona of a Chief Information Security Officer (CISO). Your tone should be authoritative, risk-oriented, and business-aligned. Questions should cover topics like governance, risk management, compliance (GRC), security metrics, and communicating security posture to executive leadership.";
            case 'The Incident Responder':
                return "Adopt the persona of a digital forensics and incident response (DFIR) specialist. Your tone should be methodical, calm under pressure, and detail-oriented. Frame questions around the incident response lifecycle (PICERL), forensic data acquisition, and containment/eradication strategies.";
            default:
                return "Adopt a standard, neutral, and clear educational tone focused on cybersecurity principles.";
        }
    };


    const buildPrompt = () => {
        // Build a summary of advanced features for the prompt
        const featureDescriptions = {
            'Challenge Quest': 'Include one optional "Bonus" or "Challenge" question.',
            'TPR Activity': 'Include one engaging Total Physical Response (TPR) activity.',
            'Fun Theme': 'Embed the quiz within a fun, engaging theme.',
            'Positive Feedback': 'Provide specific, positive feedback messages for correct answers in the explanation.',
            'Follow-up Activity': 'Suggest one simple, creative follow-up activity.',
            'Hints': 'Provide a subtle "Hint" for 1-2 challenging questions.',
            'Smart Feedback': 'Include a "Smart Feedback" section analyzing potential common mistakes.',
            'Image Prompts': 'For each question, if relevant, include an image prompt for a visual cue, such as a snippet of code, a log entry, or a network diagram. Format it as [Image: a clear, technical description of the image].'
        };

        const requestedFeatures = advancedFeatures.map(f => featureDescriptions[f]).filter(Boolean);

        let prompt = `
You are CyberGuard AI, a specialist in pedagogical design for advanced cybersecurity training. Your task is to generate a comprehensive training module lesson plan.

**Persona & Tone:** ${getPersonaInstructions(aiPersona)}

**Training Specification:**
- **Topic:** ${topic}
- **Educational Level:** ${level}
- **Difficulty:** ${difficulty}
- **Question Types:** ${questionTypes.join(', ')}
- **Advanced Features:** ${requestedFeatures.length > 0 ? requestedFeatures.join('; ') : 'None'}
- **Additional Instructions:** ${optionalInstructions || 'None'}

Your output MUST be a single, valid JSON object. Do not include markdown formatting like \`\`\`json.
The JSON object must adhere to the provided schema. For "Match the Following", the answer should be a single string like: "Premise 1 -> Option B, Premise 2 -> Option A...".
GENERATE THE TRAINING MODULE NOW.
`;
        return prompt;
    };

    const handleGenerateQuiz = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setQuizGenerationError(null);
        setGeneratedQuizData(null);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = buildPrompt();
            
            const quizSchema = {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING },
                    targetLevel: { type: Type.STRING },
                    topic: { type: Type.STRING },
                    learningObjective: { type: Type.STRING },
                    quiz: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                questionNumber: { type: Type.NUMBER },
                                questionText: { type: Type.STRING },
                                questionType: { type: Type.STRING },
                                options: { type: Type.ARRAY, items: { type: Type.STRING } },
                                premises: { type: Type.ARRAY, items: { type: Type.STRING } },
                                answer: { type: Type.STRING },
                                explanation: { type: Type.STRING },
                                imagePrompt: { type: Type.STRING },
                            }
                        }
                    },
                    advancedFeaturesContent: {
                        type: Type.OBJECT,
                        properties: {
                            followUpActivity: { type: Type.STRING },
                            smartFeedback: { type: Type.STRING },
                            challengeQuestion: { type: Type.STRING },
                            tprActivity: { type: Type.STRING },
                        }
                    }
                },
                 required: ["title", "targetLevel", "learningObjective", "quiz"]
            };

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-pro',
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: quizSchema,
                }
            });

            const quizData = JSON.parse(response.text);
            setGeneratedQuizData(quizData);
            setView('generated-quiz');

        } catch (err) {
            console.error(err);
            setQuizGenerationError('Failed to generate the training module. The AI could not produce a valid structure for your request. Please try simplifying your request or try again.');
        } finally {
            setIsLoading(false);
        }
    };
    
    const parseMarkdown = (text) => {
        if (!text) return null;
        const parseInline = (line, baseKey) => {
            const regex = /(?<bold_delim>\*\*|__)(?<boldText>.*?)\k<bold_delim>|(?<italic_delim>\*|_)(?<italicText>.*?)\k<italic_delim>/g;
            const elements = [];
            let lastIndex = 0;
            let matchIndex = 0;

            for (const match of line.matchAll(regex)) {
                if (match.index > lastIndex) {
                    elements.push(<span key={`${baseKey}-text-${matchIndex++}`}>{line.substring(lastIndex, match.index)}</span>);
                }

                const { boldText, italicText } = match.groups;
                
                if (boldText !== undefined) {
                    elements.push(<strong key={`${baseKey}-strong-${matchIndex}`}>{boldText}</strong>);
                } else if (italicText !== undefined) {
                    elements.push(<em key={`${baseKey}-em-${matchIndex}`}>{italicText}</em>);
                }
                lastIndex = match.index + match[0].length;
                matchIndex++;
            }

            if (lastIndex < line.length) {
                elements.push(<span key={`${baseKey}-text-${matchIndex}`}>{line.substring(lastIndex)}</span>);
            }
            return elements;
        };

        const lines = text.split('\n');
        const blocks = [];
        lines.forEach((line) => {
            if (line.startsWith('### ')) blocks.push({ type: 'h3', content: line.substring(4) });
            else if (line.startsWith('## ')) blocks.push({ type: 'h2', content: line.substring(3) });
            else if (line.startsWith('**') && line.endsWith('**')) blocks.push({ type: 'h4', content: line.substring(2, line.length - 2) });
            else if (line.match(/^\d+\.\s/)) blocks.push({ type: 'ol', content: line.replace(/^\d+\.\s/, '') });
            else if (line.startsWith('* ')) blocks.push({ type: 'ul', content: line.substring(2) });
            else if (line.trim()) blocks.push({ type: 'p', content: line });
            else blocks.push({ type: 'br' });
        });

        const renderedElements = [];
        let listItems = [];
        let listType = null;

        const flushList = () => {
            if (listItems.length > 0) {
                const key = `${listType}-${renderedElements.length}`;
                renderedElements.push(
                    listType === 'ol' ? <ol key={key}>{listItems}</ol> : <ul key={key}>{listItems}</ul>
                );
                listItems = [];
                listType = null;
            }
        };

        blocks.forEach((block, index) => {
            const key = `block-${index}`;
            if (block.type === 'ul' || block.type === 'ol') {
                if (listType !== block.type) flushList();
                listType = block.type;
                listItems.push(<li key={`${key}-li`}>{parseInline(block.content, key)}</li>);
            } else {
                flushList();
                if (block.type === 'h2') renderedElements.push(<h2 key={key}>{parseInline(block.content, key)}</h2>);
                else if (block.type === 'h3') renderedElements.push(<h3 key={key}>{parseInline(block.content, key)}</h3>);
                else if (block.type === 'h4') renderedElements.push(<h4 key={key}>{parseInline(block.content, key)}</h4>);
                else if (block.type === 'p') renderedElements.push(<p key={key}>{parseInline(block.content, key)}</p>);
            }
        });
        flushList();
        return renderedElements;
    };
    
    // Exam Logic
    const handlePlayAudio = async (text, key) => {
        if (!text) return;
        setAudioStates(prev => ({ ...prev, [key]: 'loading' }));
        try {
            if (!outputAudioContextRef.current) {
                outputAudioContextRef.current = new(window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            }
            const outputAudioContext = outputAudioContextRef.current;

            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash-preview-tts",
                contents: [{ parts: [{ text: text }] }],
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: {
                        voiceConfig: {
                            prebuiltVoiceConfig: { voiceName: 'Kore' }
                        }
                    }
                }
            });
            const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
                const audioBuffer = await decodeAudioData(
                    decode(base64Audio),
                    outputAudioContext,
                    24000,
                    1
                );
                const source = outputAudioContext.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(outputAudioContext.destination);
                source.start();
            }
            setAudioStates(prev => ({ ...prev, [key]: 'idle' }));
        } catch (err) {
            console.error("Audio generation failed:", err);
            setAudioStates(prev => ({ ...prev, [key]: 'error' }));
        }
    };


    const handleGenerateStudyGuide = async () => {
        setIsGeneratingStudyGuide(true);
        setStudyGuide('');
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-pro',
                contents: `Generate a concise, well-structured study guide for the cybersecurity topic of '${topic}'. Cover the key concepts, important definitions, and provide 2-3 illustrative examples (e.g., code snippets, log examples). The target audience is a cybersecurity professional preparing for a certification exam on this topic. Use markdown for formatting.`,
            });
            setStudyGuide(response.text);
        } catch (err) {
            setStudyGuide("Sorry, I couldn't generate a study guide at this time. Please try again.");
        } finally {
            setIsGeneratingStudyGuide(false);
        }
    }

    const handleStartExam = async (e) => {
        e.preventDefault();
        setIsGeneratingExam(true);
        setExamError(null);
        setExamQuestions([]);
        setUserAnswers({});
        setIsExamSubmitted(false);
        setExamScore(0);
        setStudyGuide('');
        setExplanationStates({});
        setHintStates({});
        setIsRetryMode(false);
        setQuestionsToRetryIndices([]);
        
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-pro',
                contents: `Create a difficult, 10-question certification exam on the advanced cybersecurity topic of "${topic}". The exam must include a mix of question types: 'multiple-choice', 'fill-in-the-blank', 'match-the-following', and 'match-the-pairs'. For 'match-the-pairs', provide a set of premises and a corresponding set of options to be paired. Output MUST be a valid JSON object.`,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            questions: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        type: { type: Type.STRING },
                                        question: { type: Type.STRING },
                                        prompt: { type: Type.STRING }, // For matching
                                        options: { type: Type.ARRAY, items: { type: Type.STRING } },
                                        answer: { type: Type.STRING }, // For MC and Fill-in-blank
                                        premises: { type: Type.ARRAY, items: { type: Type.STRING } }, // For matching
                                        answers: { type: Type.OBJECT } // For matching
                                    }
                                }
                            }
                        },
                        required: ["questions"]
                    }
                }
            });

            const examData = JSON.parse(response.text);
            setExamQuestions(examData.questions || []);

        } catch (err) {
            console.error(err);
            setExamError('Failed to generate the exam. The topic might be too complex or there was a network issue. Please try again.');
        } finally {
            setIsGeneratingExam(false);
        }
    };
    
    const handleAnswerChange = (questionIndex, value) => {
        setUserAnswers(prev => ({ ...prev, [questionIndex]: value }));
    };

    const handleSubmitExam = (e) => {
        e.preventDefault();
        let correctAnswers = 0;
        examQuestions.forEach((q, index) => {
            const userAnswer = userAnswers[index];
            if (q.type === 'multiple-choice' || q.type === 'fill-in-the-blank') {
                if (typeof userAnswer === 'string' && userAnswer.trim().toLowerCase() === q.answer.trim().toLowerCase()) {
                    correctAnswers++;
                }
            } else if (q.type === 'match-the-following' || q.type === 'match-the-pairs') {
                let allMatched = true;
                if(typeof userAnswer === 'object' && userAnswer !== null && Object.keys(userAnswer).length === q.premises.length) {
                    for(const premise of q.premises) {
                        if (userAnswer[premise] !== q.answers[premise]) {
                            allMatched = false;
                            break;
                        }
                    }
                } else {
                    allMatched = false;
                }
                if (allMatched) {
                    correctAnswers++;
                }
            }
        });
        setExamScore((correctAnswers / examQuestions.length) * 100);
        setIsExamSubmitted(true);
        setIsRetryMode(false);
    };

    const handleGetHint = async (questionIndex) => {
        setHintStates(prev => ({ ...prev, [questionIndex]: { status: 'loading', text: '' } }));
        const question = examQuestions[questionIndex];
        const userAnswer = userAnswers[questionIndex];

        let prompt;
        if (question.type === 'multiple-choice' || question.type === 'fill-in-the-blank') {
            prompt = `You are an AI Professor. A cybersecurity student incorrectly answered a question about "${topic}".
Question: "${question.question}"
Correct Answer: "${question.answer}"
Student's Incorrect Answer: "${userAnswer}"
Provide a single, Socratic-style hint to guide the student toward the correct answer without giving it away. The hint should be a question or a short statement that makes them reconsider their choice.`;
        } else {
            prompt = `You are an AI Professor. A cybersecurity student incorrectly answered a matching question about "${topic}".
Question: "${question.prompt}"
Provide a single, Socratic-style hint to guide the student toward the correct matches without giving away the full answer. Focus on one of the incorrect pairings and ask a guiding question about it.`;
        }

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
            setHintStates(prev => ({ ...prev, [questionIndex]: { status: 'success', text: response.text } }));
        } catch (err) {
            setHintStates(prev => ({ ...prev, [questionIndex]: { status: 'error', text: 'Could not fetch hint.' } }));
        }
    };
    
    const handleGetExplanation = async (questionIndex) => {
        setExplanationStates(prev => ({ ...prev, [questionIndex]: { status: 'loading', text: '' } }));
        const question = examQuestions[questionIndex];
        const userAnswer = userAnswers[questionIndex];
        
        let prompt;
        if (question.type === 'multiple-choice' || question.type === 'fill-in-the-blank') {
            prompt = `You are an AI Professor, an expert in cybersecurity pedagogy. A student incorrectly answered the following question about "${topic}":
Question: "${question.question}"
The correct answer is: "${question.answer}"
The student's incorrect answer was: "${userAnswer}"
Please provide a detailed, clear, and encouraging explanation of why the correct answer is right and address the potential misconception that might have led them to choose their incorrect answer. Explain it like you're talking to a cybersecurity professional. Use markdown for formatting.`;
        } else if (question.type === 'match-the-following' || question.type === 'match-the-pairs') {
            const correctPairs = Object.entries(question.answers).map(([p, o]) => `- ${p} -> ${o}`).join('\n');
            const userPairs = question.premises.map(p => `- ${p} -> ${userAnswer?.[p] || '[Not answered]'}`).join('\n');
            prompt = `You are an AI Professor, an expert in cybersecurity pedagogy. A student incorrectly answered a matching question about "${topic}":
Question: "${question.prompt}"
The correct matches are:
${correctPairs}
The student's incorrect matches were:
${userPairs}
Please provide a detailed, clear, and encouraging explanation for the correct matches, and address any likely misconceptions. Explain it like you're talking to a cybersecurity professional. Use markdown for formatting.`;
        }
        
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({ model: 'gemini-2.5-pro', contents: prompt });
            setExplanationStates(prev => ({ ...prev, [questionIndex]: { status: 'success', text: response.text } }));
        } catch (err) {
            setExplanationStates(prev => ({ ...prev, [questionIndex]: { status: 'error', text: 'Could not fetch explanation.' } }));
        }
    };


    const handleDownloadCertificate = () => {
        const certificateElement = document.getElementById('certificate');
        if (certificateElement) {
            html2canvas(certificateElement, { 
                scale: 3,
                useCORS: true,
                backgroundColor: null,
                allowTaint: true,
             }).then(canvas => {
                const link = document.createElement('a');
                link.download = `Certificate-${userName.replace(/\s/g, '_')}-${topic}.png`;
                link.href = canvas.toDataURL('image/png');
                link.click();
            });
        }
    };

    const isAnswerCorrect = (q, index) => {
        if (!isExamSubmitted) return false;
        const userAnswer = userAnswers[index];
        if (q.type === 'multiple-choice' || q.type === 'fill-in-the-blank') {
            return typeof userAnswer === 'string' && userAnswer.trim().toLowerCase() === q.answer.trim().toLowerCase();
        } else if (q.type === 'match-the-following' || q.type === 'match-the-pairs') {
             if(typeof userAnswer !== 'object' || userAnswer === null || Object.keys(userAnswer).length !== q.premises.length) return false;
             return q.premises.every(p => userAnswer[p] === q.answers[p]);
        }
        return false;
    }

    const handleRetryIncorrect = () => {
        const incorrectIndices = examQuestions
            .map((_q, index) => index)
            .filter(index => !isAnswerCorrect(examQuestions[index], index));

        const newAnswers = { ...userAnswers };
        incorrectIndices.forEach(index => {
            delete newAnswers[index];
        });
        
        setUserAnswers(newAnswers);
        setQuestionsToRetryIndices(incorrectIndices);
        setIsRetryMode(true);
        setIsExamSubmitted(false);
        setExplanationStates({});
        setHintStates({});
    };

    const generatorProps = {
        handleGenerateQuiz, isLoading, quizGenerationError,
        level, setLevel, difficulty, setDifficulty, topic, setTopic, aiPersona, setAiPersona,
        questionTypes, setQuestionTypes, advancedFeatures, setAdvancedFeatures, optionalInstructions, setOptionalInstructions,
        handleCheckboxChange
    };

    const examProps = {
        topic, parseMarkdown,
        userName, setUserName, isGeneratingExam, examError, examQuestions, userAnswers, isExamSubmitted,
        examScore, studyGuide, isGeneratingStudyGuide, explanationStates, hintStates, audioStates,
        isRetryMode, questionsToRetryIndices,
        handleGenerateStudyGuide, handleStartExam, handleSubmitExam, handleAnswerChange,
        handleDownloadCertificate, isAnswerCorrect, handleRetryIncorrect, setExamQuestions, setIsExamSubmitted,
        handleGetHint, handleGetExplanation, handlePlayAudio
    };

    return (
        <>
            <Header view={view} setView={setView} theme={theme} setTheme={setTheme} userName={userName} />
            <main>
                {view === 'generator' && <GeneratorView {...generatorProps} />}
                {view === 'generated-quiz' && <GeneratedQuizView quizData={generatedQuizData} onBack={() => setView('generator')} />}
                {view === 'exam' && <ExamView {...examProps} />}
                {view === 'about' && <AboutContactPage />}
            </main>
            <Footer setView={setView} />
            <div className={`modal-overlay ${isChatOpen ? 'active' : ''}`}></div>
            <button className="chatbot-fab" onClick={() => setIsChatOpen(true)} aria-label="Open AI Assistant">
                <span role="img" aria-label="chatbot">🤖</span>
            </button>
            <Chatbot isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} parseMarkdown={parseMarkdown} />
        </>
    );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);