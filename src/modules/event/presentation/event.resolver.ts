import { randomUUID } from "node:crypto";
import { Args, Int, Mutation, Query, Resolver } from "@nestjs/graphql";
import { ClsService } from "nestjs-cls";
import { TypedCommandBus } from "../../../shared/cqrs/typed-command-bus";
import { TypedQueryBus } from "../../../shared/cqrs/typed-query-bus";
import { encodeCursor } from "../../../shared/graphql/relay-pagination";
import { CreateEventCommand } from "../application/commands/create-event/create-event.command";
import { DeleteEventCommand } from "../application/commands/delete-event/delete-event.command";
import { UpdateEventCommand } from "../application/commands/update-event/update-event.command";
import type { EventReadModel } from "../application/queries/get-events/get-events.query";
import { GetEventsQuery } from "../application/queries/get-events/get-events.query";
import type { OccurrenceReadModel } from "../application/queries/get-occurrences/get-occurrences.query";
import { GetOccurrencesQuery } from "../application/queries/get-occurrences/get-occurrences.query";
import {
  EventNotFoundError,
  InvalidRecurrencePatternError,
} from "../domain/errors/event-base.error";
import type { RecurrencePatternProps } from "../domain/event/recurrence-pattern";
import { recurrencePatternSchema } from "../domain/event/recurrence-pattern";
import {
  CreateEventInput,
  CreateEventResult,
  CreateEventSuccess,
  DeleteEventInput,
  DeleteEventResult,
  DeleteEventSuccess,
  EventConnection,
  EventNotFoundErrorType,
  EventType,
  InvalidRecurrencePatternErrorType,
  OccurrenceConnection,
  OccurrenceType,
  RecurrencePatternInput,
  UpdateEventInput,
  UpdateEventResult,
  UpdateEventSuccess,
} from "./dto/event.dto";

/**
 * Parses a RecurrencePatternInput through Zod to produce a properly typed RecurrencePatternProps.
 * Throws InvalidRecurrencePatternError if the input is invalid.
 */
function parseRecurrencePatternInput(
  input: RecurrencePatternInput,
  correlationId: string,
): RecurrencePatternProps {
  const result = recurrencePatternSchema.safeParse({
    frequency: input.frequency,
    interval: input.interval ?? undefined,
    byDay: input.byDay ?? undefined,
    byMonthDay: input.byMonthDay ?? undefined,
    byMonth: input.byMonth ?? undefined,
    until: input.until ?? undefined,
    count: input.count ?? undefined,
  });
  if (!result.success) {
    throw new InvalidRecurrencePatternError(result.error.message, {
      correlationId,
      metadata: { issues: result.error.issues },
    });
  }
  return result.data;
}

function toEventType(item: EventReadModel): EventType {
  const node = new EventType();
  node.id = item.id;
  node.title = item.title;
  node.description = item.description;
  node.location = item.location;
  node.startDate = item.startDate;
  node.endDate = item.endDate;
  node.maxCapacity = item.maxCapacity;
  node.isRecurring = item.recurrencePattern !== null;
  node.createdAt = item.createdAt;
  node.updatedAt = item.updatedAt;
  return node;
}

function toOccurrenceType(item: OccurrenceReadModel): OccurrenceType {
  const node = new OccurrenceType();
  node.id = item.id;
  node.eventId = item.eventId;
  node.startDate = item.startDate;
  node.endDate = item.endDate;
  node.title = item.title;
  node.location = item.location;
  node.maxCapacity = item.maxCapacity;
  node.createdAt = item.createdAt;
  node.updatedAt = item.updatedAt;
  return node;
}

@Resolver(() => EventType)
export class EventResolver {
  constructor(
    private readonly commandBus: TypedCommandBus,
    private readonly queryBus: TypedQueryBus,
    private readonly cls: ClsService,
  ) {}

  @Mutation(() => CreateEventResult)
  async createEvent(@Args("input") input: CreateEventInput): Promise<typeof CreateEventResult> {
    const correlationId = this.cls.getId() ?? randomUUID();
    const id = randomUUID();

    try {
      const recurrencePattern =
        input.recurrencePattern !== null
          ? parseRecurrencePatternInput(input.recurrencePattern, correlationId)
          : undefined;

      await this.commandBus.execute(
        new CreateEventCommand({
          id,
          organizationId: this.cls.get<string>("tenantId"),
          title: input.title,
          description: input.description,
          location: input.location ?? undefined,
          startDate: input.startDate,
          endDate: input.endDate,
          maxCapacity: input.maxCapacity,
          recurrencePattern,
          correlationId,
        }),
      );

      const success = new CreateEventSuccess();
      success.id = id;
      success.title = input.title;
      return success;
    } catch (err: unknown) {
      if (err instanceof InvalidRecurrencePatternError) {
        const errorResult = new InvalidRecurrencePatternErrorType();
        errorResult.message = err.message;
        return errorResult;
      }
      throw err;
    }
  }

