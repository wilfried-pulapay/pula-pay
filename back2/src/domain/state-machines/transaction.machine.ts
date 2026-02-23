import { setup, assign } from 'xstate';

export interface TransactionContext {
  id: string;
  amountUsdc: string;
  feeUsdc: string;
  failureReason?: string;
}

export type TransactionEvent =
  | { type: 'PROCESS' }
  | { type: 'COMPLETE' }
  | { type: 'FAIL'; reason: string }
  | { type: 'CANCEL' }
  | { type: 'EXPIRE' };

export const transactionMachine = setup({
  types: {
    context: {} as TransactionContext,
    events: {} as TransactionEvent,
  },
}).createMachine({
  id: 'transaction',
  context: { id: '', amountUsdc: '0', feeUsdc: '0' },
  initial: 'PENDING',
  states: {
    PENDING: {
      on: {
        PROCESS: { target: 'PROCESSING' },
        CANCEL: { target: 'CANCELLED' },
        EXPIRE: { target: 'EXPIRED' },
        FAIL: {
          target: 'FAILED',
          actions: assign({
            failureReason: ({ event }) => event.reason,
          }),
        },
      },
    },
    PROCESSING: {
      on: {
        COMPLETE: { target: 'COMPLETED' },
        FAIL: {
          target: 'FAILED',
          actions: assign({
            failureReason: ({ event }) => event.reason,
          }),
        },
      },
    },
    COMPLETED: { type: 'final' },
    FAILED: { type: 'final' },
    CANCELLED: { type: 'final' },
    EXPIRED: { type: 'final' },
  },
});
