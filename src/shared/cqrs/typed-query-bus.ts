import { Injectable } from "@nestjs/common";
import { QueryBus } from "@nestjs/cqrs";
import { TypedQuery } from "./typed-query";

@Injectable()
export class TypedQueryBus {
  constructor(private readonly queryBus: QueryBus) {}

  execute<TResult>(query: TypedQuery<TResult>): Promise<TResult> {
    return this.queryBus.execute(query);
  }
}
