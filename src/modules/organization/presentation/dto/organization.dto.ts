import { createUnionType, Field, InputType, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class OrganizationType {
  @Field()
  id!: string;

  @Field()
  name!: string;

  @Field()
  slug!: string;

  @Field()
  createdAt!: Date;
}

@InputType()
export class CreateOrganizationInput {
  @Field()
  name!: string;
}

@ObjectType()
export class CreateOrganizationSuccess {
  @Field()
  id!: string;

  @Field()
  slug!: string;

  @Field()
  name!: string;
}

@ObjectType()
export class SlugAlreadyTakenErrorType {
  @Field()
  message!: string;

  @Field()
  slug!: string;
}

export const CreateOrganizationResult = createUnionType({
  name: "CreateOrganizationResult",
  types: () => [CreateOrganizationSuccess, SlugAlreadyTakenErrorType] as const,
});
