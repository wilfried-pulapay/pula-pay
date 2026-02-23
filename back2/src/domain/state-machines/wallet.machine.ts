import { setup, assign } from 'xstate';
import Decimal from 'decimal.js';

export interface WalletContext {
  walletId: string;
  circleWalletId?: string;
  balanceUsdc: string;
}

export type WalletEvent =
  | { type: 'ACTIVATE'; circleWalletId: string }
  | { type: 'FREEZE' }
  | { type: 'UNFREEZE' }
  | { type: 'CLOSE' }
  | { type: 'CREDIT'; amount: string }
  | { type: 'DEBIT'; amount: string };

export const walletMachine = setup({
  types: {
    context: {} as WalletContext,
    events: {} as WalletEvent,
  },
  guards: {
    hasSufficientFunds: ({ context, event }) => {
      if (event.type !== 'DEBIT') return false;
      return new Decimal(context.balanceUsdc).gte(new Decimal(event.amount));
    },
  },
}).createMachine({
  id: 'wallet',
  context: { walletId: '', balanceUsdc: '0' },
  initial: 'PENDING',
  states: {
    PENDING: {
      on: {
        ACTIVATE: {
          target: 'ACTIVE',
          actions: assign({
            circleWalletId: ({ event }) => event.circleWalletId,
          }),
        },
      },
    },
    ACTIVE: {
      on: {
        FREEZE: { target: 'FROZEN' },
        CLOSE: { target: 'CLOSED' },
        CREDIT: {
          actions: assign({
            balanceUsdc: ({ context, event }) =>
              new Decimal(context.balanceUsdc).plus(event.amount).toFixed(6),
          }),
        },
        DEBIT: {
          guard: 'hasSufficientFunds',
          actions: assign({
            balanceUsdc: ({ context, event }) =>
              new Decimal(context.balanceUsdc).minus(event.amount).toFixed(6),
          }),
        },
      },
    },
    FROZEN: {
      on: {
        UNFREEZE: { target: 'ACTIVE' },
        CLOSE: { target: 'CLOSED' },
      },
    },
    CLOSED: { type: 'final' },
  },
});
