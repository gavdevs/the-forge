export interface ApiGeneratorSchema {
  framework: 'hono' | 'python';
  database: 'sqlite' | 'postgres';
  optionalFeatures?: string[];
  targetDir?: string;
}
