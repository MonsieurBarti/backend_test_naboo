import { Global, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { MongooseModule as NestMongooseModule } from "@nestjs/mongoose";
import { TenantConnectionRegistry } from "./tenant-connection-registry";

@Global()
@Module({
  imports: [
    NestMongooseModule.forRootAsync({
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>("MONGODB_URI"),
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [TenantConnectionRegistry],
  exports: [NestMongooseModule, TenantConnectionRegistry],
})
export class MongooseConfigModule {}
