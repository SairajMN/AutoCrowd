export interface TransactionInfo {
    hash: string;
    blockNumber: string;
    timestamp: string;
    from: string;
    to: string;
    value: string;
    gasUsed: string;
    status: boolean;
}

export interface EventLog {
    address: string;
    topics: string[];
    data: string;
    blockNumber: string;
    blockHash: string;
    transactionHash: string;
    transactionIndex: string;
    logIndex: string;
}

export interface BlockscoutResponse<T> {
    status: string;
    message: string;
    result: T;
}

export interface ContractInfo {
    Address: string;
    ContractName: string;
    CompilerVersion: string;
    OptimizationEnabled: string;
    SourceCode: string;
    ABI: string;
}

export interface CustomExplorerConfig {
    theme?: 'light' | 'dark';
    network?: string;
    apiUrl?: string;
    realTimeUpdates?: boolean;
}

export interface RealTimeUpdate {
    type: 'transaction' | 'block' | 'contract';
    data: any;
    timestamp: number;
}

/**
 * Enhanced Blockscout API Client with custom explorer functionality
 */
export class BlockscoutClient {
    private baseUrl: string;
    private apiUrl: string;
    private apiKey?: string;
    private retryAttempts: number = 3;
    private timeout: number = 10000;

    constructor() {
        this.baseUrl = process.env.NEXT_PUBLIC_BLOCKSCOUT_BASE_URL || 'https://eth-sepolia.blockscout.com';
        this.apiUrl = `${this.baseUrl}/api`;
        this.apiKey = process.env.NEXT_PUBLIC_BLOCKSCOUT_API_KEY;
    }

    /**
     * Get transaction details by hash
     */
    async getTransaction(txHash: string): Promise<TransactionInfo | null> {
        try {
            const response = await fetch(
                `${this.apiUrl}?module=transaction&action=gettxinfo&txhash=${txHash}`
            );

            const data: BlockscoutResponse<TransactionInfo> = await response.json();

            if (data.status === '1' && data.result) {
                return data.result;
            }

            return null;
        } catch (error) {
            console.error('Error fetching transaction:', error);
            return null;
        }
    }

    /**
     * Get contract ABI
     */
    async getContractABI(address: string): Promise<string | null> {
        try {
            const response = await fetch(
                `${this.apiUrl}?module=contract&action=getabi&address=${address}`
            );

            const data: BlockscoutResponse<string> = await response.json();

            if (data.status === '1' && data.result) {
                return data.result;
            }

            return null;
        } catch (error) {
            console.error('Error fetching contract ABI:', error);
            return null;
        }
    }

    /**
     * Get contract source code
     */
    async getContractSource(address: string): Promise<ContractInfo | null> {
        try {
            const response = await fetch(
                `${this.apiUrl}?module=contract&action=getsourcecode&address=${address}`
            );

            const data: BlockscoutResponse<ContractInfo[]> = await response.json();

            if (data.status === '1' && data.result && data.result.length > 0) {
                return data.result[0];
            }

            return null;
        } catch (error) {
            console.error('Error fetching contract source:', error);
            return null;
        }
    }

    /**
     * Get transaction logs/events for a contract
     */
    async getContractLogs(
        address: string,
        fromBlock?: number,
        toBlock?: 'latest' | number,
        topic0?: string
    ): Promise<EventLog[]> {
        try {
            let url = `${this.apiUrl}?module=logs&action=getLogs&address=${address}`;

            if (fromBlock) url += `&fromBlock=${fromBlock}`;
            if (toBlock) url += `&toBlock=${toBlock}`;
            if (topic0) url += `&topic0=${topic0}`;

            const response = await fetch(url);
            const data: BlockscoutResponse<EventLog[]> = await response.json();

            if (data.status === '1' && data.result) {
                return data.result;
            }

            return [];
        } catch (error) {
            console.error('Error fetching contract logs:', error);
            return [];
        }
    }

    /**
     * Get PYUSD token balance for an address
     */
    async getTokenBalance(tokenAddress: string, walletAddress: string): Promise<string | null> {
        try {
            const response = await fetch(
                `${this.apiUrl}?module=account&action=tokenbalance&contractaddress=${tokenAddress}&address=${walletAddress}`
            );

            const data: BlockscoutResponse<string> = await response.json();

            if (data.status === '1' && data.result) {
                return data.result;
            }

            return null;
        } catch (error) {
            console.error('Error fetching token balance:', error);
            return null;
        }
    }

    /**
     * Get account transactions
     */
    async getAccountTransactions(
        address: string,
        page: number = 1,
        offset: number = 10
    ): Promise<TransactionInfo[]> {
        try {
            const response = await fetch(
                `${this.apiUrl}?module=account&action=txlist&address=${address}&page=${page}&offset=${offset}`
            );

            const data: BlockscoutResponse<TransactionInfo[]> = await response.json();

            if (data.status === '1' && data.result) {
                return data.result;
            }

            return [];
        } catch (error) {
            console.error('Error fetching account transactions:', error);
            return [];
        }
    }
}

export const blockscoutClient = new BlockscoutClient();
