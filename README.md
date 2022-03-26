# serverless-aws-lambda-dynamic-trigger

The plugin can register triggers (events) for a lambda function dynamically at the time of the deployment.
The usual static trigger (event) definitions can be completely omitted.
The original idea is to make the same lambda function triggered by different events on different environments (stages).
This way we can even do some basic **feature switching**.

## How it works
The plugin when the host code gets deployed...
1. Fetches the value of a defined parameter from the Parameter Store. The value must be a list ARNs separated by commas. (If there is only one trigger it's just a single ARN)
2. Parses the individual ARNs and pulls out the name of the aws service.
3. Registers the ARNs as triggers with the configured lambda function or functions.

Please note that you can only use the plugin with **sns**, **sqs** or **kinesis** triggers.

Like on **dev** foo lambda function is triggered by
- arn:aws:sns:eu-west-2:123456654321:topic1
- arn:aws:sns:eu-west-2:123456654321:topic2
- arn:aws:sns:eu-west-2:123456654321:topic3

While on **prod** foo lambda function is triggered by
- arn:aws:sns:eu-west-2:123456654321:topic1
- arn:aws:sns:eu-west-2:123456654321:topic2

This way we can switch features on and off on different stages.

The dynamic trigger sets need to be stored in the Parameter Store of the Systems Manager (SSM) and it should look somewhat like this:

- **Name**: /dev/dynamic-trigger
- **Value**: arn:aws:sns:eu-west-2:123456654321:topic1,arn:aws:sns:eu-west-2:123456654321:topic2,arn:aws:sns:eu-west-2:123456654321:topic3

or

- **Name**: /prod/dynamic-trigger
- **Value**: arn:aws:sns:eu-west-2:123456654321:topic1,arn:aws:sns:eu-west-2:123456654321:topic2

## The config parameters:
- **region**: {string} the region of the Systems Manager -> Parameter Store
- **functions**: {Array<name: string, ssmPath: string>}
  - **name**: {string} The name of the function
  - **ssmPath**: {string} It's actually the name of the parameter in the Parameter Store

## Example
The configuration in the serverless.yml:
```yml
plugins:
  - @kakkuk/serverless-aws-lambda-dynamic-trigger
custom:
  dynamicTrigger:
    region: "eu-west-2" // !!! Optional !!! It'll fall back to AWS_DEFAULT_REGION if it's not set
    functions:
      - name: "handler1"
        ssmPath: "/${opt:stage}/trigger-set1" // This is the dynamic part :)
      - name: "handler2"
        ssmPath: "/${opt:stage}/trigger-set2" // This is the dynamic part :)

// Further down in the serverless.yml

handler1:
  handler: src/handler1
  name: ${self:service}-handler1
  // No events section needed
handler2:
  handler: src/handler1
  name: ${self:service}-handler2
  // No events section needed
```