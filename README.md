# serverless-aws-lambda-dynamic-trigger

The plugin can register triggers (events) for a lambda function dynamically at the time of the deployment.
1. It fetches the value of a parameter form the Parameter Store. The value must be a list ARNs separated by commas.
2. Parses the individual ARNs and pulls out the name of the aws service.
3. Register the ARNs as triggers with the configured lambda function or functions.

Please note that you can only use the plugin with **sns**, **sqs** or **kinesis** triggers.

The original idea is to make the same lambda function triggered by different events on different environments (stages).
Like on **dev** foo lambda function is triggered by
- arn:aws:sns:eu-west-2:123456654321:topic1
- arn:aws:sns:eu-west-2:123456654321:topic2
- arn:aws:sns:eu-west-2:123456654321:topic3
while on **prod** foo lambda function is triggered by
- arn:aws:sns:eu-west-2:123456654321:topic1
- arn:aws:sns:eu-west-2:123456654321:topic2
This way we can switch features on and off on different stages.

The dynamic trigger sets need to ne stored in the Parameter Store of the Systems Manager (SSM) and it should look somewhat like this:

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
```yml
plugins:
  - @kakkuk/serverless-aws-lambda-dynamic-trigger
custom:
  dynamicTrigger:
    region: "eu-west-2" // !!! Optional !!! It'll fall back to AWS_DEFAULT_REGION if it's not set
    functions:
      - name: "handler1"
        ssmPath: "/prod/tigger-set1"
      - name: "handler2"
        ssmPath: "/prod/tigger-set2"
```