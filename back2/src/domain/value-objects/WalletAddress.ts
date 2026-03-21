import { Blockchain } from '@prisma/client';

/**
 * Value Object representing a validated blockchain wallet address
 */
export class WalletAddress {
  private constructor(
    public readonly address: string,
    public readonly blockchain: Blockchain
  ) {
    Object.freeze(this);
  }

  /**
   * Create and validate a wallet address
   */
  static create(address: string, blockchain: Blockchain): WalletAddress {
    const normalized = address.trim().toLowerCase();

    if (!WalletAddress.isValid(normalized, blockchain)) {
      throw new Error(`Invalid wallet address for ${blockchain}: ${address}`);
    }

    return new WalletAddress(normalized, blockchain);
  }

  /**
   * Create without validation (for trusted sources like Circle)
   */
  static fromTrusted(address: string, blockchain: Blockchain): WalletAddress {
    return new WalletAddress(address.toLowerCase(), blockchain);
  }

  /**
   * Validate address format based on blockchain
   */
  static isValid(address: string, blockchain: Blockchain): boolean {
    // All supported chains are EVM-compatible
    const evmChains: Blockchain[] = [
      'BASE_SEPOLIA', 'BASE',
      'POLYGON_AMOY', 'ETH_SEPOLIA', 'ARBITRUM_SEPOLIA',
      'POLYGON', 'ETHEREUM', 'ARBITRUM',
    ];

    if (evmChains.includes(blockchain)) {
      return /^0x[a-fA-F0-9]{40}$/.test(address);
    }

    return false;
  }

  /**
   * Check if this is a testnet address
   */
  isTestnet(): boolean {
    const testnets: Blockchain[] = ['BASE_SEPOLIA', 'POLYGON_AMOY', 'ETH_SEPOLIA', 'ARBITRUM_SEPOLIA'];
    return testnets.includes(this.blockchain);
  }

  /**
   * Get abbreviated address for display (0x1234...5678)
   */
  abbreviated(): string {
    if (this.address.length <= 10) return this.address;
    return `${this.address.slice(0, 6)}...${this.address.slice(-4)}`;
  }

  /**
   * Get explorer URL for this address
   */
  explorerUrl(): string {
    const explorers: Record<Blockchain, string> = {
      BASE_SEPOLIA: 'https://sepolia.basescan.org/address/',
      BASE: 'https://basescan.org/address/',
      POLYGON_AMOY: 'https://amoy.polygonscan.com/address/',
      ETH_SEPOLIA: 'https://sepolia.etherscan.io/address/',
      ARBITRUM_SEPOLIA: 'https://sepolia.arbiscan.io/address/',
      POLYGON: 'https://polygonscan.com/address/',
      ETHEREUM: 'https://etherscan.io/address/',
      ARBITRUM: 'https://arbiscan.io/address/',
    };

    return `${explorers[this.blockchain]}${this.address}`;
  }

  equals(other: WalletAddress): boolean {
    return this.address === other.address && this.blockchain === other.blockchain;
  }

  toString(): string {
    return this.address;
  }

  toJSON() {
    return {
      address: this.address,
      blockchain: this.blockchain,
    };
  }
}
