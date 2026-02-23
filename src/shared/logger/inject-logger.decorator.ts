import { Inject } from "@nestjs/common";

export const LOGGER_TOKEN = Symbol("LOGGER_TOKEN");

export const InjectLogger = (): ParameterDecorator => Inject(LOGGER_TOKEN);
