export interface ApiGeneratorSchema {
  database: 'sqlite' | 'postgres';
  targetDir?: string;
}
