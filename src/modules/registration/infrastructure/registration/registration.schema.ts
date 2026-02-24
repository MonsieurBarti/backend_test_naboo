import { Schema } from "mongoose";

export interface RegistrationDocument {
  _id: string;
  occurrenceId: string;
  organizationId: string;
  userId: string;
  seatCount: number;
  status: "active" | "cancelled";
  occurrenceStartDate: Date;
  occurrenceEndDate: Date;
  eventTitle: string;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export const RegistrationSchema = new Schema<RegistrationDocument>(
  {
    _id: { type: String, required: true },
    occurrenceId: { type: String, required: true },
    organizationId: { type: String, required: true },
    userId: { type: String, required: true },
    seatCount: { type: Number, required: true },
    status: { type: String, required: true, enum: ["active", "cancelled"] },
    occurrenceStartDate: { type: Date, required: true },
    occurrenceEndDate: { type: Date, required: true },
    eventTitle: { type: String, required: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// Enforces one active registration per user per occurrence at DB level
RegistrationSchema.index(
  { userId: 1, occurrenceId: 1 },
  { unique: true, partialFilterExpression: { status: "active" } },
);

// Optimizes cross-org overlap detection queries
RegistrationSchema.index({ userId: 1, status: 1, occurrenceStartDate: 1, occurrenceEndDate: 1 });

// Optimizes queries for registrations within an organization
RegistrationSchema.index({ organizationId: 1, userId: 1, status: 1 });
