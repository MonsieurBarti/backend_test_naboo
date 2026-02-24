import {
  OccurrenceCapacityExceededError,
  SeatDecrementBelowZeroError,
} from "src/modules/event/domain/errors/event-base.error";
import { Occurrence } from "src/modules/event/domain/occurrence/occurrence";
import { OccurrenceBuilder } from "src/modules/event/domain/occurrence/occurrence.builder";
import { FakeDateProvider } from "src/shared/testing/fake-date-provider";
import { describe, expect, it } from "vitest";
import { ZodError } from "zod";

describe("Occurrence", () => {
  const dateProvider = new FakeDateProvider(new Date("2024-06-15T12:00:00.000Z"));
  const fixedNow = new Date("2024-06-15T12:00:00.000Z");

  const baseProps = {
    id: "550e8400-e29b-41d4-a716-446655440001",
    eventId: "550e8400-e29b-41d4-a716-446655440002",
    organizationId: "550e8400-e29b-41d4-a716-446655440003",
    startDate: new Date("2024-07-01T10:00:00.000Z"),
    endDate: new Date("2024-07-01T12:00:00.000Z"),
  };

  describe("createNew", () => {
    it("creates an occurrence with timestamps from dateProvider", () => {
      const occurrence = Occurrence.createNew(baseProps, dateProvider);

      expect(occurrence.id).toBe(baseProps.id);
      expect(occurrence.eventId).toBe(baseProps.eventId);
      expect(occurrence.createdAt).toEqual(fixedNow);
      expect(occurrence.updatedAt).toEqual(fixedNow);
    });

    it("sets registeredSeats to 0 by default", () => {
      const occurrence = Occurrence.createNew(baseProps, dateProvider);

      expect(occurrence.registeredSeats).toBe(0);
    });

    it("respects provided registeredSeats", () => {
      const occurrence = Occurrence.createNew({ ...baseProps, registeredSeats: 5 }, dateProvider);

      expect(occurrence.registeredSeats).toBe(5);
    });

    it("sets deletedAt to undefined", () => {
      const occurrence = Occurrence.createNew(baseProps, dateProvider);

      expect(occurrence.deletedAt).toBeUndefined();
      expect(occurrence.isDeleted).toBe(false);
    });

    it("accepts optional title, location, and maxCapacity", () => {
      const occurrence = Occurrence.createNew(
        {
          ...baseProps,
          title: "Special Occurrence",
          location: "Room 101",
          maxCapacity: 50,
        },
        dateProvider,
      );

      expect(occurrence.title).toBe("Special Occurrence");
      expect(occurrence.location).toBe("Room 101");
      expect(occurrence.maxCapacity).toBe(50);
    });
  });

  describe("create (reconstitution)", () => {
    it("reconstitutes an occurrence with exact props", () => {
      const props = {
        ...baseProps,
        registeredSeats: 10,
        deletedAt: undefined,
        createdAt: new Date("2023-01-01T00:00:00.000Z"),
        updatedAt: new Date("2023-06-01T00:00:00.000Z"),
      };

      const occurrence = Occurrence.create(props);

      expect(occurrence.id).toBe(props.id);
      expect(occurrence.registeredSeats).toBe(10);
      expect(occurrence.createdAt).toEqual(props.createdAt);
      expect(occurrence.updatedAt).toEqual(props.updatedAt);
    });

    it("throws ZodError when props are invalid", () => {
      expect(() =>
        Occurrence.create({
          // biome-ignore lint/suspicious/noExplicitAny: testing invalid props
          id: "not-a-uuid" as any,
          eventId: "550e8400-e29b-41d4-a716-446655440002",
          organizationId: "550e8400-e29b-41d4-a716-446655440003",
          startDate: new Date(),
          endDate: new Date(),
          registeredSeats: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      ).toThrowError(ZodError);
    });

    it("throws ZodError when registeredSeats is negative", () => {
      expect(() =>
        Occurrence.create({
          ...baseProps,
          registeredSeats: -1,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      ).toThrowError(ZodError);
    });
  });

  describe("toJSON", () => {
    it("returns all props matching the getters", () => {
      const occurrence = new OccurrenceBuilder().build();
      const json = occurrence.toJSON();

      expect(json.id).toBe(occurrence.id);
      expect(json.eventId).toBe(occurrence.eventId);
      expect(json.organizationId).toBe(occurrence.organizationId);
      expect(json.startDate).toEqual(occurrence.startDate);
      expect(json.endDate).toEqual(occurrence.endDate);
      expect(json.registeredSeats).toBe(occurrence.registeredSeats);
      expect(json.createdAt).toEqual(occurrence.createdAt);
      expect(json.updatedAt).toEqual(occurrence.updatedAt);
    });

    it("round-trips through create correctly", () => {
      const original = new OccurrenceBuilder().build();
      const reconstituted = Occurrence.create(original.toJSON());

      expect(reconstituted.toJSON()).toEqual(original.toJSON());
    });
  });

  describe("business methods", () => {
    describe("incrementRegisteredSeats", () => {
      it("increments registeredSeats by the given count", () => {
        const occurrence = new OccurrenceBuilder().withRegisteredSeats(5).build();

        occurrence.incrementRegisteredSeats(3);

        expect(occurrence.registeredSeats).toBe(8);
      });

      it("allows incrementing to exactly maxCapacity", () => {
        const occurrence = new OccurrenceBuilder()
          .withRegisteredSeats(8)
          .withOverrides({ maxCapacity: 10 })
          .build();

        occurrence.incrementRegisteredSeats(2);

        expect(occurrence.registeredSeats).toBe(10);
      });

      it("throws OccurrenceCapacityExceededError when exceeding maxCapacity", () => {
        const occurrence = new OccurrenceBuilder()
          .withRegisteredSeats(9)
          .withOverrides({ maxCapacity: 10 })
          .build();

        expect(() => occurrence.incrementRegisteredSeats(2)).toThrow(
          OccurrenceCapacityExceededError,
        );
      });

      it("does not throw when maxCapacity is undefined (unlimited)", () => {
        const occurrence = new OccurrenceBuilder().withRegisteredSeats(1000).build();

        expect(() => occurrence.incrementRegisteredSeats(1000)).not.toThrow();
      });
    });

    describe("decrementRegisteredSeats", () => {
      it("decrements registeredSeats by the given count", () => {
        const occurrence = new OccurrenceBuilder().withRegisteredSeats(5).build();

        occurrence.decrementRegisteredSeats(3);

        expect(occurrence.registeredSeats).toBe(2);
      });

      it("allows decrementing to exactly 0", () => {
        const occurrence = new OccurrenceBuilder().withRegisteredSeats(5).build();

        occurrence.decrementRegisteredSeats(5);

        expect(occurrence.registeredSeats).toBe(0);
      });

      it("throws SeatDecrementBelowZeroError when going below 0", () => {
        const occurrence = new OccurrenceBuilder().withRegisteredSeats(2).build();

        expect(() => occurrence.decrementRegisteredSeats(3)).toThrow(SeatDecrementBelowZeroError);
      });
    });

    describe("softDelete", () => {
      it("sets deletedAt to the provided date", () => {
        const occurrence = new OccurrenceBuilder().build();
        const deletedAt = new Date("2024-08-01T00:00:00.000Z");

        occurrence.softDelete(deletedAt);

        expect(occurrence.deletedAt).toEqual(deletedAt);
        expect(occurrence.isDeleted).toBe(true);
      });
    });

    describe("update", () => {
      it("updates the provided fields and advances updatedAt", () => {
        const occurrence = new OccurrenceBuilder().withTitle("Original Title").build();
        const updateTime = new Date("2024-09-01T00:00:00.000Z");

        occurrence.update({ title: "Updated Title" }, updateTime);

        expect(occurrence.title).toBe("Updated Title");
        expect(occurrence.updatedAt).toEqual(updateTime);
      });

      it("can update maxCapacity", () => {
        const occurrence = new OccurrenceBuilder().withOverrides({ maxCapacity: 50 }).build();
        const updateTime = new Date("2024-09-01T00:00:00.000Z");

        occurrence.update({ maxCapacity: 100 }, updateTime);

        expect(occurrence.maxCapacity).toBe(100);
        expect(occurrence.updatedAt).toEqual(updateTime);
      });
    });
  });
});
