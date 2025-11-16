
import React, { useState, useEffect, useRef, useMemo } from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleGenAI, Type, Modality, Chat } from "@google/genai";
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

function encode(bytes) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
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

function createBlob(data) {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

const formatDuration = (totalSeconds) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

const blobToBase64 = (blob) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result.toString().split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
});


const renderMessageWithPronunciations = (text) => {
    if (!text || !text.includes('[')) return text;
    const regex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const elements = [];
    let lastIndex = 0;
    
    // Using for...of loop for matchAll iterator
    for (const match of text.matchAll(regex)) {
        const [fullMatch, term, pronunciation] = match;
        const matchIndex = match.index;
        
        // Add text before the match
        if (matchIndex > lastIndex) {
            elements.push(text.substring(lastIndex, matchIndex));
        }
        
        // Add the styled term with tooltip
        elements.push(
            <span key={matchIndex} className="technical-term" data-pronunciation={pronunciation}>
                {term}
            </span>
        );
        
        lastIndex = matchIndex + fullMatch.length;
    }
    
    // Add any remaining text after the last match
    if (lastIndex < text.length) {
        elements.push(text.substring(lastIndex));
    }
    
    // Use React.Fragment to group elements
    return elements.length > 0 ? <>{elements}</> : text;
};

const AudioMessageBubble = ({ audio }) => {
    const audioRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);

    const togglePlay = (e) => {
        e.stopPropagation();
        if (audioRef.current.paused) {
            audioRef.current.play();
        } else {
            audioRef.current.pause();
        }
    };
    
    useEffect(() => {
        const audioEl = audioRef.current;
        if (!audioEl) return;
        
        const handlePlay = () => setIsPlaying(true);
        const handlePause = () => setIsPlaying(false);
        const handleTimeUpdate = () => {
            if (audioEl.duration > 0) {
                setProgress((audioEl.currentTime / audioEl.duration) * 100);
            }
        };
        const handleEnded = () => {
            setIsPlaying(false);
            setProgress(0);
        };
        
        audioEl.addEventListener('play', handlePlay);
        audioEl.addEventListener('pause', handlePause);
        audioEl.addEventListener('timeupdate', handleTimeUpdate);
        audioEl.addEventListener('ended', handleEnded);
        
        return () => {
            audioEl.removeEventListener('play', handlePlay);
            audioEl.removeEventListener('pause', handlePause);
            audioEl.removeEventListener('timeupdate', handleTimeUpdate);
            audioEl.removeEventListener('ended', handleEnded);
        }
    }, []);

    return (
        <div className="message-bubble audio-bubble">
            <audio ref={audioRef} src={audio.url} preload="metadata"></audio>
            <button onClick={togglePlay} className="play-pause-btn-bubble">
                <i className={`fas ${isPlaying ? 'fa-pause' : 'fa-play'}`}></i>
            </button>
            <div className="audio-progress-bar">
                <div className="audio-progress-dot" style={{ left: `calc(${progress}% - 4px)` }}></div>
                <div className="audio-progress" style={{ width: `${progress}%` }}></div>
            </div>
            <span className="audio-duration-bubble">{formatDuration(audio.duration || 0)}</span>
        </div>
    );
};

