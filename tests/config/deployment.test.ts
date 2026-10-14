import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

const root = resolve(import.meta.dirname, '../..');

describe('deployment configuration', () => {
  it('deploys main to GitHub Pages with the official Astro workflow', () => {
    const source = readFileSync(resolve(root, '.github/workflows/deploy.yml'), 'utf8');
    const workflow = parse(source);

    expect(workflow.on.push.branches).toContain('main');
    expect(workflow.on).toHaveProperty('workflow_dispatch');
    expect(workflow.permissions).toEqual({
      contents: 'read',
      pages: 'write',
      'id-token': 'write',
    });

    const buildActions = workflow.jobs.build.steps.map((step: { uses?: string }) => step.uses);
    const deployActions = workflow.jobs.deploy.steps.map((step: { uses?: string }) => step.uses);

    expect(buildActions).toContain('withastro/action@v3');
    expect(deployActions).toContain('actions/deploy-pages@v4');
  });

  it('keeps the verification command comprehensive', () => {
    const packageJson = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));

    expect(packageJson.scripts.verify).toBe(
      'npm run check && npm run test:unit && npm run build && npm run test:e2e',
    );
  });
});
