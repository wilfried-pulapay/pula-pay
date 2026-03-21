import { CreateWalletHandler, CreateWalletCommand } from '../CreateWalletHandler';
import { UserNotFoundError } from '../../../domain/errors/UserNotFoundError';
import {
  createMockUserRepository,
  createMockWalletRepository,
} from '../../../__tests__/mocks/repositories.mock';
import { createMockWalletProvider } from '../../../__tests__/mocks/adapters.mock';
import { userFixtures, walletFixtures } from '../../../__tests__/fixtures';

describe('CreateWalletHandler', () => {
  let handler: CreateWalletHandler;
  let mockUserRepo: ReturnType<typeof createMockUserRepository>;
  let mockWalletRepo: ReturnType<typeof createMockWalletRepository>;
  let mockWalletProvider: ReturnType<typeof createMockWalletProvider>;

  const mockTokenResult = {
    userToken: 'user-token-abc',
    encryptionKey: 'enc-key-xyz',
  };
  const mockChallengeResult = { challengeId: 'challenge-123' };
  const APP_ID = 'circle-app-id';

  beforeEach(() => {
    mockUserRepo = createMockUserRepository();
    mockWalletRepo = createMockWalletRepository();
    mockWalletProvider = createMockWalletProvider();

    handler = new CreateWalletHandler(mockUserRepo, mockWalletRepo, mockWalletProvider);

    // Default happy-path mocks
    mockWalletProvider.registerUser.mockResolvedValue(undefined);
    mockWalletProvider.getUserToken.mockResolvedValue(mockTokenResult);
    mockWalletProvider.initiateWalletSetup.mockResolvedValue(mockChallengeResult);

    // Silence config.circle.appId by injecting via jest.mock or relying on the returned value
    jest.mock('../../../shared/config', () => ({
      config: { circle: { appId: APP_ID }, blockchain: { default: 'BASE_SEPOLIA' } },
    }));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute — new user, no existing wallet', () => {
    it('should register user, get token and initiate wallet setup', async () => {
      const user = userFixtures.basicKyc();
      const command: CreateWalletCommand = { userId: user.id };

      mockUserRepo.findById.mockResolvedValue(user);
      mockWalletRepo.findByUserId.mockResolvedValue(null);

      const result = await handler.execute(command);

      expect(mockUserRepo.findById).toHaveBeenCalledWith(user.id);
      expect(mockWalletProvider.registerUser).toHaveBeenCalledWith(user.id);
      expect(mockWalletProvider.getUserToken).toHaveBeenCalledWith(user.id);
      expect(mockWalletProvider.initiateWalletSetup).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: user.id,
          userToken: mockTokenResult.userToken,
        })
      );

      expect(result.challengeId).toBe('challenge-123');
      expect(result.userToken).toBe(mockTokenResult.userToken);
      expect(result.encryptionKey).toBe(mockTokenResult.encryptionKey);
      expect(result.appId).toBeDefined();
    });

    it('should pass blockchain to initiateWalletSetup when specified', async () => {
      const user = userFixtures.basicKyc();
      const command: CreateWalletCommand = { userId: user.id, blockchain: 'BASE_SEPOLIA' };

      mockUserRepo.findById.mockResolvedValue(user);
      mockWalletRepo.findByUserId.mockResolvedValue(null);

      await handler.execute(command);

      expect(mockWalletProvider.initiateWalletSetup).toHaveBeenCalledWith(
        expect.objectContaining({ blockchain: 'BASE_SEPOLIA' })
      );
    });

    it('should pass idempotencyKey to initiateWalletSetup when provided', async () => {
      const user = userFixtures.basicKyc();
      const idempotencyKey = 'custom-key-001';
      const command: CreateWalletCommand = { userId: user.id, idempotencyKey };

      mockUserRepo.findById.mockResolvedValue(user);
      mockWalletRepo.findByUserId.mockResolvedValue(null);

      await handler.execute(command);

      expect(mockWalletProvider.initiateWalletSetup).toHaveBeenCalledWith(
        expect.objectContaining({ idempotencyKey })
      );
    });

    it('should not call walletRepo.create — wallet is created after challenge resolution', async () => {
      const user = userFixtures.basicKyc();
      mockUserRepo.findById.mockResolvedValue(user);
      mockWalletRepo.findByUserId.mockResolvedValue(null);

      await handler.execute({ userId: user.id });

      expect(mockWalletRepo.create).not.toHaveBeenCalled();
    });
  });

  describe('execute — wallet already exists', () => {
    it('should return fresh userToken without re-registering or re-creating wallet', async () => {
      const user = userFixtures.basicKyc();
      const existingWallet = walletFixtures.activeWithBalance();
      const command: CreateWalletCommand = { userId: user.id };

      mockUserRepo.findById.mockResolvedValue(user);
      mockWalletRepo.findByUserId.mockResolvedValue(existingWallet);

      const result = await handler.execute(command);

      // Should NOT register again or initiate setup
      expect(mockWalletProvider.registerUser).not.toHaveBeenCalled();
      expect(mockWalletProvider.initiateWalletSetup).not.toHaveBeenCalled();
      expect(mockWalletRepo.create).not.toHaveBeenCalled();

      // Should return fresh token with empty challengeId
      expect(mockWalletProvider.getUserToken).toHaveBeenCalledWith(user.id);
      expect(result.challengeId).toBe('');
      expect(result.userToken).toBe(mockTokenResult.userToken);
      expect(result.encryptionKey).toBe(mockTokenResult.encryptionKey);
    });
  });

  describe('execute — error cases', () => {
    it('should throw UserNotFoundError when user does not exist', async () => {
      const command: CreateWalletCommand = { userId: 'non-existent' };
      mockUserRepo.findById.mockResolvedValue(null);

      await expect(handler.execute(command)).rejects.toThrow(UserNotFoundError);
      expect(mockWalletProvider.registerUser).not.toHaveBeenCalled();
    });

    it('should propagate error from registerUser', async () => {
      const user = userFixtures.basicKyc();
      mockUserRepo.findById.mockResolvedValue(user);
      mockWalletRepo.findByUserId.mockResolvedValue(null);
      mockWalletProvider.registerUser.mockRejectedValue(new Error('Circle error'));

      await expect(handler.execute({ userId: user.id })).rejects.toThrow('Circle error');
      expect(mockWalletProvider.initiateWalletSetup).not.toHaveBeenCalled();
    });

    it('should propagate error from getUserToken', async () => {
      const user = userFixtures.basicKyc();
      mockUserRepo.findById.mockResolvedValue(user);
      mockWalletRepo.findByUserId.mockResolvedValue(null);
      mockWalletProvider.getUserToken.mockRejectedValue(new Error('Token error'));

      await expect(handler.execute({ userId: user.id })).rejects.toThrow('Token error');
    });
  });
});