const Certificate = ({ title, name, topic, onDownload, handleApiError }) => {
    const [backgroundImage, setBackgroundImage] = useState('');
    const [isBgLoading, setIsBgLoading] = useState(true);
    const [enhancedTopic, setEnhancedTopic] = useState('');
    const [isTopicLoading, setIsTopicLoading] = useState(true);

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

    useEffect(() => {
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
                    <h1 className="cert-title">{title || 'Certificate of Achievement'}</h1>
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
            <div className="certificate-actions">
                <button onClick={onDownload} className="download-cert-btn">
                    <span role="img" aria-label="download">📥</span> Download as PNG
                </button>
                <button onClick={generateBgImage} className="regenerate-bg-btn" disabled={isBgLoading}>
                    {isBgLoading ? 
                        <><div className="mini-spinner"></div> Regenerating...</> : 
                        <><span role="img" aria-label="regenerate">🔄</span> Regenerate Background</>
                    }
                </button>
            </div>
        </div>
    );
};
const MatchThePairsQuestion = ({ q, qIndex, userAnswer, onAnswerChange }) => {
    const [activePremise, setActivePremise] = useState(null);

    // Memoize shuffled options to prevent re-shuffling on every render
    const shuffledOptions = useMemo(() => [...(q.options || [])].sort(() => Math.random() - 0.5), [q.options]);

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
                {(q.premises || []).map((premise, pIndex) => (
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
        return [...(q.items || [])].sort(() => Math.random() - 0.5);
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
    const [error, setError] = useState(null);
    const fileInputRef = useRef(null);

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        setError(null);

        if (!file) return;

        // Validation
        if (!file.type.startsWith('image/')) {
            setError('Invalid file type. Please select an image.');
            return;
        }
        if (file.size > 2 * 1024 * 1024) { // 2MB limit
            setError('File is too large. Please select an image under 2MB.');
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            setProfilePicture(reader.result as string);
        };
        reader.readAsDataURL(file);
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
                accept="image/png, image/jpeg, image/gif"
                style={{ display: 'none' }}
                aria-label="Upload profile picture"
            />
             {error && <p className="profile-upload-error">{error}</p>}
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
            <footer>— Alex Chen, Senior Security Analyst</footer>
        </blockquote>
        <blockquote>
            <p>"The 'Challenge Quest' feature is brilliant. It's not just about knowing the facts; it's about applying them in the right order. This has been invaluable for our junior analysts."</p>
            <footer>— Dr. Maria Flores, Cybersecurity Training Lead</footer>
        </blockquote>
    </div>
);

const ContactInfo = () => (
    <div className="contact-info-card">
        <h4>Contact Information</h4>
        <p><i className="fas fa-map-marker-alt"></i> Quantum Valley, Silicon Oasis</p>
        <p><i className="fas fa-envelope"></i> support@nexuslearn.ai</p>
        <p><i className="fas fa-phone"></i> +1 (555) CYBER-01</p>
        <div className="social-icons">
             <a href="https://www.linkedin.com/in/nwaiwu-chibuzor" aria-label="LinkedIn Profile" target="_blank" rel="noopener noreferrer"><i className="fab fa-linkedin"></i></a>
             <a href="https://github.com/c-nwaiwu" aria-label="GitHub Repository" target="_blank" rel="noopener noreferrer"><i className="fab fa-github"></i></a>
             <a href="https://x.com/nwaiwu_codes" aria-label="Twitter Page" target="_blank" rel="noopener noreferrer"><i className="fab fa-twitter"></i></a>
        </div>
    </div>
);

const AboutPage = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        // Simulate a form submission
        setTimeout(() => {
            setIsSubmitting(false);
            setIsSuccess(true);
            setName('');
            setEmail('');
            setMessage('');
            setTimeout(() => setIsSuccess(false), 5000);
        }, 1500);
    };

    return (
        <div className="about-contact-page animate-in">
            <section className="about-section content-card">
                <h2>About NexusLearn AI</h2>
                <p className="mission-statement">
                    Our mission is to empower the next generation of cybersecurity professionals with cutting-edge, AI-driven learning tools. We believe in adaptive, hands-on education that evolves as quickly as the threat landscape.
                </p>
                <div className="founder-profile">
                    <h3>Meet the Creator</h3>
                    <CreatorProfile />
                </div>
                 <div className="testimonials-section">
                    <h3>What Professionals Are Saying</h3>
                    <Testimonials />
                </div>
            </section>
            <section id="contact" className="contact-section content-card">
                <h2>Get in Touch</h2>
                <p>Have questions, feedback, or partnership inquiries? We'd love to hear from you.</p>
                <div className="contact-layout">
                    <form onSubmit={handleSubmit} className="form-container">
                         {isSuccess && <p className="form-success-msg">Thank you for your message! We'll get back to you shortly.</p>}
                        <div className="form-group">
                            <label htmlFor="name">Name</label>
                            <input type="text" id="name" value={name} onChange={(e) => setName(e.target.value)} required />
                        </div>
                        <div className="form-group">
                            <label htmlFor="email">Email</label>
                            <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                        </div>
                        <div className="form-group">
                            <label htmlFor="message">Message</label>
                            <textarea id="message" value={message} onChange={(e) => setMessage(e.target.value)} required></textarea>
                        </div>
                        <button type="submit" disabled={isSubmitting}>
                             {isSubmitting ? <><div className="mini-spinner"></div> Sending...</> : 'Send Message'}
                        </button>
                    </form>
                    <div className="contact-info-container">
                        <ContactInfo />
                    </div>
                </div>
            </section>
        </div>
    );
};

const CyberExpertChatbot = ({ isOpen, onClose, handleApiError }) => {
    const [status, setStatus] = useState('IDLE');
    const [transcriptionHistory, setTranscriptionHistory] = useState([]);
    const [inputText, setInputText] = useState('');
    const [copiedMessageIndex, setCopiedMessageIndex] = useState(null);
    const [chatMode, setChatMode] = useState('live'); // 'live' or 'message'
    const [recordingStatus, setRecordingStatus] = useState('idle'); // 'idle', 'recording', 'recorded'
    const [recordedAudio, setRecordedAudio] = useState(null); // { url: string, blob: Blob, duration: number }
    const [recordingDuration, setRecordingDuration] = useState(0);
    
    const sessionPromiseRef = useRef(null);
    const inputAudioContextRef = useRef(null);
    const outputAudioContextRef = useRef(null);
    const scriptProcessorRef = useRef(null);
    const mediaStreamSourceRef = useRef(null);
    const streamRef = useRef(null);
    const sourcesRef = useRef(new Set());
    const nextStartTimeRef = useRef(0);
    const textareaRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const recordingIntervalRef = useRef(null);
    
    const currentInputTranscriptionRef = useRef('');
    const currentOutputTranscriptionRef = useRef('');
    const systemInstruction = `You are Oracle, a master-level AI expert in all things cybersecurity. Your knowledge spans SOC Analysis, SIEM, SOAR, Red and Blue Team strategies, malware analysis, ethical hacking, cryptography, and network security. You are professional, concise, and provide highly accurate, practical advice. You assist users in learning and solving complex security challenges. When you use a technical or difficult-to-pronounce cybersecurity term, embed its phonetic pronunciation in this format: [term](pronunciation). For example: 'Investigate the [malware](mal-wear) using a sandbox.'`;

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            const scrollHeight = textareaRef.current.scrollHeight;
            textareaRef.current.style.height = `${scrollHeight}px`;
        }
    }, [inputText]);
    
     const handleCopyToClipboard = (text, index) => {
        if (!text) return;
        // Strip the pronunciation markdown for a clean copy.
        const cleanText = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1');
        navigator.clipboard.writeText(cleanText).then(() => {
            setCopiedMessageIndex(index);
            setTimeout(() => {
                setCopiedMessageIndex(null);
            }, 2000); // Reset after 2 seconds
        }).catch(err => {
            console.error('Failed to copy text: ', err);
            handleApiError(new Error("Could not copy text to clipboard."));
        });
    };

    const playTextAsAudio = async (text, onEndCallback) => {
        if (!outputAudioContextRef.current || outputAudioContextRef.current.state === 'closed') {
            outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        }
        
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash-preview-tts",
                contents: [{ parts: [{ text }] }],
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: {
                        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
                    },
                },
            });
            
            const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
                setStatus('SPEAKING');
                const audioBuffer = await decodeAudioData(
                    decode(base64Audio),
                    outputAudioContextRef.current,
                    24000,
                    1,
                );
                const source = outputAudioContextRef.current.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(outputAudioContextRef.current.destination);
                
                source.onended = () => {
                    sourcesRef.current.delete(source);
                    if (onEndCallback) onEndCallback();
                };
                
                source.start();
                sourcesRef.current.add(source);
            } else {
                 if (onEndCallback) onEndCallback();
            }
        } catch (error) {
            console.error('TTS for text response failed:', error);
            handleApiError(error);
            if (onEndCallback) onEndCallback();
        }
    };
    
    const sendTextMessage = async (message, history) => {
        deactivate();
        setStatus('THINKING');
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const chatHistory = history
                .filter(item => item.text && !item.audio)
                .map(item => ({
                    role: item.speaker === 'user' ? 'user' : 'model',
                    parts: [{ text: item.text }]
                }));

            const chat = ai.chats.create({
                model: 'gemini-2.5-flash',
                history: chatHistory,
                config: { systemInstruction },
            });
            
            const response = await chat.sendMessage({ message });
            const modelResponseText = response.text;
            
            setTranscriptionHistory(prev => [...prev, { speaker: 'model', text: modelResponseText }]);
            
            await playTextAsAudio(modelResponseText, () => {
                 setStatus('IDLE');
            });
        } catch (error) {
            console.error("Text message failed:", error);
            handleApiError(error);
            setStatus('ERROR');
        }
    };

    const activate = async () => {
        setStatus('CONNECTING');
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

            inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

            streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            sessionPromiseRef.current = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                callbacks: {
                    onopen: () => {
                        setStatus('LISTENING');
                        const source = inputAudioContextRef.current.createMediaStreamSource(streamRef.current);
                        mediaStreamSourceRef.current = source;
                        const scriptProcessor = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
                        scriptProcessorRef.current = scriptProcessor;

                        scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                            const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                            const pcmBlob = createBlob(inputData);
                            sessionPromiseRef.current.then((session) => {
                                session.sendRealtimeInput({ media: pcmBlob });
                            });
                        };
                        source.connect(scriptProcessor);
                        scriptProcessor.connect(inputAudioContextRef.current.destination);
                    },
                    onmessage: async (message) => {
                        if (message.serverContent?.inputTranscription) {
                            currentInputTranscriptionRef.current += message.serverContent.inputTranscription.text;
                            setTranscriptionHistory(prev => {
                                const newHistory = [...prev];
                                const last = newHistory[newHistory.length - 1];
                                if (last?.speaker === 'user' && !last.audio) {
                                    last.text = currentInputTranscriptionRef.current;
                                    return newHistory;
                                }
                                return [...newHistory, { speaker: 'user', text: currentInputTranscriptionRef.current }];
                            });
                        } else if (message.serverContent?.outputTranscription) {
                            currentOutputTranscriptionRef.current += message.serverContent.outputTranscription.text;
                             setTranscriptionHistory(prev => {
                                const newHistory = [...prev];
                                const last = newHistory[newHistory.length - 1];
                                if (last?.speaker === 'model') {
                                    last.text = currentOutputTranscriptionRef.current;
                                    return newHistory;
                                }
                                return [...newHistory, { speaker: 'model', text: currentOutputTranscriptionRef.current }];
                            });
                        }
                        
                        if (message.serverContent?.turnComplete) {
                            currentInputTranscriptionRef.current = '';
                            currentOutputTranscriptionRef.current = '';
                        }
                        
                        const base64EncodedAudioString = message.serverContent?.modelTurn?.parts[0]?.inlineData.data;
                        if (base64EncodedAudioString) {
                            setStatus('SPEAKING');
                            nextStartTimeRef.current = Math.max(
                                nextStartTimeRef.current,
                                outputAudioContextRef.current.currentTime,
                            );
                            const audioBuffer = await decodeAudioData(
                                decode(base64EncodedAudioString),
                                outputAudioContextRef.current,
                                24000,
                                1,
                            );
                            const source = outputAudioContextRef.current.createBufferSource();
                            source.buffer = audioBuffer;
                            source.connect(outputAudioContextRef.current.destination);
                            
                            source.addEventListener('ended', () => {
                                sourcesRef.current.delete(source);
                                if (sourcesRef.current.size === 0) {
                                    setStatus('LISTENING');
                                }
                            });

                            source.start(nextStartTimeRef.current);
                            nextStartTimeRef.current += audioBuffer.duration;
                            sourcesRef.current.add(source);
                        }

                        const interrupted = message.serverContent?.interrupted;
                        if (interrupted) {
                            for (const source of sourcesRef.current.values()) {
                                source.stop();
                                sourcesRef.current.delete(source);
                            }
                            nextStartTimeRef.current = 0;
                        }
                    },
                    onerror: (e) => {
                        console.error('Live session error:', e);
                        handleApiError(new Error("Live chat session failed. Please try again."));
                        setStatus('ERROR');
                        deactivate();
                    },
                    onclose: () => {},
                },
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: {
                        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
                    },
                    systemInstruction,
                    inputAudioTranscription: {},
                    outputAudioTranscription: {},
                },
            });

        } catch (error) {
            console.error("Failed to start voice session:", error);
            handleApiError(error);
            setStatus('ERROR');
        }
    };
    
    const handleDiscardRecording = () => {
        if (recordedAudio) {
            URL.revokeObjectURL(recordedAudio.url);
        }
        setRecordedAudio(null);
        setRecordingStatus('idle');
        setRecordingDuration(0);
        if (recordingIntervalRef.current) {
            clearInterval(recordingIntervalRef.current);
        }
    };

    const deactivate = () => {
        if (sessionPromiseRef.current) {
            sessionPromiseRef.current.then(session => session.close());
            sessionPromiseRef.current = null;
        }

        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }

        if (scriptProcessorRef.current) {
            scriptProcessorRef.current.disconnect();
            scriptProcessorRef.current = null;
        }

        if (mediaStreamSourceRef.current) {
            mediaStreamSourceRef.current.disconnect();
            mediaStreamSourceRef.current = null;
        }

        if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') {
            inputAudioContextRef.current.close();
        }
        if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
            outputAudioContextRef.current.close();
        }

        sourcesRef.current.forEach(source => source.stop());
        sourcesRef.current.clear();
        nextStartTimeRef.current = 0;
        currentInputTranscriptionRef.current = '';
        currentOutputTranscriptionRef.current = '';
        
        setStatus('IDLE');
    };
    
    const handleToggleSession = () => {
        if (status === 'IDLE' || status === 'ERROR') {
            setTranscriptionHistory([]);
            activate();
        } else {
            deactivate();
        }
    };
    
    const handleTextSubmit = (e) => {
        e.preventDefault();
        if (!inputText.trim() || status === 'THINKING' || status === 'SPEAKING') return;
        const message = inputText.trim();
        const newHistory = [...transcriptionHistory, { speaker: 'user', text: message }];
        setTranscriptionHistory(newHistory);
        sendTextMessage(message, transcriptionHistory);
        setInputText('');
    };
    
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            audioChunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = event => {
                audioChunksRef.current.push(event.data);
            };

            mediaRecorderRef.current.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                const audioUrl = URL.createObjectURL(audioBlob);
                setRecordedAudio({ url: audioUrl, blob: audioBlob, duration: recordingDuration });
                setRecordingStatus('recorded');
                stream.getTracks().forEach(track => track.stop());
            };

            setRecordingStatus('recording');
            setRecordingDuration(0);
            mediaRecorderRef.current.start();
            recordingIntervalRef.current = setInterval(() => {
                setRecordingDuration(prev => prev + 1);
            }, 1000);
        } catch (err) {
            console.error("Error starting recording:", err);
            handleApiError(new Error("Microphone access was denied. Please enable it in your browser settings."));
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
            clearInterval(recordingIntervalRef.current);
            setRecordingStatus('idle');
        }
    };
    
    const handleSendVoiceMessage = async () => {
        if (!recordedAudio) return;

        setStatus('THINKING');
        const apiHistory = transcriptionHistory;
        setTranscriptionHistory(prev => [...prev, {
            speaker: 'user',
            audio: { url: recordedAudio.url, duration: recordedAudio.duration },
            text: `[Voice Message]`,
        }]);
        
        try {
            const base64Audio = await blobToBase64(recordedAudio.blob);
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            const historyForApi = apiHistory
                .filter(item => item.text && !item.audio)
                .map(item => ({
                    role: item.speaker === 'user' ? 'user' : 'model',
                    parts: [{ text: item.text }]
                }));

            const newUserMessage = {
                role: 'user',
                parts: [
                    { inlineData: { mimeType: recordedAudio.blob.type, data: base64Audio } },
                    { text: 'Listen to this voice message from a user. Please provide a helpful, concise response to their query.' }
                ]
            };
            
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-pro',
                contents: [...historyForApi, newUserMessage],
                config: { systemInstruction }
            });

            const modelResponseText = response.text;
            
            setTranscriptionHistory(prev => [...prev, { speaker: 'model', text: modelResponseText }]);
            await playTextAsAudio(modelResponseText, () => setStatus('IDLE'));

        } catch (error) {
            console.error("Voice message failed:", error);
            handleApiError(error);
            setStatus('ERROR');
        } finally {
            handleDiscardRecording();
        }
    };

    const handleModeChange = (newMode) => {
        if (chatMode === newMode) return;
        deactivate();
        handleDiscardRecording();
        setChatMode(newMode);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleTextSubmit(e);
        }
    };
    
    useEffect(() => {
        return () => {
            if (sessionPromiseRef.current) {
                deactivate();
            }
        };
    }, [isOpen]);
    
    const chatHistoryRef = useRef(null);
    useEffect(() => {
        if (chatHistoryRef.current) {
            chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight;
        }
    }, [transcriptionHistory]);

    const isPulsating = ['LISTENING', 'CONNECTING', 'SPEAKING'].includes(status);

    return (
        <div className={`cyber-chatbot-wrapper ${isOpen ? 'open' : ''}`}>
            <div className="cyber-chatbot-container">
                <div className="cyber-chatbot-header">
                    <h3><span role="img" aria-label="Oracle">🔮</span> Oracle AI Expert</h3>
                    <button onClick={onClose} className="close-btn" aria-label="Close Chatbot">&times;</button>
                </div>
                <div className={`cyber-chatbot-status ${status}`}>{status}</div>
                <div className="cyber-chatbot-history" ref={chatHistoryRef}>
                    {transcriptionHistory.length === 0 && (
                        <div className="chat-message-wrapper model">
                            <div className="chat-message model">
                                <div className="message-bubble">
                                    Hello! I am Oracle, your personal cybersecurity expert. Use "Live Conversation" for real-time chat, or switch to "Voice Message" to record and send audio clips. How can I assist you?
                                </div>
                            </div>
                        </div>
                    )}
                    {transcriptionHistory.map((item, index) => (
                        <div key={index} className={`chat-message-wrapper ${item.speaker}`}>
                             {item.speaker === 'user' && item.text && !item.audio && (
                                <button
                                    className={`copy-to-clipboard-btn ${copiedMessageIndex === index ? 'copied' : ''}`}
                                    onClick={() => handleCopyToClipboard(item.text, index)}
                                    aria-label={copiedMessageIndex === index ? 'Copied' : 'Copy message'}
                                    title={copiedMessageIndex === index ? 'Copied!' : 'Copy'}
                                >
                                    <i className={`fas ${copiedMessageIndex === index ? 'fa-check' : 'fa-copy'}`}></i>
                                </button>
                            )}
                            <div className={`chat-message ${item.speaker}`}>
                               {item.audio ? (
                                    <AudioMessageBubble audio={item.audio} />
                                ) : (
                                    <div className="message-bubble">{item.text ? renderMessageWithPronunciations(item.text) : '...'}</div>
                                )}
                            </div>
                            {item.speaker === 'model' && (
                                <button
                                    className={`copy-to-clipboard-btn ${copiedMessageIndex === index ? 'copied' : ''}`}
                                    onClick={() => handleCopyToClipboard(item.text, index)}
                                    aria-label={copiedMessageIndex === index ? 'Copied' : 'Copy message'}
                                    title={copiedMessageIndex === index ? 'Copied!' : 'Copy'}
                                >
                                    <i className={`fas ${copiedMessageIndex === index ? 'fa-check' : 'fa-copy'}`}></i>
                                </button>
                            )}
                        </div>
                    ))}
                     {status === 'THINKING' && (
                        <div className="chat-message-wrapper model">
                             <div className="chat-message model">
                                <div className="message-bubble typing-indicator">
                                    <span></span><span></span><span></span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                <div className="cyber-chatbot-controls">
                     <div className="chatbot-mode-switcher">
                        <button className={chatMode === 'live' ? 'active' : ''} onClick={() => handleModeChange('live')}>
                            <i className="fas fa-satellite-dish"></i> Live
                        </button>
                        <button className={chatMode === 'message' ? 'active' : ''} onClick={() => handleModeChange('message')}>
                             <i className="fas fa-microphone-alt"></i> Message
                        </button>
                    </div>
                    {chatMode === 'live' && (
                         <>
                            <button 
                                className={`activate-button ${status !== 'IDLE' && status !== 'ERROR' ? 'active' : ''} ${isPulsating ? 'pulsating' : ''}`}
                                onClick={handleToggleSession}
                                aria-label={status === 'IDLE' ? "Activate Voice Session" : "Deactivate Voice Session"}
                            >
                                {status === 'CONNECTING' ? <div className="mini-spinner"></div> : <i className="fas fa-microphone"></i>}
                            </button>
                             <form onSubmit={handleTextSubmit} className="text-input-form">
                                <textarea
                                    ref={textareaRef}
                                    value={inputText}
                                    onChange={(e) => setInputText(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Or type your message..."
                                    rows="1"
                                    aria-label="Chat message input"
                                    disabled={status === 'SPEAKING' || status === 'THINKING' || status === 'CONNECTING' }
                                />
                                <button 
                                    type="submit" 
                                    aria-label="Send Message" 
                                    disabled={!inputText.trim() || status === 'SPEAKING' || status === 'THINKING' || status === 'CONNECTING'}
                                >
                                    <i className="fas fa-paper-plane"></i>
                                </button>
                            </form>
                        </>
                    )}
                    {chatMode === 'message' && (
                        <div className="voice-message-controls">
                            {recordingStatus === 'recorded' && recordedAudio ? (
                                <div className="recorded-audio-player">
                                    <button onClick={handleDiscardRecording} className="discard-btn" aria-label="Discard recording"><i className="fas fa-trash"></i></button>
                                    <AudioMessageBubble audio={recordedAudio} />
                                    <button onClick={handleSendVoiceMessage} className="send-voice-btn" aria-label="Send voice message"><i className="fas fa-paper-plane"></i></button>
                                </div>
                            ) : (
                                <>
                                <button 
                                    className={`record-button ${recordingStatus === 'recording' ? 'recording' : ''}`}
                                    onClick={recordingStatus === 'recording' ? stopRecording : startRecording}
                                    aria-label={recordingStatus === 'recording' ? 'Stop recording' : 'Start recording'}
                                >
                                    <i className={`fas fa-2x ${recordingStatus === 'recording' ? 'fa-stop' : 'fa-microphone'}`}></i>
                                </button>
                                {recordingStatus === 'recording' && <span className="recording-timer">{formatDuration(recordingDuration)}</span>}
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};


const QuizGenerator = ({ onQuizGenerated, handleApiError }) => {
    const [topic, setTopic] = useState('Incident Response');
    const [numQuestions, setNumQuestions] = useState(5);
    const [questionTypes, setQuestionTypes] = useState(['Multiple-Choice', 'Fill-in-the-Blank', 'True/False', 'Ordering']);
    const [isLoading, setIsLoading] = useState(false);

    const allQuestionTypes = ['Multiple-Choice', 'Fill-in-the-Blank', 'True/False', 'Ordering', 'Match the Pairs', 'Image-Based'];
    
    const handleSelectAll = () => {
        if (questionTypes.length === allQuestionTypes.length) {
            setQuestionTypes([]);
        } else {
            setQuestionTypes(allQuestionTypes);
        }
    };


    const handleSubmit = async (e) => {
        e.preventDefault();
        if (questionTypes.length === 0) {
            handleApiError(new Error("Please select at least one question type."));
            return;
        }
        setIsLoading(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = `Generate a challenging cybersecurity quiz on the topic of "${topic}".
            The quiz should contain exactly ${numQuestions} questions.
            The questions should be of the following types: ${questionTypes.join(', ')}.
            Ensure a good mix of the selected types.
            For Multiple-Choice questions, provide 4 options, with only one being correct.
            For Fill-in-the-Blank questions, provide the blank word or phrase in the "answer" field.
            For True/False questions, the "answer" should be either "True" or "False". The question should be a declarative statement.
            For Ordering questions, provide a list of "items" to be ordered, and the "answer" should be an array with the items in the correct order.
            For Match the Pairs questions, provide a list of "premises" and a list of "options". The "answer" must be a single string, with each correct pair on a new line, formatted exactly as 'premise /// option'.
            For Image-Based questions, provide an AI image generation prompt in the "imagePrompt" field related to the question. The question should then ask to identify or describe something in the potential image. Do not generate an image, just the prompt for it.
            Return the output as a JSON object with a key "quiz" which is an array of question objects.
            Each question object must have:
            1. "type": (e.g., "Multiple-Choice", "Fill-in-the-Blank", "True/False", "Ordering", "Match the Pairs", "Image-Based")
            2. "question": The question text.
            3. "options": An array of strings (for Multiple-Choice and Match the Pairs).
            4. "premises": An array of strings (for Match the Pairs only).
            5. "items": An array of strings (for Ordering only).
            6. "answer": The correct answer. For Multiple-Choice, this is the string of the correct option. For Fill-in-the-Blank, it's the missing word/phrase. For Ordering, it's an array of items in the correct sequence. For Match the Pairs, this is a single multi-line string with each pair formatted as 'premise /// option'.
            7. "imagePrompt": A string for the image generation AI (for Image-Based only).
            Do not include any extra text or markdown formatting in your response.`;
            
             const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    responseMimeType: 'application/json',
                     responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            quiz: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        type: { type: Type.STRING },
                                        question: { type: Type.STRING },
                                        options: { type: Type.ARRAY, items: { type: Type.STRING } },
                                        premises: { type: Type.ARRAY, items: { type: Type.STRING } },
                                        items: { type: Type.ARRAY, items: { type: Type.STRING } },
                                        answer: {
                                            oneOf: [
                                                { type: Type.STRING },
                                                { type: Type.ARRAY, items: { type: Type.STRING } }
                                            ]
                                        },
                                        imagePrompt: { type: Type.STRING },
                                    }
                                }
                            }
                        }
                    }
                }
            });

            const quizData = JSON.parse(response.text.trim());
            onQuizGenerated({ ...quizData, topic });

        } catch (error) {
            console.error("Quiz generation failed:", error);
            handleApiError(error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="form-container">
            <form onSubmit={handleSubmit}>
                <h2>Quiz Generator</h2>
                <div className="form-group">
                    <label htmlFor="topic">Topic</label>
                    <input
                        type="text"
                        id="topic"
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        required
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="numQuestions">Number of Questions ({numQuestions})</label>
                    <input
                        type="range"
                        id="numQuestions"
                        min="3"
                        max="15"
                        value={numQuestions}
                        onChange={(e) => setNumQuestions(Number(e.target.value))}
                    />
                </div>
                <div className="form-group">
                    <div className="checkbox-group-header">
                        <label>Question Types</label>
                        <button type="button" onClick={handleSelectAll} className="select-all-btn">
                            {questionTypes.length === allQuestionTypes.length ? 'Deselect All' : 'Select All'}
                        </button>
                    </div>
                    <div className="checkbox-group">
                        {allQuestionTypes.map(type => (
                            <label key={type}>
                                <input
                                    type="checkbox"
                                    value={type}
                                    checked={questionTypes.includes(type)}
                                    onChange={(e) => {
                                        if (e.target.checked) {
                                            setQuestionTypes([...questionTypes, type]);
                                        } else {
                                            setQuestionTypes(questionTypes.filter(t => t !== type));
                                        }
                                    }}
                                />
                                <span className="checkmark"></span>
                                <span>{type}</span>
                            </label>
                        ))}
                    </div>
                </div>
                <button type="submit" disabled={isLoading}>
                    {isLoading ? <><div className="mini-spinner"></div>Generating...</> : 'Generate Quiz'}
                </button>
            </form>
        </div>
    );
};


const ChallengeQuestGenerator = ({ onQuestGenerated, handleApiError }) => {
    const [topic, setTopic] = useState('Incident Response for a Ransomware Attack');
    const [numSteps, setNumSteps] = useState(5);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = `Generate a realistic, multi-step cybersecurity scenario for a "Challenge Quest" on the topic: "${topic}".
            The scenario should have exactly ${numSteps} distinct, actionable steps.
            The goal is for a user to learn the correct procedure by observing and then replicating the order of these steps.
            Return the output as a single JSON object with two keys:
            1. "title": A concise, professional title for the scenario (e.g., "Phishing Email Triage Procedure").
            2. "steps": An array of strings, where each string is one step in the correct procedural order. The steps should be clear and imperative (e.g., "Isolate the infected machine from the network.").
            Do not include any extra text or markdown formatting in your response. Ensure the output is a valid JSON object.`;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-pro',
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            title: { type: Type.STRING },
                            steps: {
                                type: Type.ARRAY,
                                items: { type: Type.STRING }
                            }
                        }
                    }
                },
            });

            const questData = JSON.parse(response.text.trim());
            onQuestGenerated(questData);

        } catch (error) {
            console.error("Quest generation failed:", error);
            handleApiError(error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="form-container">
            <form onSubmit={handleSubmit}>
                <h2>Challenge Quest Setup</h2>
                <div className="form-group">
                    <label htmlFor="quest-topic">Scenario Topic</label>
                    <input
                        type="text"
                        id="quest-topic"
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        required
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="numSteps">Number of Steps ({numSteps})</label>
                    <input
                        type="range"
                        id="numSteps"
                        min="4"
                        max="8"
                        value={numSteps}
                        onChange={(e) => setNumSteps(Number(e.target.value))}
                    />
                </div>
                <button type="submit" disabled={isLoading}>
                    {isLoading ? <><div className="mini-spinner"></div> Creating Scenario...</> : 'Begin Quest'}
                </button>
            </form>
        </div>
    );
};


