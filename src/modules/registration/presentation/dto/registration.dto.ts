import { createUnionType, Field, ID, InputType, Int, ObjectType } from "@nestjs/graphql";
import { Paginated } from "../../../../shared/graphql/relay-pagination";

// --- Object Types ---

@ObjectType("Registration")
export class RegistrationType {
  @Field(() => ID)
  id!: string;

  @Field()
  occurrenceId!: string;

  @Field()
  organizationId!: string;

  @Field()
  userId!: string;

  @Field(() => Int)
  seatCount!: number;

  @Field()
  status!: string;

  @Field(() => Date)
  occurrenceStartDate!: Date;

  @Field(() => Date)
  occurrenceEndDate!: Date;

  @Field()
  eventTitle!: string;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;
}

// --- Relay Pagination Types ---

@ObjectType("RegistrationConnection")
export class RegistrationConnection extends Paginated(RegistrationType) {}

// --- Input Types ---

@InputType()
export class RegisterForOccurrenceInput {
  @Field()
  occurrenceId!: string;

  @Field()
  userId!: string;

  @Field(() => Int, { defaultValue: 1 })
  seatCount!: number;
}

@InputType()
export class CancelRegistrationInput {
  @Field()
  registrationId!: string;

  @Field(() => Int, { nullable: true })
  newSeatCount!: number | null;
}

// --- Success Types ---

@ObjectType()
export class RegisterForOccurrenceSuccess {
  @Field(() => ID)
  registrationId!: string;

  @Field()
  occurrenceId!: string;

  @Field()
  userId!: string;

  @Field(() => Int)
  seatCount!: number;
}

@ObjectType()
export class CancelRegistrationSuccess {
  @Field(() => ID)
  registrationId!: string;

  @Field()
  cancelled!: boolean;
}

// --- Error ObjectTypes (for union result discrimination) ---

@ObjectType()
export class CapacityExceededErrorType {
  @Field()
  message!: string;

  @Field()
  occurrenceId!: string;
}

@ObjectType()
export class ConflictDetectedErrorType {
  @Field()
  message!: string;

  @Field()
  conflictingOccurrenceId!: string;

  @Field()
  eventTitle!: string;

  @Field(() => Date)
  startDate!: Date;

  @Field(() => Date)
  endDate!: Date;
}

@ObjectType()
export class AlreadyRegisteredErrorType {
  @Field()
  message!: string;

  @Field()
  userId!: string;

  @Field()
  occurrenceId!: string;
}

@ObjectType()
export class OccurrenceInPastErrorType {
  @Field()
  message!: string;

  @Field()
  occurrenceId!: string;
}

@ObjectType()
export class EventCancelledErrorType {
  @Field()
  message!: string;

  @Field()
  occurrenceId!: string;
}

@ObjectType()
export class OccurrenceNotFoundErrorType {
  @Field()
  message!: string;

  @Field()
  occurrenceId!: string;
}

@ObjectType()
export class RegistrationNotFoundErrorType {
  @Field()
  message!: string;

  @Field(() => ID)
  registrationId!: string;
}

// --- Union Result Types ---

export const RegisterForOccurrenceResult = createUnionType({
  name: "RegisterForOccurrenceResult",
  types: () =>
    [
      RegisterForOccurrenceSuccess,
      CapacityExceededErrorType,
      ConflictDetectedErrorType,
      AlreadyRegisteredErrorType,
      OccurrenceInPastErrorType,
      EventCancelledErrorType,
      OccurrenceNotFoundErrorType,
    ] as const,
});

export const CancelRegistrationResult = createUnionType({
  name: "CancelRegistrationResult",
  types: () => [CancelRegistrationSuccess, RegistrationNotFoundErrorType] as const,
});
