import { createUnionType, Field, ID, InputType, Int, ObjectType } from "@nestjs/graphql";
import { Paginated } from "../../../../shared/graphql/relay-pagination";

// --- Object Types ---

@ObjectType()
export class EventType {
  @Field(() => ID)
  id!: string;

  @Field()
  title!: string;

  @Field()
  description!: string;

  @Field(() => String, { nullable: true })
  location!: string | null;

  @Field(() => Date)
  startDate!: Date;

  @Field(() => Date)
  endDate!: Date;

  @Field(() => Int)
  maxCapacity!: number;

  @Field()
  isRecurring!: boolean;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;
}

@ObjectType()
export class OccurrenceType {
  @Field(() => ID)
  id!: string;

  @Field()
  eventId!: string;

  @Field(() => Date)
  startDate!: Date;

  @Field(() => Date)
  endDate!: Date;

  @Field(() => String, { nullable: true })
  title!: string | null;

  @Field(() => String, { nullable: true })
  location!: string | null;

  @Field(() => Int, { nullable: true })
  maxCapacity!: number | null;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;
}

// --- Relay Pagination Types ---

@ObjectType("EventConnection")
export class EventConnection extends Paginated(EventType) {}

@ObjectType("OccurrenceConnection")
export class OccurrenceConnection extends Paginated(OccurrenceType) {}

// --- Input Types ---

@InputType()
export class RecurrencePatternInput {
  @Field()
  frequency!: string;

  @Field(() => Int, { nullable: true })
  interval!: number | null;

  @Field(() => [String], { nullable: true })
  byDay!: string[] | null;

  @Field(() => [Int], { nullable: true })
  byMonthDay!: number[] | null;

  @Field(() => [Int], { nullable: true })
  byMonth!: number[] | null;

  @Field(() => Date, { nullable: true })
  until!: Date | null;

  @Field(() => Int, { nullable: true })
  count!: number | null;
}

@InputType()
export class CreateEventInput {
  @Field()
  title!: string;

  @Field()
  description!: string;

  @Field(() => String, { nullable: true })
  location!: string | null;

  @Field(() => Date)
  startDate!: Date;

  @Field(() => Date)
  endDate!: Date;

  @Field(() => Int)
  maxCapacity!: number;

  @Field(() => RecurrencePatternInput, { nullable: true })
  recurrencePattern!: RecurrencePatternInput | null;
}

@InputType()
export class UpdateEventInput {
  @Field(() => ID)
  eventId!: string;

  @Field(() => String, { nullable: true })
  title!: string | null;

  @Field(() => String, { nullable: true })
  description!: string | null;

  @Field(() => String, { nullable: true })
  location!: string | null;

  @Field(() => Date, { nullable: true })
  startDate!: Date | null;

  @Field(() => Date, { nullable: true })
  endDate!: Date | null;

  @Field(() => Int, { nullable: true })
  maxCapacity!: number | null;

  @Field(() => RecurrencePatternInput, { nullable: true })
  recurrencePattern!: RecurrencePatternInput | null;
}

@InputType()
export class DeleteEventInput {
  @Field(() => ID)
  eventId!: string;
}

// --- Union Result Types ---

@ObjectType()
export class CreateEventSuccess {
  @Field(() => ID)
  id!: string;

  @Field()
  title!: string;
}

@ObjectType()
export class EventNotFoundErrorType {
  @Field()
  message!: string;

  @Field()
  eventId!: string;
}

@ObjectType()
export class InvalidRecurrencePatternErrorType {
  @Field()
  message!: string;
}

@ObjectType()
export class UpdateEventSuccess {
  @Field(() => ID)
  id!: string;

  @Field()
  title!: string;
}

@ObjectType()
export class DeleteEventSuccess {
  @Field(() => ID)
  id!: string;
}

export const CreateEventResult = createUnionType({
  name: "CreateEventResult",
  types: () => [CreateEventSuccess, InvalidRecurrencePatternErrorType] as const,
});

export const UpdateEventResult = createUnionType({
  name: "UpdateEventResult",
  types: () =>
    [UpdateEventSuccess, EventNotFoundErrorType, InvalidRecurrencePatternErrorType] as const,
});

export const DeleteEventResult = createUnionType({
  name: "DeleteEventResult",
  types: () => [DeleteEventSuccess, EventNotFoundErrorType] as const,
});
