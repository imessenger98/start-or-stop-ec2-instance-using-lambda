import AWS from 'aws-sdk'
import { parseBody } from '../../common/utils.js'
/**
 * Toggles(start or stop) the state of an EC2 instance between running and stopped states.
 *
 * @async
 * @function
 * @param {Object} event - The event object passed to the Lambda function. It should contain the instanceId and region in its body.
 * @returns {Promise<Object>} A promise that resolves to an object containing the HTTP status code and a message indicating the success or failure of the operation.
 * @throws {Error} If an error occurs during the fetching or processing of instance data, or if the instanceId and region are not provided.
 *
 * @example
 * {
 *   "body": {
 *     "instanceId": "i-e53453dfg452123",
 *     "region": "us-east-1"
 *   }
 * }
 */
export const handler = async (event) => {
  const { instanceId, region } = parseBody(event);
  try {
    const ec2 = new AWS.EC2({ region })

    const describeParams = { InstanceIds: [instanceId] }
    const describeResponse = await ec2.describeInstances(describeParams).promise()

    if (describeResponse.Reservations.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: 'Instance not found' }),
      }
    }

    const currentState = describeResponse.Reservations[0].Instances[0].State.Name
    if (!['running', 'stopped'].includes(currentState)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Instance is in an invalid state' }),
      };
    }
    let nextState = currentState === 'running' ? 'stopped' : 'running';
    const actionParams = { InstanceIds: [instanceId], DryRun: false }
    const action = nextState === 'running' ? ec2.startInstances(actionParams) : ec2.stopInstances(actionParams);
    await action.promise();

    const message = `Instance ${instanceId} in region ${region} has been ${nextState === 'running' ? 'started' : 'stopped'}`
    return {
      statusCode: 200,
      body: JSON.stringify(message),
    }
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Error toggling instance state',
        error: error.message,
      }),
    }
  }
}
