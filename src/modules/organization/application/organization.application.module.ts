import { CreateOrganizationHandler } from "./commands/create-organization/create-organization.command";
import { GetOrganizationHandler } from "./queries/get-organization/get-organization.query";

export const commandHandlers = [CreateOrganizationHandler];
export const queryHandlers = [GetOrganizationHandler];
