
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


const Certificate = ({ name, topic, onDownload, handleApiError }) => {
    const [backgroundImage, setBackgroundImage] = useState('');
    const [isBgLoading, setIsBgLoading] = useState(true);
    const [enhancedTopic, setEnhancedTopic] = useState('');
    const [isTopicLoading, setIsTopicLoading] = useState(true);

    useEffect(() => {
        const generateBgImage = async () => {
            setIsBgLoading(true);
            try {
                const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
                const response = await ai.models.generateImages({
                    model: 'imagen-4.0-generate-001',
                    prompt: 'An elegant, professional certificate background with subtle, abstract patterns inspired by digital networks and glowing green circuits. A sophisticated green and dark gray color palette, high resolution, formal, academic aesthetic.',
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
                handleApiError(error);
                // On error, we'll just fall back to the CSS background
            } finally {
                setIsBgLoading(false);
            }
        };

        generateBgImage();
    }, []);

    useEffect(() => {
        const generateEnhancedTopic = async () => {
            setIsTopicLoading(true);
            try {
                const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
                const prompt = `Given the quiz topic "${topic}", generate a more formal and impressive-sounding subject matter for a "Certificate of Achievement". The output should be a short, professional phrase. For example, if the topic is "Penetration Testing", a good output might be "Advanced Penetration Testing Methodologies". If the topic is "SQL Injection", a good output could be "Mastery of SQL Injection and Defensive Programming". Output only the phrase, with no extra text or quotes.`;
                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: prompt,
                });
                setEnhancedTopic(response.text.trim());
            } catch (error) {
                console.error("Certificate topic generation failed:", error);
                handleApiError(error);
                setEnhancedTopic(topic); // Fallback to original topic on error
            } finally {
                setIsTopicLoading(false);
            }
        };
        
        generateEnhancedTopic();
    }, [topic]);

    const date = useMemo(() => new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    }), []);
    
    const certificateId = useMemo(() => `NLAI-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`, []);

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
                    <p className="cert-desc cert-anim-3">for demonstrating exceptional understanding and mastery in</p>
                    <h3 className="cert-topic cert-anim-4">
                        {isTopicLoading ? (
                            <span className="topic-loader">Enhancing topic...</span>
                        ) : (
                            enhancedTopic
                        )}
                    </h3>
                </div>
                <div className="certificate-v2-footer">
                    <div className="cert-details cert-anim-5">
                        <div className="cert-signature">
                            <span>Dr. Evelyn Reed</span>
                            <hr />
                            <span>Lead Cyber Strategist, NexusLearn AI</span>
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
                                    <stop offset="0%" style={{stopColor: '#2E7D32', stopOpacity: 1}} />
                                    <stop offset="100%" style={{stopColor: '#66BB6A', stopOpacity: 1}} />
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

