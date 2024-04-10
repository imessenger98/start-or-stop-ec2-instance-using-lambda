# Toggle EC2 instance 
Start or stop an ec2 instance manually using aws lambda.
brief overview of each function within the Ec2Toggle service:

- #### ListInstances
    - Purpose: List all EC2 instance information in all regions, including details such as instance name, ID, region, and status. This information is later passed to the startOrStopAnInstance  function to start/stop an instance manually.

- #### startOrStopAnInstance 
    - Purpose: Switches the current state of a given EC2 instance from start to stop  an instance manually and vice versa(event include instanceId and region).

- #### StopInstancesCron
    - Purpose: Get all the instances from all the regions and check if the network activity of each instance is less than zero for the past 6 hours. If it is zero, deactivate the instance.
    - Event: Scheduled to run every 6 hours.

## Usage

### Deployment

In order to deploy the example, you need to run the following command:

```
$ serverless deploy
```

### Invocation

After successful deployment, you can invoke the deployed function by using the following command:

```bash
serverless invoke --function ListInstances
```

### Local development

You can invoke your function locally by using the following command:

```bash
serverless invoke local --function ListInstances
serverless invoke local --function startOrStopAnInstance  -p event.json
```

Which should result in response similar to the following:

```
{
    "statusCode": 200,
    "body": "{\n \"message\": \"List of EC2 instances retrieved successfully!\",\n \"instances\": [{\"id\": \"i-123456sad7890abcdef0\", \"name\": \"example-instance\", \"region\": \"us-east-1\", \"status\": \"running\"}]\n}"
}

```
