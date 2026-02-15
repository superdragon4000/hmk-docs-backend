import { Request } from 'express';

export interface RequestUser {
  id: string;
  email: string;
}

export type RequestWithUser = Request & { user?: RequestUser };
