

## Plan: Remove deprecated functions from department-utils.ts

**Scope**: Single-file cleanup — remove `deptKeyToOps`, `deptKeyToCategory`, and the now-unused `DEPT_KEY_TO_OPS` map from `src/lib/department-utils.ts`. The `LEGACY_CATEGORY_MAP` stays since `getDepartmentActivityScope` uses it as a fallback.

**Changes**:
- **`src/lib/department-utils.ts`**: Delete lines defining `DEPT_KEY_TO_OPS`, `deptKeyToOps`, and `deptKeyToCategory` (roughly lines 8–34). No other files import these functions.

