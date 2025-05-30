# Inconsistent buildStart Hook Behavior in Vite SSR Environments

**Issue Summary:** The `buildStart` hook in Vite exhibits inconsistent behavior when used with the `createServer` API in server-side rendering (SSR) environments. The hook is not properly awaited at the top level, leading to execution order problems during SSR processes.

**Impact:** This inconsistency causes several critical issues:
- Missing or out-of-order build steps
- Incomplete build artifacts
- Potential runtime errors in SSR contexts
- Unpredictable build behavior

**Root Cause:** The fundamental problem stems from how Vite handles hook execution ordering in SSR contexts. When using `createServer` with SSR enabled, the `buildStart` hook's promises are not properly awaited at the top level of execution, causing asynchronous operations to potentially complete after subsequent build steps have already begun.

**Additional Context:** The issue creates confusion for developers implementing plugins that rely on consistent hook execution order, particularly when transitioning between client-side and server-side rendering environments.

## Requirements

**Requirement 1:** In the `buildStart` method of the PluginContainer class, explicitly await the invocation of `this.environments.client.buildStart()` to ensure that all promises returned from the client environment's buildStart hook are fully resolved before the method returns. The solution must ensure that hook execution is properly sequential even when asynchronous operations inside the `buildStart` hook take longer than expected.

**Requirement 2:** Implement a consistent hook execution order across environments by ensuring that in SSR mode, the client environment's hooks are always completely resolved before the server environment proceeds with subsequent build steps. This specifically applies to lifecycle hooks that run during initialization and build phases, maintaining the correct sequence: client environment hook complete → server environment proceeds.

**Requirement 3:** Ensure backward compatibility with existing Vite plugins by maintaining the current method signature of `buildStart(options?: { plugins: readonly Plugin[] })` and preserving the existing return value behavior (returning `Promise<void>`). The solution should not introduce any breaking changes to how plugins currently register or interact with the `buildStart` hook in non-SSR contexts.

**Requirement 4:** Modify the promise handling mechanism in the PluginContainer's `buildStart` method specifically for SSR-enabled environments by implementing proper top-level awaits for all asynchronous operations. This includes handling the Promise chain correctly so that errors propagate appropriately and don't cause unhandled rejections. The solution should use standard async/await patterns rather than manual Promise chaining.

**Requirement 5:** Apply the same asynchronous handling pattern to the `watchChange` method and any other lifecycle hooks that operate across environments (client and server). This includes but is not limited to: transforming the `watchChange(id: string, event: 'create' | 'update' | 'delete')` method to properly await `this.environments.client.watchChange()` when it exists, and ensuring consistent error handling across all affected hooks.

**Technical Constraints:**
- Changes should be contained within the PluginContainer class implementation
- No modifications to the public API signatures
- No regression in performance for non-SSR use cases
- Solution must be compatible with existing plugin ecosystem
- The implementation must handle both synchronous and asynchronous plugin hooks correctly
- Error handling must be comprehensive to prevent unhandled promise rejections

## Rationales

**Rationale for Requirement 1:** The core issue is that the `buildStart` hook promises are not being fully awaited in SSR environments, causing asynchronous operations to potentially complete after subsequent build steps have already begun. By ensuring these promises are properly awaited, we guarantee that all necessary build steps are completed in the correct order, preventing missing or out-of-order build artifacts.

**Rationale for Requirement 2:** Developers expect consistent behavior across different rendering environments. The current inconsistency between client-side and server-side hook execution creates confusion and leads to unpredictable build outcomes. Maintaining consistent hook execution order will provide a more reliable developer experience and make debugging easier.

**Rationale for Requirement 3:** Many projects rely on the current behavior of the `buildStart` hook in non-SSR contexts. Any solution must ensure that existing plugins continue to work as expected while fixing the SSR-specific issues. Breaking changes to the plugin API would create significant disruption in the Vite ecosystem.

**Rationale for Requirement 4:** The PluginContainer class is responsible for managing plugin hooks, including `buildStart`. By implementing proper promise handling specifically in this class when SSR is enabled, we target the root cause of the issue without disrupting other parts of the codebase. This focused approach minimizes the risk of introducing new bugs.

**Rationale for Requirement 5:** Other hooks like `watchChange` may have similar asynchronous behavior patterns and could potentially exhibit the same issue. By applying a consistent pattern across all related hooks, we prevent similar problems from occurring elsewhere and establish a standard approach for handling hook promises throughout the codebase.

## File Paths for Requirements

**Requirement 1:** packages/vite/src/node/server/pluginContainer.ts
- This requirement targets the implementation of the `buildStart` method in the PluginContainer class where promises need to be properly awaited in SSR contexts.

**Requirement 2:** packages/vite/src/node/server/pluginContainer.ts
- The hook execution order is managed in the PluginContainer class, which is responsible for maintaining consistency between client-side and server-side environments.

**Requirement 3:** packages/vite/src/node/server/pluginContainer.ts
- Preserving backward compatibility requires careful modification of the existing `buildStart` implementation in the PluginContainer class.

**Requirement 4:** packages/vite/src/node/server/pluginContainer.ts
- The proper promise handling needs to be implemented directly in the PluginContainer class which manages the plugin hooks.

**Requirement 5:** packages/vite/src/node/server/pluginContainer.ts
- Related hooks like `watchChange` are also implemented in the same PluginContainer class and need similar handling.