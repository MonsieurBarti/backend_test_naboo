import { DomainEvent, type DomainEventProps } from "src/shared/ddd/domain-event.base";

export class RegistrationCreatedEvent extends DomainEvent {
  readonly organizationId: string;
  readonly occurrenceId: string;

  constructor(props: DomainEventProps<RegistrationCreatedEvent>) {
    super(props);
    this.organizationId = props.organizationId;
    this.occurrenceId = props.occurrenceId;
  }
}
