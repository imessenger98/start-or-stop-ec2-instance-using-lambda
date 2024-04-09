/*
 * Author MUHAMMED YAZEEN AN
 * Created on Wed Apr 10 2024
 */

import AWS from 'aws-sdk'

/**
 * Asynchronously fetches and extracts data from all EC2 instances across specified regions.
 * If no regions are specified, it defaults to fetching data from all available regions.
 * The function checks each region for instances and extracts their data, including name, ID, region, and state.
 *
 * @async
 * @function
 * @returns {Promise<Array>} A promise that resolves to an array of objects, each containing the name, ID, region, and state of an EC2 instance.
 * @throws {Error} If an error occurs during the fetching or processing of instance data.
 */
export const handler = async () => {
  try {
    let regionNames = []

    //all the regions that we are currently using will be given in the secrets
    if (process.env.CURRENTLY_USING_REGION && process.env.CURRENTLY_USING_REGION !== '') {
      regionNames = process.env.CURRENTLY_USING_REGION.split(',')
    } else {
      // Get the list of all available regions.not recommended as it is slower
      const ec2 = new AWS.EC2()
      const regions = await ec2.describeRegions({}).promise()
      regionNames = regions.Regions.map((region) => region.RegionName)
    }

    const allInstances = await listAllInstanceData(regionNames)

    return {
      statusCode: 200,
      body: JSON.stringify(allInstances),
    }
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    }
  }
}

async function listAllInstanceData(regionNames) {
  const promises = regionNames.map((regionName) => getAllInstancesOfTheRegion(regionName))
  const allInstances = await Promise.all(promises)
  return allInstances.flat()
}

//Extract data of instances in the region.
async function getAllInstancesOfTheRegion(regionName) {
  const ec2Region = new AWS.EC2({ region: regionName })
  try {
    const data = await ec2Region.describeInstances({}).promise()
    return data.Reservations.flatMap((reservation) =>
      reservation.Instances.map((instance) => extractRequiredData({ instance, regionName })),
    )
  } catch (error) {
    console.error(`Error fetching instances for region ${regionName}:`, error)
    return []
  }
}

// Extract only the required data of instances
function extractRequiredData({ instance, regionName }) {
  const nameTag = instance.Tags.find((tag) => tag.Key === 'Name')
  const instanceName = nameTag ? nameTag.Value : 'Unnamed'

  return {
    Name: instanceName,
    InstanceId: instance.InstanceId,
    Region: regionName,
    State: instance.State.Name,
  }
}
