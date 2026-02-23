import { IQuery } from "@nestjs/cqrs";

export abstract class TypedQuery<TResult> implements IQuery {
  readonly _resultType?: TResult;
}
