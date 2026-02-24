import { Inject, Injectable } from "@nestjs/common";
import { CommandHandler, ICommandHandler } from "@nestjs/cqrs";
import { TypedCommand } from "../../../../../shared/cqrs/typed-command";
import { IDateProvider } from "../../../../../shared/date/date-provider";
import { SlugAlreadyTakenError } from "../../../domain/errors/organization-base.error";
import { Organization } from "../../../domain/organization/organization";
import { IOrganizationRepository } from "../../../domain/organization/organization.repository";
import { generateSlug } from "../../../domain/organization/slug";
import { ORGANIZATION_TOKENS } from "../../../organization.tokens";

export class CreateOrganizationCommand extends TypedCommand<void> {
  constructor(
    public readonly props: {
      readonly name: string;
      readonly correlationId: string;
    },
  ) {
    super();
  }
}

@CommandHandler(CreateOrganizationCommand)
@Injectable()
export class CreateOrganizationHandler implements ICommandHandler<CreateOrganizationCommand> {
  constructor(
    @Inject(ORGANIZATION_TOKENS.ORGANIZATION_REPOSITORY)
    private readonly orgRepo: IOrganizationRepository,
    private readonly dateProvider: IDateProvider,
  ) {}

  async execute(command: CreateOrganizationCommand): Promise<void> {
    const { name, correlationId } = command.props;
    const slug = generateSlug(name);

    const exists = await this.orgRepo.existsBySlug(slug);
    if (exists) {
      throw new SlugAlreadyTakenError(slug, { correlationId });
    }

    const org = Organization.createNew(name, slug, this.dateProvider);
    await this.orgRepo.save(org);
  }
}