const ExamView = ({ quiz, onSubmit, onBack, userName }) => {
    const [userAnswers, setUserAnswers] = useState(Array(quiz.questions.length).fill(null));
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

    const handleAnswerChange = (qIndex, answer) => {
        const newAnswers = [...userAnswers];
        newAnswers[qIndex] = answer;
        setUserAnswers(newAnswers);
    };

    const handleNext = () => {
        if (currentQuestionIndex < quiz.questions.length - 1) {
            setCurrentQuestionIndex(currentQuestionIndex + 1);
        }
    };
    
    const handlePrevious = () => {
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex(currentQuestionIndex - 1);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(userAnswers);
    };

    const currentQuestion = quiz.questions[currentQuestionIndex];
    const progress = (currentQuestionIndex / quiz.questions.length) * 100;
    const isAnswered = userAnswers[currentQuestionIndex] !== null && userAnswers[currentQuestionIndex] !== '';


    return (
        <div className="generated-quiz-view content-card animate-in">
            <div className="quiz-actions-header">
                <button onClick={onBack} className="back-btn no-print"><i className="fas fa-arrow-left"></i> Back to Generator</button>
            </div>
            
            <div className="exam-intro">
                 <h2>{quiz.topic} Assessment</h2>
                 <p>Welcome, {userName}. Please answer the following questions.</p>
            </div>
            
             <div className="exam-progress-container">
                <div className="progress-bar">
                    <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
                </div>
                <span className="progress-text">{currentQuestionIndex + 1} / {quiz.questions.length}</span>
            </div>

            <form onSubmit={handleSubmit}>
                <div className="exam-question fade-in">
                    <h4>Question {currentQuestionIndex + 1}: {currentQuestion.question}</h4>
                    
                    {currentQuestion.type === 'Multiple-Choice' && (
                        <div className="exam-options">
                            {(currentQuestion.options || []).map((option, index) => (
                                <label key={index} className="option-label">
                                    <input
                                        type="radio"
                                        name={`q${currentQuestionIndex}`}
                                        value={option}
                                        checked={userAnswers[currentQuestionIndex] === option}
                                        onChange={(e) => handleAnswerChange(currentQuestionIndex, e.target.value)}
                                    />
                                    <span>{option}</span>
                                </label>
                            ))}
                        </div>
                    )}

                    {currentQuestion.type === 'Fill-in-the-Blank' && (
                        <input
                            type="text"
                            className="fill-blank-input"
                            value={userAnswers[currentQuestionIndex] || ''}
                            onChange={(e) => handleAnswerChange(currentQuestionIndex, e.target.value)}
                        />
                    )}
                    
                     {currentQuestion.type === 'True/False' && (
                        <div className="exam-options">
                            {['True', 'False'].map((option, index) => (
                                <label key={index} className="option-label">
                                    <input
                                        type="radio"
                                        name={`q${currentQuestionIndex}`}
                                        value={option}
                                        checked={userAnswers[currentQuestionIndex] === option}
                                        onChange={(e) => handleAnswerChange(currentQuestionIndex, e.target.value)}
                                    />
                                    <span>{option}</span>
                                </label>
                            ))}
                        </div>
                    )}

                    {currentQuestion.type === 'Match the Pairs' && (
                       <MatchThePairsQuestion 
                           q={currentQuestion} 
                           qIndex={currentQuestionIndex} 
                           userAnswer={userAnswers[currentQuestionIndex]}
                           onAnswerChange={handleAnswerChange}
                       />
                    )}

                     {currentQuestion.type === 'Ordering' && (
                       <OrderingQuestion 
                           q={currentQuestion} 
                           qIndex={currentQuestionIndex} 
                           userAnswer={userAnswers[currentQuestionIndex]}
                           onAnswerChange={handleAnswerChange}
                       />
                    )}
                </div>
                
                <div className="exam-navigation">
                     <button type="button" onClick={handlePrevious} disabled={currentQuestionIndex === 0} className="secondary-btn">Previous</button>
                    {currentQuestionIndex < quiz.questions.length - 1 ? (
                        <button type="button" onClick={handleNext} disabled={!isAnswered}>Next Question</button>
                    ) : (
                        <button type="submit">Submit Answers</button>
                    )}
                </div>
            </form>
        </div>
    );
};