const OrderingQuestion = ({ q, qIndex, userAnswer, onAnswerChange }) => {
    // Memoize shuffled items to prevent re-shuffling if user hasn't answered yet.
    const initialItems = useMemo(() => {
        if (userAnswer && userAnswer.length > 0) {
            return userAnswer;
        }
        // Create a new array to avoid mutating the original question object
        return [...q.items].sort(() => Math.random() - 0.5);
    }, []); // Only run once when the component mounts

    const [items, setItems] = useState(initialItems);
    const dragItem = useRef(null);
    const dragOverItem = useRef(null);
    const [dragging, setDragging] = useState(false);

    useEffect(() => {
        // When the initial items are set (or reset), notify the parent
        // This ensures an initial (shuffled) answer is logged
        if (!userAnswer || userAnswer.length === 0) {
            onAnswerChange(qIndex, items);
        }
    }, [items, qIndex, onAnswerChange, userAnswer]);

    const handleDragStart = (e, index) => {
        dragItem.current = index;
        setDragging(true);
        // Better for browser compatibility
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', e.target.parentNode);
    };

    const handleDragEnter = (e, index) => {
        dragOverItem.current = index;
    };

    const handleDragEnd = () => {
        const _items = [...items];
        const draggedItemContent = _items.splice(dragItem.current, 1)[0];
        _items.splice(dragOverItem.current, 0, draggedItemContent);
        dragItem.current = null;
        dragOverItem.current = null;
        setItems(_items);
        onAnswerChange(qIndex, _items);
        setDragging(false);
    };

    return (
        <div className="ordering-question-container">
            <p><em>Drag and drop the items to place them in the correct order.</em></p>
            {items.map((item, index) => (
                <div
                    key={index}
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragEnter={(e) => handleDragEnter(e, index)}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => e.preventDefault()}
                    className={`ordering-item ${dragging && dragItem.current === index ? 'dragging' : ''}`}
                    aria-label={`Draggable item ${item}, currently at position ${index + 1}`}
                >
                    <i className="fas fa-grip-vertical drag-handle" aria-hidden="true"></i>
                    <span>{item}</span>
                </div>
            ))}
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

const CreatorProfile = () => {
    const [profilePicture, setProfilePicture] = useState("https://i.ibb.co/6wmz62v/Sir-Iyke-Profile.png");
    const fileInputRef = useRef(null);

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setProfilePicture(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    return (
        <div className="creator-profile-card">
            <div className="profile-picture-container" onClick={handleUploadClick} title="Click to upload a new picture">
                <img src={profilePicture} alt="Nwaiwu Chibuzor .I., Full-Stack Developer & AI Enthusiast" className="profile-picture" />
                <div className="upload-overlay">
                    <i className="fas fa-camera"></i>
                </div>
            </div>
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageChange}
                accept="image/*"
                style={{ display: 'none' }}
            />
            <div className="profile-info">
                <h3>Nwaiwu Chibuzor .I.</h3>
                <p>Full-Stack Developer & AI Architect</p>
                <div className="profile-rating">
                    <span>★★★★★</span> 5.0
                </div>
            </div>
        </div>
    );
};

const Testimonials = () => (
    <div className="testimonials-container">
        <blockquote>
            <p>"NexusLearn AI is a game-changer for our SOC team's continuous training. The ability to generate hyper-specific quizzes on new threat vectors or SIEM queries has drastically improved our readiness."</p>
            <footer>- Jane Doe, Senior Security Analyst</footer>
        </blockquote>
        <blockquote>
            <p>"As a penetration tester, I use this tool to create challenging scenarios for my team. The AI-generated 'Challenge Quests' are surprisingly clever and push us to think outside the box. Indispensable tool."</p>
            <footer>- John Smith, Lead Pentester</footer>
        </blockquote>
        <blockquote>
            <p>"We've integrated NexusLearn AI into our university's cybersecurity curriculum. It allows us to create dynamic, relevant coursework that keeps pace with the rapidly evolving tech landscape. Student engagement is at an all-time high."</p>
            <footer>- Dr. Alisha Khan, Professor of Computer Science</footer>
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


const Chatbot = ({ isOpen, onClose, parseMarkdown, handleApiError }) => {
    const [messages, setMessages] = useState([
        { role: 'model', text: 'Hello! I am the NexusLearn AI Assistant. How can I help you with your cybersecurity studies or our platform today?' }
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
        return `You are a helpful, friendly, and professional AI assistant for the "NexusLearn AI" application, a platform for advanced cybersecurity education. Your name is Oracle.
        
        **Your Core Functions:**
        1.  Answer user questions about the features of the NexusLearn AI app.
        2.  Provide helpful tips on how to use the app effectively for cybersecurity training and education.
        3.  If the user asks for "contact", "email", "phone", or similar, respond conversationally that you are providing the contact information. For example: "Of course, here is the contact information for the development team." Then, provide this exact JSON object and nothing else: {"component": "ContactInfo"}.
        4.  Provide concise, accurate definitions and explanations of cybersecurity concepts.
        
        **Tone & Persona:**
        *   You are an expert, but you are also encouraging and supportive.
        *   Keep your answers relatively brief and to the point. Use formatting like lists or bold text to improve readability.
        *   Never break character. Do not mention that you are an AI model.
        
        **Boundaries:**
        *   Do not answer questions that are unrelated to cybersecurity, technology, education, or the NexusLearn AI platform itself.
        *   Do not provide any real-time threat data, vulnerability reports, or perform any actions that could be construed as actual security operations. You are an educational tool, not a security tool.
        *   If a question is outside your scope, politely decline, e.g., "My expertise is focused on cybersecurity education. I can't help with that topic, but I'd be happy to answer any questions you have about threat analysis or our platform's features."
        `;
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!userInput.trim() || isLoading) return;

        const newMessages = [...messages, { role: 'user', text: userInput }];
        setMessages(newMessages);
        setUserInput('');
        setIsLoading(true);

        const chatHistory = newMessages.slice(0, -1).map(msg => ({
            role: msg.role,
            parts: [{ text: msg.text }]
        }));

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const chat = ai.chats.create({
                model: 'gemini-2.5-flash',
                config: { systemInstruction: getSystemInstruction() },
                history: chatHistory
            });
            
            const response = await chat.sendMessage({ message: userInput });
            
            let modelResponse = response.text;
            let component = null;

            try {
                const parsed = JSON.parse(modelResponse);
                if (parsed.component === 'ContactInfo') {
                    component = <ContactInfo />;
                    modelResponse = "Certainly, here is the contact information for the creator.";
                }
            } catch (err) {
                // Not a JSON component, treat as plain text.
            }

            setMessages(prev => [...prev, { role: 'model', text: modelResponse, component }]);
        } catch (error) {
            console.error("Chatbot API error:", error);
            handleApiError(error);
            setMessages(prev => [...prev, { role: 'model', text: "Sorry, I encountered an error. Please try again." }]);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="chatbot-container animate-in">
            <div className="chatbot-header">
                <h3>NexusLearn AI Assistant</h3>
                <button onClick={onClose} className="close-btn">&times;</button>
            </div>
            <div className="chatbot-history" ref={chatHistoryRef}>
                {messages.map((msg, index) => (
                    <div key={index} className={`chat-message ${msg.role}`}>
                        <div className="message-bubble">
                            <div dangerouslySetInnerHTML={{ __html: parseMarkdown(msg.text) }}></div>
                            {msg.component}
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="chat-message model">
                         <div className="message-bubble">
                            <div className="typing-indicator">
                                <span></span><span></span><span></span>
                            </div>
                         </div>
                    </div>
                )}
            </div>
            <form onSubmit={handleSendMessage} className="chatbot-input-form">
                <input
                    type="text"
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    placeholder="Ask about cybersecurity..."
                    disabled={isLoading || isListening}
                />
                {isSpeechSupported && (
                    <button type="button" onClick={handleToggleListening} className={`mic-btn ${isListening ? 'listening' : ''}`} disabled={isLoading}>
                         <i className={`fas fa-microphone`}></i>
                    </button>
                )}
                <button type="submit" disabled={isLoading || !userInput.trim()}>
                    {isLoading ? <div className="mini-spinner"></div> : <i className="fas fa-paper-plane"></i>}
                </button>
            </form>
        </div>
    );
};

const RotatingLogo = ({ containerClass = '' }) => (
    <div className={`rotating-logo-container ${containerClass}`}>
        <svg className="rotating-logo-svg" viewBox="0 0 100 100">
            <defs>
                <path id="circlePath" d="M 50, 50 m -42, 0 a 42,42 0 1,1 84,0 a 42,42 0 1,1 -84,0" />
            </defs>
            <text className="logo-text-path">
                <textPath href="#circlePath">
                    NEXUSLEARN AI • NEXUSLEARN AI •
                </textPath>
            </text>
        </svg>
        <span className="logo-icon-center">🧠</span>
    </div>
);


const Header = ({ onNavClick, activePage, userName }) => {
    const [theme, setTheme] = useState('dark');
    
    const userInitials = useMemo(() => {
        if (!userName) return '👤';
        const parts = userName.split(' ');
        if (parts.length > 1) {
            return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
        }
        return userName.substring(0, 2).toUpperCase();
    }, [userName]);

    useEffect(() => {
        document.body.className = theme;
    }, [theme]);

    const handleThemeChange = (e) => {
        setTheme(e.target.checked ? 'light' : 'dark');
    };

    return (
        <header className="eco-header no-print">
            <div className="logo">
                <a href="#" onClick={(e) => { e.preventDefault(); onNavClick('generator'); }} aria-label="NexusLearn AI Home">
                   <RotatingLogo />
                </a>
            </div>

            <nav className="site-nav">
                <button className={`nav-link ${activePage === 'generator' ? 'active' : ''}`} onClick={() => onNavClick('generator')}>Generator</button>
                <button className={`nav-link ${activePage === 'about' ? 'active' : ''}`} onClick={() => onNavClick('about')}>About & Contact</button>
            </nav>
            <div className="header-controls">
                <div className="user-profile" title={userName || 'User'}>
                    {userInitials}
                </div>
                 <div className="theme-switch-wrapper">
                    <label className="theme-switch" htmlFor="theme-checkbox">
                        <input type="checkbox" id="theme-checkbox" onChange={handleThemeChange} checked={theme === 'light'}/>
                        <div className="slider round"></div>
                    </label>
                </div>
            </div>
        </header>
    );
};

const QuizGenerator = ({ onQuizGenerated, isGenerating, handleApiError }) => {
    const [topic, setTopic] = useState("Penetration Testing Methodologies");
    const [numQuestions, setNumQuestions] = useState(5);
    const [difficulty, setDifficulty] = useState("Intermediate");
    const [questionTypes, setQuestionTypes] = useState({
        "Multiple-Choice": true,
        "Fill-in-the-Blank": true,
        "Match the Pairs": true,
        "Scenario-Based": true,
        "True/False": true,
        "Ordering": true
    });
    const [error, setError] = useState('');

    const handleGenerateClick = async () => {
        const selectedTypes = Object.keys(questionTypes).filter(type => questionTypes[type]);
        if (!topic.trim()) {
            setError("Please enter a topic.");
            return;
        }
        if (selectedTypes.length === 0) {
            setError("Please select at least one question type.");
            return;
        }
        setError('');
        
        const prompt = `
        You are an expert cybersecurity curriculum developer. Generate a comprehensive and challenging quiz based on the following specifications.
        
        **Topic:** ${topic}
        **Difficulty:** ${difficulty}
        **Number of Questions:** ${numQuestions}
        **Question Types to Include:** ${selectedTypes.join(', ')}

        **Instructions:**
        1.  **Multiple-Choice:** Provide 4 options. The correct answer must be clearly indicated.
        2.  **Fill-in-the-Blank:** Use "[BLANK]" to indicate where the user should fill in their answer. Provide the correct answer.
        3.  **Match the Pairs:** Provide a list of premises and a corresponding list of options to be matched. Ensure a clear key-value pairing for the correct answers.
        4.  **Scenario-Based:** Present a realistic cybersecurity scenario and ask a multiple-choice question about it. This tests practical application of knowledge.
        5.  **True/False:** Present a statement that is either true or false. The answer must be the string "True" or "False".
        6.  **Ordering:** Provide a list of items that need to be put in a specific order (e.g., chronological, procedural). Provide the list of items to be ordered in the 'items' field, and the correctly ordered list as the 'answer'.

        **Output Format:**
        Return the output as a single, valid JSON object. Do not include any text or markdown formatting before or after the JSON object. The JSON should have a single key, "questions", which is an array of question objects. Each question object must have:
        -   \`type\`: (string) "Multiple-Choice", "Fill-in-the-Blank", "Match the Pairs", "Scenario-Based", "True/False", or "Ordering".
        -   \`question\`: (string) The question text.
        -   \`options\`: (array of strings) Required for "Multiple-Choice" and "Scenario-Based".
        -   \`answer\`: (string, object, or array) The correct answer. For "Match the Pairs", an object mapping premises to options. For "Ordering", an array of strings in the correct order.
        -   \`premises\`: (array of strings) Required for "Match the Pairs".
        -   \`items\`: (array of strings) Required for "Ordering".
        `;

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: prompt,
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
                                        options: { type: Type.ARRAY, items: { type: Type.STRING }, nullable: true },
                                        items: { type: Type.ARRAY, items: { type: Type.STRING }, nullable: true },
                                        answer: {
                                            oneOf: [
                                                { type: Type.STRING },
                                                {
                                                    type: Type.OBJECT,
                                                    properties: {},
                                                    additionalProperties: { type: Type.STRING }
                                                },
                                                { type: Type.ARRAY, items: { type: Type.STRING } }
                                            ]
                                        },
                                        premises: { type: Type.ARRAY, items: { type: Type.STRING }, nullable: true }
                                    },
                                    required: ['type', 'question', 'answer']
                                }
                            }
                        },
                        required: ['questions']
                    }
                }
            });

            let jsonStr = response.text.trim();
            const generatedQuiz = JSON.parse(jsonStr);
            
            onQuizGenerated({
                topic,
                difficulty,
                questions: generatedQuiz.questions
            });

        } catch (error) {
            console.error("API Error:", error);
            handleApiError(error);
        }
    };
    
    const handleSelectAll = (e) => {
        e.preventDefault();
        const allSelected = Object.values(questionTypes).every(v => v);
        const newTypes = {};
        for (const key in questionTypes) {
            newTypes[key] = !allSelected;
        }
        setQuestionTypes(newTypes);
    };

    const handleCheckboxChange = (type) => {
        setQuestionTypes(prev => ({ ...prev, [type]: !prev[type] }));
    };

    return (
        <div className="form-container">
            <div className="content-card animate-in">
                <h2>Create Your Cybersecurity Quiz</h2>
                <div className="form-group">
                    <label htmlFor="topic">Topic</label>
                    <input type="text" id="topic" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g., OWASP Top 10, Network Forensics" />
                </div>
                <div className="form-group">
                    <label htmlFor="numQuestions">Number of Questions</label>
                    <select id="numQuestions" value={numQuestions} onChange={(e) => setNumQuestions(parseInt(e.target.value, 10))}>
                        <option value="5">5</option>
                        <option value="10">10</option>
                        <option value="15">15</option>
                        <option value="20">20</option>
                    </select>
                </div>
                <div className="form-group">
                    <label htmlFor="difficulty">Difficulty</label>
                    <select id="difficulty" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
                        <option>Beginner</option>
                        <option>Intermediate</option>
                        <option>Advanced</option>
                        <option>Expert</option>
                    </select>
                </div>
                <div className="form-group">
                    <div className="checkbox-group-header">
                        <label>Question Types</label>
                        <button onClick={handleSelectAll} className="select-all-btn">
                            {Object.values(questionTypes).every(v => v) ? 'Deselect All' : 'Select All'}
                        </button>
                    </div>
                    <div className="checkbox-group">
                        {Object.keys(questionTypes).map(type => (
                            <label key={type}>
                                <input type="checkbox" checked={questionTypes[type]} onChange={() => handleCheckboxChange(type)} />
                                <span className="checkmark"></span>
                                <span>{type}</span>
                            </label>
                        ))}
                    </div>
                </div>
                {error && <p className="error-message">{error}</p>}
                <button onClick={handleGenerateClick} disabled={isGenerating}>
                    {isGenerating ? <><div className="mini-spinner"></div> Generating...</> : "Generate Quiz"}
                </button>
            </div>
        </div>
    );
};

