import { transition, type AnyStateMachine, type SnapshotFrom } from 'xstate';
import { InvalidStateTransitionError } from '../errors/InvalidStateTransitionError';

export function applyTransition<TMachine extends AnyStateMachine>(
  machine: TMachine,
  currentStatus: string,
  event: { type: string; [key: string]: any },
  context: Record<string, any>,
): { newStatus: string; newContext: Record<string, any> } {
  const resolved = machine.resolveState({
    value: currentStatus,
    context,
  } as any) as SnapshotFrom<TMachine>;

  const [nextSnapshot] = transition(machine, resolved, event as any);

  const snap = nextSnapshot as any;
  const nextStatus = typeof snap.value === 'string'
    ? snap.value
    : Object.keys(snap.value)[0];

  if (nextStatus === currentStatus) {
    throw new InvalidStateTransitionError(currentStatus, event.type);
  }

  return {
    newStatus: nextStatus,
    newContext: snap.context,
  };
}
