import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './modules/database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { ProductsModule } from './modules/products/products.module';
import { CustomerTiersModule } from './modules/customer-tiers/customer-tiers.module';
import { PriceListsModule } from './modules/price-lists/price-lists.module';
import { EventsModule } from './modules/events/events.module';
import { GovernanceModule } from './modules/governance/governance.module';
import { QuotesModule } from './modules/quotes/quotes.module';
import { RecommendationsModule } from './modules/recommendations/recommendations.module';
import { PortalModule } from './modules/portal/portal.module';
import { FulfillmentModule } from './modules/fulfillment/fulfillment.module';
import { BillingModule } from './modules/billing/billing.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { HealthModule } from './modules/health/health.module';
import { CorrelationIdMiddleware } from './common/correlation-id.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '../../.env' }),
    DatabaseModule,
    EventsModule,
    GovernanceModule,
    QuotesModule,
    RecommendationsModule,
    PortalModule,
    FulfillmentModule,
    BillingModule,
    AnalyticsModule,
    PaymentsModule,
    HealthModule,
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
