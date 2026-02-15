import {
  Controller,
  Get,
  Param,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequestUser } from '../common/types/request-with-user.type';
import { CatalogsService } from './catalogs.service';
import { AdminApiKeyGuard } from '../common/guards/admin-api-key.guard';
import { CreateCatalogDto } from './dto/create-catalog.dto';
import { Body } from '@nestjs/common';

@ApiTags('catalogs')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard)
@Controller('catalogs')
export class CatalogsController {
  constructor(private readonly catalogsService: CatalogsService) {}

  @Get()
  @ApiOperation({ summary: 'List available catalogs metadata' })
  list() {
    return this.catalogsService.list();
  }

  @UseGuards(AdminApiKeyGuard)
  @Post()
  @ApiOperation({ summary: 'Create catalog metadata (admin only, file should already exist on server)' })
  create(@Body() dto: CreateCatalogDto) {
    return this.catalogsService.create(dto);
  }

  @Get(':id/access-link')
  @ApiOperation({ summary: 'Get short-lived file access link (60 seconds)' })
  accessLink(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.catalogsService.createAccessLink(user.id, id);
  }

  @Throttle({ default: { limit: 8, ttl: 60_000 } })
  @Get(':id/file')
  @ApiOperation({ summary: 'Stream catalog PDF by short-lived token' })
  @ApiQuery({ name: 'token', required: true })
  async file(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Query('token') token: string,
    @Res() res: Response,
  ) {
    const file = await this.catalogsService.openCatalogFile({
      userId: user.id,
      catalogId: id,
      fileToken: token,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=\"${file.fileName}\"`);
    res.setHeader('Cache-Control', 'no-store');
    file.stream.pipe(res);
  }
}
