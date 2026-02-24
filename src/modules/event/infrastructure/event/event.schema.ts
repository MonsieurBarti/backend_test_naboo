import { Schema } from "mongoose";
import type { RecurrencePatternProps } from "../../domain/event/recurrence-pattern";

export interface EventDocument {
  _id: string;
  organizationId: string;
  title: string;
  description: string;
  location: string | null;
  startDate: Date;
  endDate: Date;
  maxCapacity: number;
  recurrencePattern: RecurrencePatternProps | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export const EventSchema = new Schema<EventDocument>(
  {
    _id: { type: String, required: true },
    organizationId: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    location: { type: String, default: null },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    maxCapacity: { type: Number, required: true },
    recurrencePattern: { type: Schema.Types.Mixed, default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

EventSchema.index({ startDate: 1, deletedAt: 1 });
EventSchema.index({ organizationId: 1, deletedAt: 1, startDate: 1 });
