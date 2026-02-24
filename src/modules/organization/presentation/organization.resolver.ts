import { Args, Mutation, Query, Resolver } from "@nestjs/graphql";
import { ClsService } from "nestjs-cls";
import { TypedCommandBus } from "../../../shared/cqrs/typed-command-bus";
import { TypedQueryBus } from "../../../shared/cqrs/typed-query-bus";
import { Public } from "../../../shared/guards/tenant.guard";
import { CreateOrganizationCommand } from "../application/commands/create-organization/create-organization.command";
import { GetOrganizationQuery } from "../application/queries/get-organization/get-organization.query";
import { SlugAlreadyTakenError } from "../domain/errors/organization-base.error";
import { generateSlug } from "../domain/organization/slug";
import {
  CreateOrganizationInput,
  CreateOrganizationResult,
  CreateOrganizationSuccess,
  OrganizationType,
  SlugAlreadyTakenErrorType,
} from "./dto/organization.dto";

@Resolver(() => OrganizationType)
export class OrganizationResolver {
  constructor(
    private readonly commandBus: TypedCommandBus,
    private readonly queryBus: TypedQueryBus,
    private readonly cls: ClsService,
  ) {}

  @Public()
  @Mutation(() => CreateOrganizationResult)
  async createOrganization(
    @Args("input") input: CreateOrganizationInput,
  ): Promise<typeof CreateOrganizationResult> {
    const correlationId = this.cls.getId() ?? "unknown";

    try {
      await this.commandBus.execute(
        new CreateOrganizationCommand({ name: input.name, correlationId }),
      );

      const slug = generateSlug(input.name);
      const org = await this.queryBus.execute(new GetOrganizationQuery({ slug, correlationId }));

      const success = new CreateOrganizationSuccess();
      success.id = org?.id ?? "";
      success.slug = org?.slug ?? slug;
      success.name = org?.name ?? input.name;
      return success;
    } catch (err: unknown) {
      if (err instanceof SlugAlreadyTakenError) {
        const errorResult = new SlugAlreadyTakenErrorType();
        errorResult.message = err.message;
        errorResult.slug =
          typeof err.metadata?.slug === "string" ? err.metadata.slug : generateSlug(input.name);
        return errorResult;
      }
      throw err;
    }
  }

  @Public()
  @Query(() => OrganizationType, { nullable: true })
  async organization(
    @Args("id", { nullable: true }) id?: string,
    @Args("slug", { nullable: true }) slug?: string,
  ): Promise<OrganizationType | null> {
    const correlationId = this.cls.getId() ?? "unknown";

    const org = await this.queryBus.execute(new GetOrganizationQuery({ id, slug, correlationId }));

    if (!org) return null;

    const result = new OrganizationType();
    result.id = org.id;
    result.name = org.name;
    result.slug = org.slug;
    result.createdAt = org.createdAt;
    return result;
  }
}
