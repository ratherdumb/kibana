import { resolve, relative, dirname } from 'path';

import chalk from 'chalk';

import { createSymlink, isFile, chmod, mkdirp } from './fs';

/**
 * Yarn does not link the executables from dependencies that are installed
 * using `link:` https://github.com/yarnpkg/yarn/pull/5046
 *
 * We simulate this functionality by walking through each project's project
 * dependencies, and manually linking their executables if defined. The logic
 * for linking was mostly adapted from lerna: https://github.com/lerna/lerna/blob/1d7eb9eeff65d5a7de64dea73613b1bf6bfa8d57/src/PackageUtilities.js#L348
 */
export async function linkProjectExecutables(projectsByName, projectGraph) {
  for (const [projectName, projectDeps] of projectGraph) {
    const project = projectsByName.get(projectName);
    const binsDir = resolve(project.nodeModulesLocation, '.bin');

    for (const projectDep of projectDeps) {
      const executables = projectDep.getExecutables();
      for (const name of Object.keys(executables)) {
        const srcPath = executables[name];

        // existing logic from lerna -- ensure that the bin we are going to
        // point to exists or ignore it
        if (!await isFile(srcPath)) {
          continue;
        }

        const dest = resolve(binsDir, name);

        console.log(
          chalk`{dim [${project.name}]} ${name} -> {dim ${relative(
            project.path,
            srcPath
          )}}`
        );

        await mkdirp(dirname(dest));
        await createSymlink(srcPath, dest, 'exec');
        await chmod(dest, '755');
      }
    }
  }
}
