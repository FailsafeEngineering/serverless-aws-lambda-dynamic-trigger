/**
 * @name Package @kakkuk/serverless-aws-lambda-dynamic-trigger
 * @description Serverless plugin registers a set of events stored in the AWS Parameter Store.
 */

/**
 * @module index
 * @description
 *
 * The plugin can register triggers (events) for a lambda function dynamically. At deployment time
 * 1. It fetches the value of a parameter in the Parameters. The value must be a list ARNs sepearted by comma.
 * 2. Parses the individual ARNs.
 * 3. Register the ARNs as triggers with the configured lambda function or functions.
 *
 * Please note that currently you can only use the plugin with sns, sqs or kinesis triggers (events).
 *
 * The original idea is to make the same lambda function triggered by different events on different environments (stages).
 * Like on *dev* foo lambda function is triggered by
 * - arn:aws:sns:eu-west-2:123456654321:topic1
 * - arn:aws:sns:eu-west-2:123456654321:topic2
 * - arn:aws:sns:eu-west-2:123456654321:topic3
 * while on *prod* foo lambda function is triggered by
 * - arn:aws:sns:eu-west-2:123456654321:topic1
 * - arn:aws:sns:eu-west-2:123456654321:topic2
 * This way we can switch features on and off on different stages.
 *
 * The dynamic triger sets needs to ne stored in the Parameter Store of the Systems Manager (SSM) and it should look somewhat like this:
 * @example
 * *Name*: /dev/dynamic-trigger
 * *Value*: arn:aws:sns:eu-west-2:123456654321:topic1,arn:aws:sns:eu-west-2:123456654321:topic2,arn:aws:sns:eu-west-2:123456654321:topic3
 * or
 * *Name*: /prod/dynamic-trigger
 * *Value*: arn:aws:sns:eu-west-2:123456654321:topic1,arn:aws:sns:eu-west-2:123456654321:topic2
 *
 * The config parameters:
 * - functions:
 *   - name: The name of the function
 *   - ssmPath: Path to ssm which stores the triggers for the function. The value of the parameter should be a list of aws arns.
 * @example
 * plugins:
 *   - @kakkuk/serverless-aws-lambda-dynamic-trigger
 * custom:
 *   dynamicTrigger:
 *     region: "eu-west-2" // !!! Optional !!! It'll fall back to AWS_DEFAULT_REGION if it's not set
 *     functions:
 *       - name: "handler"
 *         ssmPath: "{/path/to/triggers}"
 */
import { SSMClient, GetParametersCommand } from '@aws-sdk/client-ssm'

const REGION = process.env.AWS_DEFAULT_REGION
const serviceMap = new Map([
  ['sns', 'sns'],
  ['sqs', 'sqs'],
  ['kinesis', 'stream']
])

/**
 * @class Represents a trigger registrar instance
 * @private
 */
class SLSAWSLambdaDynamicTrigger {
  /**
   * Constructs the registrar instance
   * @private
   * @param {Object} serverless - The built-on object which represents the state of the lambda app.
   */
  constructor (serverless) {
    this.validateConfig(serverless)
    this.setupState(serverless)
  }

  /**
   * Validates if the plugin config exists.
   * @private
   * @throws {Error} - When the plugin configuration is missing from serverless.yml or invalid.
   * @returns {Boolean}
   */
  validateConfig (serverless) {
    if (!serverless.service.custom.dynamicTrigger) {
      throw new Error('SLSAWSLambdaDynamicTrigger - plugin configuration is missing.')
    }

    serverless.service.custom.dynamicTrigger.region = serverless.service.custom.dynamicTrigger.region || REGION

    const isPluginConfigValid =
      Boolean(serverless.service.custom.dynamicTrigger.functions) &&
      typeof serverless.service.custom.dynamicTrigger.region === 'string' &&
      Array.isArray(serverless.service.custom.dynamicTrigger.functions) &&
      !serverless.service.custom.dynamicTrigger.functions.some((functionSetting) => {
        return functionSetting.constructor !== Object ||
          !functionSetting.name ||
          typeof functionSetting.name !== 'string' ||
          !functionSetting.ssmPath ||
          typeof functionSetting.ssmPath !== 'string'
      })

    if (!isPluginConfigValid) {
      throw new Error('SLSAWSLambdaDynamicTrigger - plugin configuration is not valid. Please look into the README.md for the details.')
    }

    return true
  }

  /**
   * Sets up the state of the plugin instance
   * @private
   * @param {object} serverless - The builtin serverless parameter passed by the serverless framework
   * @returns {void}
   */
  setupState (serverless) {
    this.config = serverless.service.custom.dynamicTrigger
    this.ssmClient = new SSMClient({ region: REGION })
    this.serverless = serverless
    this.hooks = {
      'before:package:compileEvents': this.beforeCompileEvents.bind(this)
    }
  }

  /**
   * Mutates the function configs by adding the trigger arns.
   * @private
   * @requires 'ssm'
   * @returns {Array<{name: string, ssmPath: string, value: string}>}
   */
  async extendFunctionConfigs () {
    const ssmPaths = this.config.functions.map(({ ssmPath }) => { return ssmPath })
    const { Parameters: parameters } = await this.ssmClient.send(new GetParametersCommand({ Names: ssmPaths }))

    return this.config.functions.reduce((accu, { name, ssmPath }) => {
      const { Value: value } = parameters.find(({ Name }) => Name === ssmPath)
      accu = [...accu, { name, ssmPath, value }]
      return accu
    }, [])
  }

  /**
   * Assigns the ARNs to the events property of the functions
   * @private
   * @param {Object} foundFunctionConfig - The configuration of the function
   * @param {string} key - The name of the function
   * @param {Object} value - The serverless representation of the function
   * @returns {void}
   */
  registerTriggersDynamically (foundFunctionConfig, key, value) {
    const { value: valueInConfig } = foundFunctionConfig
    const arns = valueInConfig.split(',')
    const re = /^(?:[^:]*:){2}([^:]*)/
    const servicesPlusARNs = arns.map((arn) => {
      const awsServiceSearchResult = re.exec(arn)
      const slsService = serviceMap.get(awsServiceSearchResult[1])
      if (!slsService) {
        throw new Error('Wrong aws service in arn. Only sns, sqs and kinesis can be handled.')
      }
      return { [slsService]: arn }
    })
    value.events = servicesPlusARNs
    this.serverless.cli.log(`SLSPluginSNSEventReg - triggers will be registered for function ${key}: ${servicesPlusARNs.map((servicePlusARN) => Object.values(servicePlusARN)[0]).toString()}`)
  }

  /**
   * Mutates the events property right before the compilation of the CloudFormation template.
   * @private
   * @returns {Promise<void>}
   */
  async beforeCompileEvents () {
    this.serverless.cli.log(`SLSPluginSNSEventReg - the functions the triggers will be registered for: ${this.config.functions.map(({ name }) => name)}`)
    const extendedFunctionConfigs = await this.extendFunctionConfigs()

    for (const [key, value] of Object.entries(this.serverless.service.functions)) {
      const foundFunctionConfig = extendedFunctionConfigs.find(({ name }) => key === name)
      if (foundFunctionConfig) {
        this.registerTriggersDynamically(foundFunctionConfig, key, value)
      }
    }
  }
}

export default SLSAWSLambdaDynamicTrigger
