import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Injectable,
  SetMetadata,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { GqlExecutionContext } from "@nestjs/graphql";
import type { FastifyRequest } from "fastify";
import { ClsService } from "nestjs-cls";
import { z } from "zod";
import { IOrganizationModuleInProc } from "../in-proc/organization-module.in-proc";

export const IS_PUBLIC_KEY = "isPublic";
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

const tenantIdSchema = z.string().uuid();

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly orgInProc: IOrganizationModuleInProc,
    private readonly cls: ClsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = this.getRequest(context);
    const result = tenantIdSchema.safeParse(request.headers["x-tenant-id"]);

    if (!result.success) {
      throw new BadRequestException("Missing or invalid x-tenant-id header");
    }

    const tenantId = result.data;

    const org = await this.orgInProc.findById(tenantId);
    if (!org) {
      throw new BadRequestException("Organization not found for tenant ID");
    }

    this.cls.set("tenantSlug", org.slug);
    this.cls.set("tenantId", tenantId);

    return true;
  }

  private getRequest(context: ExecutionContext): FastifyRequest {
    const type = context.getType<string>();
    if (type === "graphql") {
      const gqlCtx = GqlExecutionContext.create(context);
      return gqlCtx.getContext<{ req: FastifyRequest }>().req;
    }
    return context.switchToHttp().getRequest<FastifyRequest>();
  }
}
