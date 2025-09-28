import React, { useState, useRef, useEffect } from 'react'
import { 
  Send, 
  Mic, 
  MicOff, 
  Camera, 
  Play, 
  Pause, 
  Download, 
  Globe, 
  Wifi, 
  WifiOff,
  Bot,
  User,
  Leaf,
  Upload,
  FileText
} from 'lucide-react'
import { smartKissanAgent, type AgentInput, type AgentResponse } from '../lib/smartKissanAgent'

interface Message {
  id: string
  type: 'user' | 'smartkissan'
  content: string
  timestamp: Date
  messageType?: 'text' | 'speech' | 'image+speech'
  image?: string
  agentResponse?: AgentResponse
}

interface SmartKissanChatProps {
  onBack: () => void
}

export default function SmartKissanChat({ onBack }: SmartKissanChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputText, setInputText] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [isOffline, setIsOffline] = useState(false)
  const [language, setLanguage] = useState<'en' | 'ur'>('en')
  const [isLoading, setIsLoading] = useState(false)
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null)
  const [processingAgent, setProcessingAgent] = useState(false)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const synthRef = useRef<SpeechSynthesis | null>(null)

  useEffect(() => {
    // Initialize speech recognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.continuous = false
      recognitionRef.current.interimResults = false
      recognitionRef.current.lang = language === 'en' ? 'en-US' : 'ur-PK'
    }

    // Initialize speech synthesis
    if ('speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis
    }

    // Add welcome message
    const welcomeMessage: Message = {
      id: '1',
      type: 'smartkissan',
      content: language === 'en' 
        ? "Hello! I'm Smart Kissan, your AI farming companion. I can help you with crop diseases, fertilizer recommendations, weather advice, and more. You can type, speak, or upload images of your crops!"
        : "السلام علیکم! میں Smart Kissan ہوں، آپ کا AI کاشتکاری ساتھی۔ میں آپ کی فصلوں کی بیماریوں، کھاد کی سفارشات، موسمی مشورے اور بہت کچھ میں مدد کر سکتا ہوں۔",
      timestamp: new Date()
    }
    setMessages([welcomeMessage])
  }, [language])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSendMessage = async (text: string, type: 'text' | 'speech' | 'image+speech' = 'text', image?: string) => {
    if (!text.trim() && !image) return

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: text,
      timestamp: new Date(),
      messageType: type,
      image
    }

    setMessages(prev => [...prev, userMessage])
    setInputText('')
    setIsLoading(true)

    try {
      // Call Smart Kissan Agent
      setProcessingAgent(true)
      const agentInput: AgentInput = {
        farmer_query: text
      }
      
      const agentResponse = await smartKissanAgent.execute(agentInput)
      setProcessingAgent(false)
      
      // Use the farmer-friendly response from the agent
      const responseContent = agentResponse.final_answer || 
        (language === 'en' 
          ? "I've analyzed your request and gathered the latest data. Here's what I found:"
          : "میں نے آپ کی درخواست کا تجزیہ کیا ہے اور تازہ ترین ڈیٹا اکٹھا کیا ہے۔")
      
      const smartkissanMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'smartkissan',
        content: responseContent,
        timestamp: new Date(),
        agentResponse
      }

      setMessages(prev => [...prev, smartkissanMessage])
    } catch (error) {
      console.error('API call failed:', error)
      setProcessingAgent(false)
      
      // Fallback response
      const smartkissanMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'smartkissan',
        content: language === 'en' 
          ? "I'm having trouble connecting right now, but based on usual conditions, water your crops in the morning, check for pests, and avoid over-irrigation."
          : "فی الوقت کنکشن میں مسئلہ ہے، لیکن عام حالات کی بنیاد پر، صبح اپنی فصلوں کو پانی دیں، کیڑوں کی جانچ کریں، اور زیادہ پانی دینے سے بچیں۔",
        timestamp: new Date()
      }

      setMessages(prev => [...prev, smartkissanMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const startRecording = () => {
    if (recognitionRef.current) {
      setIsRecording(true)
      recognitionRef.current.start()
      
      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript
        setInputText(transcript)
        setIsRecording(false)
      }

      recognitionRef.current.onerror = () => {
        setIsRecording(false)
      }

      recognitionRef.current.onend = () => {
        setIsRecording(false)
      }
    }
  }

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      setIsRecording(false)
    }
  }

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const base64Image = e.target?.result as string
        // Automatically start speech recognition for image uploads
        if (recognitionRef.current) {
          setIsRecording(true)
          recognitionRef.current.start()
          
          recognitionRef.current.onresult = (event) => {
            const transcript = event.results[0][0].transcript
            handleSendMessage(transcript, 'image+speech', base64Image)
            setIsRecording(false)
          }

          recognitionRef.current.onerror = () => {
            // Send image without speech if speech recognition fails
            handleSendMessage('Image uploaded for analysis', 'image+speech', base64Image)
            setIsRecording(false)
          }
        } else {
          // Fallback if speech recognition is not available
          handleSendMessage('Image uploaded for analysis', 'image+speech', base64Image)
        }
      }
      reader.readAsDataURL(file)
    }
  }

  const playMessage = (messageId: string, text: string) => {
    if ('speechSynthesis' in window) {
      if (currentlyPlaying === messageId) {
        window.speechSynthesis.cancel()
        setCurrentlyPlaying(null)
        return
      }

      window.speechSynthesis.cancel()
      
      // Wait for voices to load
      const speakText = () => {
        const utterance = new SpeechSynthesisUtterance(text)
        const voices = window.speechSynthesis.getVoices()
        
        if (language === 'ur') {
          // Try to find Urdu voice
          const urduVoice = voices.find(voice => 
            voice.lang.includes('ur') || 
            voice.lang.includes('hi') || 
            voice.name.toLowerCase().includes('urdu') ||
            voice.name.toLowerCase().includes('hindi')
          )
          if (urduVoice) {
            utterance.voice = urduVoice
          }
          utterance.lang = 'ur-PK'
        } else {
          // English voice
          const englishVoice = voices.find(voice => 
            voice.lang.includes('en-US') || voice.lang.includes('en')
          )
          if (englishVoice) {
            utterance.voice = englishVoice
          }
          utterance.lang = 'en-US'
        }
        
        utterance.rate = 0.8
        utterance.pitch = 1
        utterance.volume = 1
        utterance.onstart = () => setCurrentlyPlaying(messageId)
        utterance.onend = () => setCurrentlyPlaying(null)
        utterance.onerror = (event) => {
          console.warn('Speech synthesis error:', event)
          setCurrentlyPlaying(null)
        }
        
        setCurrentlyPlaying(messageId)
        window.speechSynthesis.speak(utterance)
      }
      
      // Check if voices are loaded
      if (window.speechSynthesis.getVoices().length === 0) {
        window.speechSynthesis.addEventListener('voiceschanged', speakText, { once: true })
      } else {
        speakText()
      }
    } else {
      console.warn('Speech synthesis not supported in this browser')
    }
  }

  const downloadReport = () => {
    const report = {
      timestamp: new Date().toISOString(),
      language,
      messages: messages.map(msg => ({
        type: msg.type,
        content: msg.content,
        timestamp: msg.timestamp,
        analysis: msg.analysis
      }))
    }

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `agrimind-report-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'en' ? 'ur' : 'en')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="bg-green-600 p-2 rounded-lg">
                <Leaf className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">Smart Kissan</h1>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={toggleLanguage}
                className="flex items-center space-x-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium hover:bg-green-200 transition-colors duration-200"
              >
                <Globe className="w-4 h-4" />
                <span>{language === 'en' ? 'EN' : 'اردو'}</span>
              </button>
              
              <button
                onClick={() => setIsOffline(!isOffline)}
                className={`flex items-center space-x-1 px-3 py-1 rounded-full text-sm font-medium transition-colors duration-200 ${
                  isOffline 
                    ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                    : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                }`}
              >
                {isOffline ? <WifiOff className="w-4 h-4" /> : <Wifi className="w-4 h-4" />}
                <span>{isOffline ? 'Offline' : 'Online'}</span>
              </button>

              <button
                onClick={downloadReport}
                className="p-2 text-gray-600 hover:text-green-600 transition-colors duration-200"
                title="Download Report"
              >
                <Download className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Chat Messages */}
      <div className="flex-1 flex flex-col">
        {/* Welcome Section */}
        {messages.length <= 1 && (
          <div className="flex-1 flex items-center justify-center px-4 py-12">
            <div className="text-center max-w-2xl">
              <div className="mb-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Leaf className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome to Smart Kissan!</h2>
                <p className="text-lg text-green-600 font-semibold mb-4">Smart Kissan Smart Pakistan</p>
                <p className="text-gray-600 mb-8">
                  Send a photo of your crop, describe an issue, or ask any farming question.
                </p>
              </div>
              
              {/* Feature Icons */}
              <div className="grid grid-cols-4 gap-6 mb-8">
                <div className="text-center">
                  <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <span className="text-2xl">🌦</span>
                  </div>
                  <p className="text-sm text-gray-600">Weather</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <span className="text-2xl">🐛</span>
                  </div>
                  <p className="text-sm text-gray-600">Disease</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <span className="text-2xl">💧</span>
                  </div>
                  <p className="text-sm text-gray-600">Soil</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <span className="text-2xl">🌿</span>
                  </div>
                  <p className="text-sm text-gray-600">Fertilizer</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Messages */}
        {messages.length > 1 && (
          <div className="flex-1 overflow-y-auto px-4 py-6">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl ${
                    message.type === 'user'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <div className="flex items-start space-x-2">
                    {message.type === 'smartkissan' && (
                      <Bot className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    )}
                    {message.type === 'user' && (
                      <User className="w-5 h-5 text-white flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      {message.image && (
                        <img
                          src={message.image}
                          alt="Uploaded crop"
                          className="w-full max-w-xs h-48 object-cover rounded-lg mb-2 border border-gray-200"
                        />
                      )}
                      <p className="text-sm">{message.content}</p>
                      
                      {/* Agent Response Data */}
                      {message.agentResponse && (
                        <div className="mt-3 space-y-3">
                          {/* Weather Data */}
                          {message.agentResponse.weather && (
                            <div className="bg-blue-50 p-3 rounded-lg">
                              <h4 className="font-semibold text-blue-800 mb-2 flex items-center">
                                🌤️ Current Weather
                              </h4>
                              <div className="grid grid-cols-2 gap-2 text-sm text-blue-700">
                                <div>Temperature: {message.agentResponse.weather.main.temp}°C</div>
                                <div>Humidity: {message.agentResponse.weather.main.humidity}%</div>
                                <div>Pressure: {message.agentResponse.weather.main.pressure} hPa</div>
                                <div>Wind: {message.agentResponse.weather.wind.speed} m/s</div>
                              </div>
                              <p className="text-sm text-blue-600 mt-1 capitalize">
                                {message.agentResponse.weather.weather[0].description}
                              </p>
                            </div>
                          )}
                          
                          {/* Soil Data */}
                          {message.agentResponse.soil && message.agentResponse.soil.length > 0 && (
                            <div className="bg-amber-50 p-3 rounded-lg">
                              <h4 className="font-semibold text-amber-800 mb-2 flex items-center">
                                🌱 Latest Soil Data
                              </h4>
                              {message.agentResponse.soil.slice(-2).map((soil, idx) => (
                                <div key={idx} className="text-sm text-amber-700 mb-1">
                                  <div className="flex justify-between">
                                    <span>{soil.date} {soil.time}</span>
                                    <span>Moisture: {(soil.moisture * 100).toFixed(1)}%</span>
                                  </div>
                                  <div className="text-xs text-amber-600">
                                    Surface: {soil.t0}K, 10cm: {soil.t10}K
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                      
                      {message.type === 'smartkissan' && (
                        <button
                          onClick={() => playMessage(message.id, message.content)}
                          className="mt-2 flex items-center space-x-1 text-xs text-green-600 hover:text-green-700 transition-colors duration-200 bg-green-50 px-2 py-1 rounded-full"
                        >
                          {currentlyPlaying === message.id ? (
                            <Pause className="w-3 h-3" />
                          ) : (
                            <Play className="w-3 h-3" />
                          )}
                          <span>Play</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 px-4 py-3 rounded-2xl">
                  <div className="flex items-center space-x-2">
                    <Bot className="w-5 h-5 text-green-600" />
                    <div className="flex flex-col">
                      <div className="flex space-x-1 mb-1">
                        <div className="w-2 h-2 bg-green-600 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-green-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-green-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                      {processingAgent && (
                        <span className="text-xs text-green-600">Running Smart Kissan Agent...</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Input Area */}
        <div className="bg-white border-t border-gray-200 p-4">
          <div className="max-w-4xl mx-auto">
            {/* Quick Action Buttons */}
            <div className="flex items-center justify-center space-x-2 mb-4">
              <button
                onClick={() => handleSendMessage("I need water for my 2-acre farm", 'text')}
                className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs hover:bg-blue-200 transition-colors duration-200"
              >
                💧 Water Request
              </button>
              <button
                onClick={() => handleSendMessage("Need fertilizer recommendations for wheat crop", 'text')}
                className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs hover:bg-green-200 transition-colors duration-200"
              >
                🌿 Fertilizer Help
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs hover:bg-orange-200 transition-colors duration-200"
              >
                📸 Disease Check
              </button>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-3 bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 transition-colors duration-200"
                title="Upload crop image"
              >
                <Camera className="w-5 h-5" />
              </button>
              
              <button
                onClick={isRecording ? stopRecording : startRecording}
                className={`p-3 rounded-full transition-colors duration-200 ${
                  isRecording
                    ? 'bg-red-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                title={isRecording ? 'Stop recording' : 'Start voice input'}
              >
                {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>
              
              <div className="flex-1">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage(inputText)}
                  placeholder={language === 'en' ? "Ask about your crops, diseases, fertilizers..." : "فصلوں، بیماریوں، کھادوں کے بارے میں پوچھیں..."}
                  className="w-full px-4 py-3 border border-gray-300 rounded-full focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 text-gray-700"
                  disabled={isRecording}
                />
              </div>
              
              <button
                onClick={() => handleSendMessage(inputText)}
                disabled={!inputText.trim() || isLoading}
                className="p-3 bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-5 h-5 transform rotate-45" />
              </button>
            </div>
            
            {isRecording && (
              <div className="mt-2 text-center">
                <span className="text-sm text-red-600 animate-pulse">
                  {language === 'en' ? 'Listening...' : 'سن رہا ہوں...'}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center py-4 text-gray-500 bg-white border-t">
        <p className="text-sm">Built at National Agentic AI Hackathon 2025</p>
      </footer>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        className="hidden"
      />
    </div>
  )
}

// Extend Window interface for speech recognition
declare global {
  interface Window {
    SpeechRecognition: any
    webkitSpeechRecognition: any
  }
}