import { DomainEvent, type DomainEventProps } from "src/shared/ddd/domain-event.base";

export class EventCreatedEvent extends DomainEvent {
  readonly organizationId: string;

  constructor(props: DomainEventProps<EventCreatedEvent>) {
    super(props);
    this.organizationId = props.organizationId;
  }
}
