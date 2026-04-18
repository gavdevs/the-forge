export interface StaticGeneratorSchema {
  database: 'sqlite' | 'postgres';
  targetDir?: string;
}
