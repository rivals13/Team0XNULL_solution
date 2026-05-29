import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as compression from 'compression';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  const configService = app.get(ConfigService);
  const port    = configService.get<number>('PORT', 3000);
  const nodeEnv = configService.get<string>('NODE_ENV', 'development');

  // Trust proxy headers (needed when behind nginx / load balancer for real IP)
  app.set('trust proxy', 1);

  // ─── Security Headers (Helmet) ──────────────────────────────────────────────
  app.use(
    helmet({
      // Strict Transport Security — tells browsers to use HTTPS only
      strictTransportSecurity: {
        maxAge:            63_072_000, // 2 years in seconds
        includeSubDomains: true,
        preload:           true,
      },
      // Prevent clickjacking — disallow embedding in iframes
      frameguard: { action: 'deny' },
      // Prevent MIME-type sniffing
      noSniff: true,
      // Disable X-Powered-By header
      hidePoweredBy: true,
      // XSS filter for older browsers
      xssFilter: true,
      // Referrer policy
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      // Content Security Policy — tightened for an API-only server
      contentSecurityPolicy: {
        directives: {
          defaultSrc:  ["'self'"],
          scriptSrc:   ["'self'"],
          styleSrc:    ["'self'"],
          imgSrc:      ["'self'", 'data:'],
          connectSrc:  ["'self'"],
          fontSrc:     ["'self'"],
          objectSrc:   ["'none'"],
          frameSrc:    ["'none'"],
          upgradeInsecureRequests: [],
        },
      },
      // Cross-Origin policies
      crossOriginEmbedderPolicy: true,
      crossOriginOpenerPolicy:   { policy: 'same-origin' },
      crossOriginResourcePolicy: { policy: 'same-origin' },
    }),
  );
  app.use(compression());

  // ─── CORS ───────────────────────────────────────────────────────────────────
  // Base local origins + any extras from ALLOWED_ORIGINS env var
  // (comma-separated, e.g. ngrok/cloudflared HTTPS URLs)
  const extraOrigins = configService
    .get<string>('ALLOWED_ORIGINS', '')
    .split(',')
    .map(o => o.trim())
    .filter(Boolean);

  const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    ...extraOrigins,
  ];

  app.enableCors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
    credentials: true,
  });

  // ─── Global Prefix & Versioning ─────────────────────────────────────────────
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  // ─── Global Pipes / Filters / Interceptors ──────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());

  // ─── Swagger ────────────────────────────────────────────────────────────────
  if (nodeEnv !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('PaySmart API')
      .setDescription('Intelligent Payment Scheduling & Automation — eSewa Hackathon Challenge 11')
      .setVersion('1.0')
      .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'JWT')
      .addTag('Auth', 'Authentication & authorization')
      .addTag('Transactions', 'Transaction sync & history')
      .addTag('Schedule', 'Payment scheduling')
      .addTag('Payments', 'Payment execution')
      .addTag('Webhooks', 'Multi-app webhook support')
      .addTag('External', 'eSewa & Khalti integrations')
      .addTag('SMS / OTP', 'Sparrow SMS — OTP send & verify')
      .addTag('Transaction Sync', 'eSewa sandbox sync + FastAPI pattern analysis')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  await app.listen(port);
  console.log(`🚀 PaySmart Backend running on http://localhost:${port}/api/v1`);
  console.log(`📖 Swagger docs at   http://localhost:${port}/api/docs`);
}

bootstrap();
