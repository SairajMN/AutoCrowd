'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Loader2, MessageCircle, Bot, User, Send } from 'lucide-react';

interface ChatMessage {
    id: string;
    role: 'user' | 'agent' | 'system';
    content: string;
    timestamp: Date;
    confidence?: number;
    reasoning?: string;
}

interface VerificationRequest {
    milestoneId: string;
    campaignAddress: string;
    description: string;
    evidenceHash?: string;
}

interface MilestoneChatProps {
    milestoneId: string;
    campaignAddress: string;
    description: string;
    evidenceHash?: string;
    onVerificationResult?: (result: any) => void;
}

/**
 * MilestoneChat component provides ASI:One chat interface for user-agent interactions
 * Integrates with ASI Alliance ecosystem for real-time milestone verification
 */
export default function MilestoneChat({
    milestoneId,
    campaignAddress,
    description,
    evidenceHash,
    onVerificationResult
}: MilestoneChatProps) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const scrollAreaRef = useRef<HTMLDivElement>(null);

    // Initialize chat with system message
    useEffect(() => {
        const initialMessage: ChatMessage = {
            id: 'initial',
            role: 'system',
            content: `Welcome to ASI milestone verification for milestone ${milestoneId}. I'm here to help verify your crowdfunding milestone completion using advanced AI assistance.`,
            timestamp: new Date()
        };
        setMessages([initialMessage]);
    }, [milestoneId]);

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        if (scrollAreaRef.current) {
            scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSendMessage = async () => {
        if (!inputMessage.trim()) return;

        const userMessage: ChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            content: inputMessage.trim(),
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInputMessage('');
        setIsLoading(true);

        try {
            // Call ASI:One chat API
            const response = await callAsiOneChat({
                milestoneId,
                campaignAddress,
                description,
                evidenceHash,
                userMessage: inputMessage
            });

            const agentMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'agent',
                content: response.message,
                timestamp: new Date(),
                confidence: response.confidence,
                reasoning: response.reasoning
            };

            setMessages(prev => [...prev, agentMessage]);

            // Check if this is a verification result
            if (response.verificationResult) {
                onVerificationResult?.(response.verificationResult);
            }
        } catch (error) {
            console.error('ASI chat error:', error);
            const errorMessage: ChatMessage = {
                id: (Date.now() + 2).toString(),
                role: 'system',
                content: 'Sorry, I encountered an error communicating with the ASI system. Please try again.',
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerificationRequest = async () => {
        setIsVerifying(true);

        try {
            const verificationMessage: ChatMessage = {
                id: Date.now().toString(),
                role: 'user',
                content: `Please verify this milestone: "${description}"${evidenceHash ? `\n\nEvidence Hash: ${evidenceHash}` : ''}`,
                timestamp: new Date()
            };

            setMessages(prev => [...prev, verificationMessage]);

            const response = await requestMilestoneVerification({
                milestoneId,
                campaignAddress,
                description,
                evidenceHash
            });

            const verificationResult: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'agent',
                content: response.result,
                timestamp: new Date(),
                confidence: response.confidence,
                reasoning: response.reasoning
            };

            setMessages(prev => [...prev, verificationResult]);

            if (response.verificationResult) {
                onVerificationResult?.(response.verificationResult);
            }
        } catch (error) {
            console.error('Verification error:', error);
            const errorMessage: ChatMessage = {
                id: (Date.now() + 2).toString(),
                role: 'system',
                content: 'Verification request failed. Please try again.',
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsVerifying(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    return (
        <div className="w-full max-w-2xl mx-auto bg-white rounded-lg shadow-md border border-gray-200">
            {/* Header */}
            <div className="p-6 border-b border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                    <MessageCircle className="w-5 h-5 text-blue-600" />
                    <h2 className="text-xl font-bold text-gray-900">
                        ASI Milestone Verification Chat
                    </h2>
                </div>
                <p className="text-sm text-gray-600">
                    Chat with our AI agent to verify milestone completion using ASI:One protocol
                </p>
            </div>

            {/* Content */}
            <div className="p-6 flex flex-col space-y-4">
                {/* Chat Messages */}
                <div className="h-96 overflow-y-auto rounded-md border border-gray-200 p-4" ref={scrollAreaRef}>
                    <div className="space-y-4">
                        {messages.map((message) => (
                            <div
                                key={message.id}
                                className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                {message.role !== 'user' && (
                                    <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                                        {message.role === 'agent' ? <Bot className="w-4 h-4" /> : '🤖'}
                                    </div>
                                )}

                                <div
                                    className={`max-w-[70%] rounded-lg p-3 ${message.role === 'user'
                                            ? 'bg-blue-500 text-white'
                                            : message.role === 'system'
                                                ? 'bg-gray-200 text-gray-800'
                                                : 'bg-gray-100 text-gray-900'
                                        }`}
                                >
                                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>

                                    {message.confidence && (
                                        <div className="mt-2 flex items-center gap-2">
                                            <span className="text-xs opacity-75">Confidence:</span>
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${message.confidence > 0.8
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-yellow-100 text-yellow-800'
                                                }`}>
                                                {Math.round(message.confidence * 100)}%
                                            </span>
                                        </div>
                                    )}

                                    {message.reasoning && (
                                        <div className="mt-2 text-xs opacity-75 italic">
                                            {message.reasoning}
                                        </div>
                                    )}

                                    <div className="text-xs opacity-50 mt-1">
                                        {message.timestamp.toLocaleTimeString()}
                                    </div>
                                </div>

                                {message.role === 'user' && (
                                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                                        <User className="w-4 h-4 text-white" />
                                    </div>
                                )}
                            </div>
                        ))}

                        {isLoading && (
                            <div className="flex gap-3">
                                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                                    <Bot className="w-4 h-4" />
                                </div>
                                <div className="bg-gray-100 rounded-lg p-3">
                                    <div className="flex items-center gap-2">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span className="text-sm">Agent is thinking...</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Input Section */}
                <div className="space-y-3">
                    {/* Verification Button */}
                    {!isVerifying ? (
                        <button
                            onClick={handleVerificationRequest}
                            className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                        >
                            <Bot className="w-4 h-4" />
                            Request Milestone Verification
                        </button>
                    ) : (
                        <button
                            disabled
                            className="w-full px-4 py-2 bg-gray-300 text-gray-500 rounded-lg cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Verifying Milestone...
                        </button>
                    )}

                    {/* Chat Input */}
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={inputMessage}
                            onChange={(e) => setInputMessage(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="Ask the ASI agent about milestone verification..."
                            disabled={isLoading}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                            onClick={handleSendMessage}
                            disabled={isLoading || !inputMessage.trim()}
                            className={`px-3 py-2 rounded-lg ${isLoading || !inputMessage.trim()
                                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    : 'bg-blue-500 text-white hover:bg-blue-600'
                                } transition-colors flex items-center justify-center`}
                        >
                            {isLoading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Send className="w-4 h-4" />
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

/**
 * Call ASI:One chat protocol
 */
async function callAsiOneChat(params: {
    milestoneId: string;
    campaignAddress: string;
    description: string;
    evidenceHash?: string;
    userMessage: string;
}) {
    const asiEndpoint = process.env.NEXT_PUBLIC_ASI_ENDPOINT || 'https://api.asi.one';
    const apiKey = process.env.NEXT_PUBLIC_ASI_API_KEY;

    if (!apiKey) {
        // Fallback to mock response for development
        return {
            message: "Thank you for your question. I'm analyzing the milestone verification process using ASI ecosystem capabilities.",
            confidence: 0.85,
            reasoning: "Providing helpful context using ASI knowledge graphs",
            verificationResult: null
        };
    }

    try {
        const response = await fetch(`${asiEndpoint}/chat/milestone-verification`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(params)
        });

        if (!response.ok) {
            throw new Error(`ASI API error: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('ASI:One chat API error:', error);
        throw error;
    }
}

/**
 * Request milestone verification through ASI ecosystem
 */
async function requestMilestoneVerification(request: VerificationRequest) {
    const verificationEndpoint = process.env.NEXT_PUBLIC_ASI_VERIFICATION_ENDPOINT || 'https://api.asi.one';
    const apiKey = process.env.NEXT_PUBLIC_ASI_API_KEY;

    if (!apiKey) {
        // Fallback to mock response for development
        return {
            result: "Mock verification completed. In production, this would use ASI MeTTa knowledge graphs and AgentVerse consensus.",
            confidence: 0.85,
            reasoning: "Mock agent analysis using ASI ecosystem protocols",
            verificationResult: {
                verdict: "approved",
                confidence: 0.85,
                reasoning: "Evidence analysis and agent consensus approved"
            }
        };
    }

    try {
        const response = await fetch(`${verificationEndpoint}/verify/milestone`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(request)
        });

        if (!response.ok) {
            throw new Error(`ASI verification API error: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('ASI verification API error:', error);
        throw error;
    }
}
