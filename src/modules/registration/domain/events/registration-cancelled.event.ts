import { DomainEvent, type DomainEventProps } from "src/shared/ddd/domain-event.base";

export class RegistrationCancelledEvent extends DomainEvent {
  readonly organizationId: string;
  readonly occurrenceId: string;

  constructor(props: DomainEventProps<RegistrationCancelledEvent>) {
    super(props);
    this.organizationId = props.organizationId;
    this.occurrenceId = props.occurrenceId;
  }
}
