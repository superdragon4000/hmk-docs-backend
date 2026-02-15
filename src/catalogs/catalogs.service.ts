import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { createReadStream, existsSync } from 'fs';
import { join, resolve } from 'path';
import { Repository } from 'typeorm';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { Catalog } from './catalog.entity';
import { CreateCatalogDto } from './dto/create-catalog.dto';
import { JwtPayload } from '../auth/jwt-payload.interface';

@Injectable()
export class CatalogsService {
  constructor(
    private readonly subscriptionsService: SubscriptionsService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    @InjectRepository(Catalog)
    private readonly catalogsRepository: Repository<Catalog>,
  ) {}

  list() {
    return this.catalogsRepository.find({ where: { isActive: true }, order: { createdAt: 'DESC' } });
  }

  async create(dto: CreateCatalogDto): Promise<Catalog> {
    const storageDir = this.configService.get<string>('CATALOG_STORAGE_DIR', './storage/catalogs');
    const resolvedPath = resolve(join(storageDir, dto.fileName));

    if (!existsSync(resolvedPath)) {
      throw new NotFoundException(`PDF file not found: ${resolvedPath}`);
    }

    const catalog = this.catalogsRepository.create({
      title: dto.title,
      description: dto.description,
      filePath: resolvedPath,
      isActive: true,
    });

    return this.catalogsRepository.save(catalog);
  }

  async createAccessLink(userId: string, catalogId: string): Promise<{ url: string; expiresAt: Date }> {
    const hasAccess = await this.subscriptionsService.hasActiveAccess(userId);
    if (!hasAccess) {
      throw new ForbiddenException('Subscription is required');
    }

    const catalog = await this.catalogsRepository.findOne({ where: { id: catalogId, isActive: true } });
    if (!catalog) {
      throw new NotFoundException('Catalog not found');
    }

    const tokenPayload: JwtPayload = {
      sub: userId,
      email: '',
      type: 'file',
      catalogId,
    };

    const expiresInSeconds = 60;
    const token = await this.jwtService.signAsync(tokenPayload, {
      secret: this.configService.getOrThrow<string>('FILE_TOKEN_SECRET'),
      expiresIn: `${expiresInSeconds}s`,
    });

    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);
    const baseUrl = this.configService.get<string>('APP_BASE_URL', 'http://localhost:3000');

    return {
      url: `${baseUrl}/api/catalogs/${catalogId}/file?token=${encodeURIComponent(token)}`,
      expiresAt,
    };
  }

  async openCatalogFile(params: {
    userId: string;
    catalogId: string;
    fileToken: string;
  }): Promise<{ stream: NodeJS.ReadableStream; fileName: string }> {
    const payload = await this.jwtService.verifyAsync<JwtPayload>(params.fileToken, {
      secret: this.configService.getOrThrow<string>('FILE_TOKEN_SECRET'),
    });

    if (payload.type !== 'file' || payload.sub !== params.userId || payload.catalogId !== params.catalogId) {
      throw new ForbiddenException('Invalid file token');
    }

    const hasAccess = await this.subscriptionsService.hasActiveAccess(params.userId);
    if (!hasAccess) {
      throw new ForbiddenException('Subscription expired');
    }

    const catalog = await this.catalogsRepository.findOne({ where: { id: params.catalogId, isActive: true } });
    if (!catalog) {
      throw new NotFoundException('Catalog not found');
    }

    if (!existsSync(catalog.filePath)) {
      throw new NotFoundException('Catalog file missing on server');
    }

    const stream = createReadStream(catalog.filePath);

    return {
      stream,
      fileName: catalog.filePath.split(/[/\\]/).pop() ?? 'catalog.pdf',
    };
  }
}
