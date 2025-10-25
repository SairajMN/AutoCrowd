'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { WalletConnect } from '../../components/WalletConnect';
import { useWeb3 } from '../../hooks/useWeb3';

interface FormData {
    // Personal Information
    fullName: string;
    email: string;
    walletAddress: string;
    country: string;

    // Verification Details
    kycProvider: string;
    verificationLevel: string;
    verificationDate: string;

    // Project Details
    purpose: string;
    projectDescription: string;
    expectedUsage: string;

    // Metadata
    metadataURI: string;
    additionalNotes: string;
}

interface UploadedFile {
    file: File;
    type: 'identity' | 'address' | 'additional';
    preview?: string;
}

export default function VerificationPage() {
    const router = useRouter();
    const { address, isConnected } = useWeb3();

    const [formData, setFormData] = useState<FormData>({
        fullName: '',
        email: '',
        walletAddress: '',
        country: '',
        kycProvider: 'custom-form',
        verificationLevel: 'basic',
        verificationDate: new Date().toISOString().split('T')[0],
        purpose: '',
        projectDescription: '',
        expectedUsage: 'Campaign Creation',
        metadataURI: '',
        additionalNotes: ''
    });

    const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    // Auto-fill wallet address when connected
    useEffect(() => {
        if (address) {
            setFormData(prev => ({ ...prev, walletAddress: address }));
        }
    }, [address]);

    const updateFormData = (field: keyof FormData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>, type: 'identity' | 'address' | 'additional') => {
        const files = Array.from(event.target.files || []);

        files.forEach(file => {
            const newFile: UploadedFile = {
                file,
                type,
                preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined
            };
            setUploadedFiles(prev => [...prev, newFile]);
        });
    };

    const removeFile = (index: number) => {
        setUploadedFiles(prev => {
            const newFiles = [...prev];
            if (newFiles[index].preview) {
                URL.revokeObjectURL(newFiles[index].preview!);
            }
            newFiles.splice(index, 1);
            return newFiles;
        });
    };

    const validateForm = (): string | null => {
        if (!formData.fullName.trim()) return 'Full name is required';
        if (!formData.email.trim()) return 'Email is required';
        if (!formData.email.includes('@')) return 'Valid email is required';
        if (!formData.walletAddress.trim()) return 'Wallet address is required';
        if (!formData.walletAddress.match(/^0x[a-fA-F0-9]{40}$/)) return 'Valid wallet address is required';
        if (!formData.country.trim()) return 'Country is required';
        if (!formData.purpose.trim()) return 'Purpose is required';

        return null;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);

        const validationError = validateForm();
        if (validationError) {
            setError(validationError);
            setIsSubmitting(false);
            return;
        }

        try {
            // Create FormData for file uploads
            const submitData = new FormData();

            // Add form fields
            Object.entries(formData).forEach(([key, value]) => {
                submitData.append(key, value);
            });

            // Add files
            uploadedFiles.forEach((uploadedFile, index) => {
                submitData.append(`file_${index}`, uploadedFile.file);
                submitData.append(`file_${index}_type`, uploadedFile.type);
            });

            const response = await fetch('/api/verification/submit', {
                method: 'POST',
                body: submitData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Submission failed');
            }

            const result = await response.json();
            setSuccess(true);

            // Redirect to campaign creation after successful NFT minting
            setTimeout(() => {
                router.push('/create');
            }, 2000);

        } catch (err: any) {
            console.error('Submission failed:', err);
            setError(err.message || 'Failed to submit verification. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Verification Submitted!</h2>
                    <p className="text-gray-600 mb-4">
                        Your NFT verification application has been submitted successfully. Your NFT is being minted...
                    </p>
                    <p className="text-sm text-gray-500">
                        Redirecting you to campaign creation in a moment...
                    </p>
                </div>
            </div>
        );
    }

    if (!isConnected) {
        return (
            <div className="min-h-screen bg-gray-50">
                <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="text-center">
                        <h1 className="text-3xl font-bold text-gray-900 mb-4">NFT Verification</h1>
                        <p className="text-gray-600 mb-8">Connect your wallet to submit your verification application</p>
                        <WalletConnect />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-6">
                        <div className="flex items-center">
                            <Link href="/" className="text-2xl font-bold text-gray-900">
                                AutoCrowd
                            </Link>
                        </div>
                        <nav className="flex items-center space-x-6">
                            <Link href="/" className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">
                                Home
                            </Link>
                            <Link href="/create" className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">
                                Create Campaign
                            </Link>
                            <Link href="/dashboard" className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">
                                Dashboard
                            </Link>
                            <WalletConnect />
                        </nav>
                    </div>
                </div>
            </header>

            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">NFT Verification</h1>
                    <p className="mt-2 text-gray-600">
                        Submit your verification application to receive an NFT and unlock campaign creation features
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-md p-4">
                            <p className="text-red-600 text-sm">{error}</p>
                        </div>
                    )}

                    {/* Personal Information */}
                    <div className="bg-white shadow rounded-lg p-6">
                        <h2 className="text-lg font-medium text-gray-900 mb-4">Personal Information</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-2">
                                    Full Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    id="fullName"
                                    value={formData.fullName}
                                    onChange={(e) => updateFormData('fullName', e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    required
                                />
                            </div>

                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                                    Email Address <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="email"
                                    id="email"
                                    value={formData.email}
                                    onChange={(e) => updateFormData('email', e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    required
                                />
                            </div>

                            <div>
                                <label htmlFor="walletAddress" className="block text-sm font-medium text-gray-700 mb-2">
                                    Wallet Address <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    id="walletAddress"
                                    value={formData.walletAddress}
                                    onChange={(e) => updateFormData('walletAddress', e.target.value)}
                                    placeholder="0x..."
                                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
                                    required
                                />
                            </div>

                            <div>
                                <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-2">
                                    Country <span className="text-red-500">*</span>
                                </label>
                                <select
                                    id="country"
                                    value={formData.country}
                                    onChange={(e) => updateFormData('country', e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    required
                                >
                                    <option value="">Select your country</option>
                                    <option value="United States">United States</option>
                                    <option value="Canada">Canada</option>
                                    <option value="United Kingdom">United Kingdom</option>
                                    <option value="Germany">Germany</option>
                                    <option value="France">France</option>
                                    <option value="Australia">Australia</option>
                                    <option value="India">India</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Verification Details */}
                    <div className="bg-white shadow rounded-lg p-6">
                        <h2 className="text-lg font-medium text-gray-900 mb-4">Verification Details</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label htmlFor="kycProvider" className="block text-sm font-medium text-gray-700 mb-2">
                                    KYC Provider
                                </label>
                                <select
                                    id="kycProvider"
                                    value={formData.kycProvider}
                                    onChange={(e) => updateFormData('kycProvider', e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="custom-form">Custom Form</option>
                                    <option value="manual-review">Manual Review</option>
                                    <option value="third-party">Third Party</option>
                                    <option value="self-verified">Self Verified</option>
                                </select>
                            </div>

                            <div>
                                <label htmlFor="verificationLevel" className="block text-sm font-medium text-gray-700 mb-2">
                                    Verification Level
                                </label>
                                <select
                                    id="verificationLevel"
                                    value={formData.verificationLevel}
                                    onChange={(e) => updateFormData('verificationLevel', e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="basic">Basic</option>
                                    <option value="premium">Premium</option>
                                    <option value="verified">Verified</option>
                                    <option value="enterprise">Enterprise</option>
                                </select>
                            </div>

                            <div>
                                <label htmlFor="verificationDate" className="block text-sm font-medium text-gray-700 mb-2">
                                    Verification Date
                                </label>
                                <input
                                    type="date"
                                    id="verificationDate"
                                    value={formData.verificationDate}
                                    onChange={(e) => updateFormData('verificationDate', e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Document Upload */}
                    <div className="bg-white shadow rounded-lg p-6">
                        <h2 className="text-lg font-medium text-gray-900 mb-4">Document Upload</h2>
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Identity Document <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="file"
                                    accept=".jpg,.jpeg,.png,.pdf"
                                    multiple
                                    onChange={(e) => handleFileUpload(e, 'identity')}
                                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                                <p className="text-xs text-gray-500 mt-1">Upload passport, driver's license, or ID card (JPG, PNG, PDF)</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Proof of Address (Optional)
                                </label>
                                <input
                                    type="file"
                                    accept=".jpg,.jpeg,.png,.pdf"
                                    multiple
                                    onChange={(e) => handleFileUpload(e, 'address')}
                                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                                <p className="text-xs text-gray-500 mt-1">Upload utility bill, bank statement, etc. (JPG, PNG, PDF)</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Additional Documents (Optional)
                                </label>
                                <input
                                    type="file"
                                    accept=".jpg,.jpeg,.png,.pdf"
                                    multiple
                                    onChange={(e) => handleFileUpload(e, 'additional')}
                                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                                <p className="text-xs text-gray-500 mt-1">Upload any additional supporting documents (JPG, PNG, PDF)</p>
                            </div>

                            {/* File Preview */}
                            {uploadedFiles.length > 0 && (
                                <div className="border-t pt-4">
                                    <h3 className="text-sm font-medium text-gray-700 mb-2">Uploaded Files:</h3>
                                    <div className="space-y-2">
                                        {uploadedFiles.map((uploadedFile, index) => (
                                            <div key={index} className="flex items-center justify-between bg-gray-50 rounded p-2">
                                                <div className="flex items-center space-x-2">
                                                    {uploadedFile.preview && (
                                                        <Image src={uploadedFile.preview} alt="Preview" width={32} height={32} className="w-8 h-8 object-cover rounded" />
                                                    )}
                                                    <span className="text-sm text-gray-700">{uploadedFile.file.name}</span>
                                                    <span className="text-xs text-gray-500">({uploadedFile.type})</span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => removeFile(index)}
                                                    className="text-red-500 hover:text-red-700 text-sm"
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Project Details */}
                    <div className="bg-white shadow rounded-lg p-6">
                        <h2 className="text-lg font-medium text-gray-900 mb-4">Project Details</h2>
                        <div className="space-y-6">
                            <div>
                                <label htmlFor="purpose" className="block text-sm font-medium text-gray-700 mb-2">
                                    Purpose <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    id="purpose"
                                    value={formData.purpose}
                                    onChange={(e) => updateFormData('purpose', e.target.value)}
                                    placeholder="Describe the purpose of your verification (e.g., creating crowdfunding campaigns, contributing to projects)"
                                    rows={3}
                                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    required
                                />
                            </div>

                            <div>
                                <label htmlFor="projectDescription" className="block text-sm font-medium text-gray-700 mb-2">
                                    Project Description (Optional)
                                </label>
                                <textarea
                                    id="projectDescription"
                                    value={formData.projectDescription}
                                    onChange={(e) => updateFormData('projectDescription', e.target.value)}
                                    placeholder="Provide additional details about your project or intended use"
                                    rows={3}
                                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label htmlFor="expectedUsage" className="block text-sm font-medium text-gray-700 mb-2">
                                    Expected Usage
                                </label>
                                <select
                                    id="expectedUsage"
                                    value={formData.expectedUsage}
                                    onChange={(e) => updateFormData('expectedUsage', e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="Campaign Creation">Campaign Creation</option>
                                    <option value="Contribution">Contribution</option>
                                    <option value="Both">Both</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Metadata */}
                    <div className="bg-white shadow rounded-lg p-6">
                        <h2 className="text-lg font-medium text-gray-900 mb-4">Additional Information</h2>
                        <div className="space-y-6">
                            <div>
                                <label htmlFor="metadataURI" className="block text-sm font-medium text-gray-700 mb-2">
                                    Metadata URI (Optional)
                                </label>
                                <input
                                    type="url"
                                    id="metadataURI"
                                    value={formData.metadataURI}
                                    onChange={(e) => updateFormData('metadataURI', e.target.value)}
                                    placeholder="https://ipfs.io/ipfs/..."
                                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label htmlFor="additionalNotes" className="block text-sm font-medium text-gray-700 mb-2">
                                    Additional Notes (Optional)
                                </label>
                                <textarea
                                    id="additionalNotes"
                                    value={formData.additionalNotes}
                                    onChange={(e) => updateFormData('additionalNotes', e.target.value)}
                                    placeholder="Any additional information you'd like to provide"
                                    rows={3}
                                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <div className="bg-white shadow rounded-lg p-6">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? 'Submitting Verification...' : 'Submit Verification'}
                        </button>

                        <div className="mt-4 text-center">
                            <Link href="/" className="text-blue-600 hover:text-blue-500 text-sm">
                                ← Back to Home
                            </Link>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