  @Mutation(() => UpdateEventResult)
  async updateEvent(@Args("input") input: UpdateEventInput): Promise<typeof UpdateEventResult> {
    const correlationId = this.cls.getId() ?? randomUUID();

    try {
      const recurrencePattern =
        input.recurrencePattern !== null && input.recurrencePattern !== undefined
          ? parseRecurrencePatternInput(input.recurrencePattern, correlationId)
          : undefined;

      await this.commandBus.execute(
        new UpdateEventCommand({
          eventId: input.eventId,
          title: input.title ?? undefined,
          description: input.description ?? undefined,
          location: input.location ?? undefined,
          startDate: input.startDate ?? undefined,
          endDate: input.endDate ?? undefined,
          maxCapacity: input.maxCapacity ?? undefined,
          recurrencePattern,
          correlationId,
        }),
      );

      const success = new UpdateEventSuccess();
      success.id = input.eventId;
      success.title = input.title ?? "";
      return success;
    } catch (err: unknown) {
      if (err instanceof EventNotFoundError) {
        const errorResult = new EventNotFoundErrorType();
        errorResult.message = err.message;
        errorResult.eventId = input.eventId;
        return errorResult;
      }
      if (err instanceof InvalidRecurrencePatternError) {
        const errorResult = new InvalidRecurrencePatternErrorType();
        errorResult.message = err.message;
        return errorResult;
      }
      throw err;
    }
  }

  @Mutation(() => DeleteEventResult)
  async deleteEvent(@Args("input") input: DeleteEventInput): Promise<typeof DeleteEventResult> {
    const correlationId = this.cls.getId() ?? randomUUID();

    try {
      await this.commandBus.execute(
        new DeleteEventCommand({
          eventId: input.eventId,
          correlationId,
        }),
      );

      const success = new DeleteEventSuccess();
      success.id = input.eventId;
      return success;
    } catch (err: unknown) {
      if (err instanceof EventNotFoundError) {
        const errorResult = new EventNotFoundErrorType();
        errorResult.message = err.message;
        errorResult.eventId = input.eventId;
        return errorResult;
      }
      throw err;
    }
  }

  @Query(() => EventConnection)
  async events(
    @Args("startDate", { nullable: true }) startDate?: Date,
    @Args("endDate", { nullable: true }) endDate?: Date,
    @Args("first", { type: () => Int, defaultValue: 20 }) first = 20,
    @Args("after", { nullable: true }) after?: string,
  ): Promise<EventConnection> {
    const correlationId = this.cls.getId() ?? randomUUID();

    const result = await this.queryBus.execute(
      new GetEventsQuery({ startDate, endDate, first, after, correlationId }),
    );

    const connection = new EventConnection();
    connection.nodes = result.items.map(toEventType);
    connection.edges = result.items.map((item) => ({
      cursor: encodeCursor(item.id),
      node: toEventType(item),
    }));
    connection.totalCount = result.totalCount;
    connection.hasNextPage = result.hasNextPage;
    return connection;
  }

  @Query(() => OccurrenceConnection)
  async occurrences(
    @Args("eventId") eventId: string,
    @Args("startDate", { nullable: true }) startDate?: Date,
    @Args("endDate", { nullable: true }) endDate?: Date,
    @Args("first", { type: () => Int, defaultValue: 20 }) first = 20,
    @Args("after", { nullable: true }) after?: string,
  ): Promise<OccurrenceConnection> {
    const correlationId = this.cls.getId() ?? randomUUID();

    const result = await this.queryBus.execute(
      new GetOccurrencesQuery({ eventId, startDate, endDate, first, after, correlationId }),
    );

    const connection = new OccurrenceConnection();
    connection.nodes = result.items.map(toOccurrenceType);
    connection.edges = result.items.map((item) => ({
      cursor: encodeCursor(item.id),
      node: toOccurrenceType(item),
    }));
    connection.totalCount = result.totalCount;
    connection.hasNextPage = result.hasNextPage;
    return connection;
  }
}