const ChallengeQuestView = ({ quest, onComplete, onBack, handleApiError }) => {
    const [phase, setPhase] = useState('briefing'); // briefing -> challenge -> debriefing
    const [userAnswer, setUserAnswer] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [debriefing, setDebriefing] = useState('');
    
    // For briefing phase
    const [currentStepIndex, setCurrentStepIndex] = useState(-1);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const audioContextRef = useRef(null);
    const audioQueueRef = useRef([]);
    const isPlayingRef = useRef(false);
    const audioSourceRef = useRef(null);
    const isMountedRef = useRef(true);
    const questSteps = quest?.steps || [];

    useEffect(() => {
        isMountedRef.current = true;
        // Cleanup function to run when the component unmounts
        return () => {
            isMountedRef.current = false;
            // Stop any playing audio source to prevent it from continuing after unmount
            if (audioSourceRef.current) {
                try {
                    audioSourceRef.current.stop();
                } catch (e) {
                    console.warn("Could not stop audio source on unmount:", e);
                }
            }
            // Close the audio context to release system resources
            if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
                audioContextRef.current.close();
            }
        };
    }, []);

     useEffect(() => {
        if (phase === 'briefing') {
            const timer = setTimeout(() => {
                if (isMountedRef.current) setCurrentStepIndex(0);
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [phase]);
    
    useEffect(() => {
        if (phase === 'briefing' && currentStepIndex >= 0 && currentStepIndex < questSteps.length) {
            playText(questSteps[currentStepIndex]);
        }
    }, [currentStepIndex, phase, questSteps]);


    const playText = async (text) => {
        audioQueueRef.current.push(text);
        if (isPlayingRef.current || !isMountedRef.current) return;
        
        isPlayingRef.current = true;
        setIsSpeaking(true);
        
        if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        } else if (audioContextRef.current.state === 'suspended') {
            audioContextRef.current.resume();
        }

        while(audioQueueRef.current.length > 0) {
            const currentText = audioQueueRef.current.shift();
            try {
                 const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
                 const response = await ai.models.generateContent({
                    model: "gemini-2.5-flash-preview-tts",
                    contents: [{ parts: [{ text: currentText }] }],
                    config: {
                        responseModalities: [Modality.AUDIO],
                        speechConfig: {
                            voiceConfig: {
                                prebuiltVoiceConfig: { voiceName: 'Kore' },
                            },
                        },
                    },
                });
                
                if (!isMountedRef.current) return;
                
                const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
                if (base64Audio) {
                    const audioBuffer = await decodeAudioData(
                        decode(base64Audio),
                        audioContextRef.current,
                        24000,
                        1,
                    );
                    const source = audioContextRef.current.createBufferSource();
                    audioSourceRef.current = source;
                    source.buffer = audioBuffer;
                    source.connect(audioContextRef.current.destination);
                    
                    await new Promise<void>(resolve => {
                        source.onended = () => {
                            audioSourceRef.current = null;
                            if (!isMountedRef.current) return resolve();
                            
                            if (currentStepIndex < questSteps.length - 1) {
                                setCurrentStepIndex(i => i + 1);
                            } else {
                                setTimeout(() => {
                                    if (isMountedRef.current) setPhase('challenge');
                                }, 1000);
                            }
                            resolve();
                        };
                        source.start();
                    });
                }
            } catch (error) {
                if (!isMountedRef.current) return;
                console.error('TTS failed:', error);
                handleApiError(error);
                 if (currentStepIndex < questSteps.length - 1) {
                    setCurrentStepIndex(i => i + 1);
                } else {
                    setTimeout(() => {
                        if (isMountedRef.current) setPhase('challenge');
                    }, 1000);
                }
            }
        }
        
        if (!isMountedRef.current) return;
        isPlayingRef.current = false;
        setIsSpeaking(false);
    };


    const handleChallengeSubmit = (finalOrder) => {
        setUserAnswer(finalOrder);
        setPhase('debriefing');
    };
    
    const generateDebriefing = async () => {
        setIsLoading(true);
        setDebriefing('');
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = `A cybersecurity trainee was given the following scenario: "${quest.title}".
            The correct order of steps is:
            ${questSteps.map((s, i) => `${i + 1}. ${s}`).join('\n')}
            
            Their submitted order was:
            ${(userAnswer || []).map((s, i) => `${i + 1}. ${s}`).join('\n')}
            
            Provide a professional "debriefing". Explain concisely why the correct order is crucial for success in this scenario. Focus on the logic and consequences of performing steps in the wrong sequence. Address the user directly as "you". Keep it under 150 words.`;
            
             const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
            });
            if (isMountedRef.current) setDebriefing(response.text);

        } catch (error) {
            console.error("Debriefing generation failed:", error);
            if (isMountedRef.current) {
                handleApiError(error);
                setDebriefing("Failed to generate debriefing. Please check the console for errors.");
            }
        } finally {
            if (isMountedRef.current) setIsLoading(false);
        }
    };

    return (
        <div className="content-card animate-in">
             <div className="quiz-actions-header">
                <button onClick={onBack} className="back-btn no-print"><i className="fas fa-arrow-left"></i> Back to Setup</button>
            </div>
            
            <h2>Challenge Quest: {quest.title}</h2>

            {phase === 'briefing' && (
                <div className="quest-briefing-view">
                    <h3>The Briefing: Observe the Expert</h3>
                    <p>Oracle, our AI expert, will now demonstrate the correct procedure. Pay close attention.</p>
                     <div className="quest-steps-container">
                        {questSteps.map((step, index) => (
                            <div key={index} className={`quest-step ${index <= currentStepIndex ? 'visible' : ''}`}>
                                <strong>Step {index + 1}:</strong> {step}
                            </div>
                        ))}
                    </div>
                    {isSpeaking && <div className="speaking-indicator">Oracle is speaking...</div>}
                </div>
            )}
            
            {phase === 'challenge' && (
                 <div className="quest-challenge-view">
                    <h3>Your Turn: Replicate the Procedure</h3>
                    <p>Now, show what you've learned. Arrange the steps into the correct procedural order.</p>
                     <OrderingQuestion 
                        q={{ items: questSteps }} 
                        qIndex={0} 
                        userAnswer={null}
                        onAnswerChange={(index, answer) => setUserAnswer(answer)} // Temporarily store answer
                    />
                    <button onClick={() => handleChallengeSubmit(userAnswer)} disabled={!userAnswer}>Submit Sequence</button>
                 </div>
            )}
            
            {phase === 'debriefing' && (
                <div className="quest-debriefing-view">
                    <h3>The Debriefing: Results & Analysis</h3>
                    <div className="debriefing-comparison">
                        <div className="comparison-column">
                            <h4>Correct Order</h4>
                            <ol>
                                {questSteps.map((step, i) => <li key={i}>{step}</li>)}
                            </ol>
                        </div>
                         <div className="comparison-column">
                            <h4>Your Answer</h4>
                             <ol>
                                {(userAnswer || []).map((step, i) => {
                                    const isCorrect = questSteps[i] === step;
                                    return <li key={i} className={isCorrect ? 'correct' : 'incorrect'}>{step}</li>;
                                })}
                            </ol>
                        </div>
                    </div>
                    
                    <div className="debriefing-actions">
                         <button onClick={generateDebriefing} disabled={isLoading}>
                            {isLoading ? <><div className="mini-spinner"></div> Analyzing...</> : 'Request AI Debriefing'}
                        </button>
                        <button onClick={onComplete} className="secondary-btn">Try Another Quest</button>
                    </div>
                    
                    {debriefing && (
                        <div className="ai-debriefing-content">
                            <h4>Oracle's Analysis</h4>
                            <p>{debriefing}</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const ExamResults = ({ results, quiz, onRetry, onRetryIncorrect, onNewQuiz, onViewCertificate, handleApiError }) => {
    const { score, correct, incorrect, total } = results;
    const passThreshold = 70;
    const passed = score >= passThreshold;

    return (
        <div className="exam-results content-card animate-in">
            <h2>Assessment Complete</h2>
            <p>You scored:</p>
            <div className={`score ${passed ? 'pass' : 'fail'}`}>{score}%</div>
            <p>{correct} out of {total} questions correct.</p>
            
            <div className="results-actions">
                <button onClick={onNewQuiz}>New Quiz</button>
                <button onClick={onRetry}>Retry Full Quiz</button>
                {incorrect > 0 && (
                    <button onClick={onRetryIncorrect} className="retry-incorrect-btn">
                        Retry {incorrect} Incorrect Questions
                    </button>
                )}
                {passed && <button onClick={onViewCertificate} className="download-cert-btn">Claim Certificate</button>}
            </div>
            
            <ExamReview results={results} quiz={quiz} handleApiError={handleApiError} />
        </div>
    );
};

const ExamReview = ({ results, quiz, handleApiError }) => {
    const [hint, setHint] = useState({});
    const [explanation, setExplanation] = useState({});
    const [sources, setSources] = useState({});
    const [isLoading, setIsLoading] = useState({});
    
     const getAiHelp = async (qIndex, type) => {
        setIsLoading(prev => ({...prev, [`${type}-${qIndex}`]: true}));
        const question = quiz.questions[qIndex];
        const helpType = type === 'hint' ? 'a brief hint' : 'a detailed explanation';
        const isExplanation = type === 'explanation';

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = `For the cybersecurity question: "${question.question}", provide ${helpType}. The correct answer is "${JSON.stringify(question.answer)}". Be concise and helpful for a student.`;
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    ...(isExplanation && { tools: [{ googleSearch: {} }] })
                }
            });
            
            if(type === 'hint') {
                setHint(prev => ({...prev, [qIndex]: response.text}));
            } else {
                setExplanation(prev => ({...prev, [qIndex]: response.text}));
                const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
                if (groundingChunks) {
                    setSources(prev => ({ ...prev, [qIndex]: groundingChunks }));
                }
            }

        } catch (error) {
            console.error(`${type} generation failed:`, error);
            handleApiError(error);
        } finally {
             setIsLoading(prev => ({...prev, [`${type}-${qIndex}`]: false}));
        }
    };

    const renderAnswerText = (answer, questionType) => {
        if (answer === null || answer === undefined || answer === '') return "No answer";

        if (questionType === 'Match the Pairs') {
            let answerObj = answer;
            if (typeof answer === 'string') {
                // This is the correct answer from the model. Parse it.
                try {
                    const parsedObj = {};
                    answer.split('\n').forEach(line => {
                        const parts = line.split(' /// ');
                        if(parts.length === 2) {
                            parsedObj[parts[0].trim()] = parts[1].trim();
                        }
                    });
                    answerObj = parsedObj;
                } catch (e) {
                    return answer; // Not parseable, display as is.
                }
            }
             // User answer is already an object
            if (typeof answerObj === 'object' && answerObj !== null) {
                return Object.entries(answerObj).map(([key, val]) => <div key={key}>{key}: {val as string}</div>);
            }
        }
        
        if (Array.isArray(answer)) {
            return answer.join(', ');
        }
        
        if (typeof answer === 'object' && answer !== null) {
            return JSON.stringify(answer); // Fallback for any other objects
        }

        return String(answer);
    };

    return (
        <div className="exam-review">
            <h3>Review Your Answers</h3>
            {quiz.questions.map((q, i) => {
                const result = results.detailed[i];
                return (
                    <div key={i} className={`exam-question-review ${result.isCorrect ? 'correct' : 'incorrect'}`}>
                        <div className="question-header">
                            <strong>Question {i + 1}: {q.question}</strong>
                            <span>{result.isCorrect ? '✅ Correct' : '❌ Incorrect'}</span>
                        </div>
                         <div className="answer-line">
                            <span>Your answer:</span>
                            <strong>
                                {renderAnswerText(result.userAnswer, q.type)}
                            </strong>
                        </div>
                         {!result.isCorrect && (
                            <div className="answer-line">
                               <span>Correct answer:</span>
                                <strong>
                                    {renderAnswerText(q.answer, q.type)}
                                </strong>
                           </div>
                        )}
                        
                        <div className="ai-professor">
                            <button onClick={() => getAiHelp(i, 'hint')} disabled={isLoading[`hint-${i}`]}>
                                {isLoading[`hint-${i}`] ? <div className="mini-spinner"></div> : 'Get Hint'}
                            </button>
                             <button onClick={() => getAiHelp(i, 'explanation')} disabled={isLoading[`explanation-${i}`]}>
                                {isLoading[`explanation-${i}`] ? <div className="mini-spinner"></div> : 'Explain Answer'}
                            </button>
                        </div>
                        {hint[i] && <div className="hint-content fade-in">{hint[i]}</div>}
                        {explanation[i] && (
                            <>
                                <div className="explanation-content fade-in">{explanation[i]}</div>
                                {sources[i] && (
                                    <div className="explanation-sources fade-in">
                                        <h4>Sources from Google Search</h4>
                                        <ul>
                                            {(sources[i] || []).map((source, idx) => (
                                                source.web && <li key={idx}><a href={source.web.uri} target="_blank" rel="noopener noreferrer">{source.web.title || source.web.uri}</a></li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                );
            })}
        </div>
    );
};


const QuizPaperView = ({ quiz, onBack }) => {
    const [showAnswers, setShowAnswers] = useState(false);
    return (
        <div className="generated-quiz-view content-card animate-in">
            <div className="quiz-actions-header no-print">
                <button onClick={onBack} className="back-btn"><i className="fas fa-arrow-left"></i> Back to Generator</button>
                <div className="actions-right">
                    <label className="toggle-answers">
                        <span>Show Answers</span>
                        <input type="checkbox" checked={showAnswers} onChange={() => setShowAnswers(!showAnswers)} />
                        <span className="slider"></span>
                    </label>
                    <button onClick={() => window.print()} className="print-btn"><i className="fas fa-print"></i> Print</button>
                </div>
            </div>
            <div className="quiz-paper">
                <div className="quiz-paper-header">
                    <h1>{quiz.topic} Quiz</h1>
                    <div className="quiz-meta">
                        <span>Name: _________________________</span>
                        <span>Date: _________________________</span>
                        <span>Score: ______ / {quiz.questions.length}</span>
                    </div>
                </div>

                <div className="quiz-paper-section">
                    {quiz.questions.map((q, index) => (
                        <div key={index} className="quiz-question-card">
                            <p><strong>{index + 1}. {q.question}</strong></p>
                            {q.type === 'Multiple-Choice' && (
                                <ul className="mc-options">
                                    {(q.options || []).map((opt, i) => <li key={i}>{opt}</li>)}
                                </ul>
                            )}
                            {q.type === 'Fill-in-the-Blank' && <p>Answer: <span className="fill-blank-space"></span></p>}
                            {q.type === 'True/False' && <p>Answer: True / False</p>}
                            {q.type === 'Match the Pairs' && (
                                <div className="match-display">
                                    <div className="match-column-display">
                                        <strong>Column A</strong>
                                        <ul>{(q.premises || []).map((p, i) => <li key={i}>{i+1}. {p}</li>)}</ul>
                                    </div>
                                    <div className="match-column-display">
                                        <strong>Column B</strong>
                                         <ul>{(q.options || []).map((o, i) => <li key={i}>{String.fromCharCode(65 + i)}. {o}</li>)}</ul>
                                    </div>
                                </div>
                            )}
                            {q.type === 'Ordering' && (
                                <div>
                                    <p><em>Order the following items:</em></p>
                                    <ul>{(q.items || []).map((item, i) => <li key={i}>{item}</li>)}</ul>
                                </div>
                            )}
                            {q.type === 'Image-Based' && (
                                <p className="image-prompt-note">
                                    <em>(Instructor: Generate an image using the prompt: "{q.imagePrompt}")</em>
                                </p>
                            )}
                        </div>
                    ))}
                </div>

                <div className={`answer-key-section ${showAnswers ? 'visible' : ''}`}>
                    <h3>Answer Key</h3>
                    {quiz.questions.map((q, index) => (
                         <div key={index} className="answer-card">
                            <p><strong>{index + 1}.</strong> {Array.isArray(q.answer) ? q.answer.join(', ') : typeof q.answer === 'object' ? JSON.stringify(q.answer) : q.answer}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const PrivacyPolicyModal = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-content animate-in" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>Privacy Policy</h3>
                    <button onClick={onClose} className="close-btn" aria-label="Close Privacy Policy">&times;</button>
                </div>
                <div className="modal-body">
                    <h4>1. Information We Collect</h4>
                    <p>This application operates entirely client-side. We do not collect, store, or transmit any personal data, including your name, quiz topics, or generated content. All operations are processed within your browser.</p>
                    
                    <h4>2. API Usage</h4>
                    <p>The application interacts with the Google Gemini API to generate content. The API key is managed by the execution environment and is not stored or logged by this application. All API requests are made directly from your browser to Google's servers. Please refer to Google's API Privacy Policy for information on how they handle data.</p>

                    <h4>3. Use of Local Storage</h4>
                    <p>We may use your browser's local storage to save application settings, such as your preferred theme (light/dark), for your convenience. This data is stored only on your device and is not accessible by us.</p>
                    
                    <h4>4. No Cookies or Tracking</h4>
                    <p>NexusLearn AI does not use cookies or any other third-party tracking technologies for analytics or advertising purposes.</p>

                    <h4>5. Changes to This Policy</h4>
                    <p>We may update this Privacy Policy from time to time. Any changes will be reflected on this page. This policy is effective as of {new Date().getFullYear()}.</p>
                </div>
            </div>
        </div>
    );
};

const Header = ({ currentView, setView, theme, toggleTheme }) => (
    <header className="eco-header">
        <a href="#" className="rotating-logo-container" onClick={() => setView('generator')} aria-label="NexusLearn AI Home">
            <svg className="rotating-logo-svg" viewBox="0 0 100 100">
                <path id="circlePath" fill="none" d="M 10, 50 a 40,40 0 1,1 80,0 a 40,40 0 1,1 -80,0" />
                <text className="logo-text-path">
                    <textPath href="#circlePath">NEXUSLEARN AI • CYBERSECURITY TRAINING • </textPath>
                </text>
            </svg>
            <i className="fas fa-brain logo-icon-center"></i>
        </a>
        <nav className="site-nav">
             <button onClick={() => setView('generator')} className={`nav-link ${currentView.startsWith('generator') ? 'active' : ''}`}>Generator</button>
             <button onClick={() => setView('about')} className={`nav-link ${currentView === 'about' ? 'active' : ''}`}>About</button>
        </nav>
        <div className="header-controls">
            <div className="theme-switch-wrapper">
                <label className="theme-switch" htmlFor="theme-toggle">
                    <input type="checkbox" id="theme-toggle" onChange={toggleTheme} checked={theme === 'light'} />
                    <span className="slider round"></span>
                </label>
            </div>
             <div className="user-profile" title="User Profile">NL</div>
        </div>
    </header>
);

const Footer = ({ setView, handleNavigateToContact, openPrivacyModal }) => (
    <footer className="site-footer">
        <div className="footer-content">
            <div className="footer-section">
                <div className="footer-logo-container rotating-logo-container">
                     <svg className="rotating-logo-svg" viewBox="0 0 100 100">
                        <path id="footerCirclePath" fill="none" d="M 10, 50 a 40,40 0 1,1 80,0 a 40,40 0 1,1 -80,0" />
                        <text className="logo-text-path">
                            <textPath href="#footerCirclePath">NEXUSLEARN AI • CYBERSECURITY TRAINING • </textPath>
                        </text>
                    </svg>
                    <i className="fas fa-brain logo-icon-center"></i>
                </div>
                <p>Empowering the next generation of cybersecurity experts with AI-driven, adaptive learning.</p>
            </div>
            <div className="footer-section">
                <h3>Quick Links</h3>
                <ul>
                    <li><a href="#" onClick={(e) => { e.preventDefault(); setView('generator'); }}>Home</a></li>
                    <li><a href="#contact" onClick={(e) => { e.preventDefault(); handleNavigateToContact(); }}>Contact</a></li>
                    <li><a href="#" onClick={(e) => { e.preventDefault(); openPrivacyModal(); }}>Privacy Policy</a></li>
                </ul>
            </div>
             <div className="footer-section">
                <h3>Follow Us</h3>
                <p>Stay updated with the latest in cybersecurity education.</p>
                <div className="social-icons">
                    <a href="https://www.linkedin.com/in/nwaiwu-chibuzor" aria-label="LinkedIn Profile" target="_blank" rel="noopener noreferrer"><i className="fab fa-linkedin"></i></a>
                    <a href="https://github.com/c-nwaiwu" aria-label="GitHub Repository" target="_blank" rel="noopener noreferrer"><i className="fab fa-github"></i></a>
                    <a href="https://x.com/nwaiwu_codes" aria-label="Twitter Page" target="_blank" rel="noopener noreferrer"><i className="fab fa-twitter"></i></a>
                </div>
            </div>
        </div>
        <div className="footer-bottom">
            &copy; {new Date().getFullYear()} NexusLearn AI. All Rights Reserved.
        </div>
    </footer>
);


const App = () => {
    const [theme, setTheme] = useState('dark');
    const [view, setView] = useState('generator');
    const [quiz, setQuiz] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [userAnswers, setUserAnswers] = useState(null);
    const [examResults, setExamResults] = useState(null);
    const [userName, setUserName] = useState('Cyber Defender');
    const [isChatbotOpen, setIsChatbotOpen] = useState(false);
    const [learningMode, setLearningMode] = useState('quiz'); // 'quiz' or 'quest'
    const [quest, setQuest] = useState(null);
    const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
    const [scrollToContactFlag, setScrollToContactFlag] = useState(false);

    useEffect(() => {
        document.body.className = theme;
    }, [theme]);

    useEffect(() => {
        if (view === 'about' && scrollToContactFlag) {
            const contactSection = document.getElementById('contact');
            if (contactSection) {
                contactSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
            setScrollToContactFlag(false);
        }
    }, [view, scrollToContactFlag]);

    const handleNavigateToContact = () => {
        setView('about');
        setScrollToContactFlag(true);
    };

    const toggleTheme = () => {
        setTheme(theme === 'dark' ? 'light' : 'dark');
    };
    
    const handleApiError = (e) => {
        const message = e.message || "An unexpected error occurred. Please try again.";
        console.error("API Error caught by handler:", e);
        setError(message);
        setTimeout(() => setError(null), 7000); // Auto-dismiss error after 7 seconds
    };

    const handleQuizGenerated = (generatedQuiz) => {
        const normalizedQuiz = {
            questions: generatedQuiz.quiz || [],
            topic: generatedQuiz.topic,
        };
        setQuiz(normalizedQuiz);
        setView('exam_start');
    };
    
    const handleQuestGenerated = (generatedQuest) => {
        setQuest(generatedQuest);
        setView('quest_view');
    };

    const handleStartExam = (name) => {
        setUserName(name);
        setExamResults(null);
        setUserAnswers(Array(quiz.questions.length).fill(null));
        setView('exam');
    };
    
    const handleQuestComplete = () => {
        setQuest(null);
        setLearningMode('quiz'); // Or back to quest generator
        setView('generator');
    };

    const handleSubmitExam = (finalAnswers) => {
        setUserAnswers(finalAnswers);
        let correctCount = 0;
        const detailedResults = quiz.questions.map((q, i) => {
            let isCorrect = false;
            if (q.type === 'Ordering') {
                isCorrect = JSON.stringify(finalAnswers[i]) === JSON.stringify(q.answer);
            } else if (q.type === 'Match the Pairs') {
                const userAnswerObj = finalAnswers[i];
                if (!userAnswerObj || typeof userAnswerObj !== 'object') {
                    isCorrect = false;
                } else {
                    try {
                        const correctAnswerObj = {};
                        const pairs = (q.answer as string).split('\n');
                        for (const pair of pairs) {
                            const parts = pair.split(' /// ');
                            if (parts.length === 2) {
                                correctAnswerObj[parts[0].trim()] = parts[1].trim();
                            }
                        }

                        const correctKeys = Object.keys(correctAnswerObj);
                        const userKeys = Object.keys(userAnswerObj);

                        if (correctKeys.length !== userKeys.length) {
                             isCorrect = false;
                        } else {
                            isCorrect = correctKeys.every(key => correctAnswerObj[key] === userAnswerObj[key]);
                        }
                    } catch (e) {
                        console.error("Failed to parse or compare answer for Match the Pairs:", q.answer, e);
                        isCorrect = false;
                    }
                }
            }
            else {
                 isCorrect = finalAnswers[i]?.toString().toLowerCase() === q.answer.toString().toLowerCase();
            }
            
            if (isCorrect) correctCount++;
            return { question: q.question, userAnswer: finalAnswers[i], correctAnswer: q.answer, isCorrect };
        });

        setExamResults({
            score: Math.round((correctCount / quiz.questions.length) * 100),
            correct: correctCount,
            incorrect: quiz.questions.length - correctCount,
            total: quiz.questions.length,
            detailed: detailedResults,
        });
        setView('results');
    };

    const handleRetry = () => {
        setView('exam_start');
    };
    
    const handleRetryIncorrect = () => {
        const incorrectQuestions = quiz.questions.filter((q, i) => !examResults.detailed[i].isCorrect);
        const incorrectQuiz = { topic: `${quiz.topic} (Incorrect Questions)`, questions: incorrectQuestions };
        setQuiz(incorrectQuiz);
        setView('exam_start');
    };
    
    const handleNewQuiz = () => {
        setQuiz(null);
        setExamResults(null);
        setView('generator');
    };
    
    const handleDownloadCertificate = () => {
        const certElement = document.getElementById('certificate');
        if (certElement) {
             html2canvas(certElement, {
                scale: 3, // Higher scale for better resolution
                useCORS: true,
                backgroundColor: null, // Use element's background
            }).then(canvas => {
                const link = document.createElement('a');
                link.download = `Certificate_${userName}_${quiz.topic.replace(/\s+/g, '_')}.png`;
                link.href = canvas.toDataURL('image/png');
                link.click();
            });
        }
    };


    const renderContent = () => {
        switch(view) {
            case 'exam_start':
                return (
                     <div className="exam-intro content-card animate-in">
                        <h2>Ready for your assessment?</h2>
                        <p>You have generated a quiz on <strong>{quiz.topic}</strong> with {quiz.questions.length} questions.</p>
                        <form onSubmit={(e) => { e.preventDefault(); handleStartExam(userName); }} className="start-exam-form">
                            <div className="form-group">
                                <label htmlFor="userName">Enter Your Name</label>
                                <input type="text" id="userName" value={userName} onChange={(e) => setUserName(e.target.value)} required />
                            </div>
                            <button type="submit">Start Exam</button>
                        </form>
                    </div>
                );
            case 'exam':
                return <ExamView quiz={quiz} onSubmit={handleSubmitExam} onBack={handleNewQuiz} userName={userName} />;
            case 'results':
                return <ExamResults 
                    results={examResults} 
                    quiz={quiz} 
                    onRetry={handleRetry} 
                    onRetryIncorrect={handleRetryIncorrect}
                    onNewQuiz={handleNewQuiz}
                    onViewCertificate={() => setView('certificate')}
                    handleApiError={handleApiError}
                />;
            case 'paper':
                return <QuizPaperView quiz={quiz} onBack={handleNewQuiz} />;
            case 'about':
                return <AboutPage />;
            case 'certificate': {
                const certificateTitle = examResults?.score === 100 ? "Certificate of Mastery" : "Certificate of Achievement";
                return <Certificate title={certificateTitle} name={userName} topic={quiz.topic} onDownload={handleDownloadCertificate} handleApiError={handleApiError} />;
            }
            case 'quest_view':
                return <ChallengeQuestView quest={quest} onComplete={handleQuestComplete} onBack={handleNewQuiz} handleApiError={handleApiError} />;
            case 'generator':
            default:
                return (
                     <div className="generator-view">
                         <div className="mode-switcher no-print">
                            <button 
                                className={`mode-tab ${learningMode === 'quiz' ? 'active' : ''}`}
                                onClick={() => setLearningMode('quiz')}>
                                Quiz Generator
                            </button>
                            <button 
                                className={`mode-tab ${learningMode === 'quest' ? 'active' : ''}`}
                                onClick={() => setLearningMode('quest')}>
                                Challenge Quest
                            </button>
                        </div>
                        <div className="content-card animate-in">
                        {learningMode === 'quiz' ? 
                            <QuizGenerator onQuizGenerated={handleQuizGenerated} handleApiError={handleApiError} /> :
                            <ChallengeQuestGenerator onQuestGenerated={handleQuestGenerated} handleApiError={handleApiError} />
                        }
                        </div>
                        <div className="quiz-container-placeholder">
                             {isLoading ? <QuizSkeleton /> : 
                             (<>
                                 <i className="fas fa-tasks" style={{fontSize: '4rem', opacity: '0.3', marginBottom: '1rem'}}></i>
                                 <h3>Your Custom Learning Experience Awaits</h3>
                                 <p>Configure your desired {learningMode} on the left and let our AI create a tailored challenge for you.</p>
                            </>)
                             }
                        </div>
                    </div>
                );
        }
    };

    return (
        <>
            <Header currentView={view} setView={setView} theme={theme} toggleTheme={toggleTheme} />
            <main>
                <div className="page-container">
                    {error && (
                         <div className="error-banner" role="alert">
                            <div className="error-banner-content">
                                <i className="fas fa-exclamation-circle error-banner-icon"></i>
                                <p>{error}</p>
                            </div>
                            <button onClick={() => setError(null)} className="error-banner-close" aria-label="Close">&times;</button>
                        </div>
                    )}
                    {renderContent()}
                </div>
            </main>
             <button className="chatbot-fab" onClick={() => setIsChatbotOpen(true)} aria-label="Open AI Expert Chatbot">
                <i className="fas fa-hat-wizard"></i>
            </button>
            <CyberExpertChatbot isOpen={isChatbotOpen} onClose={() => setIsChatbotOpen(false)} handleApiError={handleApiError} />
            <PrivacyPolicyModal isOpen={isPrivacyModalOpen} onClose={() => setIsPrivacyModalOpen(false)} />
            <Footer setView={setView} handleNavigateToContact={handleNavigateToContact} openPrivacyModal={() => setIsPrivacyModalOpen(true)} />
        </>
    );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
