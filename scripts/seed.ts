import { randomUUID } from "node:crypto";
import mongoose from "mongoose";
import { materializeOccurrenceDates } from "../src/modules/event/application/services/occurrence-materializer.service";
import type { EventDocument } from "../src/modules/event/infrastructure/event/event.schema";
import { EventSchema } from "../src/modules/event/infrastructure/event/event.schema";
import type { OccurrenceDocument } from "../src/modules/event/infrastructure/occurrence/occurrence.schema";
import { OccurrenceSchema } from "../src/modules/event/infrastructure/occurrence/occurrence.schema";
import { OrganizationSchema } from "../src/modules/organization/infrastructure/organization/organization.schema";
import type { RegistrationDocument } from "../src/modules/registration/infrastructure/registration/registration.schema";
import { RegistrationSchema } from "../src/modules/registration/infrastructure/registration/registration.schema";

const MONGODB_URI =
  process.env["MONGODB_URI"] ?? "mongodb://localhost:27017/event-scheduler?replicaSet=rs0";

// ─── Helpers ────────────────────────────────────────────────────────────────

function nextWeekday(dayOfWeek: number): Date {
  // dayOfWeek: 0=Sun, 1=Mon ... 6=Sat
  const now = new Date();
  const result = new Date(now);
  const daysUntil = (((dayOfWeek - now.getDay()) % 7) + 7) % 7 || 7;
  result.setDate(now.getDate() + daysUntil);
  result.setHours(0, 0, 0, 0);
  return result;
}

function firstDayOfNextMonth(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0));
}

function weeksFromNow(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n * 7);
  return d;
}

function monthsFromNow(n: number): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + n, 1, 0, 0, 0, 0));
}

