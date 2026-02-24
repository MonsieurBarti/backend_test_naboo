import { Injectable } from "@nestjs/common";
import { AggregateRoot, EventBus } from "@nestjs/cqrs";
import { InjectModel } from "@nestjs/mongoose";
import type { ClientSession } from "mongoose";
import { Model } from "mongoose";
import type { CursorPaginatedResult } from "../../../event/domain/event/event.repository";
import { Registration } from "../../domain/registration/registration";
import { IRegistrationRepository } from "../../domain/registration/registration.repository";
import { RegistrationMapper } from "./registration.mapper";
import type { RegistrationDocument } from "./registration.schema";

function encodeCursor(id: string): string {
  return Buffer.from(id).toString("base64");
}

function decodeCursor(cursor: string): string {
  return Buffer.from(cursor, "base64").toString("utf-8");
}

@Injectable()
export class MongooseRegistrationRepository implements IRegistrationRepository {
  private readonly mapper: RegistrationMapper = new RegistrationMapper();

  constructor(
    @InjectModel("Registration")
    private readonly model: Model<RegistrationDocument>,
    private readonly eventBus: EventBus,
  ) {}

  async save(entity: Registration, session?: ClientSession): Promise<void> {
    const doc = this.mapper.toPersistence(entity);
    await this.model.findOneAndUpdate(
      { _id: doc._id },
      { $set: doc },
      { upsert: true, new: true, session },
    );
    this.publishEvents(entity);
  }

  async findByUserAndOccurrence(
    userId: string,
    occurrenceId: string,
  ): Promise<Registration | null> {
    const doc = await this.model
      .findOne({ userId, occurrenceId })
      .lean<RegistrationDocument>()
      .exec();
    return doc ? this.mapper.toDomain(doc) : null;
  }

  async findOverlappingRegistrations(
    userId: string,
    startDate: Date,
    endDate: Date,
    excludeRegistrationId?: string,
  ): Promise<Registration[]> {
    const filter: Record<string, unknown> = {
      userId,
      status: "active",
      occurrenceStartDate: { $lt: endDate },
      occurrenceEndDate: { $gt: startDate },
    };

    if (excludeRegistrationId !== undefined) {
      filter["_id"] = { $ne: excludeRegistrationId };
    }

    const docs = await this.model.find(filter).lean<RegistrationDocument[]>().exec();
    return docs.map((doc) => this.mapper.toDomain(doc));
  }

  async findByUserInOrganization(params: {
    userId: string;
    organizationId: string;
    includeCancelled?: boolean;
    first: number;
    after?: string;
  }): Promise<CursorPaginatedResult<Registration>> {
    const { userId, organizationId, includeCancelled, first, after } = params;

    const baseFilter: Record<string, unknown> = {
      organizationId,
      userId,
      ...(includeCancelled ? {} : { status: "active" }),
      ...(after ? { _id: { $gt: decodeCursor(after) } } : {}),
    };

    const countFilter: Record<string, unknown> = {
      organizationId,
      userId,
      ...(includeCancelled ? {} : { status: "active" }),
    };

    const [docs, totalCount] = await Promise.all([
      this.model
        .find(baseFilter)
        .sort({ _id: 1 })
        .limit(first + 1)
        .lean<RegistrationDocument[]>()
        .exec(),
      this.model.countDocuments(countFilter).exec(),
    ]);

    const hasNextPage = docs.length > first;
    if (hasNextPage) docs.pop();

    return {
      items: docs.map((doc) => this.mapper.toDomain(doc)),
      hasNextPage,
      totalCount,
    };
  }

  async withTransaction<T>(fn: (session?: ClientSession) => Promise<T>): Promise<T> {
    const session = await this.model.db.startSession();
    try {
      let result!: T;
      await session.withTransaction(async () => {
        result = await fn(session);
      });
      return result;
    } finally {
      await session.endSession();
    }
  }

  private publishEvents(entity: AggregateRoot): void {
    const events = entity.getUncommittedEvents();
    if (events.length > 0) {
      this.eventBus.publishAll(events);
      entity.uncommit();
    }
  }

  static encodeCursor(id: string): string {
    return encodeCursor(id);
  }
}
