import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class CreateCatalogDto {
  @ApiProperty({ example: 'CAT 320D Service Manual' })
  @IsString()
  @MinLength(3)
  title!: string;

  @ApiProperty({ example: 'Hydraulic schematics and maintenance instructions' })
  @IsString()
  description!: string;

  @ApiProperty({ example: 'CAT_320D_service_manual.pdf' })
  @IsString()
  fileName!: string;
}
