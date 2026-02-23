import { CreateWalletHandler, CreateWalletCommand } from '../CreateWalletHandler';
import { UserNotFoundError } from '../../../domain/errors/UserNotFoundError';
import {
  createMockUserRepository,
  createMockWalletRepository,
} from '../../../__tests__/mocks/repositories.mock';
import { createMockWalletProvider } from '../../../__tests__/mocks/adapters.mock';
import { createWallet, userFixtures, walletFixtures } from '../../../__tests__/fixtures';

describe('CreateWalletHandler', () => {
  let handler: CreateWalletHandler;
  let mockUserRepo: ReturnType<typeof createMockUserRepository>;
  let mockWalletRepo: ReturnType<typeof createMockWalletRepository>;
  let mockWalletProvider: ReturnType<typeof createMockWalletProvider>;

  beforeEach(() => {
    mockUserRepo = createMockUserRepository();
    mockWalletRepo = createMockWalletRepository();
    mockWalletProvider = createMockWalletProvider();

    handler = new CreateWalletHandler(mockUserRepo, mockWalletRepo, mockWalletProvider);
  });

  describe('execute', () => {
    it('should create wallet for existing user', async () => {
      // Arrange
      const user = userFixtures.basicKyc();
      const command: CreateWalletCommand = {
        userId: user.id,
        blockchain: 'POLYGON_AMOY',
      };

      mockUserRepo.findById.mockResolvedValue(user);
      mockWalletRepo.findByUserId.mockResolvedValue(null);
      mockWalletProvider.createWallet.mockResolvedValue({
        circleWalletId: 'circle-wallet-123',
        walletSetId: 'wallet-set-123',
        address: '0x1234567890abcdef1234567890abcdef12345678',
        status: 'active',
      });
      mockWalletRepo.create.mockResolvedValue(
        createWallet({
          id: 'wallet-new',
          userId: user.id,
          address: '0x1234567890abcdef1234567890abcdef12345678',
          blockchain: 'POLYGON_AMOY',
        })
      );

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.walletId).toBe('wallet-new');
      expect(result.address).toBe('0x1234567890abcdef1234567890abcdef12345678');
      expect(result.blockchain).toBe('POLYGON_AMOY');
      expect(result.status).toBe('active');
      expect(mockWalletProvider.createWallet).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: user.id,
          blockchain: 'POLYGON_AMOY',
        })
      );
    });

    it('should throw UserNotFoundError when user does not exist', async () => {
      // Arrange
      const command: CreateWalletCommand = {
        userId: 'non-existent-user',
      };

      mockUserRepo.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(UserNotFoundError);
      expect(mockWalletRepo.findByUserId).not.toHaveBeenCalled();
      expect(mockWalletProvider.createWallet).not.toHaveBeenCalled();
    });

    it('should return existing wallet if already created (idempotent)', async () => {
      // Arrange
      const user = userFixtures.basicKyc();
      const existingWallet = walletFixtures.activeWithBalance();
      const command: CreateWalletCommand = {
        userId: user.id,
      };

      mockUserRepo.findById.mockResolvedValue(user);
      mockWalletRepo.findByUserId.mockResolvedValue(existingWallet);

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.walletId).toBe(existingWallet.id);
      expect(result.address).toBe(existingWallet.address);
      expect(result.status).toBe('active');
      expect(mockWalletProvider.createWallet).not.toHaveBeenCalled();
      expect(mockWalletRepo.create).not.toHaveBeenCalled();
    });

    it('should return pending status for pending wallet', async () => {
      // Arrange
      const user = userFixtures.basicKyc();
      const pendingWallet = walletFixtures.pending();
      const command: CreateWalletCommand = {
        userId: user.id,
      };

      mockUserRepo.findById.mockResolvedValue(user);
      mockWalletRepo.findByUserId.mockResolvedValue(pendingWallet);

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.status).toBe('pending');
    });

    it('should use default blockchain when not specified', async () => {
      // Arrange
      const user = userFixtures.basicKyc();
      const command: CreateWalletCommand = {
        userId: user.id,
        // No blockchain specified
      };

      mockUserRepo.findById.mockResolvedValue(user);
      mockWalletRepo.findByUserId.mockResolvedValue(null);
      mockWalletProvider.createWallet.mockResolvedValue({
        circleWalletId: 'circle-wallet-123',
        walletSetId: 'wallet-set-123',
        address: '0x1234567890abcdef1234567890abcdef12345678',
        status: 'active',
      });
      mockWalletRepo.create.mockResolvedValue(
        createWallet({
          id: 'wallet-new',
          userId: user.id,
        })
      );

      // Act
      await handler.execute(command);

      // Assert
      expect(mockWalletProvider.createWallet).toHaveBeenCalledWith(
        expect.objectContaining({
          blockchain: expect.any(String), // Default blockchain from config
        })
      );
    });

    it('should use provided idempotencyKey', async () => {
      // Arrange
      const user = userFixtures.basicKyc();
      const idempotencyKey = 'custom-idempotency-key-123';
      const command: CreateWalletCommand = {
        userId: user.id,
        idempotencyKey,
      };

      mockUserRepo.findById.mockResolvedValue(user);
      mockWalletRepo.findByUserId.mockResolvedValue(null);
      mockWalletProvider.createWallet.mockResolvedValue({
        circleWalletId: 'circle-wallet-123',
        walletSetId: 'wallet-set-123',
        address: '0x1234567890abcdef1234567890abcdef12345678',
        status: 'active',
      });
      mockWalletRepo.create.mockResolvedValue(
        createWallet({
          id: 'wallet-new',
          userId: user.id,
        })
      );

      // Act
      await handler.execute(command);

      // Assert
      expect(mockWalletProvider.createWallet).toHaveBeenCalledWith(
        expect.objectContaining({
          idempotencyKey,
        })
      );
    });

    it('should use specific blockchain when provided', async () => {
      // Arrange
      const user = userFixtures.basicKyc();
      const command: CreateWalletCommand = {
        userId: user.id,
        blockchain: 'ETH_SEPOLIA',
      };

      mockUserRepo.findById.mockResolvedValue(user);
      mockWalletRepo.findByUserId.mockResolvedValue(null);
      mockWalletProvider.createWallet.mockResolvedValue({
        circleWalletId: 'circle-wallet-123',
        walletSetId: 'wallet-set-123',
        address: '0x1234567890abcdef1234567890abcdef12345678',
        status: 'active',
      });
      mockWalletRepo.create.mockResolvedValue(
        createWallet({
          id: 'wallet-new',
          userId: user.id,
          blockchain: 'ETH_SEPOLIA',
        })
      );

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.blockchain).toBe('ETH_SEPOLIA');
      expect(mockWalletProvider.createWallet).toHaveBeenCalledWith(
        expect.objectContaining({
          blockchain: 'ETH_SEPOLIA',
        })
      );
    });

    it('should persist wallet with Circle data', async () => {
      // Arrange
      const user = userFixtures.basicKyc();
      const command: CreateWalletCommand = {
        userId: user.id,
        blockchain: 'POLYGON_AMOY',
      };

      const circleData = {
        circleWalletId: 'circle-wallet-abc',
        walletSetId: 'wallet-set-xyz',
        address: '0xabcdef1234567890abcdef1234567890abcdef12',
        status: 'active' as const,
      };

      mockUserRepo.findById.mockResolvedValue(user);
      mockWalletRepo.findByUserId.mockResolvedValue(null);
      mockWalletProvider.createWallet.mockResolvedValue(circleData);
      mockWalletRepo.create.mockResolvedValue(
        createWallet({
          id: 'wallet-new',
          userId: user.id,
          circleWalletId: circleData.circleWalletId,
          walletSetId: circleData.walletSetId,
          address: circleData.address,
        })
      );

      // Act
      await handler.execute(command);

      // Assert
      expect(mockWalletRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: user.id,
          circleWalletId: circleData.circleWalletId,
          walletSetId: circleData.walletSetId,
          address: circleData.address,
          blockchain: 'POLYGON_AMOY',
        })
      );
    });
  });
});
