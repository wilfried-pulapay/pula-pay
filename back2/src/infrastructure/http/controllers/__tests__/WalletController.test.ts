import { Request, Response, NextFunction } from 'express';
import { WalletController } from '../WalletController';
import { ZodError } from 'zod';

// Mock handlers
const mockCreateWalletHandler = { execute: jest.fn() };
const mockConfirmWalletSetupHandler = { execute: jest.fn() };
const mockDepositHandler = { execute: jest.fn() };
const mockWithdrawHandler = { execute: jest.fn() };
const mockTransferHandler = { execute: jest.fn() };
const mockSimpleTransferHandler = { execute: jest.fn() };
const mockSyncStatusHandler = { execute: jest.fn() };
const mockBalanceHandler = { execute: jest.fn() };
const mockHistoryHandler = { execute: jest.fn() };
const mockTransactionByIdHandler = { execute: jest.fn() };
const mockAddressHandler = { execute: jest.fn() };
const mockResolveRecipientHandler = { execute: jest.fn() };

describe('WalletController', () => {
  let controller: WalletController;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    controller = new WalletController(
      mockCreateWalletHandler as any,
      mockConfirmWalletSetupHandler as any,
      mockDepositHandler as any,
      mockWithdrawHandler as any,
      mockTransferHandler as any,
      mockSimpleTransferHandler as any,
      mockSyncStatusHandler as any,
      mockBalanceHandler as any,
      mockHistoryHandler as any,
      mockTransactionByIdHandler as any,
      mockAddressHandler as any,
      mockResolveRecipientHandler as any,
      { execute: jest.fn() } as any,
      { execute: jest.fn() } as any
    );

    mockReq = {
      user: { id: 'user-123', phone: '+22501234567', kycLevel: 'BASIC', displayCurrency: 'EUR' },
      body: {},
      query: {},
      headers: { 'x-request-id': 'req-123' },
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();

    jest.clearAllMocks();
  });

  describe('createWallet', () => {
    const challengeResponse = {
      challengeId: 'challenge-abc',
      userToken: 'user-token-xyz',
      encryptionKey: 'enc-key-123',
      appId: 'circle-app-id',
    };

    it('should initiate wallet setup and return 202 with challenge data', async () => {
      // Arrange
      mockReq.body = { blockchain: 'BASE_SEPOLIA' };
      mockCreateWalletHandler.execute.mockResolvedValue(challengeResponse);

      // Act
      await controller.createWallet(mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(202);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          challengeId: 'challenge-abc',
          userToken: 'user-token-xyz',
          encryptionKey: 'enc-key-123',
        }),
        meta: expect.objectContaining({ requestId: 'req-123' }),
      });
    });

    it('should pass userId and blockchain to the handler', async () => {
      // Arrange
      mockReq.body = { blockchain: 'BASE_SEPOLIA' };
      mockCreateWalletHandler.execute.mockResolvedValue(challengeResponse);

      // Act
      await controller.createWallet(mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(mockCreateWalletHandler.execute).toHaveBeenCalledWith({
        userId: 'user-123',
        blockchain: 'BASE_SEPOLIA',
      });
    });

    it('should pass undefined blockchain when not specified', async () => {
      // Arrange
      mockReq.body = {};
      mockCreateWalletHandler.execute.mockResolvedValue(challengeResponse);

      // Act
      await controller.createWallet(mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(mockCreateWalletHandler.execute).toHaveBeenCalledWith({
        userId: 'user-123',
        blockchain: undefined,
      });
    });

    it('should call next with error when handler throws', async () => {
      // Arrange
      mockReq.body = {};
      const error = new Error('Handler error');
      mockCreateWalletHandler.execute.mockRejectedValue(error);

      // Act
      await controller.createWallet(mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledWith(error);
    });

    it('should reject invalid blockchain value', async () => {
      // Arrange
      mockReq.body = { blockchain: 'INVALID_CHAIN' };

      // Act
      await controller.createWallet(mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledWith(expect.any(ZodError));
    });
  });

  describe('confirmWalletSetup', () => {
    const confirmResponse = {
      walletId: 'wallet-123',
      address: '0x1234567890abcdef1234567890abcdef12345678',
      blockchain: 'BASE_SEPOLIA',
      status: 'active',
    };

    it('should confirm wallet setup and return 201', async () => {
      // Arrange
      mockReq.body = { userToken: 'user-token-xyz' };
      mockConfirmWalletSetupHandler.execute.mockResolvedValue(confirmResponse);

      // Act
      await controller.confirmWalletSetup(mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          walletId: 'wallet-123',
          address: expect.any(String),
          status: 'active',
        }),
        meta: expect.any(Object),
      });
    });

    it('should pass userId and userToken to the handler', async () => {
      // Arrange
      mockReq.body = { userToken: 'user-token-xyz', blockchain: 'BASE_SEPOLIA' };
      mockConfirmWalletSetupHandler.execute.mockResolvedValue(confirmResponse);

      // Act
      await controller.confirmWalletSetup(mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(mockConfirmWalletSetupHandler.execute).toHaveBeenCalledWith({
        userId: 'user-123',
        userToken: 'user-token-xyz',
        blockchain: 'BASE_SEPOLIA',
      });
    });

    it('should reject request with missing userToken', async () => {
      // Arrange
      mockReq.body = {};

      // Act
      await controller.confirmWalletSetup(mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledWith(expect.any(ZodError));
    });

    it('should call next with error when handler throws', async () => {
      // Arrange
      mockReq.body = { userToken: 'token' };
      const error = new Error('Circle error');
      mockConfirmWalletSetupHandler.execute.mockRejectedValue(error);

      // Act
      await controller.confirmWalletSetup(mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getBalance', () => {
    it('should return balance with 200', async () => {
      // Arrange
      mockBalanceHandler.execute.mockResolvedValue({
        walletId: 'wallet-123',
        address: '0x1234...',
        balanceUsdc: '100.500000',
        displayBalance: '92.46',
        displayCurrency: 'EUR',
        exchangeRate: '0.92',
        status: 'ACTIVE',
      });

      // Act
      await controller.getBalance(mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          walletId: 'wallet-123',
          balanceUsdc: '100.500000',
        }),
        meta: expect.any(Object),
      });
    });

    it('should pass currency query parameter', async () => {
      // Arrange
      mockReq.query = { currency: 'XOF' };
      mockBalanceHandler.execute.mockResolvedValue({
        walletId: 'wallet-123',
        address: '0x1234...',
        balanceUsdc: '100',
        displayBalance: '60345',
        displayCurrency: 'XOF',
        exchangeRate: '603.45',
        status: 'ACTIVE',
      });

      // Act
      await controller.getBalance(mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(mockBalanceHandler.execute).toHaveBeenCalledWith({
        userId: 'user-123',
        displayCurrency: 'XOF',
      });
    });
  });

  describe('initiateDeposit', () => {
    it('should initiate deposit and return 202', async () => {
      // Arrange
      mockReq.body = {
        amount: 100,
        currency: 'USD',
        country: 'US',
        paymentMethod: 'CARD',
      };
      mockDepositHandler.execute.mockResolvedValue({
        transactionId: 'tx-123',
        providerRef: 'coinbase-quote-123',
        status: 'PROCESSING',
        amountUsdc: '97.50',
        displayAmount: '100',
        displayCurrency: 'USD',
        paymentUrl: 'https://pay.coinbase.com/buy/select-asset?sessionToken=abc',
      });

      // Act
      await controller.initiateDeposit(mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(202);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          transactionId: 'tx-123',
          status: 'PROCESSING',
          paymentUrl: expect.any(String),
        }),
        meta: expect.any(Object),
      });
    });

    it('should validate required fields', async () => {
      // Arrange
      mockReq.body = {
        // Missing amount
        currency: 'USD',
      };

      // Act
      await controller.initiateDeposit(mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledWith(expect.any(ZodError));
    });

    it('should validate positive amount', async () => {
      // Arrange
      mockReq.body = {
        amount: -100,
        currency: 'USD',
      };

      // Act
      await controller.initiateDeposit(mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledWith(expect.any(ZodError));
    });

    it('should validate currency enum', async () => {
      // Arrange
      mockReq.body = {
        amount: 100,
        currency: 'INVALID',
      };

      // Act
      await controller.initiateDeposit(mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledWith(expect.any(ZodError));
    });
  });

  describe('initiateWithdrawal', () => {
    it('should initiate withdrawal and return 202', async () => {
      // Arrange
      mockReq.body = {
        amount: 50,
        targetCurrency: 'EUR',
        country: 'US',
        paymentMethod: 'ACH_BANK_ACCOUNT',
      };
      mockWithdrawHandler.execute.mockResolvedValue({
        transactionId: 'tx-456',
        providerRef: 'coinbase-quote-456',
        status: 'PROCESSING',
        amountUsdc: '50',
        displayAmount: '48.50',
        displayCurrency: 'EUR',
        paymentUrl: 'https://pay.coinbase.com/sell?sessionToken=xyz',
      });

      // Act
      await controller.initiateWithdrawal(mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(202);
      expect(mockWithdrawHandler.execute).toHaveBeenCalledWith({
        userId: 'user-123',
        fiatAmount: 50,
        fiatCurrency: 'EUR',
        country: 'US',
        paymentMethod: 'ACH_BANK_ACCOUNT',
      });
    });
  });

  describe('transfer', () => {
    it('should transfer to phone and return 202', async () => {
      // Arrange
      mockReq.body = {
        recipientPhone: '+22507654321',
        amount: 25,
        currency: 'EUR',
        description: 'Test transfer',
      };
      mockTransferHandler.execute.mockResolvedValue({
        transactionId: 'tx-789',
        amountUsdc: '27.17',
        displayAmount: '25',
        displayCurrency: 'EUR',
        recipientAddress: '0xrecipient...',
        status: 'COMPLETED',
      });

      // Act
      await controller.transfer(mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(202);
      expect(mockTransferHandler.execute).toHaveBeenCalledWith({
        senderUserId: 'user-123',
        recipientPhone: '+22507654321',
        recipientWalletAddress: undefined,
        amount: 25,
        currency: 'EUR',
        description: 'Test transfer',
      });
    });

    it('should transfer to address', async () => {
      // Arrange
      mockReq.body = {
        recipientAddress: '0x1234567890abcdef1234567890abcdef12345678',
        amount: 100,
        currency: 'USD',
      };
      mockTransferHandler.execute.mockResolvedValue({
        transactionId: 'tx-abc',
        amountUsdc: '100',
        displayAmount: '100',
        displayCurrency: 'USD',
        recipientAddress: '0x1234567890abcdef1234567890abcdef12345678',
        status: 'PROCESSING',
      });

      // Act
      await controller.transfer(mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(mockTransferHandler.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientWalletAddress: '0x1234567890abcdef1234567890abcdef12345678',
        })
      );
    });

    it('should reject transfer without recipient', async () => {
      // Arrange
      mockReq.body = {
        amount: 25,
        currency: 'EUR',
      };

      // Act
      await controller.transfer(mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledWith(expect.any(ZodError));
    });

    it('should validate description max length', async () => {
      // Arrange
      mockReq.body = {
        recipientPhone: '+22507654321',
        amount: 25,
        currency: 'EUR',
        description: 'a'.repeat(201), // 201 characters
      };

      // Act
      await controller.transfer(mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledWith(expect.any(ZodError));
    });
  });

  describe('getTransactionHistory', () => {
    it('should return transaction history', async () => {
      // Arrange
      mockReq.query = {
        page: '1',
        limit: '10',
      };
      mockHistoryHandler.execute.mockResolvedValue({
        transactions: [
          { id: 'tx-1', type: 'DEPOSIT_ONRAMP', status: 'COMPLETED' },
          { id: 'tx-2', type: 'TRANSFER_P2P', status: 'COMPLETED' },
        ],
        pagination: {
          page: 1,
          limit: 10,
          total: 2,
          totalPages: 1,
        },
      });

      // Act
      await controller.getTransactionHistory(mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          transactions: expect.any(Array),
          pagination: expect.any(Object),
        }),
        meta: expect.any(Object),
      });
    });

    it('should filter by type', async () => {
      // Arrange
      mockReq.query = {
        type: 'TRANSFER_P2P',
      };
      mockHistoryHandler.execute.mockResolvedValue({
        transactions: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
      });

      // Act
      await controller.getTransactionHistory(mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(mockHistoryHandler.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'TRANSFER_P2P',
        })
      );
    });

    it('should filter by status', async () => {
      // Arrange
      mockReq.query = {
        status: 'COMPLETED',
      };
      mockHistoryHandler.execute.mockResolvedValue({
        transactions: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
      });

      // Act
      await controller.getTransactionHistory(mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(mockHistoryHandler.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'COMPLETED',
        })
      );
    });

    it('should filter by date range', async () => {
      // Arrange
      mockReq.query = {
        fromDate: '2026-01-01T00:00:00.000Z',
        toDate: '2026-01-31T23:59:59.000Z',
      };
      mockHistoryHandler.execute.mockResolvedValue({
        transactions: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
      });

      // Act
      await controller.getTransactionHistory(mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(mockHistoryHandler.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          fromDate: new Date('2026-01-01T00:00:00.000Z'),
          toDate: new Date('2026-01-31T23:59:59.000Z'),
        })
      );
    });

    it('should validate limit max 100', async () => {
      // Arrange
      mockReq.query = {
        limit: '200',
      };

      // Act
      await controller.getTransactionHistory(mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledWith(expect.any(ZodError));
    });
  });
});
