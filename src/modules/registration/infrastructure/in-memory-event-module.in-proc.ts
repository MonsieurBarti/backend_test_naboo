import type { ClientSession } from "mongoose";
import {
  type EventReadModel,
  IEventModuleInProc,
  type OccurrenceReadModel,
} from "../../../shared/in-proc/event-module.in-proc";

export class InMemoryEventModuleInProc extends IEventModuleInProc {
  private readonly occurrences = new Map<string, OccurrenceReadModel>();
  private readonly events = new Map<string, EventReadModel>();

  // --- Test helpers ---

  seedOccurrence(model: OccurrenceReadModel): void {
    this.occurrences.set(model.id, { ...model });
  }

  seedEvent(model: EventReadModel): void {
    this.events.set(model.id, { ...model });
  }

  getOccurrence(id: string): OccurrenceReadModel | undefined {
    return this.occurrences.get(id);
  }

  getEvent(id: string): EventReadModel | undefined {
    return this.events.get(id);
  }

  clear(): void {
    this.occurrences.clear();
    this.events.clear();
  }

  // --- IEventModuleInProc implementation ---

  async findOccurrenceById(
    id: string,
    _session?: ClientSession,
  ): Promise<OccurrenceReadModel | null> {
    const stored = this.occurrences.get(id);
    if (stored === undefined) return null;
    return { ...stored };
  }

  async findEventById(id: string, _session?: ClientSession): Promise<EventReadModel | null> {
    const stored = this.events.get(id);
    if (stored === undefined) return null;
    return { ...stored };
  }

  async reserveSeats(occurrenceId: string, count: number, _session?: ClientSession): Promise<void> {
    const stored = this.occurrences.get(occurrenceId);
    if (stored === undefined) return;
    stored.registeredSeats += count;
  }

  async releaseSeats(occurrenceId: string, count: number, _session?: ClientSession): Promise<void> {
    const stored = this.occurrences.get(occurrenceId);
    if (stored === undefined) return;
    stored.registeredSeats = Math.max(0, stored.registeredSeats - count);
  }
}
