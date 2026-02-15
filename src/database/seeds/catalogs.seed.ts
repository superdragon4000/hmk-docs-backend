import 'dotenv/config';
import { existsSync } from 'fs';
import { resolve } from 'path';
import dataSource from '../data-source';
import { Catalog } from '../../catalogs/catalog.entity';

interface SampleCatalog {
  title: string;
  description: string;
  fileName: string;
}

const samples: SampleCatalog[] = [
  {
    title: 'HIDROMEK HMK 220 LC GEN1',
    description: 'Каталог запчастей и узлов для первого поколения HMK 220 LC.',
    fileName: 'hidromek-hmk220lc-gen1.pdf',
  },
  {
    title: 'HIDROMEK HMK 220 LC GEN2',
    description: 'Каталог запчастей и узлов для второго поколения HMK 220 LC.',
    fileName: 'hidromek-hmk220lc-gen2.pdf',
  },
  {
    title: 'HIDROMEK HMK 102B ALPHA',
    description: 'Каталог компонентов по модели HMK 102B ALPHA.',
    fileName: 'hidromek-hmk102b-alpha.pdf',
  },
];

async function run(): Promise<void> {
  await dataSource.initialize();
  const repo = dataSource.getRepository(Catalog);
  const storageDir = process.env.CATALOG_STORAGE_DIR ?? './storage/catalogs';

  for (const sample of samples) {
    const fullPath = resolve(storageDir, sample.fileName);

    if (!existsSync(fullPath)) {
      console.warn(`[seed] skipped, file not found: ${fullPath}`);
      continue;
    }

    const existing = await repo.findOne({ where: { filePath: fullPath } });
    if (existing) {
      existing.title = sample.title;
      existing.description = sample.description;
      existing.isActive = true;
      await repo.save(existing);
      console.log(`[seed] updated: ${sample.title}`);
      continue;
    }

    const entity = repo.create({
      title: sample.title,
      description: sample.description,
      filePath: fullPath,
      isActive: true,
    });

    await repo.save(entity);
    console.log(`[seed] inserted: ${sample.title}`);
  }

  await dataSource.destroy();
}

run().catch(async (error) => {
  console.error('[seed] failed', error);
  if (dataSource.isInitialized) {
    await dataSource.destroy();
  }
  process.exit(1);
});
