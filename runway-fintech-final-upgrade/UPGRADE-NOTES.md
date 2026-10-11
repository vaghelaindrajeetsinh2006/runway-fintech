# Runway final-attempt upgrade notes

This is a full project-source update. It intentionally excludes `.git`, `node_modules`, `dist`, `.test-build`, and `package-lock.json` so it can be copied into an existing checkout without overwriting Git history or machine-specific install artifacts.

## Main changes

- Adds local plain-language Decision Lab interpretation for supported money prompts. It creates an editable draft only; it never writes state before Apply.
- Adds an explicit unexpected-expense decision mode, amount/category fields, and an optional subscription-offset selector.
- Defers Recharts implementation until a chart is approaching the viewport, keeping chart code out of the eager import path.
- Adds a top-level error recovery boundary and keyboard skip link that works with HashRouter.
- Uses the verified Tailwind CSS v4 PostCSS setup and React Router 7.18.4 dependency range.
- Expands deterministic tests to 23 cases, improves architecture/deployment documentation, and verifies for high-severity npm advisories in GitHub Actions.

## Apply to the existing GitHub checkout

1. Extract this ZIP to a separate folder, for example `E:\Downloads\runway-fintech-final-upgrade`.
2. Keep the existing repository's `.git` folder. Do not copy `.git`, `node_modules`, `dist`, or `.test-build` from an extracted project.
3. In PowerShell, use the actual extracted folder path and existing checkout path:

```powershell
$source = "E:\Downloads\runway-fintech-final-upgrade"
$repo = "E:\Downloads\runway-fintech\runway-fintech"
robocopy $source $repo /E /XD .git node_modules dist .test-build
```

4. Change to the checkout and validate it after copying:

```powershell
cd "E:\Downloads\runway-fintech\runway-fintech"
npm install
npm run verify
npm audit
```

5. Push only if verification passes and the audit report is acceptable:

```powershell
git status --short
git add -A
git commit -m "Improve Runway decision lab, performance and quality checks"
git push origin main
```

6. Wait for the GitHub Actions workflow to go green and manually test the deployed website before using the final evaluation attempt.

Do not use `git push --force`; do not use `npm audit fix --force` without reviewing the resulting compatibility changes. The scoring engine is not fully public, so no source-code update can guarantee a particular score.
