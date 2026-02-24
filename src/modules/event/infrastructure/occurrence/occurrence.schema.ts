import { Schema } from "mongoose";

export interface OccurrenceDocument {
  _id: string;
  eventId: string;
  organizationId: string;
  startDate: Date;
  endDate: Date;
  title: string | null;
  location: string | null;
  maxCapacity: number | null;
  registeredSeats: number;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export const OccurrenceSchema = new Schema<OccurrenceDocument>(
  {
    _id: { type: String, required: true },
    eventId: { type: String, required: true },
    organizationId: { type: String, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    title: { type: String, default: null },
    location: { type: String, default: null },
    maxCapacity: { type: Number, default: null },
    registeredSeats: { type: Number, required: true, default: 0 },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

OccurrenceSchema.index({ eventId: 1, deletedAt: 1, startDate: 1 });
