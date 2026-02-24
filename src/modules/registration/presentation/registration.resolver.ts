import { randomUUID } from "node:crypto";
import { Args, Int, Mutation, Query, Resolver } from "@nestjs/graphql";
import { ClsService } from "nestjs-cls";
import { TypedCommandBus } from "../../../shared/cqrs/typed-command-bus";
import { TypedQueryBus } from "../../../shared/cqrs/typed-query-bus";
import { encodeCursor } from "../../../shared/graphql/relay-pagination";
import { CancelRegistrationCommand } from "../application/commands/cancel-registration/cancel-registration.command";
import { RegisterForOccurrenceCommand } from "../application/commands/register-for-occurrence/register-for-occurrence.command";
import type { RegistrationReadModel } from "../application/queries/get-registrations/get-registrations.query";
import { GetRegistrationsQuery } from "../application/queries/get-registrations/get-registrations.query";
import {
  AlreadyRegisteredError,
  CapacityExceededError,
  ConflictDetectedError,
  EventCancelledError,
  NotOrgMemberError,
  OccurrenceInPastError,
  RegistrationNotFoundError,
} from "../domain/errors/registration-base.error";
import {
  AlreadyRegisteredErrorType,
  CancelRegistrationInput,
  CancelRegistrationResult,
  CancelRegistrationSuccess,
  CapacityExceededErrorType,
  ConflictDetectedErrorType,
  EventCancelledErrorType,
  NotOrgMemberErrorType,
  OccurrenceInPastErrorType,
  RegisterForOccurrenceInput,
  RegisterForOccurrenceResult,
  RegisterForOccurrenceSuccess,
  RegistrationConnection,
  RegistrationNotFoundErrorType,
  RegistrationType,
} from "./dto/registration.dto";

function getString(meta: Record<string, unknown> | undefined, key: string): string {
  const val = meta?.[key];
  return typeof val === "string" ? val : "";
}

function getDate(meta: Record<string, unknown> | undefined, key: string): Date {
  const val = meta?.[key];
  return val instanceof Date ? val : new Date(0);
}

function toRegistrationType(item: RegistrationReadModel): RegistrationType {
  const node = new RegistrationType();
  node.id = item.id;
  node.occurrenceId = item.occurrenceId;
  node.organizationId = item.organizationId;
  node.userId = item.userId;
  node.seatCount = item.seatCount;
  node.status = item.status;
  node.occurrenceStartDate = item.occurrenceStartDate;
  node.occurrenceEndDate = item.occurrenceEndDate;
  node.eventTitle = item.eventTitle;
  node.createdAt = item.createdAt;
  node.updatedAt = item.updatedAt;
  return node;
}

@Resolver(() => RegistrationType)
export class RegistrationResolver {
  constructor(
    private readonly commandBus: TypedCommandBus,
    private readonly queryBus: TypedQueryBus,
    private readonly cls: ClsService,
  ) {}

  @Mutation(() => RegisterForOccurrenceResult)
  async registerForOccurrence(
    @Args("input") input: RegisterForOccurrenceInput,
  ): Promise<typeof RegisterForOccurrenceResult> {
    const correlationId = this.cls.getId() ?? randomUUID();
    const organizationId = this.cls.get<string>("tenantId");
    const registrationId = randomUUID();

    try {
      await this.commandBus.execute(
        new RegisterForOccurrenceCommand({
          registrationId,
          occurrenceId: input.occurrenceId,
          userId: input.userId,
          seatCount: input.seatCount,
          organizationId,
          correlationId,
        }),
      );

      const success = new RegisterForOccurrenceSuccess();
      success.registrationId = registrationId;
      success.occurrenceId = input.occurrenceId;
      success.userId = input.userId;
      success.seatCount = input.seatCount;
      return success;
    } catch (err: unknown) {
      if (err instanceof CapacityExceededError) {
        const errorResult = new CapacityExceededErrorType();
        errorResult.message = err.message;
        errorResult.occurrenceId = getString(err.metadata, "occurrenceId");
        return errorResult;
      }
      if (err instanceof ConflictDetectedError) {
        const errorResult = new ConflictDetectedErrorType();
        errorResult.message = err.message;
        errorResult.conflictingOccurrenceId = getString(err.metadata, "conflictingOccurrenceId");
        errorResult.eventTitle = getString(err.metadata, "eventTitle");
        errorResult.startDate = getDate(err.metadata, "startDate");
        errorResult.endDate = getDate(err.metadata, "endDate");
        return errorResult;
      }
      if (err instanceof AlreadyRegisteredError) {
        const errorResult = new AlreadyRegisteredErrorType();
        errorResult.message = err.message;
        errorResult.userId = getString(err.metadata, "userId");
        errorResult.occurrenceId = getString(err.metadata, "occurrenceId");
        return errorResult;
      }
      if (err instanceof OccurrenceInPastError) {
        const errorResult = new OccurrenceInPastErrorType();
        errorResult.message = err.message;
        errorResult.occurrenceId = getString(err.metadata, "occurrenceId");
        return errorResult;
      }
      if (err instanceof EventCancelledError) {
        const errorResult = new EventCancelledErrorType();
        errorResult.message = err.message;
        errorResult.occurrenceId = getString(err.metadata, "occurrenceId");
        return errorResult;
      }
      if (err instanceof NotOrgMemberError) {
        const errorResult = new NotOrgMemberErrorType();
        errorResult.message = err.message;
        errorResult.userId = getString(err.metadata, "userId");
        errorResult.organizationId = getString(err.metadata, "organizationId");
        return errorResult;
      }
      throw err;
    }
  }

  @Mutation(() => CancelRegistrationResult)
  async cancelRegistration(
    @Args("input") input: CancelRegistrationInput,
  ): Promise<typeof CancelRegistrationResult> {
    const correlationId = this.cls.getId() ?? randomUUID();

    try {
      await this.commandBus.execute(
        new CancelRegistrationCommand({
          registrationId: input.registrationId,
          newSeatCount: input.newSeatCount ?? undefined,
          correlationId,
        }),
      );

      const success = new CancelRegistrationSuccess();
      success.registrationId = input.registrationId;
      success.cancelled = input.newSeatCount === null || input.newSeatCount === 0;
      return success;
    } catch (err: unknown) {
      if (err instanceof RegistrationNotFoundError) {
        const errorResult = new RegistrationNotFoundErrorType();
        errorResult.message = err.message;
        errorResult.registrationId = getString(err.metadata, "registrationId");
        return errorResult;
      }
      throw err;
    }
  }

  @Query(() => RegistrationConnection)
  async registrations(
    @Args("userId") userId: string,
    @Args("includeCancelled", { nullable: true, defaultValue: false }) includeCancelled: boolean,
    @Args("first", { type: () => Int, defaultValue: 20 }) first: number,
    @Args("after", { nullable: true }) after?: string,
  ): Promise<RegistrationConnection> {
    const correlationId = this.cls.getId() ?? randomUUID();
    const organizationId = this.cls.get<string>("tenantId");

    const result = await this.queryBus.execute(
      new GetRegistrationsQuery({
        userId,
        organizationId,
        includeCancelled,
        first,
        after,
        correlationId,
      }),
    );

    const connection = new RegistrationConnection();
    connection.nodes = result.items.map(toRegistrationType);
    connection.edges = result.items.map((item) => ({
      cursor: encodeCursor(item.id),
      node: toRegistrationType(item),
    }));
    connection.totalCount = result.totalCount;
    connection.hasNextPage = result.hasNextPage;
    return connection;
  }
}