const QuizPlaceholder = () => (
    <div className="quiz-container-placeholder">
        <div className="content-card" style={{ textAlign: 'center' }}>
            <h2>Welcome to NexusLearn AI</h2>
            <p>Your personalized cybersecurity learning platform.</p>
            <p>Use the panel on the left to generate a quiz on any cybersecurity topic you can imagine. The AI will craft a unique set of questions to test your knowledge.</p>
            <span style={{ fontSize: '3rem', marginTop: '1rem', display: 'inline-block' }}>🧠</span>
        </div>
    </div>
);

const ExamView = ({ quiz, onBack, onFinish, userName, audioStates, handlePlayAudio, handleApiError, parseMarkdown }) => {
    const [userAnswers, setUserAnswers] = useState({});
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [isFinished, setIsFinished] = useState(false);
    const [results, setResults] = useState(null);
    const [view, setView] = useState('intro'); // intro, exam, results, review
    const [name, setName] = useState(userName || '');
    const [explanations, setExplanations] = useState({});
    const [isExplaining, setIsExplaining] = useState({});
    const [studyGuideData, setStudyGuideData] = useState(null);
    const [isGeneratingGuide, setIsGeneratingGuide] = useState(false);


    const handleAnswerChange = (qIndex, answer) => {
        setUserAnswers(prev => ({ ...prev, [qIndex]: answer }));
    };

    const handleNextQuestion = () => {
        if (currentQuestionIndex < quiz.questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
        } else {
            handleSubmit();
        }
    };
    
     const generateStudyGuideAndMappings = async () => {
        setIsGeneratingGuide(true);
        const prompt = `
        You are a cybersecurity master instructor. Based on the following quiz on the topic of "${quiz.topic}", generate a concise study guide and map each question to a key concept from the guide.

        Quiz Questions (JSON format):
        ${JSON.stringify(quiz.questions.map(q => ({question: q.question, type: q.type})))}

        Instructions:
        1.  Identify the core cybersecurity concepts tested in the questions.
        2.  For each concept, write a clear and helpful explanation.
        3.  Map each original question index to one of the concepts you've identified.

        Output a single, valid JSON object with two top-level keys: "guide" and "mappings".
        -   "guide": An array of objects. Each object must have:
            -   "concept": (string) The name of the cybersecurity concept (e.g., "SQL Injection", "Phishing", "Cross-Site Scripting").
            -   "explanation": (string) A detailed explanation of the concept in markdown format.
        -   "mappings": An object where keys are the question indices as strings (e.g., "0", "1", "2") and values are the corresponding "concept" string from the "guide" array.
        `;
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            guide: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        concept: { type: Type.STRING },
                                        explanation: { type: Type.STRING }
                                    },
                                    required: ['concept', 'explanation']
                                }
                            },
                            mappings: {
                                type: Type.OBJECT,
                                properties: {},
                                additionalProperties: { type: Type.STRING }
                            }
                        },
                        required: ['guide', 'mappings']
                    }
                }
            });
            const parsedResponse = JSON.parse(response.text.trim());
            setStudyGuideData(parsedResponse);
        } catch (error) {
            console.error("Study guide generation failed:", error);
            handleApiError(error);
        } finally {
            setIsGeneratingGuide(false);
        }
    };


    const handleSubmit = () => {
        let score = 0;
        const detailedResults = quiz.questions.map((q, index) => {
            const userAnswer = userAnswers[index];
            let isCorrect = false;

            if (typeof userAnswer === 'undefined' || userAnswer === null) {
                isCorrect = false;
            } else if (q.type === 'Match the Pairs' || q.type === 'Ordering') {
                isCorrect = JSON.stringify(userAnswer) === JSON.stringify(q.answer);
            } else {
                isCorrect = userAnswer.toString().toLowerCase() === q.answer.toString().toLowerCase();
            }

            if (isCorrect) score++;
            return { question: q, userAnswer, isCorrect };
        });

        const percentage = (score / quiz.questions.length) * 100;
        setResults({ score, total: quiz.questions.length, percentage, detailedResults });
        setIsFinished(true);
        setView('results');
        generateStudyGuideAndMappings();
    };
    
    const handleRetryIncorrect = () => {
        const incorrectQuestions = results.detailedResults
            .filter(r => !r.isCorrect)
            .map(r => r.question);

        if (incorrectQuestions.length > 0) {
            const newQuiz = { ...quiz, questions: incorrectQuestions };
            onFinish(newQuiz); // Pass the new quiz back up to the main App component
        }
    };
    
    const handleGetExplanation = async (qIndex) => {
        setIsExplaining(prev => ({...prev, [qIndex]: true}));
        const question = quiz.questions[qIndex];
        const userAnswer = userAnswers[qIndex];
        const correctAnswer = question.answer;

        let correctAnswerText = '';
        if (question.type === 'Match the Pairs') {
            correctAnswerText = Object.entries(correctAnswer).map(([key, value]) => `${key} -> ${value}`).join(', ');
        } else if (question.type === 'Ordering') {
            correctAnswerText = (correctAnswer as string[]).join(' -> ');
        } else {
            correctAnswerText = Array.isArray(correctAnswer) ? correctAnswer.join(', ') : correctAnswer;
        }

        let userAnswerText = '';
        if (question.type === 'Match the Pairs') {
            userAnswerText = userAnswer ? Object.entries(userAnswer).map(([key, value]) => `${key} -> ${value}`).join(', ') : "Not answered";
        } else if (question.type === 'Ordering') {
            userAnswerText = userAnswer ? (userAnswer as string[]).join(' -> ') : "Not answered";
        } else {
            userAnswerText = Array.isArray(userAnswer) ? userAnswer.join(', ') : (userAnswer || "Not answered");
        }
        
         const prompt = `You are an expert cybersecurity professor, known for your clear, detailed, and encouraging explanations. A student has answered a question incorrectly during an exam review. Your task is to provide a high-quality explanation to help them understand their mistake and master the concept.

**Question:**
"${question.question}"

**Correct Answer:**
"${correctAnswerText}"

**Student's Incorrect Answer:**
"${userAnswerText}"

Please provide a detailed explanation using the following structure. Use markdown for clear formatting (e.g., headings, bold text, lists).

### 🧠 Core Concept
Briefly explain the fundamental cybersecurity principle or concept being tested in this question.

### ✅ Why the Correct Answer is Right
Detail why "${correctAnswerText}" is the correct choice. Explain the mechanism, process, or reason that makes it the right answer in the context of the question.

### ❌ Analysis of the Incorrect Answer
Explain why the student's answer, "${userAnswerText}", is incorrect. Be specific. If it's a plausible but wrong answer, explain the nuance they might have missed.

### 💡 Key Takeaway & Real-World Example
Provide a simple, memorable takeaway or a brief, real-world example to help the student solidify their understanding and remember the concept for the future.`;

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
            });
            setExplanations(prev => ({...prev, [qIndex]: response.text}));
        } catch (error) {
            console.error("Explanation generation failed:", error);
            handleApiError(error);
            setExplanations(prev => ({...prev, [qIndex]: "Sorry, I couldn't generate an explanation at this time."}));
        } finally {
            setIsExplaining(prev => ({...prev, [qIndex]: false}));
        }
    };
    

    const currentQuestion = quiz.questions[currentQuestionIndex];
    const isAnswered = userAnswers.hasOwnProperty(currentQuestionIndex) && userAnswers[currentQuestionIndex] !== '' && userAnswers[currentQuestionIndex] !== undefined;

    const progress = (currentQuestionIndex / quiz.questions.length) * 100;

    if (view === 'intro') {
        return (
            <div className="content-card exam-intro animate-in">
                <h2>{quiz.topic} Exam</h2>
                <p>You are about to begin an exam on <strong>{quiz.topic}</strong> with <strong>{quiz.questions.length}</strong> questions.</p>
                <p>This exam is rated for <strong>{quiz.difficulty}</strong> level.</p>
                <form className="start-exam-form" onSubmit={(e) => { e.preventDefault(); setView('exam'); }}>
                    <div className="form-group">
                        <label htmlFor="exam-name">Enter Your Name</label>
                        <input
                            type="text"
                            id="exam-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Your Name"
                            required
                        />
                    </div>
                    <button type="submit">Start Exam</button>
                </form>
            </div>
        );
    }
    
    const handleCertificateDownload = () => {
        const certElement = document.getElementById('certificate');
        if (certElement) {
             html2canvas(certElement, { 
                scale: 2, // Higher scale for better quality
                useCORS: true, // Important for external images
                backgroundColor: null, // Use transparent background
             }).then(canvas => {
                const link = document.createElement('a');
                link.download = `NexusLearn_AI_Certificate_${quiz.topic.replace(/\s+/g, '_')}.png`;
                link.href = canvas.toDataURL('image/png');
                link.click();
            });
        }
    };

    if (view === 'results') {
         const pass = results.percentage >= 70;
        return (
            <div className="content-card exam-results fade-in">
                <h2>Exam Results</h2>
                <p>Well done, {name}!</p>
                <p>You scored:</p>
                <div className={`score ${pass ? 'pass' : 'fail'}`}>
                    {results.percentage.toFixed(1)}%
                </div>
                <p>({results.score} out of {results.total} correct)</p>
                <p>{pass ? "Congratulations on passing!" : "Keep studying and try again. You can do it!"}</p>
                <div className="results-actions">
                    <button onClick={onBack}>Back to Generator</button>
                    <button onClick={() => setView('review')}>Review Answers</button>
                    {results.detailedResults.some(r => !r.isCorrect) && (
                        <button onClick={handleRetryIncorrect} className="retry-incorrect-btn">Retry Incorrect</button>
                    )}
                </div>
                {pass && (
                    <Certificate 
                        name={name} 
                        topic={quiz.topic} 
                        onDownload={handleCertificateDownload}
                        handleApiError={handleApiError}
                    />
                )}
                 <div className="study-guide-section">
                    <h3><span role="img" aria-label="books">📚</span> Personalized Study Guide</h3>
                    {isGeneratingGuide && <QuizSkeleton />}
                    {!isGeneratingGuide && studyGuideData && (
                        <div className="study-guide-content">
                            {studyGuideData.guide.map((item, index) => (
                                <div key={index} className="study-guide-item">
                                    <h4>{item.concept}</h4>
                                    <div dangerouslySetInnerHTML={{ __html: parseMarkdown(item.explanation) }}></div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    }
    
    if(view === 'review') {
        return (
            <div className="content-card exam-review fade-in">
                 <button onClick={onBack} className="back-btn" style={{marginBottom: '1rem', width:'auto'}}>
                    <span role="img" aria-label="back">⬅️</span> Back to Generator
                </button>
                <h3>Answer Review</h3>
                {quiz.questions.map((q, index) => {
                     const result = results.detailedResults[index];
                     const userAnswer = result.userAnswer;
                     const isCorrect = result.isCorrect;
                     const isPlaying = audioStates[q.question]?.isPlaying;
                     const isLoadingAudio = audioStates[q.question]?.isLoading;
                     const conceptName = studyGuideData?.mappings[index];
                     const guideEntry = conceptName ? studyGuideData.guide.find(g => g.concept === conceptName) : null;

                     
                     let userAnswerDisplay;
                     let correctAnswerDisplay;
                     
                     if (q.type === 'Match the Pairs') {
                        userAnswerDisplay = userAnswer ? <ul>{Object.entries(userAnswer).map(([p, o]) => <li key={p}><strong>{p}:</strong> {o as string}</li>)}</ul> : <p>Not answered</p>;
                        correctAnswerDisplay = <ul>{Object.entries(q.answer).map(([p, o]) => <li key={p}><strong>{p}:</strong> {o as string}</li>)}</ul>;
                     } else if (q.type === 'Ordering') {
                        userAnswerDisplay = userAnswer ? <ol>{(userAnswer as string[]).map((item, i) => <li key={i}>{item}</li>)}</ol> : <p>Not answered</p>;
                        correctAnswerDisplay = <ol>{(q.answer as string[]).map((item, i) => <li key={i}>{item}</li>)}</ol>;
                     } else {
                         userAnswerDisplay = <p>{userAnswer || 'Not answered'}</p>;
                         correctAnswerDisplay = <p>{Array.isArray(q.answer) ? q.answer.join(', ') : q.answer}</p>
                     }
                     
                     return (
                        <div key={index} className={`exam-question-review ${isCorrect ? 'correct' : 'incorrect'}`}>
                            <div className="question-header">
                                <strong>Question {index + 1}:</strong> 
                                <button
                                    className="audio-btn"
                                    onClick={() => handlePlayAudio(q.question)}
                                    disabled={isLoadingAudio || isPlaying}
                                    aria-label={`Play audio for question ${index + 1}`}
                                    title={isPlaying ? "Stop audio" : "Read question aloud"}
                                >
                                    {isLoadingAudio ? <div className="mini-spinner"></div> : isPlaying ? <i className="fas fa-stop"></i> : <i className="fas fa-volume-high"></i>}
                                </button>
                            </div>
                            <p>{q.question}</p>
                            
                             <div className="answer-line">
                                <span role="img" aria-label="your answer">🗣️</span> <strong>Your Answer:</strong> {userAnswerDisplay}
                             </div>
                             {!isCorrect && (
                                <div className="answer-line">
                                    <span role="img" aria-label="correct answer">✅</span> <strong>Correct Answer:</strong> {correctAnswerDisplay}
                                </div>
                             )}
                            {!isCorrect && guideEntry && (
                                <div className="hint-content">
                                    <strong><span role="img" aria-label="lightbulb">💡</span> Study Guide Hint: {guideEntry.concept}</strong>
                                    <div dangerouslySetInnerHTML={{ __html: parseMarkdown(guideEntry.explanation) }}></div>
                                </div>
                            )}
                              {!isCorrect && (
                                <div className="ai-professor">
                                    <button onClick={() => handleGetExplanation(index)} disabled={isExplaining[index]} style={{width: 'auto', fontSize: '0.9rem', padding: '0.4rem 0.8rem'}}>
                                        {isExplaining[index] ? <><div className="mini-spinner"></div> Thinking...</> : <> <span role="img" aria-label="brain">🧠</span> Ask AI Professor</>}
                                    </button>
                                     {explanations[index] && (
                                        <div className="explanation-content" dangerouslySetInnerHTML={{ __html: parseMarkdown(explanations[index]) }}></div>
                                    )}
                                </div>
                            )}
                        </div>
                     )
                })}
            </div>
        )
    }


    return (
        <div className="content-card animate-in">
            <h2>{quiz.topic}</h2>
            <div className="exam-progress-container">
                <div className="progress-bar">
                    <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
                </div>
                <span className="progress-text">{currentQuestionIndex + 1} / {quiz.questions.length}</span>
            </div>
            
            <div className={`exam-question ${isAnswered ? 'answered' : ''}`}>
                 <div className="question-header">
                    <strong>Question {currentQuestionIndex + 1}:</strong>
                    <button
                        className="audio-btn"
                        onClick={() => handlePlayAudio(currentQuestion.question)}
                        disabled={audioStates[currentQuestion.question]?.isLoading || audioStates[currentQuestion.question]?.isPlaying}
                        aria-label={`Play audio for question ${currentQuestionIndex + 1}`}
                        title={audioStates[currentQuestion.question]?.isPlaying ? "Stop audio" : "Read question aloud"}
                    >
                        {audioStates[currentQuestion.question]?.isLoading ? <div className="mini-spinner"></div> : audioStates[currentQuestion.question]?.isPlaying ? <i className="fas fa-stop"></i> : <i className="fas fa-volume-high"></i>}
                    </button>
                 </div>
                <p>{currentQuestion.question}</p>

                {currentQuestion.type === 'Multiple-Choice' || currentQuestion.type === 'Scenario-Based' ? (
                    <div className="exam-options">
                        {currentQuestion.options.map((option, index) => (
                            <label key={index} className="option-label">
                                <input type="radio" name={`q${currentQuestionIndex}`} value={option}
                                    checked={userAnswers[currentQuestionIndex] === option}
                                    onChange={(e) => handleAnswerChange(currentQuestionIndex, e.target.value)} />
                                <span>{option}</span>
                            </label>
                        ))}
                    </div>
                ) : currentQuestion.type === 'True/False' ? (
                    <div className="exam-options">
                        {["True", "False"].map((option, index) => (
                            <label key={index} className="option-label">
                                <input type="radio" name={`q${currentQuestionIndex}`} value={option}
                                    checked={userAnswers[currentQuestionIndex] === option}
                                    onChange={(e) => handleAnswerChange(currentQuestionIndex, e.target.value)} />
                                <span>{option}</span>
                            </label>
                        ))}
                    </div>
                ) : currentQuestion.type === 'Fill-in-the-Blank' ? (
                    <div className="fill-blank-input">
                        <input type="text" value={userAnswers[currentQuestionIndex] || ''}
                            onChange={(e) => handleAnswerChange(currentQuestionIndex, e.target.value)}
                            placeholder="Type your answer here" />
                    </div>
                ) : currentQuestion.type === 'Match the Pairs' ? (
                   <MatchThePairsQuestion 
                        q={currentQuestion} 
                        qIndex={currentQuestionIndex}
                        userAnswer={userAnswers[currentQuestionIndex]}
                        onAnswerChange={handleAnswerChange}
                   />
                ) : currentQuestion.type === 'Ordering' ? (
                    <OrderingQuestion
                        q={currentQuestion}
                        qIndex={currentQuestionIndex}
                        userAnswer={userAnswers[currentQuestionIndex]}
                        onAnswerChange={handleAnswerChange}
                    />
                ) : null}
            </div>

            <button onClick={handleNextQuestion} disabled={!isAnswered}>
                {currentQuestionIndex < quiz.questions.length - 1 ? 'Next Question' : 'Submit Exam'}
            </button>
        </div>
    );
};

const QuizPaperView = ({ quiz, onBack }) => {
    const [showAnswers, setShowAnswers] = useState(false);
    
    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="content-card generated-quiz-view animate-in">
            <div className="quiz-actions-header no-print">
                 <button onClick={onBack} className="back-btn">
                    <span role="img" aria-label="back">⬅️</span> Back
                </button>
                 <div className="actions-right">
                    <label className="toggle-answers">
                        Show Answers
                        <input type="checkbox" checked={showAnswers} onChange={() => setShowAnswers(!showAnswers)} />
                        <span className="slider"></span>
                    </label>
                    <button onClick={handlePrint} className="print-btn">
                         <span role="img" aria-label="print">🖨️</span> Print
                    </button>
                </div>
            </div>

            <div className="quiz-paper" id="quiz-to-print">
                <div className="quiz-paper-header">
                    <h1>{quiz.topic}</h1>
                    <div className="quiz-meta">
                        <span><strong>Difficulty:</strong> {quiz.difficulty}</span>
                        <span><strong>Questions:</strong> {quiz.questions.length}</span>
                    </div>
                </div>

                {quiz.questions.map((q, index) => (
                    <div key={index} className="quiz-paper-section">
                        <div className="quiz-question-card">
                            <p><strong>Question {index + 1}:</strong> {q.question}</p>
                            {q.type === 'Multiple-Choice' || q.type === 'Scenario-Based' ? (
                                <ol className="mc-options" type="A">
                                    {q.options.map((opt, i) => <li key={i}>{opt}</li>)}
                                </ol>
                            ) : q.type === 'True/False' ? (
                                <p><strong>(True / False)</strong></p>
                            ) : q.type === 'Fill-in-the-Blank' ? (
                                <p>Answer: <span className="fill-blank-space"></span></p>
                            ) : q.type === 'Match the Pairs' ? (
                               <div className="match-display">
                                   <div className="match-column-display">
                                       <strong>Premises</strong>
                                       <ul>
                                           {q.premises.map((p, i) => <li key={i}>{i+1}. {p}</li>)}
                                       </ul>
                                   </div>
                                    <div className="match-column-display">
                                       <strong>Options</strong>
                                       <ul>
                                           {q.options.map((o, i) => <li key={i}>{String.fromCharCode(65 + i)}. {o}</li>)}
                                       </ul>
                                   </div>
                               </div>
                            ) : q.type === 'Ordering' ? (
                                <>
                                    <p><em>Order the following items:</em></p>
                                    <ul>
                                        {q.items.map((item, i) => <li key={i}>{item}</li>)}
                                    </ul>
                                    <br/>
                                    {[...Array(q.items.length)].map((_, i) => (
                                        <p key={i}>{i+1}. <span className="fill-blank-space" style={{width: '300px'}}></span></p>
                                    ))}
                                </>
                            ) : null}
                        </div>
                    </div>
                ))}
                
                <div className={`answer-key-section ${showAnswers ? 'visible' : ''}`}>
                    <h3>Answer Key</h3>
                    {quiz.questions.map((q, index) => (
                         <div key={index} className="answer-card">
                             <p><strong>Question {index + 1}:</strong> 
                                {q.type === 'Match the Pairs' 
                                    ? <ul>{Object.entries(q.answer).map(([key, val]) => <li key={key}>{key}: {val as string}</li>)}</ul>
                                    : q.type === 'Ordering'
                                    ? <ol>{(q.answer as string[]).map((item, i) => <li key={i}>{item}</li>)}</ol>
                                    : ` ${q.answer}`
                                }
                             </p>
                         </div>
                    ))}
                </div>
            </div>
        </div>
    );
};


const AboutContactPage = ({ parseMarkdown }) => {
    const [formState, setFormState] = useState({ name: '', email: '', message: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitSuccess, setSubmitSuccess] = useState(false);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormState(prev => ({ ...prev, [name]: value }));
    };

    const handleFormSubmit = (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        // Mock submission
        setTimeout(() => {
            setIsSubmitting(false);
            setSubmitSuccess(true);
            setFormState({ name: '', email: '', message: '' });
            setTimeout(() => setSubmitSuccess(false), 5000);
        }, 1500);
    };

    return (
        <div className="about-contact-page page-container">
            <div className="content-card about-section animate-in">
                <h2>About NexusLearn AI</h2>
                <p className="mission-statement">
                    NexusLearn AI is dedicated to revolutionizing cybersecurity education by leveraging the power of artificial intelligence. Our mission is to provide adaptive, engaging, and highly-relevant learning experiences for cybersecurity professionals at all levels, from aspiring analysts to seasoned experts.
                </p>
                <div className="founder-profile">
                    <h3>Meet the Creator</h3>
                    <CreatorProfile />
                </div>
                <div className="testimonials-section">
                    <h3>What Our Users Say</h3>
                    <Testimonials />
                </div>
            </div>

            <div className="content-card contact-section animate-in" style={{ animationDelay: '0.2s' }}>
                <h2>Get In Touch</h2>
                <p>Have questions, feedback, or partnership inquiries? Reach out to us!</p>
                <div className="contact-layout">
                    <form onSubmit={handleFormSubmit} style={{ flex: 2 }}>
                        <div className="form-group">
                            <label htmlFor="name">Your Name</label>
                            <input type="text" id="name" name="name" value={formState.name} onChange={handleInputChange} required />
                        </div>
                        <div className="form-group">
                            <label htmlFor="email">Your Email</label>
                            <input type="email" id="email" name="email" value={formState.email} onChange={handleInputChange} required />
                        </div>
                        <div className="form-group">
                            <label htmlFor="message">Message</label>
                            <textarea id="message" name="message" value={formState.message} onChange={handleInputChange} required></textarea>
                        </div>
                        <button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? <><div className="mini-spinner"></div> Sending...</> : "Send Message"}
                        </button>
                        {submitSuccess && <p className="form-success-msg">Thank you for your message! We'll get back to you shortly.</p>}
                    </form>
                    <div style={{ flex: 1 }}>
                        <ContactInfo />
                    </div>
                </div>
            </div>
        </div>
    );
};


const App = () => {
    const [activePage, setActivePage] = useState('generator');
    const [quiz, setQuiz] = useState(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [currentView, setCurrentView] = useState('generator'); // generator, quiz-paper, exam
    const [userName, setUserName] = useState("Cyber Pro");
    const [isChatbotOpen, setIsChatbotOpen] = useState(false);
    const [apiError, setApiError] = useState(null);
    const audioContextRef = useRef(null);
    const [audioStates, setAudioStates] = useState({}); // { [text]: { isLoading, isPlaying, source } }

    useEffect(() => {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }, []);
    
     useEffect(() => {
        if (apiError) {
            const timer = setTimeout(() => {
                setApiError(null);
            }, 8000); // Hide error after 8 seconds
            return () => clearTimeout(timer);
        }
    }, [apiError]);


    const handleApiError = (error) => {
        let message = 'An unexpected error occurred with the AI service.';
        if (error.message) {
            // Basic attempt to find a useful message
             if (error.message.includes('API key not valid')) {
                message = 'The provided API key is not valid. Please check your configuration.';
            } else if (error.message.includes('429')) {
                message = 'You have exceeded your API quota. Please check your usage and billing or try again later.';
            } else if (error.message.includes('500') || error.message.includes('503')) {
                message = 'The AI service is currently unavailable. Please try again later.';
            } else {
                 message = error.message.length < 150 ? error.message : "An error occurred. Check the console for details.";
            }
        }
        setApiError(message);
        console.error("Detailed API Error:", error);
    };


    const handleQuizGenerated = (generatedQuiz) => {
        setQuiz(generatedQuiz);
        setCurrentView('quiz-paper');
        setIsGenerating(false);
    };
    
    const handleStartExam = () => {
        setCurrentView('exam');
    };

    const handleBackToGenerator = () => {
        setQuiz(null);
        setCurrentView('generator');
    };
    
     const handleRetryQuiz = (newQuiz) => {
        setQuiz(newQuiz);
        setCurrentView('exam');
    };

    const handleNavClick = (page) => {
        setActivePage(page);
    };
    
    const parseMarkdown = (text) => {
        if(!text) return '';
        // A simple markdown parser
        return text
            .replace(/\*\*\*(.*?)\*\*\*/g, '<h3>$1</h3>') // Bold-italic for h3
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
            .replace(/\*(.*?)\*/g, '<em>$1</em>')       // Italic
            .replace(/### (.*)/g, '<h3>$1</h3>')       // H3
            .replace(/## (.*)/g, '<h2>$1</h2>')         // H2
            .replace(/# (.*)/g, '<h1>$1</h1>')          // H1
            .replace(/- (.*)/g, '<li>$1</li>')         // List items
            .replace(/(\<li\>.*\<\/li\>)/g, '<ul>$1</ul>') // Wrap lists
            .replace(/\n/g, '<br />');                  // Newlines
    };
    
    const handlePlayAudio = async (text) => {
        const currentAudio = audioStates[text];

        if (currentAudio?.isPlaying) {
            currentAudio.source.stop();
            setAudioStates(prev => ({ ...prev, [text]: { ...prev[text], isPlaying: false } }));
            return;
        }

        setAudioStates(prev => ({ ...prev, [text]: { isLoading: true, isPlaying: false } }));

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash-preview-tts",
                contents: [{ parts: [{ text: text }] }],
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: {
                        voiceConfig: {
                            prebuiltVoiceConfig: { voiceName: 'Kore' },
                        },
                    },
                },
            });

            const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            if (!base64Audio) throw new Error("No audio data received.");

            const audioBuffer = await decodeAudioData(
                decode(base64Audio),
                audioContextRef.current,
                24000,
                1
            );

            const source = audioContextRef.current.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioContextRef.current.destination);
            source.start();
            
            source.onended = () => {
                setAudioStates(prev => ({ ...prev, [text]: { ...prev[text], isPlaying: false, source: null } }));
            };

            setAudioStates(prev => ({ ...prev, [text]: { isLoading: false, isPlaying: true, source } }));
        } catch (error) {
            console.error('TTS Error:', error);
            handleApiError(error);
            setAudioStates(prev => ({ ...prev, [text]: { isLoading: false, isPlaying: false } }));
        }
    };

    const renderPage = () => {
        switch(activePage) {
            case 'generator':
                return (
                    <div className="generator-view">
                        <QuizGenerator 
                            onQuizGenerated={handleQuizGenerated} 
                            isGenerating={isGenerating} 
                            handleApiError={handleApiError} 
                        />
                        {isGenerating ? <QuizSkeleton /> : quiz ? (
                            currentView === 'quiz-paper' ? 
                                <QuizPaperView quiz={quiz} onBack={handleBackToGenerator} /> :
                                <ExamView 
                                    quiz={quiz} 
                                    onBack={handleBackToGenerator} 
                                    onFinish={handleRetryQuiz}
                                    userName={userName}
                                    audioStates={audioStates}
                                    handlePlayAudio={handlePlayAudio}
                                    handleApiError={handleApiError}
                                    parseMarkdown={parseMarkdown}
                                />
                        ) : <QuizPlaceholder />}
                    </div>
                );
            case 'about':
                return <AboutContactPage parseMarkdown={parseMarkdown} />;
            default:
                return null;
        }
    };
    
    const Footer = () => (
        <footer className="site-footer no-print">
            <div className="footer-content">
                <div className="footer-section" style={{textAlign: 'center'}}>
                     <RotatingLogo containerClass="footer-logo-container"/>
                </div>
                <div className="footer-section">
                    <h3>Quick Links</h3>
                    <ul>
                        <li><a href="#" onClick={(e) => { e.preventDefault(); handleNavClick('generator'); }}>Quiz Generator</a></li>
                        <li><a href="#" onClick={(e) => { e.preventDefault(); handleNavClick('about'); }}>About Us</a></li>
                        <li><a href="#" onClick={(e) => { e.preventDefault(); handleNavClick('about'); }}>Contact</a></li>
                    </ul>
                </div>
                 <div className="footer-section">
                    <h3>Legal</h3>
                    <ul>
                        <li><a href="#">Terms of Service</a></li>
                        <li><a href="#">Privacy Policy</a></li>
                    </ul>
                </div>
                 <div className="footer-section">
                    <h3>Connect</h3>
                    <p>Follow the developer for updates and insights.</p>
                     <div className="social-icons">
                        <a href="https://github.com/nwaforchibu" target="_blank" rel="noopener noreferrer" aria-label="GitHub"><i className="fab fa-github"></i></a>
                        <a href="https://www.linkedin.com/in/chibuzor-nwaiwu-430930269/" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn"><i className="fab fa-linkedin"></i></a>
                        <a href="https://x.com/Sir_Iyke_N" target="_blank" rel="noopener noreferrer" aria-label="Twitter"><i className="fab fa-twitter"></i></a>
                    </div>
                </div>
            </div>
            <div className="footer-bottom">
                &copy; {new Date().getFullYear()} NexusLearn AI. All Rights Reserved.
            </div>
        </footer>
    );

    return (
        <>
            <Header onNavClick={handleNavClick} activePage={activePage} userName={userName} />
            <main>
                {renderPage()}
            </main>
            <Footer />
            {apiError && (
                 <div className="error-banner">
                    <p>{apiError}</p>
                    <button onClick={() => setApiError(null)} className="error-banner-close">&times;</button>
                </div>
            )}
            <button className="chatbot-fab" onClick={() => setIsChatbotOpen(!isChatbotOpen)} aria-label="Open AI Assistant">
                {isChatbotOpen ? '✕' : '💬'}
            </button>
            <Chatbot 
                isOpen={isChatbotOpen} 
                onClose={() => setIsChatbotOpen(false)} 
                parseMarkdown={parseMarkdown}
                handleApiError={handleApiError}
            />
        </>
    );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
