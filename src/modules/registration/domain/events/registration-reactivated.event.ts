import { DomainEvent, type DomainEventProps } from "src/shared/ddd/domain-event.base";

export class RegistrationReactivatedEvent extends DomainEvent {
  readonly organizationId: string;
  readonly occurrenceId: string;

  constructor(props: DomainEventProps<RegistrationReactivatedEvent>) {
    super(props);
    this.organizationId = props.organizationId;
    this.occurrenceId = props.occurrenceId;
  }
}
