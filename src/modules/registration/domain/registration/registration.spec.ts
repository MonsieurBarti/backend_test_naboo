import { Registration } from "src/modules/registration/domain/registration/registration";
import { RegistrationBuilder } from "src/modules/registration/domain/registration/registration.builder";
import { RegistrationReactivatedEvent } from "src/modules/registration/domain/events/registration-reactivated.event";
import { FakeDateProvider } from "src/shared/testing/fake-date-provider";
import { describe, expect, it } from "vitest";
import { ZodError } from "zod";

describe("Registration", () => {
  const dateProvider = new FakeDateProvider(new Date("2024-06-15T12:00:00.000Z"));
  const fixedNow = new Date("2024-06-15T12:00:00.000Z");

  const baseProps = {
    id: "550e8400-e29b-41d4-a716-446655440001",
    occurrenceId: "550e8400-e29b-41d4-a716-446655440002",
    organizationId: "550e8400-e29b-41d4-a716-446655440003",
    userId: "user-123",
    seatCount: 2,
    occurrenceStartDate: new Date("2024-07-01T10:00:00.000Z"),
    occurrenceEndDate: new Date("2024-07-01T12:00:00.000Z"),
    eventTitle: "Test Event",
  };

  describe("createNew", () => {
    it("creates a registration with status=active, timestamps from dateProvider", () => {
      const registration = Registration.createNew(baseProps, dateProvider);

      expect(registration.id).toBe(baseProps.id);
      expect(registration.userId).toBe(baseProps.userId);
      expect(registration.status).toBe("active");
      expect(registration.isActive).toBe(true);
      expect(registration.createdAt).toEqual(fixedNow);
      expect(registration.updatedAt).toEqual(fixedNow);
    });

    it("sets deletedAt to undefined", () => {
      const registration = Registration.createNew(baseProps, dateProvider);

      expect(registration.deletedAt).toBeUndefined();
      expect(registration.isDeleted).toBe(false);
    });

    it("copies all provided props correctly", () => {
      const registration = Registration.createNew(baseProps, dateProvider);

      expect(registration.occurrenceId).toBe(baseProps.occurrenceId);
      expect(registration.organizationId).toBe(baseProps.organizationId);
      expect(registration.seatCount).toBe(baseProps.seatCount);
      expect(registration.occurrenceStartDate).toEqual(baseProps.occurrenceStartDate);
      expect(registration.occurrenceEndDate).toEqual(baseProps.occurrenceEndDate);
      expect(registration.eventTitle).toBe(baseProps.eventTitle);
    });

    it("uses the date from dateProvider for both createdAt and updatedAt", () => {
      const customDate = new FakeDateProvider(new Date("2025-03-15T08:00:00.000Z"));
      const registration = Registration.createNew(baseProps, customDate);

      expect(registration.createdAt).toEqual(new Date("2025-03-15T08:00:00.000Z"));
      expect(registration.updatedAt).toEqual(new Date("2025-03-15T08:00:00.000Z"));
    });
  });

  describe("create (reconstitution)", () => {
    it("reconstitutes a registration with exact props", () => {
      const props = {
        ...baseProps,
        status: "active" as const,
        deletedAt: undefined,
        createdAt: new Date("2023-01-01T00:00:00.000Z"),
        updatedAt: new Date("2023-06-01T00:00:00.000Z"),
      };

      const registration = Registration.create(props);

      expect(registration.id).toBe(props.id);
      expect(registration.status).toBe("active");
      expect(registration.createdAt).toEqual(props.createdAt);
      expect(registration.updatedAt).toEqual(props.updatedAt);
    });

    it("reconstitutes a cancelled registration with deletedAt", () => {
      const deletedAt = new Date("2024-01-01T00:00:00.000Z");
      const props = {
        ...baseProps,
        status: "cancelled" as const,
        deletedAt,
        createdAt: new Date("2023-01-01T00:00:00.000Z"),
        updatedAt: deletedAt,
      };

      const registration = Registration.create(props);

      expect(registration.status).toBe("cancelled");
      expect(registration.deletedAt).toEqual(deletedAt);
      expect(registration.isActive).toBe(false);
      expect(registration.isDeleted).toBe(true);
    });

    it("throws ZodError when props are invalid", () => {
      expect(() =>
        Registration.create({
          // biome-ignore lint/suspicious/noExplicitAny: testing invalid props
          id: "not-a-uuid" as any,
          occurrenceId: "550e8400-e29b-41d4-a716-446655440002",
          organizationId: "550e8400-e29b-41d4-a716-446655440003",
          userId: "user-123",
          seatCount: 2,
          status: "active" as const,
          occurrenceStartDate: new Date(),
          occurrenceEndDate: new Date(),
          eventTitle: "Test",
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      ).toThrowError(ZodError);
    });

    it("throws ZodError when seatCount is out of range", () => {
      expect(() =>
        Registration.create({
          ...baseProps,
          seatCount: 11, // max is 10
          status: "active" as const,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      ).toThrowError(ZodError);
    });
  });

  describe("toJSON", () => {
    it("returns all props matching the getters", () => {
      const registration = new RegistrationBuilder().build();
      const json = registration.toJSON();

      expect(json.id).toBe(registration.id);
      expect(json.occurrenceId).toBe(registration.occurrenceId);
      expect(json.organizationId).toBe(registration.organizationId);
      expect(json.userId).toBe(registration.userId);
      expect(json.seatCount).toBe(registration.seatCount);
      expect(json.status).toBe(registration.status);
      expect(json.occurrenceStartDate).toEqual(registration.occurrenceStartDate);
      expect(json.occurrenceEndDate).toEqual(registration.occurrenceEndDate);
      expect(json.eventTitle).toBe(registration.eventTitle);
      expect(json.createdAt).toEqual(registration.createdAt);
      expect(json.updatedAt).toEqual(registration.updatedAt);
    });

    it("round-trips through create correctly", () => {
      const original = new RegistrationBuilder().build();
      const reconstituted = Registration.create(original.toJSON());

      expect(reconstituted.toJSON()).toEqual(original.toJSON());
    });
  });

  describe("business methods", () => {
    describe("cancel", () => {
      it("sets status to cancelled and updates deletedAt and updatedAt", () => {
        const registration = new RegistrationBuilder().build();
        const cancelTime = new Date("2024-08-01T10:00:00.000Z");

        registration.cancel(cancelTime);

        expect(registration.status).toBe("cancelled");
        expect(registration.deletedAt).toEqual(cancelTime);
        expect(registration.updatedAt).toEqual(cancelTime);
        expect(registration.isActive).toBe(false);
        expect(registration.isDeleted).toBe(true);
      });
    });

    describe("reactivate", () => {
      it("sets status to active, clears deletedAt, updates seatCount and updatedAt", () => {
        const registration = new RegistrationBuilder().asCancelled().build();
        const reactivateTime = new Date("2024-09-01T10:00:00.000Z");

        registration.reactivate(3, reactivateTime);

        expect(registration.status).toBe("active");
        expect(registration.deletedAt).toBeUndefined();
        expect(registration.seatCount).toBe(3);
        expect(registration.updatedAt).toEqual(reactivateTime);
        expect(registration.isActive).toBe(true);
        expect(registration.isDeleted).toBe(false);
      });

      it("emits RegistrationReactivatedEvent with correct aggregateId, organizationId, and occurrenceId", () => {
        const registration = new RegistrationBuilder().asCancelled().build();
        const reactivateTime = new Date("2024-09-01T10:00:00.000Z");

        registration.reactivate(3, reactivateTime);

        const events = registration.getUncommittedEvents();
        const reactivatedEvent = events.find(
          (e) => e instanceof RegistrationReactivatedEvent,
        );
        expect(reactivatedEvent).toBeDefined();
        expect(reactivatedEvent).toBeInstanceOf(RegistrationReactivatedEvent);
        if (reactivatedEvent instanceof RegistrationReactivatedEvent) {
          expect(reactivatedEvent.aggregateId).toBe(registration.id);
          expect(reactivatedEvent.organizationId).toBe(registration.organizationId);
          expect(reactivatedEvent.occurrenceId).toBe(registration.occurrenceId);
        }
      });
    });

    describe("updateSeatCount", () => {
      it("updates seatCount and advances updatedAt", () => {
        const registration = new RegistrationBuilder().withSeatCount(2).build();
        const updateTime = new Date("2024-10-01T10:00:00.000Z");

        registration.updateSeatCount(5, updateTime);

        expect(registration.seatCount).toBe(5);
        expect(registration.updatedAt).toEqual(updateTime);
      });

      it("does not change status or other fields", () => {
        const registration = new RegistrationBuilder().withStatus("active").build();
        const updateTime = new Date("2024-10-01T10:00:00.000Z");
        const originalId = registration.id;

        registration.updateSeatCount(4, updateTime);

        expect(registration.status).toBe("active");
        expect(registration.id).toBe(originalId);
      });
    });
  });
});
