## Modules

<dl>
<dt><a href="#module_index">index</a></dt>
<dd><p>The plugin can register triggers (events) for a lambda function dynamically. At deployment time</p>
<ol>
<li>It fetches the value of a parameter in the Parameters. The value must be a list ARNs sepearted by comma.</li>
<li>Parses the individual ARNs.</li>
<li>Register the ARNs as triggers with the configured lambda function or functions.</li>
</ol>
<p>Please note that currently you can only use the plugin with sns, sqs or kinesis triggers (events).</p>
<p>The original idea is to make the same lambda function triggered by different events on different environments (stages).
Like on <em>dev</em> foo lambda function is triggered by</p>
<ul>
<li>arn:aws:sns:eu-west-2:123456654321:topic1</li>
<li>arn:aws:sns:eu-west-2:123456654321:topic2</li>
<li>arn:aws:sns:eu-west-2:123456654321:topic3
while on <em>prod</em> foo lambda function is triggered by</li>
<li>arn:aws:sns:eu-west-2:123456654321:topic1</li>
<li>arn:aws:sns:eu-west-2:123456654321:topic2
This way we can switch features on and off on different stages.</li>
</ul>
<p>The dynamic triger sets needs to ne stored in the Parameter Store of the Systems Manager (SSM) and it should look somewhat like this:</p>
</dd>
</dl>

## Members

<dl>
<dt><a href="#Package @kakkuk/serverless-aws-lambda-dynamic-trigger">Package @kakkuk/serverless-aws-lambda-dynamic-trigger</a></dt>
<dd><p>Serverless plugin registers a set of events stored in the AWS Parameter Store.</p>
</dd>
</dl>

<a name="module_index"></a>

## index
The plugin can register triggers (events) for a lambda function dynamically. At deployment time
1. It fetches the value of a parameter in the Parameters. The value must be a list ARNs sepearted by comma.
2. Parses the individual ARNs.
3. Register the ARNs as triggers with the configured lambda function or functions.

Please note that currently you can only use the plugin with sns, sqs or kinesis triggers (events).

The original idea is to make the same lambda function triggered by different events on different environments (stages).
Like on *dev* foo lambda function is triggered by
- arn:aws:sns:eu-west-2:123456654321:topic1
- arn:aws:sns:eu-west-2:123456654321:topic2
- arn:aws:sns:eu-west-2:123456654321:topic3
while on *prod* foo lambda function is triggered by
- arn:aws:sns:eu-west-2:123456654321:topic1
- arn:aws:sns:eu-west-2:123456654321:topic2
This way we can switch features on and off on different stages.

The dynamic triger sets needs to ne stored in the Parameter Store of the Systems Manager (SSM) and it should look somewhat like this:

**Example**  
```js
*Name*: /dev/dynamic-trigger
*Value*: arn:aws:sns:eu-west-2:123456654321:topic1,arn:aws:sns:eu-west-2:123456654321:topic2,arn:aws:sns:eu-west-2:123456654321:topic3
or
*Name*: /prod/dynamic-trigger
*Value*: arn:aws:sns:eu-west-2:123456654321:topic1,arn:aws:sns:eu-west-2:123456654321:topic2

The config parameters:
- functions:
  - name: The name of the function
  - ssmPath: Path to ssm which stores the triggers for the function. The value of the parameter should be a list of aws arns.
```
**Example**  
```js
plugins:
  - @kakkuk/serverless-aws-lambda-dynamic-trigger
custom:
  dynamicTrigger:
    region: "eu-west-2" // !!! Optional !!! It'll fall back to AWS_DEFAULT_REGION if it's not set
    functions:
      - name: "handler"
        ssmPath: "{/path/to/triggers}"
```
<a name="Package @kakkuk/serverless-aws-lambda-dynamic-trigger"></a>

## Package @kakkuk/serverless-aws-lambda-dynamic-trigger
Serverless plugin registers a set of events stored in the AWS Parameter Store.

**Kind**: global variable  
