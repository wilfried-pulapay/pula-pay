import { DomainError } from './DomainError';

export class InvalidStateTransitionError extends DomainError {
  public readonly currentState: string;
  public readonly attemptedEvent: string;

  constructor(currentState: string, attemptedEvent: string) {
    super(
      `Cannot apply event '${attemptedEvent}' in state '${currentState}'`,
      'INVALID_STATE_TRANSITION'
    );
    this.currentState = currentState;
    this.attemptedEvent = attemptedEvent;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      currentState: this.currentState,
      attemptedEvent: this.attemptedEvent,
    };
  }
}
