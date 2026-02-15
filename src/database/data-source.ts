import 'dotenv/config';
import { DataSource } from 'typeorm';
import { buildTypeOrmOptions } from './typeorm.config';

export default new DataSource(buildTypeOrmOptions());
