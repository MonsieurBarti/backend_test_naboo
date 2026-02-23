import { ICommand } from "@nestjs/cqrs";

export abstract class TypedCommand<TResult> implements ICommand {
  // Phantom type — carries TResult at compile time, unused at runtime
  readonly _resultType?: TResult;
}