async function dropCollectionSafe(conn: mongoose.Connection, name: string): Promise<void> {
  try {
    await conn.dropCollection(name);
  } catch {
    // Collection does not exist — silently ignore
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function run(): Promise<void> {
  console.log("Connecting to MongoDB…");
  await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  const conn = mongoose.connection;

  // ── Register models ────────────────────────────────────────────────────────

  const OrgModel = mongoose.model("Organization", OrganizationSchema);

  // Registration is in a global collection
  const RegistrationModel = mongoose.model<RegistrationDocument>(
    "Registration",
    RegistrationSchema,
  );

  // Tenant-scoped collection names (must match TenantConnectionRegistry slug pattern)
  const org1Slug = "busy-corp";
  const org2Slug = "minimal-org";

  const BusyCorpEventModel = conn.model<EventDocument>(
    `${org1Slug}_Event`,
    EventSchema,
    `${org1Slug}_events`,
  );
  const BusyCorpOccurrenceModel = conn.model<OccurrenceDocument>(
    `${org1Slug}_Occurrence`,
    OccurrenceSchema,
    `${org1Slug}_occurrences`,
  );
  const MinimalOrgEventModel = conn.model<EventDocument>(
    `${org2Slug}_Event`,
    EventSchema,
    `${org2Slug}_events`,
  );
  const MinimalOrgOccurrenceModel = conn.model<OccurrenceDocument>(
    `${org2Slug}_Occurrence`,
    OccurrenceSchema,
    `${org2Slug}_occurrences`,
  );

  // ── Idempotent clear ───────────────────────────────────────────────────────

  console.log("Clearing existing data…");
  await dropCollectionSafe(conn, "organizations");
  await dropCollectionSafe(conn, "registrations");
  await dropCollectionSafe(conn, `${org1Slug}_events`);
  await dropCollectionSafe(conn, `${org1Slug}_occurrences`);
  await dropCollectionSafe(conn, `${org2Slug}_events`);
  await dropCollectionSafe(conn, `${org2Slug}_occurrences`);

  // ── Seed organizations ─────────────────────────────────────────────────────

  console.log("Seeding organizations…");
  const org1Id = randomUUID();
  const org2Id = randomUUID();
  const now = new Date();

  await OrgModel.create([
    { _id: org1Id, name: "Busy Corp", slug: org1Slug, createdAt: now },
    { _id: org2Id, name: "Minimal Org", slug: org2Slug, createdAt: now },
  ]);

  // ── Seed events and occurrences for Busy Corp ──────────────────────────────

  console.log("Seeding Busy Corp events and occurrences…");

  // Event 1: Weekly Standup (recurring weekly on Monday)
  const standupId = randomUUID();
  const standupStart = nextWeekday(1); // Next Monday
  standupStart.setHours(9, 0, 0, 0);
  const standupEnd = new Date(standupStart);
  standupEnd.setMinutes(30);

  const standupRecurrence = {
    frequency: "WEEKLY" as const,
    interval: 1,
    byDay: ["MO" as const],
    until: weeksFromNow(20),
  };

  const standupDates = materializeOccurrenceDates(standupRecurrence, standupStart);

  const standupOccurrences = standupDates.map((startDate) => {
    const endDate = new Date(startDate);
    endDate.setMinutes(endDate.getMinutes() + 30);
    return {
      _id: randomUUID(),
      eventId: standupId,
      organizationId: org1Id,
      startDate,
      endDate,
      title: null,
      location: null,
      maxCapacity: null,
      registeredSeats: 0,
      deletedAt: null,
    };
  });

  await BusyCorpEventModel.create({
    _id: standupId,
    organizationId: org1Id,
    title: "Monday Standup",
    description: "Weekly team sync",
    location: "Conference Room A",
    startDate: standupStart,
    endDate: standupEnd,
    maxCapacity: 20,
    recurrencePattern: standupRecurrence,
    deletedAt: null,
  });
  await BusyCorpOccurrenceModel.insertMany(standupOccurrences);

  // Event 2: Monthly Engineering Workshop (recurring monthly, 1st of month)
  const workshopId = randomUUID();
  const workshopStart = firstDayOfNextMonth();
  workshopStart.setHours(14, 0, 0, 0);
  const workshopEnd = new Date(workshopStart);
  workshopEnd.setHours(16, 0, 0, 0);

  const workshopRecurrence = {
    frequency: "MONTHLY" as const,
    interval: 1,
    byMonthDay: [1],
    until: monthsFromNow(6),
  };

  const workshopDates = materializeOccurrenceDates(workshopRecurrence, workshopStart);

  const workshopOccurrences = workshopDates.map((startDate) => {
    const endDate = new Date(startDate);
    endDate.setHours(endDate.getHours() + 2);
    return {
      _id: randomUUID(),
      eventId: workshopId,
      organizationId: org1Id,
      startDate,
      endDate,
      title: null,
      location: null,
      maxCapacity: null,
      registeredSeats: 0,
      deletedAt: null,
    };
  });

  await BusyCorpEventModel.create({
    _id: workshopId,
    organizationId: org1Id,
    title: "Engineering Workshop",
    description: "Monthly deep-dive on architecture topics",
    location: "Main Auditorium",
    startDate: workshopStart,
    endDate: workshopEnd,
    maxCapacity: 50,
    recurrencePattern: workshopRecurrence,
    deletedAt: null,
  });
  await BusyCorpOccurrenceModel.insertMany(workshopOccurrences);

  // Event 3: Annual Conference (one-off, at capacity)
  const conferenceId = randomUUID();
  const conferenceStart = new Date("2026-06-15T09:00:00Z");
  const conferenceEnd = new Date("2026-06-15T17:00:00Z");
  const conferenceOccurrenceId = randomUUID();

  await BusyCorpEventModel.create({
    _id: conferenceId,
    organizationId: org1Id,
    title: "Annual Tech Conference 2026",
    description: "Company-wide technology conference",
    location: "Grand Hall",
    startDate: conferenceStart,
    endDate: conferenceEnd,
    maxCapacity: 5,
    recurrencePattern: null,
    deletedAt: null,
  });
  await BusyCorpOccurrenceModel.create({
    _id: conferenceOccurrenceId,
    eventId: conferenceId,
    organizationId: org1Id,
    startDate: conferenceStart,
    endDate: conferenceEnd,
    title: null,
    location: null,
    maxCapacity: 5,
    registeredSeats: 5,
    deletedAt: null,
  });

  // Event 4: Team Retrospective (one-off)
  const retroId = randomUUID();
  const retroStart = new Date("2026-04-01T10:00:00Z");
  const retroEnd = new Date("2026-04-01T12:00:00Z");
  const retroOccurrenceId = randomUUID();

  await BusyCorpEventModel.create({
    _id: retroId,
    organizationId: org1Id,
    title: "Q1 Team Retrospective",
    description: "Quarterly team retro",
    location: "Meeting Room B",
    startDate: retroStart,
    endDate: retroEnd,
    maxCapacity: 15,
    recurrencePattern: null,
    deletedAt: null,
  });
  await BusyCorpOccurrenceModel.create({
    _id: retroOccurrenceId,
    eventId: retroId,
    organizationId: org1Id,
    startDate: retroStart,
    endDate: retroEnd,
    title: null,
    location: null,
    maxCapacity: 15,
    registeredSeats: 3,
    deletedAt: null,
  });

  // ── Seed events and occurrences for Minimal Org ────────────────────────────

  console.log("Seeding Minimal Org events and occurrences…");

  const welcomeId = randomUUID();
  const welcomeStart = new Date("2026-05-01T10:00:00Z");
  const welcomeEnd = new Date("2026-05-01T11:00:00Z");
  const welcomeOccurrenceId = randomUUID();

  await MinimalOrgEventModel.create({
    _id: welcomeId,
    organizationId: org2Id,
    title: "Welcome Onboarding",
    description: "Introductory session",
    location: null,
    startDate: welcomeStart,
    endDate: welcomeEnd,
    maxCapacity: 10,
    recurrencePattern: null,
    deletedAt: null,
  });
  await MinimalOrgOccurrenceModel.create({
    _id: welcomeOccurrenceId,
    eventId: welcomeId,
    organizationId: org2Id,
    startDate: welcomeStart,
    endDate: welcomeEnd,
    title: null,
    location: null,
    maxCapacity: 10,
    registeredSeats: 0,
    deletedAt: null,
  });

  // ── Seed registrations ─────────────────────────────────────────────────────

  console.log("Seeding registrations…");

  const user1 = randomUUID();
  const user2 = randomUUID();
  const user3 = randomUUID();
  const user4 = randomUUID();
  const user5 = randomUUID();

  const registrations: Omit<RegistrationDocument, "createdAt" | "updatedAt">[] = [];

  // 5 registrations for Annual Conference (fills capacity: registeredSeats=5, maxCapacity=5)
  const conferenceUsers = [user1, user2, user3, user4, user5];
  for (const userId of conferenceUsers) {
    registrations.push({
      _id: randomUUID(),
      occurrenceId: conferenceOccurrenceId,
      organizationId: org1Id,
      userId,
      seatCount: 1,
      status: "active",
      occurrenceStartDate: conferenceStart,
      occurrenceEndDate: conferenceEnd,
      eventTitle: "Annual Tech Conference 2026",
      deletedAt: null,
    });
  }

  // 3 registrations for Team Retro
  const retroUsers = [user1, user2, user3];
  for (const userId of retroUsers) {
    registrations.push({
      _id: randomUUID(),
      occurrenceId: retroOccurrenceId,
      organizationId: org1Id,
      userId,
      seatCount: 1,
      status: "active",
      occurrenceStartDate: retroStart,
      occurrenceEndDate: retroEnd,
      eventTitle: "Q1 Team Retrospective",
      deletedAt: null,
    });
  }

  // Edge case: Cancelled registration — user1 registered for a standup occurrence, then cancelled
  const firstStandupOccurrence = standupOccurrences[0];
  if (firstStandupOccurrence !== undefined) {
    registrations.push({
      _id: randomUUID(),
      occurrenceId: firstStandupOccurrence._id,
      organizationId: org1Id,
      userId: user1,
      seatCount: 1,
      status: "cancelled",
      occurrenceStartDate: firstStandupOccurrence.startDate,
      occurrenceEndDate: firstStandupOccurrence.endDate,
      eventTitle: "Monday Standup",
      deletedAt: new Date(Date.now() - 86400_000), // yesterday
    });
  }

  // Edge case: Back-to-back registrations — user2 in consecutive standup occurrences
  // Occurrence A ends at 9:30, Occurrence B starts at 9:30 (next week) — strict overlap check allows this
  const standupA = standupOccurrences[1];
  const standupB = standupOccurrences[2];
  if (standupA !== undefined) {
    registrations.push({
      _id: randomUUID(),
      occurrenceId: standupA._id,
      organizationId: org1Id,
      userId: user2,
      seatCount: 1,
      status: "active",
      occurrenceStartDate: standupA.startDate,
      occurrenceEndDate: standupA.endDate,
      eventTitle: "Monday Standup",
      deletedAt: null,
    });
  }
  if (standupB !== undefined) {
    registrations.push({
      _id: randomUUID(),
      occurrenceId: standupB._id,
      organizationId: org1Id,
      userId: user2,
      seatCount: 1,
      status: "active",
      occurrenceStartDate: standupB.startDate,
      occurrenceEndDate: standupB.endDate,
      eventTitle: "Monday Standup",
      deletedAt: null,
    });
  }

  await RegistrationModel.insertMany(registrations);

  // ── Summary ────────────────────────────────────────────────────────────────

  const orgCount = 2;
  const eventCount =
    1 + // standup
    1 + // workshop
    1 + // conference
    1 + // retro
    1; // welcome onboarding
  const occurrenceCount =
    standupOccurrences.length +
    workshopOccurrences.length +
    1 + // conference
    1 + // retro
    1; // welcome
  const registrationCount = registrations.length;

  console.log("\n========================================");
  console.log("           SEED COMPLETE");
  console.log("========================================");
  console.log(`  Organizations : ${orgCount}`);
  console.log(`  Events        : ${eventCount}`);
  console.log(`  Occurrences   : ${occurrenceCount}`);
  console.log(`  Registrations : ${registrationCount}`);
  console.log("\n  Edge cases seeded:");
  console.log("    ✓ At-capacity occurrence (Annual Conference: 5/5 seats filled)");
  console.log("    ✓ Cancelled registration (user1 cancelled standup registration)");
  console.log("    ✓ Back-to-back registrations (user2 in consecutive standup occurrences)");
  console.log("    ✓ Multi-tenancy isolation (Minimal Org has 1 event, 0 registrations)");
  console.log("    ✓ Mixed event types (weekly recurring, monthly recurring, one-off)");
  console.log("========================================\n");

  await mongoose.disconnect();
}

run().catch((err: unknown) => {
  console.error("Seed FAILED:", err);
  process.exit(1);
});
