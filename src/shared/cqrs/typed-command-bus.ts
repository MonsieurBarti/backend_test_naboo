import { Injectable } from "@nestjs/common";
import { CommandBus } from "@nestjs/cqrs";
import { TypedCommand } from "./typed-command";

@Injectable()
export class TypedCommandBus {
  constructor(private readonly commandBus: CommandBus) {}

  execute<TResult>(command: TypedCommand<TResult>): Promise<TResult> {
    return this.commandBus.execute(command);
  }
}
