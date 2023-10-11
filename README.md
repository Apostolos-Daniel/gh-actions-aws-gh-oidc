# gh-actions-aws-gh-oidc
Create a github actions assume role for aws

A useful guide is here:

https://blog.simonireilly.com/posts/secure-aws-cdk-deploys-with-github-actions

```
mkdir assume-roles
cd assume-roles
npx aws-cdk@2.x init app --language typescript
```

### 1. Add OpenIdConnectProvider

Add your code for the OpenIdConnectProvider

```ts
/**
 * Create an Identity provider for GitHub inside your AWS Account. This
 * allows GitHub to present itself to AWS IAM and assume a role.
 */
const provider = new OpenIdConnectProvider(this, "MyProvider", {
  url: "https://token.actions.githubusercontent.com",
  clientIds: ["sts.amazonaws.com"],
});
```

### 2. Create OpenIDConnect Principal with conditions

Then establish the trust relationship by defining the conditions for this provider to act as a principal.

```ts
const githubOrganisation = "simonireilly";
// Change this to the repo you want to push code from
const repoName = "awesome-project";
/**
 * Create a principal for the OpenID; which can allow it to assume
 * deployment roles.
 */
const GitHubPrincipal = new OpenIdConnectPrincipal(provider).withConditions({
  StringLike: {
    "token.actions.githubusercontent.com:sub": `repo:${githubOrganisation}/${repoName}:*`,
  },
});
```

### 3. Create a role for the GitHub Actions

Finally you want to establish the role that can be assumed by the OIDC principal. This will allow GitHub actions to use the AWS Roles, and mutate the AWS Resources you give it access to.

```ts
    /**
     * Create a deployment role that has short lived credentials. The only
     * principal that can assume this role is the GitHub Open ID provider.
     *
     * This role is granted authority to assume aws cdk roles; which are created
     * by the aws cdk v2.
     */
    const githubActionsRole = new Role(this, "GitHubActionsRole", {
      assumedBy: GitHubPrincipal,
      description: "Role assumed by GitHubPrincipal for deploying from CI using aws cdk",
      roleName: "github-ci-role",
      maxSessionDuration: cdk.Duration.hours(1),
      inlinePolicies: {
        CdkDeploymentPolicy: new PolicyDocument({
          assignSids: true,
          statements: [
            new PolicyStatement({
              effect: Effect.ALLOW,
              actions: ["sts:AssumeRole"],
              resources: [`arn:aws:iam::${this.account}:role/cdk-*`],
            }),
          ],
        }),
      },
    });
``