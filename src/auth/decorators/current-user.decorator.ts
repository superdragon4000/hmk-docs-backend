import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { RequestWithUser } from '../../common/types/request-with-user.type';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    return request.user;
  },
);
