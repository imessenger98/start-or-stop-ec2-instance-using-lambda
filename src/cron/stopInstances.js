/*
 * Author MUHAMMED YAZEEN AN
 * Created on Wed Apr 10 2024
 * Version 2
 */

import AWS from 'aws-sdk'

import { getAllRegionNames } from '../../common/utils.js'

/**
 *  Get all the instances from all the regions and check if the network activity of each instance is less than zero for the past 6 hours
 * If it is zero, deactivate the instance
 *
 * Lambda function to check the activity of EC2 instances based on inbound and outbound packet counts.
 * If the packet count is less than or equal to 0, the instance is considered in-active and will be stopped.
 * It checks all instances in a given region or all regions by default.
 * @async
 * @function
 */
export const handler = async () => {
  try {
    const regionNames = await getAllRegionNames()
    const mapAllRegions = regionNames.map((regionName) => handleEachRegion(regionName))
    await Promise.allSettled(mapAllRegions)
    console.info(`Cron job was invoked successfully at: ${new Date()}`)
  } catch (error) {
    console.error(error)
  }
}

async function handleEachRegion (regionName) {
  const ec2Region = new AWS.EC2({ region: regionName })
  const instances = await ec2Region.describeInstances().promise()
  const allInstance = instances.Reservations.flatMap((reservation) => reservation.Instances)
  const mapAllInstance = allInstance.map((instance) => handleEachInstances({ instance, ec2Region }))
  await Promise.all(mapAllInstance)
}

async function handleEachInstances ({ instance, ec2Region }) {
  if (instance.State.Name === 'running') {
    const isCurrentlyActive = await isInstanceInUse(instance.InstanceId)
    if (!isCurrentlyActive) {
      await ec2Region.stopInstances({ InstanceIds: [instance.InstanceId] }).promise()
      console.log(
        `Instance ${instance?.KeyName || instance?.Tags?.value || 'no_name'} (${instance?.InstanceId}) in region ${instance?.Placement?.AvailabilityZone} was stopped.`
      )
    }
  }
}

async function isInstanceInUse (instanceId) {
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
    StartTime: new Date(Date.now() - 6 * 60 * 60 * 1000), // last 6 hours
    EndTime: new Date(),
    Period: 3600,
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
    throw error
  }
}
