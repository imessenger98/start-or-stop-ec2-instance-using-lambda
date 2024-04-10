import AWS from 'aws-sdk'

// Parses the event body
export function parseBody (event) {
  let body = event.body || event
  if (typeof body === 'string') {
    body = JSON.parse(body)
  }
  return body
}

// Function to retrieve all AWS region names
export async function getAllRegionNames () {
  let regionNames = []
  if (process.env.CURRENTLY_USING_REGION && process.env.CURRENTLY_USING_REGION !== '') {
    regionNames = process.env.CURRENTLY_USING_REGION.split(',')
  } else {
    // Get the list of all regions in aws
    // ! not recommended.
    const ec2 = new AWS.EC2()
    const regions = await ec2.describeRegions({}).promise()
    regionNames = regions.Regions.map((region) => region.RegionName)
  }
  return regionNames
}
