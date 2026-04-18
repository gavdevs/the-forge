export interface WorkspaceGeneratorSchema {
  name: string;
  projectType: 'standalone' | 'open-source';
  database: 'sqlite' | 'postgres';
  styling: 'tailwind' | 'panda';
}
