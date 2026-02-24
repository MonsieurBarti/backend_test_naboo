import { Schema } from "mongoose";

export interface OrganizationDocument {
  _id: string;
  name: string;
  slug: string;
  createdAt: Date;
}

export const OrganizationSchema = new Schema<OrganizationDocument>(
  {
    _id: { type: String, required: true },
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    createdAt: { type: Date, required: true },
  },
  { timestamps: false },
);
