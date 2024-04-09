import AWS from 'aws-sdk'

export const handler = async (event) => {
  const ec2 = new AWS.EC2()
  const regions = await ec2.describeRegions({}).promise()
  const regionNames = regions.Regions.map((region) => region.RegionName)

  for (const regionName of regionNames) {
    const ec2Region = new AWS.EC2({ region: regionName })
    const instances = await ec2Region.describeInstances().promise()

    for (const reservation of instances.Reservations) {
      for (const instance of reservation.Instances) {
        if (instance.State.Name === 'running' && !(await isInUse(instance.InstanceId))) {
          await ec2Region.stopInstances({ InstanceIds: [instance.InstanceId] }).promise()
          console.log(
            `Instance ${instance?.KeyName} (${instance?.InstanceId}) in region ${instance?.Placement?.AvailabilityZone} was stopped.`
          )
        }
      }
    }
  }
}

async function isInUse (instanceId) {
  const cloudwatch = new AWS.CloudWatch()
  const params = {
    Namespace: 'AWS/EC2',
    MetricName: 'NetworkPacketsIn',
    Dimensions: [
      {
        Name: 'InstanceId',
        Value: instanceId
      }
    ],
    StartTime: new Date(Date.now() - 3600000), // 1 hour ago
    EndTime: new Date(),
    Period: 3600, // 1 hour
    Statistics: ['Sum']
  }

  try {
    const data = await cloudwatch.getMetricStatistics(params).promise()
    const totalPacketsIn = data.Datapoints.reduce((sum, datapoint) => sum + datapoint.Sum, 0)

    // Check NetworkPacketsOut for the same period
    params.MetricName = 'NetworkPacketsOut'
    const dataOut = await cloudwatch.getMetricStatistics(params).promise()
    const totalPacketsOut = dataOut.Datapoints.reduce((sum, datapoint) => sum + datapoint.Sum, 0)

    // Consider the instance as not in use if both NetworkPacketsIn and NetworkPacketsOut are 0
    return totalPacketsIn > 0 || totalPacketsOut > 0
  } catch (error) {
    console.error(`Error fetching network activity for instance ${instanceId}:`, error)
    return false // Consider the instance as not in use if there's an error fetching the metric
  }
}
