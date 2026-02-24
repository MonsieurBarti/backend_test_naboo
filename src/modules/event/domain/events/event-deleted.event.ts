import { DomainEvent, type DomainEventProps } from "src/shared/ddd/domain-event.base";

export class EventDeletedEvent extends DomainEvent {
  readonly organizationId: string;

  constructor(props: DomainEventProps<EventDeletedEvent>) {
    super(props);
    this.organizationId = props.organizationId;
  }
}
