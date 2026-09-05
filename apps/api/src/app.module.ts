import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './modules/database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { ProductsModule } from './modules/products/products.module';
import { CustomerTiersModule } from './modules/customer-tiers/customer-tiers.module';
import { PriceListsModule } from './modules/price-lists/price-lists.module';
import { EventsModule } from './modules/events/events.module';
import { GovernanceModule } from './modules/governance/governance.module';
import { CorrelationIdMiddleware } from './common/correlation-id.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '../../.env' }),
    DatabaseModule,
    EventsModule,
    GovernanceModule,
    AuthModule,
    ProductsModule,
    CustomerTiersModule,
    PriceListsModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
