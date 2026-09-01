import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error occurred. Please contact administrator.';
    let errorType = 'InternalServerError';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'object' && res !== null) {
        const resObj = res as any;
        message = resObj.message || exception.message;
        errorType = resObj.error || exception.name;
      } else {
        message = res as string;
      }
    } else if (exception instanceof Error) {
      this.logger.error(`Unhandled Exception: ${exception.message}`, exception.stack);
    } else {
      this.logger.error('Unhandled non-error exception', exception);
    }

    // Mask sensitive technical details from public exposure
    const clientSafeMessage = Array.isArray(message)
      ? message
      : typeof message === 'string'
      ? message
      : 'An error occurred while processing your request.';

    response.status(status).json({
      success: false,
      statusCode: status,
      error: errorType,
      message: clientSafeMessage,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
