export interface WebGeneratorSchema {
  styling: 'tailwind' | 'panda';
  /**
   * Backend framework the web app talks to. Controls the data layer
   * (tRPC for hono, fetch + openapi-typescript for python). Defaults
   * to 'hono' for backwards compatibility.
   */
  apiFramework?: 'hono' | 'python';
  targetDir?: string;
}
