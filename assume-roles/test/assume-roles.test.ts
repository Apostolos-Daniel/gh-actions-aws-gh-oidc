import * as cdk from 'aws-cdk-lib';
import { Match, Matcher, Template } from 'aws-cdk-lib/assertions';
import * as AssumeRoles from '../lib/assume-roles-stack';

// example test. To run these tests, uncomment this file along with the
// example resource in lib/assume-roles-stack.ts
test('Create an OpenIdConnectProvider', () => {
    const app = new cdk.App();
    // WHEN
    const stack = new AssumeRoles.AssumeRolesStack(app, 'MyTestStack');
    // THEN
    const template = Template.fromStack(stack);

    template.hasResourceProperties('Custom::AWSCDKOpenIdConnectProvider', {
        Url: "https://token.actions.githubusercontent.com",
        ClientIDList: Match.arrayWith(["sts.amazonaws.com"]),
    });
});

test('Create an GitHubActionsRole', () => {
    const app = new cdk.App();
    // WHEN
    const stack = new AssumeRoles.AssumeRolesStack(app, 'MyTestStack');
    // THEN
    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::IAM::Role', {
        MaxSessionDuration: 3600,
        AssumeRolePolicyDocument: Match.objectLike({
            Statement: Match.arrayWith([Match.objectEquals(
                {
                    "Action": "sts:AssumeRoleWithWebIdentity",
                    "Condition": {
                        "StringLike": {
                            "token.actions.githubusercontent.com:sub": "repo:Apostolis-Daniel/lambda-o11y-aws-ts*"
                        },
                        "StringEquals": {
                            "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
                        }
                    },
                    "Effect": "Allow",
                    "Principal": {
                        "Federated": {
                            "Ref": "MyProvider730BA1C8"
                        }
                    }
                })])
        }),
        Policies: Match.arrayWith([Match.objectLike({
            PolicyDocument: Match.objectLike({
                Statement: Match.arrayWith([{
                    "Action": "sts:AssumeRole",
                    "Effect": "Allow",
                    "Resource": {
                        "Fn::Join": [
                            "",
                            [
                                "arn:aws:iam::",
                                {
                                    "Ref": "AWS::AccountId"
                                },
                                ":role/cdk-*"
                            ]
                        ]
                    },
                    "Sid": "0"
                }])
            })
        })])

    })
});
