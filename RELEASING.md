# Releasing

`@explain-it/core` is published to npm by the `Release` workflow
(`.github/workflows/release.yml`), and only after a maintainer approves it.

- **Approval.** The publish job runs in the `npm` GitHub environment, which
  requires a reviewer and only deploys from `v*` tags.
- **No npm token.** npm accepts the publish through trusted publishing (OIDC),
  and only from this repo, this workflow and this environment. The repo holds
  no npm credentials.
- **Provenance.** npm records which commit and workflow run built each
  version, and shows it on the package page.
- **Tags.** A ruleset lets only repo admins create, move or delete `v*` tags.

## Release a version

1. Set the new version in `packages/core/package.json`, then run
   `npm install` so `package-lock.json` agrees. Commit and push to `main`, and
   wait for CI to pass.
2. Create a GitHub Release for that commit, tagged `v<version>`:

   ```sh
   gh release create v0.1.1 --target main --generate-notes
   ```

3. The `Release` workflow verifies the release:
   - the tag must match the package version
   - it builds, typechecks, and runs the unit tests, the browser tests, and
     `explainer check` on the example
4. The workflow stops at **publish** and waits. GitHub notifies the reviewers.
   Open the run, review it, and choose **Approve and deploy**. Choosing
   **Reject** publishes nothing.
5. Check the published version:
   [npmjs.com/package/@explain-it/core](https://www.npmjs.com/package/@explain-it/core).
   It should show the provenance link back to the run.

If the verify job fails, nothing is published. Fix the problem, delete the
release and its tag, and start again from step 1 with the same version.

## One-time setup

The repo side is done:
- the `npm` environment, with a required reviewer and a `v*` tag policy
- the `Release tags` ruleset
- the workflow

The npm side is done by hand, in order. npm only offers trusted publishing on
a package that already exists, so the first version is published from a
maintainer's machine.

1. **First publish.** From a clean checkout of `main`, at the commit that
   sets `0.1.0`:

   ```sh
   git tag v0.1.0 && git push origin v0.1.0
   npm ci && npm run build -w packages/core
   npm login
   npm publish -w packages/core
   ```

   npm asks for your two-factor code. This version has no provenance; every
   later one does. Don't create a GitHub Release for `v0.1.0`: the workflow
   would try to publish it again.

2. **Trusted publisher.** On npmjs.com, open `@explain-it/core` and go to
   **Settings → Trusted publishing**. Add a GitHub Actions publisher:
   - Organization or user: `robmadole`
   - Repository: `explain-it`
   - Workflow filename: `release.yml`
   - Environment name: `npm`

   npm expects the first publish through a new trusted publisher within two
   days of adding it.

3. **Release `0.1.1` through the workflow** (above) to prove it works.

4. **Lock out tokens.** In the package's **Settings → Publishing access**,
   choose **Require two-factor authentication and disallow tokens**. Trusted
   publishing keeps working; it doesn't use tokens.
