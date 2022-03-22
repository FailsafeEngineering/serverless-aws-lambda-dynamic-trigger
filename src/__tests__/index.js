import SLSAWSLambdaDynamicTrigger from '../index'
import { SSMClient, GetParametersCommand } from '@aws-sdk/client-ssm'

jest.mock('@aws-sdk/client-ssm', () => jest.genMockFromModule('@aws-sdk/client-ssm'))

function serverlessMockStateFactory ({
  pluginConfigMock = {
    functions: [{ name: 'handler', ssmPath: '/stage/dynamic-trigger' }],
    region: 'foo-west-2'
  },
  getAllFunctionsRetMock = ['handler'],
  getFunctionMock = function () {
    return { events: [] }
  },
  functionsMock = { handler: { events: [] } }
}) {
  return {
    service: {
      custom: pluginConfigMock === null
        ? {}
        : { dynamicTrigger: pluginConfigMock },
      getAllFunctions () {
        return getAllFunctionsRetMock
      },
      getFunction: getFunctionMock,
      functions: functionsMock
    },
    cli: {
      log () {
      }
    }
  }
}

describe('THE constructor', () => {
  describe('WHEN it\'s been executed', () => {
    describe('AND the plugin config missing', () => {
      const serverlessMockConfigMissing = serverlessMockStateFactory({ pluginConfigMock: null })

      it('SHOULD throw', () =>
        expect(() => new SLSAWSLambdaDynamicTrigger(serverlessMockConfigMissing)).toThrow('SLSAWSLambdaDynamicTrigger - plugin configuration is missing.')
      )
    })

    describe('AND the functions param missing', () => {
      const serverlessMockFunctionsMissing = serverlessMockStateFactory({
        pluginConfigMock: {
          // functions missing
        }
      })

      it('SHOULD throw', () =>
        expect(() => new SLSAWSLambdaDynamicTrigger(serverlessMockFunctionsMissing)).toThrow('SLSAWSLambdaDynamicTrigger - plugin configuration is not valid. Please look into the README.md for the details.')
      )
    })

    describe('AND the functions in the config is set but not an array', () => {
      const serverlessMockFunctionsNotValid = serverlessMockStateFactory({
        pluginConfigMock: {
          functions: 'not an array'
        }
      })

      it('SHOULD throw', () =>
        expect(() => new SLSAWSLambdaDynamicTrigger(serverlessMockFunctionsNotValid)).toThrow('SLSAWSLambdaDynamicTrigger - plugin configuration is not valid. Please look into the README.md for the details.')
      )
    })

    describe('AND the functions in the config is set but not an array of objects', () => {
      const serverlessMockFunctionsNotValid = serverlessMockStateFactory({
        pluginConfigMock: {
          functions: ['not an object']
        }
      })

      it('SHOULD throw', () =>
        expect(() => new SLSAWSLambdaDynamicTrigger(serverlessMockFunctionsNotValid)).toThrow('SLSAWSLambdaDynamicTrigger - plugin configuration is not valid. Please look into the README.md for the details.')
      )
    })

    describe('AND the functions in the config is set to an array of objects but name is missing', () => {
      const serverlessMockFunctionsNotValid = serverlessMockStateFactory({
        pluginConfigMock: {
          functions: [{
            // name is missing
            ssmPath: '/stage/dynamic-trigger'
          }]
        }
      })

      it('SHOULD throw', () =>
        expect(() => new SLSAWSLambdaDynamicTrigger(serverlessMockFunctionsNotValid)).toThrow('SLSAWSLambdaDynamicTrigger - plugin configuration is not valid. Please look into the README.md for the details.')
      )
    })

    describe('AND the functions in the config is set to an array of objects but name is not a string', () => {
      const serverlessMockFunctionsNotValid = serverlessMockStateFactory({
        pluginConfigMock: {
          functions: [{
            name: false, // not a string
            ssmPath: '/stage/dynamic-trigger'
          }]
        }
      })

      it('SHOULD throw', () =>
        expect(() => new SLSAWSLambdaDynamicTrigger(serverlessMockFunctionsNotValid)).toThrow('SLSAWSLambdaDynamicTrigger - plugin configuration is not valid. Please look into the README.md for the details.')
      )
    })

    describe('AND the functions in the config is set to an array of objects but ssmPath is missing', () => {
      const serverlessMockFunctionsNotValid = serverlessMockStateFactory({
        pluginConfigMock: {
          functions: [{
            name: 'handler'
            // ssmPath
          }]
        }
      })

      it('SHOULD throw', () =>
        expect(() => new SLSAWSLambdaDynamicTrigger(serverlessMockFunctionsNotValid)).toThrow('SLSAWSLambdaDynamicTrigger - plugin configuration is not valid. Please look into the README.md for the details.')
      )
    })

    describe('AND the functions in the config is set to an array of objects but ssmPath is not a string', () => {
      const serverlessMockFunctionsNotValid = serverlessMockStateFactory({
        pluginConfigMock: {
          functions: [{
            name: 'handler',
            ssmPath: false // not a string
          }]
        }
      })

      it('SHOULD throw', () =>
        expect(() => new SLSAWSLambdaDynamicTrigger(serverlessMockFunctionsNotValid)).toThrow('SLSAWSLambdaDynamicTrigger - plugin configuration is not valid. Please look into the README.md for the details.')
      )
    })

    describe('AND the region optional param is missing', () => {
      const serverlessMockRegionMissing = serverlessMockStateFactory({
        pluginConfigMock: {
          // region is missing
          functions: [{
            name: 'foo',
            ssmPath: '/stage/dynamic-trigger'
          }]
        }
      })

      it('SHOULD set the region in the config to the value of AWS_DEFAULT_REGION env var', () => {
        console.log(`WWWWWWWWWWWWWWRRRRRRRRRRRRRR: ${process.env.AWS_DEFAULT_REGION}`)
        const instance = new SLSAWSLambdaDynamicTrigger(serverlessMockRegionMissing)
        expect(instance.config).toHaveProperty('region', process.env.AWS_DEFAULT_REGION)
      })
    })

    describe('AND the region optional param is set but not a string', () => {
      const serverlessMockRegionNotString = serverlessMockStateFactory({
        pluginConfigMock: {
          region: true, // not a string
          functions: [{
            name: 'foo',
            ssmPath: '/stage/dynamic-trigger'
          }]
        }
      })

      it('SHOULD throw', () =>
        expect(() => new SLSAWSLambdaDynamicTrigger(serverlessMockRegionNotString)).toThrow('SLSAWSLambdaDynamicTrigger - plugin configuration is not valid. Please look into the README.md for the details.')
      )
    })
  })
})

