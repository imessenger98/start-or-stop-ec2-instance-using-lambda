import AWS from 'aws-sdk'

export const handler = async (event) => {
  const { instanceId, region } = event

  if (!instanceId || !region) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        message: 'instanceId and region must be provided'
      })
    }
  }

  try {
    // Initialize EC2 with the specified region
    const ec2 = new AWS.EC2({ region })

    const describeParams = { InstanceIds: [instanceId] }
    const describeResponse = await ec2.describeInstances(describeParams).promise()

    if (describeResponse.Reservations.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: 'Instance not found' })
      }
    }

    const currentState = describeResponse.Reservations[0].Instances[0].State.Name
    let nextState

    if (currentState === 'running') {
      nextState = 'stopped'
    } else if (currentState === 'stopped') {
      nextState = 'running'
    } else {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Instance is in an invalid state' })
      }
    }

    const actionParams = { InstanceIds: [instanceId], DryRun: false }

    if (nextState === 'running') {
      await ec2.startInstances(actionParams).promise()
    } else if (nextState === 'stopped') {
      await ec2.stopInstances(actionParams).promise()
    }

    return {
      statusCode: 200,
      message: `Instance ${instanceId} in region ${region} has been ${nextState === 'running' ? 'started' : 'stopped'}`
    }
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Error toggling instance state',
        error: error.message
      })
    }
  }
}
