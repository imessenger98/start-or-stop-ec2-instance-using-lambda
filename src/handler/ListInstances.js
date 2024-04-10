/*
 * Author MUHAMMED YAZEEN AN
 * Created on Wed Apr 10 2024
 */

import AWS from 'aws-sdk'

import { getAllRegionNames } from '../../common/utils.js'
/**
 * Get Basic details about EC2 instances in given regions.
 * If no regions are specified, it defaults to fetching details about instances from all available regions.
 * The function checks each region for instances and extracts basic data about the instances like name, ID, region, and state.
 *
 * @async
 * @function
 * @returns {Promise<Array>} A promise that resolves to an array of objects, each containing the name, ID, region, and state of an EC2 instance.
 * @throws {Error} If an error occurs during the fetching or processing of instance data.
 */
export const handler = async () => {
  try {
    const regionNames = await getAllRegionNames()
    const allInstances = await listAllInstanceData(regionNames)

    return {
      statusCode: 200,
      body: JSON.stringify(allInstances)
    }
  } catch (error) {
    console.error(error)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    }
  }
}

async function listAllInstanceData (regionNames) {
  const promises = regionNames.map((regionName) => getAllInstancesOfTheRegion(regionName))
  const allInstances = await Promise.all(promises)
  return allInstances.flat()
}

async function getAllInstancesOfTheRegion (regionName) {
  const ec2Region = new AWS.EC2({ region: regionName })
  try {
    const data = await ec2Region.describeInstances({}).promise()
    return data.Reservations.flatMap((reservation) =>
      reservation.Instances.map((instance) => extractRequiredData({ instance, regionName }))
    )
  } catch (error) {
    console.error(`Error fetching instances for region ${regionName}:`, error)
    return []
  }
}

function extractRequiredData ({ instance, regionName }) {
  const nameTag = instance.Tags.find((tag) => tag.Key === 'Name')
  const instanceName = nameTag ? nameTag.Value : 'Unnamed'

  return {
    Name: instanceName,
    InstanceId: instance.InstanceId,
    Region: regionName,
    State: instance.State.Name
  }
}
