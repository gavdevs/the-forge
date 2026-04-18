export interface ApiGeneratorSchema {
  database: 'sqlite' | 'postgres';
  optionalFeatures?: string[];
  targetDir?: string;
}
