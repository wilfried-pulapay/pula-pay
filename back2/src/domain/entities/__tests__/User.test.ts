import { User } from '../User';
import { createUser, createUserProps, userFixtures } from '../../../__tests__/fixtures';

describe('User Entity', () => {
  describe('constructor and getters', () => {
    it('should create user with all properties', () => {
      const props = createUserProps();
      const user = new User(props);

      expect(user.id).toBe(props.id);
      expect(user.phoneNumber).toBe(props.phoneNumber);
      expect(user.email).toBe(props.email);
      expect(user.name).toBe(props.name);
      expect(user.kycLevel).toBe(props.kycLevel);
      expect(user.displayCurrency).toBe(props.displayCurrency);
      expect(user.locale).toBe(props.locale);
      expect(user.createdAt).toEqual(props.createdAt);
      expect(user.updatedAt).toEqual(props.updatedAt);
    });

    it('should handle null email', () => {
      const user = createUser({ email: null });
      expect(user.email).toBeNull();
    });

    it('should handle null name', () => {
      const user = createUser({ name: null });
      expect(user.name).toBeNull();
    });
  });

  describe('KYC checks', () => {
    it('should return false for hasBasicKyc when KYC is NONE', () => {
      const user = userFixtures.noKyc();
      expect(user.hasBasicKyc()).toBe(false);
    });

    it('should return true for hasBasicKyc when KYC is BASIC', () => {
      const user = userFixtures.basicKyc();
      expect(user.hasBasicKyc()).toBe(true);
    });

    it('should return true for hasBasicKyc when KYC is VERIFIED', () => {
      const user = userFixtures.verifiedKyc();
      expect(user.hasBasicKyc()).toBe(true);
    });

    it('should return true for hasBasicKyc when KYC is ENHANCED', () => {
      const user = userFixtures.enhancedKyc();
      expect(user.hasBasicKyc()).toBe(true);
    });

    it('should return false for hasVerifiedKyc when KYC is BASIC', () => {
      const user = userFixtures.basicKyc();
      expect(user.hasVerifiedKyc()).toBe(false);
    });

    it('should return true for hasVerifiedKyc when KYC is VERIFIED', () => {
      const user = userFixtures.verifiedKyc();
      expect(user.hasVerifiedKyc()).toBe(true);
    });

    it('should return true for hasVerifiedKyc when KYC is ENHANCED', () => {
      const user = userFixtures.enhancedKyc();
      expect(user.hasVerifiedKyc()).toBe(true);
    });

    it('should return false for hasEnhancedKyc when KYC is VERIFIED', () => {
      const user = userFixtures.verifiedKyc();
      expect(user.hasEnhancedKyc()).toBe(false);
    });

    it('should return true for hasEnhancedKyc when KYC is ENHANCED', () => {
      const user = userFixtures.enhancedKyc();
      expect(user.hasEnhancedKyc()).toBe(true);
    });
  });

  describe('KYC limits', () => {
    it('should return 0 daily limit for NONE KYC', () => {
      const user = userFixtures.noKyc();
      expect(user.getDailyLimit()).toBe(0);
    });

    it('should return 100 USDC daily limit for BASIC KYC', () => {
      const user = userFixtures.basicKyc();
      expect(user.getDailyLimit()).toBe(100);
    });

    it('should return 1000 USDC daily limit for VERIFIED KYC', () => {
      const user = userFixtures.verifiedKyc();
      expect(user.getDailyLimit()).toBe(1000);
    });

    it('should return 10000 USDC daily limit for ENHANCED KYC', () => {
      const user = userFixtures.enhancedKyc();
      expect(user.getDailyLimit()).toBe(10000);
    });

    it('should calculate monthly limit as 30x daily limit', () => {
      const user = userFixtures.basicKyc();
      expect(user.getMonthlyLimit()).toBe(3000); // 100 * 30
    });
  });

  describe('preferences', () => {
    it('should update display currency', () => {
      const user = createUser({ displayCurrency: 'EUR' });

      user.updateDisplayCurrency('XOF');

      expect(user.displayCurrency).toBe('XOF');
    });

    it('should update locale', () => {
      const user = createUser({ locale: 'fr-FR' });

      user.updateLocale('en-US');

      expect(user.locale).toBe('en-US');
    });

    it('should update email', () => {
      const user = createUser({ email: 'old@example.com' });

      user.updateEmail('new@example.com');

      expect(user.email).toBe('new@example.com');
    });
  });

  describe('KYC upgrade', () => {
    it('should upgrade from NONE to BASIC', () => {
      const user = userFixtures.noKyc();

      user.upgradeKyc('BASIC');

      expect(user.kycLevel).toBe('BASIC');
    });

    it('should upgrade from BASIC to VERIFIED with KYC data', () => {
      const user = userFixtures.basicKyc();
      const kycData = { documentType: 'PASSPORT', documentNumber: 'AB123456' };

      user.upgradeKyc('VERIFIED', kycData);

      expect(user.kycLevel).toBe('VERIFIED');
      expect(user.kycData).toMatchObject(kycData);
    });

    it('should upgrade from VERIFIED to ENHANCED', () => {
      const user = userFixtures.verifiedKyc();

      user.upgradeKyc('ENHANCED', { addressProof: 'bill.pdf' });

      expect(user.kycLevel).toBe('ENHANCED');
    });

    it('should throw error when trying to downgrade KYC', () => {
      const user = userFixtures.verifiedKyc();

      expect(() => user.upgradeKyc('BASIC')).toThrow(
        'Cannot downgrade KYC from VERIFIED to BASIC'
      );
    });

    it('should throw error when trying to set same KYC level', () => {
      const user = userFixtures.basicKyc();

      expect(() => user.upgradeKyc('BASIC')).toThrow(
        'Cannot downgrade KYC from BASIC to BASIC'
      );
    });

    it('should skip levels when upgrading (NONE to VERIFIED)', () => {
      const user = userFixtures.noKyc();

      user.upgradeKyc('VERIFIED');

      expect(user.kycLevel).toBe('VERIFIED');
    });
  });

  describe('serialization', () => {
    it('should convert to JSON without sensitive data', () => {
      const user = createUser();
      const json = user.toJSON();

      expect(json).toHaveProperty('id');
      expect(json).toHaveProperty('phone');
      expect(json).toHaveProperty('email');
      expect(json).toHaveProperty('kycLevel');
      expect(json).toHaveProperty('displayCurrency');
      expect(json).toHaveProperty('locale');
      expect(json).toHaveProperty('createdAt');
      expect(json).toHaveProperty('updatedAt');

      // Should NOT have sensitive data
      expect(json).not.toHaveProperty('kycData');
    });

    it('should convert dates to ISO strings', () => {
      const user = createUser();
      const json = user.toJSON();

      expect(typeof json.createdAt).toBe('string');
      expect(typeof json.updatedAt).toBe('string');
    });

    it('should return persistence format with all properties', () => {
      const user = createUser();
      const persistence = user.toPersistence();

      expect(persistence).toHaveProperty('id');
      expect(persistence).toHaveProperty('kycData');
      expect(persistence).toHaveProperty('name');
    });
  });
});
