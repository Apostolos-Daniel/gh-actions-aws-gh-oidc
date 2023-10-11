import * as cdk from 'aws-cdk-lib';
import { Effect, OpenIdConnectPrincipal, OpenIdConnectProvider, PolicyDocument, PolicyStatement, Role } from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export class AssumeRolesStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const provider = new OpenIdConnectProvider(this, "MyProvider", {
      url: "https://token.actions.githubusercontent.com",
      clientIds: ["sts.amazonaws.com"],
    });

    const githubOrganisation = "Apostolos-Daniel";
    
    // Change this to the repo you want to push code from
    const repoName = "lambda-o11y-aws-ts";
    /**
     * Create a principal for the OpenID; which can allow it to assume
     * deployment roles.
     */
    const GitHubPrincipal = new OpenIdConnectPrincipal(provider).withConditions({
      StringLike: {
        "token.actions.githubusercontent.com:sub": `repo:${githubOrganisation}/${repoName}*`,
      },
      StringEquals: {
        "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
      },
    });

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
    
    // Define the policy statement
    const ssmPolicyStatement = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ['ssm:GetParameter'],
      resources: ['arn:aws:ssm:eu-west-1:643476110649:parameter/cdk-bootstrap/hnb659fds/version'],
    });

    // Attach the policy statement to the role
    githubActionsRole.addToPolicy(ssmPolicyStatement);
  }

}
