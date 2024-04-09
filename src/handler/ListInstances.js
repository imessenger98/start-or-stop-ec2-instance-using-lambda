import AWS from 'aws-sdk'

export const handler = async (event) => {
  try {
    // Get the list of all available regions
    const ec2 = new AWS.EC2()
    const regions = await ec2.describeRegions({}).promise()
    const regionNames = regions.Regions.map((region) => region.RegionName)

    // Initialize an empty array to hold all instances
    let allInstances = []

    // Iterate over each region
    for (const regionName of regionNames) {
      const ec2Region = new AWS.EC2({ region: regionName })

      const data = await ec2Region.describeInstances().promise()

      const instances = data.Reservations.flatMap((reservation) =>
        reservation.Instances.map((instance) => ({
          Name: instance.Tags.find((tag) => tag.Key === 'Name')?.Value || 'Unnamed',
          InstanceId: instance.InstanceId,
          Region: regionName,
          State: instance.State.Name
        }))
      )
      allInstances = allInstances.concat(instances)
    }

    return {
      statusCode: 200,
      body: JSON.stringify(allInstances)
    }
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    }
  }
}