describe('THE beforeCompileEvents hook of the instance', () => {
  afterEach(() => SSMClient.prototype.send.mockClear())

  describe('WHEN it\'s been called', () => {
    describe('AND a set of triggers should be registered', () => {
      const pluginConfigMock = {
        region: 'foo-bar-10',
        functions: [{
          name: 'handler',
          ssmPath: '/stage/dynamic-trigger'
        }]
      }

      describe('AND a function is not configured to register dynamic triggers', () => {
        const serverlessMock = serverlessMockStateFactory({
          pluginConfigMock,
          functionsMock: { handler: { events: [] }, notConfiguredFunction: { events: [] } }
        })

        beforeEach(() =>
          SSMClient.prototype.send.mockImplementation(() => Promise.resolve({
            Parameters: [
              {
                Name: '/stage/dynamic-trigger',
                Value: 'arn:aws:sns:foo-bar-10:123456654321:id1'
              }
            ]
          }))
        )

        it('SHOULD not register any trigger dynamically', async () => {
          const slsAWSLambdaDynamicTrigger = new SLSAWSLambdaDynamicTrigger(serverlessMock)
          await slsAWSLambdaDynamicTrigger.beforeCompileEvents()
          expect(serverlessMock.service.functions.notConfiguredFunction.events).toHaveLength(0)
        })
      })

      describe('AND there is a trigger of an unknown aws service', () => {
        const serverlessMock = serverlessMockStateFactory({
          pluginConfigMock
        })

        beforeEach(() =>
          SSMClient.prototype.send.mockImplementation(() => Promise.resolve({
            Parameters: [
              {
                Name: '/stage/dynamic-trigger',
                Value: 'arn:aws:unknown:foo-bar-10:123456654321:id1'
              }
            ]
          }))
        )

        it('SHOULD throw', () => {
          const slsAWSLambdaDynamicTrigger = new SLSAWSLambdaDynamicTrigger(serverlessMock)
          return expect(slsAWSLambdaDynamicTrigger.beforeCompileEvents()).rejects.toThrow('Wrong aws service in arn. Only sns, sqs and kinesis can be handled.')
        })
      })

      describe('AND all the triggers are either sns, sqs or kinesis', () => {
        const serverlessMock = serverlessMockStateFactory({
          pluginConfigMock
        })

        beforeEach(() =>
          SSMClient.prototype.send.mockImplementation(() => Promise.resolve({
            Parameters: [
              {
                Name: '/stage/dynamic-trigger',
                Value: 'arn:aws:sns:foo-bar-10:123456654321:id1,arn:aws:sqs:foo-bar-10:123456654321:id2,arn:aws:kinesis:foo-bar-10:123456654321:id3'
              }
            ]
          }))
        )

        it('SHOULD call the send method of the SSMClient instance ' +
          'AND mutate the events property of the chosen lambda functions in the state object', async () => {
          const slsAWSLambdaDynamicTrigger = new SLSAWSLambdaDynamicTrigger(serverlessMock)
          await slsAWSLambdaDynamicTrigger.beforeCompileEvents()

          expect(SSMClient.prototype.send).toHaveBeenCalledTimes(1)
          expect(SSMClient.prototype.send.mock.calls[0][0] instanceof GetParametersCommand).toBe(true)
          expect(serverlessMock.service.functions.handler.events).toHaveLength(3)
          expect(serverlessMock.service.functions.handler.events[0]).toStrictEqual({ sns: 'arn:aws:sns:foo-bar-10:123456654321:id1' })
          expect(serverlessMock.service.functions.handler.events[1]).toStrictEqual({ sqs: 'arn:aws:sqs:foo-bar-10:123456654321:id2' })
          expect(serverlessMock.service.functions.handler.events[2]).toStrictEqual({ stream: 'arn:aws:kinesis:foo-bar-10:123456654321:id3' })
        })
      })
    })
  })
})
