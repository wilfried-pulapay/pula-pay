import { KycLevel, Currency } from '@prisma/client';
import { UserProps, User } from '@domain/entities/User';

export const createUserProps = (overrides: Partial<UserProps> = {}): UserProps => ({
  id: 'user-test-id-001',
  phoneNumber: '+22501234567',
  email: 'test@example.com',
  name: null,
  kycLevel: 'BASIC' as KycLevel,
  kycData: null,
  displayCurrency: 'EUR' as Currency,
  locale: 'fr-FR',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  ...overrides,
});

export const createUser = (overrides: Partial<UserProps> = {}): User => {
  return new User(createUserProps(overrides));
};

// Pre-defined user fixtures for different scenarios
export const userFixtures = {
  // User with no KYC (cannot perform transactions)
  noKyc: (): User =>
    createUser({
      id: 'user-no-kyc',
      phoneNumber: '+22500000001',
      kycLevel: 'NONE',
    }),

  // User with BASIC KYC (can perform limited transactions)
  basicKyc: (): User =>
    createUser({
      id: 'user-basic-kyc',
      phoneNumber: '+22500000002',
      kycLevel: 'BASIC',
    }),

  // User with VERIFIED KYC (higher limits)
  verifiedKyc: (): User =>
    createUser({
      id: 'user-verified-kyc',
      phoneNumber: '+22500000003',
      kycLevel: 'VERIFIED',
      kycData: { documentType: 'ID_CARD', documentNumber: 'ID123456' },
    }),

  // User with ENHANCED KYC (unlimited)
  enhancedKyc: (): User =>
    createUser({
      id: 'user-enhanced-kyc',
      phoneNumber: '+22500000004',
      kycLevel: 'ENHANCED',
      kycData: {
        documentType: 'ID_CARD',
        documentNumber: 'ID123456',
        addressProof: 'utility_bill.pdf',
      },
    }),

  // User with XOF currency preference
  xofCurrency: (): User =>
    createUser({
      id: 'user-xof',
      phoneNumber: '+22500000007',
      displayCurrency: 'XOF',
      locale: 'fr-CI',
    }),
};
