import { Event } from "src/modules/event/domain/event/event";
import { EventBuilder } from "src/modules/event/domain/event/event.builder";
import { FakeDateProvider } from "src/shared/testing/fake-date-provider";
import { describe, expect, it } from "vitest";
import { ZodError } from "zod";

describe("Event", () => {
  const dateProvider = new FakeDateProvider(new Date("2024-06-15T12:00:00.000Z"));
  const fixedNow = new Date("2024-06-15T12:00:00.000Z");

  const baseProps = {
    id: "550e8400-e29b-41d4-a716-446655440001",
    organizationId: "550e8400-e29b-41d4-a716-446655440002",
    title: "Test Event",
    description: "A test event",
    startDate: new Date("2024-07-01T10:00:00.000Z"),
    endDate: new Date("2024-07-01T12:00:00.000Z"),
    maxCapacity: 100,
  } satisfies Omit<
    import("src/modules/event/domain/event/event").EventProps,
    "deletedAt" | "createdAt" | "updatedAt"
  >;

  describe("createNew", () => {
    it("creates an event with timestamps from dateProvider", () => {
      const event = Event.createNew(baseProps, dateProvider);

      expect(event.id).toBe(baseProps.id);
      expect(event.title).toBe(baseProps.title);
      expect(event.createdAt).toEqual(fixedNow);
      expect(event.updatedAt).toEqual(fixedNow);
    });

    it("sets deletedAt to undefined", () => {
      const event = Event.createNew(baseProps, dateProvider);

      expect(event.deletedAt).toBeUndefined();
      expect(event.isDeleted).toBe(false);
    });

    it("sets recurrencePattern when provided", () => {
      const recurrencePattern = {
        frequency: "WEEKLY" as const,
        byDay: ["MO" as const],
        until: new Date("2024-12-31T00:00:00.000Z"),
      };
      const event = Event.createNew({ ...baseProps, recurrencePattern }, dateProvider);

      expect(event.recurrencePattern).toEqual(recurrencePattern);
      expect(event.isRecurring).toBe(true);
    });

    it("sets isRecurring to false when no recurrencePattern", () => {
      const event = Event.createNew(baseProps, dateProvider);

      expect(event.isRecurring).toBe(false);
    });
  });

  describe("create (reconstitution)", () => {
    it("reconstitutes an event with exact props", () => {
      const props = {
        ...baseProps,
        deletedAt: undefined,
        createdAt: new Date("2023-01-01T00:00:00.000Z"),
        updatedAt: new Date("2023-06-01T00:00:00.000Z"),
      };

      const event = Event.create(props);

      expect(event.id).toBe(props.id);
      expect(event.title).toBe(props.title);
      expect(event.createdAt).toEqual(props.createdAt);
      expect(event.updatedAt).toEqual(props.updatedAt);
      expect(event.deletedAt).toBeUndefined();
    });

    it("reconstitutes with deletedAt when provided", () => {
      const deletedAt = new Date("2024-01-01T00:00:00.000Z");
      const props = {
        ...baseProps,
        deletedAt,
        createdAt: new Date("2023-01-01T00:00:00.000Z"),
        updatedAt: new Date("2024-01-01T00:00:00.000Z"),
      };

      const event = Event.create(props);

      expect(event.deletedAt).toEqual(deletedAt);
      expect(event.isDeleted).toBe(true);
    });

    it("throws ZodError when props are invalid", () => {
      expect(() =>
        Event.create({
          // biome-ignore lint/suspicious/noExplicitAny: testing invalid props
          id: "not-a-uuid" as any,
          organizationId: "550e8400-e29b-41d4-a716-446655440002",
          title: "Test",
          description: "Test",
          startDate: new Date(),
          endDate: new Date(),
          maxCapacity: 100,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      ).toThrowError(ZodError);
    });
  });

  describe("toJSON", () => {
    it("returns all props matching the getters", () => {
      const event = new EventBuilder().build();
      const json = event.toJSON();

      expect(json.id).toBe(event.id);
      expect(json.title).toBe(event.title);
      expect(json.description).toBe(event.description);
      expect(json.organizationId).toBe(event.organizationId);
      expect(json.startDate).toEqual(event.startDate);
      expect(json.endDate).toEqual(event.endDate);
      expect(json.maxCapacity).toBe(event.maxCapacity);
      expect(json.createdAt).toEqual(event.createdAt);
      expect(json.updatedAt).toEqual(event.updatedAt);
    });

    it("round-trips through create correctly", () => {
      const original = new EventBuilder().build();
      const reconstituted = Event.create(original.toJSON());

      expect(reconstituted.toJSON()).toEqual(original.toJSON());
    });
  });

  describe("business methods", () => {
    describe("softDelete", () => {
      it("sets deletedAt to the provided date", () => {
        const event = new EventBuilder().build();
        const deletedAt = new Date("2024-08-01T00:00:00.000Z");

        event.softDelete(deletedAt);

        expect(event.deletedAt).toEqual(deletedAt);
        expect(event.isDeleted).toBe(true);
      });
    });

    describe("update", () => {
      it("updates the provided fields and advances updatedAt", () => {
        const event = new EventBuilder().withTitle("Original Title").build();
        const updateTime = new Date("2024-09-01T00:00:00.000Z");

        event.update({ title: "Updated Title" }, updateTime);

        expect(event.title).toBe("Updated Title");
        expect(event.updatedAt).toEqual(updateTime);
      });

      it("does not change fields not included in the update", () => {
        const event = new EventBuilder().withTitle("Original Title").build();
        const originalDescription = event.description;
        const updateTime = new Date("2024-09-01T00:00:00.000Z");

        event.update({ title: "New Title" }, updateTime);

        expect(event.description).toBe(originalDescription);
      });

      it("can update multiple fields at once", () => {
        const event = new EventBuilder().build();
        const updateTime = new Date("2024-09-01T00:00:00.000Z");
        const newStartDate = new Date("2024-10-01T10:00:00.000Z");
        const newEndDate = new Date("2024-10-01T12:00:00.000Z");

        event.update(
          { title: "New Title", startDate: newStartDate, endDate: newEndDate },
          updateTime,
        );

        expect(event.title).toBe("New Title");
        expect(event.startDate).toEqual(newStartDate);
        expect(event.endDate).toEqual(newEndDate);
        expect(event.updatedAt).toEqual(updateTime);
      });
    });
  });
});
