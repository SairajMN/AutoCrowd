import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Blockchain service URL - adjust based on your deployment
const BLOCKCHAIN_SERVICE_URL = process.env.BLOCKCHAIN_SERVICE_URL || 'http://localhost:8000';

// KYC Oracle address - should match the backend wallet address that has permission to update KYC status
const KYC_ORACLE_ADDRESS = process.env.KYC_ORACLE_ADDRESS;

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();

        // Extract form fields
        const submissionData = {
            fullName: formData.get('fullName') as string,
            email: formData.get('email') as string,
            walletAddress: formData.get('walletAddress') as string,
            country: formData.get('country') as string,
            kycProvider: formData.get('kycProvider') as string,
            verificationLevel: formData.get('verificationLevel') as string,
            verificationDate: formData.get('verificationDate') as string,
            purpose: formData.get('purpose') as string,
            projectDescription: formData.get('projectDescription') as string,
            expectedUsage: formData.get('expectedUsage') as string,
            metadataURI: formData.get('metadataURI') as string,
            additionalNotes: formData.get('additionalNotes') as string,
        };

        // Validate required fields
        if (!submissionData.fullName || !submissionData.email || !submissionData.walletAddress || !submissionData.country || !submissionData.purpose) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Validate wallet address format
        if (!submissionData.walletAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
            return NextResponse.json(
                { error: 'Invalid wallet address format' },
                { status: 400 }
            );
        }

        // Validate email format
        if (!submissionData.email.includes('@')) {
            return NextResponse.json(
                { error: 'Invalid email format' },
                { status: 400 }
            );
        }

        // Process uploaded files
        const uploadedFiles: Array<{
            name: string;
            type: string;
            size: number;
            data: Buffer;
        }> = [];

        let fileIndex = 0;
        while (formData.has(`file_${fileIndex}`)) {
            const file = formData.get(`file_${fileIndex}`) as File;
            const fileType = formData.get(`file_${fileIndex}_type`) as string;

            if (file && fileType) {
                const buffer = Buffer.from(await file.arrayBuffer());
                uploadedFiles.push({
                    name: file.name,
                    type: file.type,
                    size: file.size,
                    data: buffer,
                });
            }
            fileIndex++;
        }

        // Store submission in database
        const sessionId = `custom_form_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        const verificationData = {
            ...submissionData,
            uploadedFiles: uploadedFiles.map(f => ({
                name: f.name,
                type: f.type,
                size: f.size,
                // Note: In production, you'd upload files to a storage service like S3 or Supabase Storage
                // For now, we'll store file metadata only
            })),
            timestamp: new Date().toISOString(),
            formId: sessionId,
        };

        // Insert into creator_verifications table
        const { data: insertResult, error: insertError } = await supabase
            .from('creator_verifications')
            .insert([{
                session_id: sessionId,
                wallet_address: submissionData.walletAddress.toLowerCase(),
                verification_type: 'custom_form',
                status: 'pending',
                provider: submissionData.kycProvider || 'custom-form',
                verification_data: verificationData,
                created_at: new Date(),
                updated_at: new Date(),
            }])
            .select()
            .single();

        if (insertError) {
            console.error('Database insert error:', insertError);
            throw new Error('Failed to store verification data');
        }

        // Log verification attempt
        await supabase
            .from('verification_attempts')
            .insert([{
                session_id: sessionId,
                attempt_type: 'custom_form_submission',
                provider: submissionData.kycProvider || 'custom-form',
                status: 'pending',
                metadata: {
                    formData: submissionData,
                    fileCount: uploadedFiles.length,
                    submissionId: insertResult.id,
                },
                created_at: new Date(),
            }]);

        // Process NFT minting and blockchain KYC update in background
        processCustomFormSubmission(insertResult.id, submissionData, verificationData)
            .catch(error => {
                console.error(`Background NFT minting failed for ${submissionData.walletAddress}:`, error);
            });

        return NextResponse.json({
            success: true,
            message: 'Verification submitted successfully',
            submissionId: insertResult.id,
            data: {
                walletAddress: submissionData.walletAddress,
                provider: submissionData.kycProvider,
                level: submissionData.verificationLevel,
                status: 'processing',
            },
        });

    } catch (error) {
        console.error('Verification submission error:', error);
        return NextResponse.json(
            {
                error: 'Failed to submit verification',
                message: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}

async function processCustomFormSubmission(
    submissionId: number,
    submissionData: any,
    verificationData: any
) {
    try {
        console.log(`Starting NFT minting process for ${submissionData.walletAddress} (submission ${submissionId})`);

        // Update status to processing
        await supabase
            .from('creator_verifications')
            .update({
                status: 'processing',
                updated_at: new Date(),
            })
            .eq('id', submissionId);

        // Check if user already has NFT (using blockchain service)
        const hasExistingNFT = await checkExistingNFT(submissionData.walletAddress);

        if (hasExistingNFT) {
            console.log(`User ${submissionData.walletAddress} already has NFT, updating status`);

            // Update database status
            await supabase
                .from('creator_verifications')
                .update({
                    status: 'completed',
                    updated_at: new Date(),
                    completed_at: new Date(),
                })
                .eq('id', submissionId);

            // Log completion
            await supabase
                .from('verification_attempts')
                .update({
                    status: 'completed',
                    created_at: new Date(),
                })
                .eq('session_id', verificationData.formId);

            return {
                success: true,
                message: 'User already has NFT',
                alreadyExists: true,
            };
        }

        // Mint new NFT
        const mintResult = await mintVerificationNFT(
            submissionData.walletAddress,
            submissionData.kycProvider,
            submissionData.verificationLevel,
            submissionData.metadataURI
        );

        console.log(`NFT minted successfully for ${submissionData.walletAddress}:`, mintResult);

        // Update database status to completed
        await supabase
            .from('creator_verifications')
            .update({
                status: 'completed',
                updated_at: new Date(),
                completed_at: new Date(),
            })
            .eq('id', submissionId);

        // Log successful completion
        await supabase
            .from('verification_attempts')
            .update({
                status: 'completed',
                metadata: {
                    ...verificationData,
                    submissionId,
                    mintResult,
                    completedAt: new Date(),
                },
                created_at: new Date(),
            })
            .eq('session_id', verificationData.formId);

        return mintResult;

    } catch (error) {
        console.error(`NFT minting failed for ${submissionData.walletAddress} (submission ${submissionId}):`, error);

        // Update database status to failed
        try {
            await supabase
                .from('creator_verifications')
                .update({
                    status: 'failed',
                    updated_at: new Date(),
                })
                .eq('id', submissionId);
        } catch (dbError) {
            console.error('Failed to update database status:', dbError);
        }

        // Log failure
        try {
            await supabase
                .from('verification_attempts')
                .update({
                    status: 'failed',
                    error_message: error instanceof Error ? error.message : 'Unknown error',
                    created_at: new Date(),
                })
                .eq('session_id', verificationData.formId);
        } catch (dbError) {
            console.error('Failed to log verification attempt:', dbError);
        }

        throw error;
    }
}

async function checkExistingNFT(walletAddress: string): Promise<boolean> {
    try {
        console.log(`Checking existing NFT for ${walletAddress} via blockchain service`);

        // Call blockchain service to check if user already has NFT
        const response = await fetch(`${BLOCKCHAIN_SERVICE_URL}/api/kyc/nft/${walletAddress}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            if (response.status === 404) {
                // No NFT found, which is fine
                return false;
            }
            throw new Error(`Blockchain service error: ${response.statusText}`);
        }

        const result = await response.json();
        console.log(`Blockchain service NFT check result:`, result);

        return result.success && result.data !== null;
    } catch (blockchainError) {
        console.error('Error in checkExistingNFT:', blockchainError);
        // If blockchain service is unavailable, fall back to database check
        console.log('Falling back to database check for NFT existence');

        const { data, error } = await supabase
            .from('creator_verifications')
            .select('id')
            .eq('wallet_address', walletAddress.toLowerCase())
            .eq('status', 'completed')
            .limit(1);

        if (error) {
            console.error('Error checking existing NFT in database:', error);
            return false;
        }

        return data && data.length > 0;
    }
}

async function mintVerificationNFT(
    walletAddress: string,
    kycProvider: string,
    verificationLevel: string,
    metadataURI: string
) {
    try {
        console.log(`Minting NFT and updating KYC status for ${walletAddress} with provider ${kycProvider} and level ${verificationLevel}`);

        // Call blockchain service to mint NFT and update KYC status
        const response = await fetch(`${BLOCKCHAIN_SERVICE_URL}/api/kyc/verify-and-mint`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                walletAddress,
                kycProvider,
                verificationLevel,
                metadataURI,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Blockchain service error: ${errorData.error || response.statusText}`);
        }

        const result = await response.json();
        console.log(`Blockchain service response:`, result);

        return {
            success: true,
            transactionHash: result.transactionHash,
            tokenId: result.tokenId,
            walletAddress,
            kycProvider,
            verificationLevel,
            metadataURI,
            kycStatusUpdated: result.kycStatusUpdated,
            mintedAt: new Date(),
        };

    } catch (error) {
        console.error('Error minting NFT:', error);
        throw new Error(`Failed to mint verification NFT: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
