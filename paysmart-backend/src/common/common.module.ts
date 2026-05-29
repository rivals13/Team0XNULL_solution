import { Global, Module } from '@nestjs/common';
import { HmacService } from './security/hmac.service';
import { SecurityController } from './security/security.controller';
import { SecureLoggerService } from './logger/secure-logger.service';
import { EncryptionService } from './encryption/encryption.service';

/**
 * CommonModule — shared security, encryption & logging utilities.
 *
 * @Global() means all modules in the application can inject these
 * services without explicitly importing CommonModule.
 */
@Global()
@Module({
  controllers: [SecurityController],
  providers:   [HmacService, SecureLoggerService, EncryptionService],
  exports:     [HmacService, SecureLoggerService, EncryptionService],
})
export class CommonModule {}
