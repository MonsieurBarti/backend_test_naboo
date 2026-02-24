import { DomainEvent, type DomainEventProps } from "src/shared/ddd/domain-event.base";

export class EventUpdatedEvent extends DomainEvent {
  readonly organizationId: string;

  constructor(props: DomainEventProps<EventUpdatedEvent>) {
    super(props);
    this.organizationId = props.organizationId;
  }
}
