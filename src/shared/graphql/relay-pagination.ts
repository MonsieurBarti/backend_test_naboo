import { Type } from "@nestjs/common";
import { Field, Int, ObjectType } from "@nestjs/graphql";

export interface PaginatedEdge<T> {
  cursor: string;
  node: T;
}

export interface PaginatedResult<T> {
  edges: PaginatedEdge<T>[];
  nodes: T[];
  totalCount: number;
  hasNextPage: boolean;
}

export function Paginated<T>(classRef: Type<T>): Type<PaginatedResult<T>> {
  @ObjectType(`${classRef.name}Edge`)
  abstract class EdgeType {
    @Field(() => String)
    cursor!: string;

    @Field(() => classRef)
    node!: T;
  }

  @ObjectType({ isAbstract: true })
  abstract class PaginatedType {
    @Field(() => [EdgeType], { nullable: true })
    edges!: EdgeType[];

    @Field(() => [classRef], { nullable: true })
    nodes!: T[];

    @Field(() => Int)
    totalCount!: number;

    @Field()
    hasNextPage!: boolean;
  }

  return PaginatedType as Type<PaginatedResult<T>>;
}

export function encodeCursor(id: string): string {
  return Buffer.from(id).toString("base64");
}

export function decodeCursor(cursor: string): string {
  return Buffer.from(cursor, "base64").toString("utf-8");
}
