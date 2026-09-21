export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (error) {
    if ((specifier.startsWith('./') || specifier.startsWith('../')) && !specifier.endsWith('.ts')) {
      if (error?.code === 'ERR_UNSUPPORTED_DIR_IMPORT') {
        try {
          return await nextResolve(`${specifier}.ts`, context);
        } catch (typedError) {
          if (typedError?.code === 'ERR_MODULE_NOT_FOUND') {
            return nextResolve(`${specifier}/index.ts`, context);
          }
          throw typedError;
        }
      }
      if (error?.code === 'ERR_MODULE_NOT_FOUND') {
        try {
          return await nextResolve(`${specifier}.ts`, context);
        } catch (typedError) {
          if (typedError?.code === 'ERR_MODULE_NOT_FOUND') {
            return nextResolve(`${specifier}/index.ts`, context);
          }
          throw typedError;
        }
      }
    }
    throw error;
  }
}
