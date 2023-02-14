# Lightforce TakeHome

I decided to make use of Lambda based APIs to build the take-home excercise. For Database I've used the DynamoDB as DB. Having DB makes it easy to implement error conditions for the POST and PUT. I am using DyanmoDB because I am familiar with it and it is easy to hook up Lambda with DynamoDB. If I would be writing production level APIs DyanmoDB would not have been good design choice. Relational DB would work well.

All APIs are hosted in AWS so you can make use of your favorite REST client to test APIs.

1. POST https://ds1n99lv4a.execute-api.us-east-1.amazonaws.com/prod/device
   Payload exmaple
   {
   "factoryName":"Wilmington",
   "deviceType":"Vida",
   "deviceClass":"3DPrinter",
   "status":"online",
   "ipAddress":"192.168.3.7",
   "name":"Printer-1"
   }
2. GET https://ds1n99lv4a.execute-api.us-east-1.amazonaws.com/prod/device
   It will list all the devices except Devices which are deleted.

3. DELETE https://ds1n99lv4a.execute-api.us-east-1.amazonaws.com/prod//720bb7bf-33ef-4a3b-9fc3-7104de7c63c6
   It will delete the given device if it is not already deleted. If it is already deleted then it will return time it was deleted.
4. PUT https://ds1n99lv4a.execute-api.us-east-1.amazonaws.com/prod/device/433ec210-967e-4efa-96b4-e6d6eb3a1965

Payload example
{
"deviceAttributes":{
"maxTemp":"1000C"
}
}

Note:- Put request is not working well to update IPAddress or FactoryName. It is happening becasue I'm using these values as Partition Key and Sort key respectively. PUT operation will detect the IPAddress conflict. But if you update IPAddress to non-existed values, if next time you're trying to use the same IPAddress to set it to some other device. API will allow you to do so, since it is not about actual SortKey.

Dynamo DB Key Design

Parition Key : {FactoryName}
Sort Key : {SortKey}::{IPAddress}

DyanmoDB Key is designed to support the following read patterns

1. Read devcies from a single factory
2. Read device using deviceID
3. Read device using IPAddress

Relational DB Design

I would've designed DB as follows

1. FactoryTable
   factoryName : string
   factoryId : string
   factoryAddress : string
2. DeviceTable
   deviceId : string
   ipAddress : string
   factoryId : string
   name : string
   deviceType : string
   updatedAt : number
   createdAt : number
   deletedAt : number

### Notes

1. I've tried to make use of Middy middleware layer. I wanted to implement payload/response schema validation as well. Unfortunately, I was not able to get validator middleware working.
2. To test APIs you can use your favorite REST client. Or if you'll be vieweing the code in VS Code then you can install REST Client Plugin [[https://marketplace.visualstudio.com/items?itemName=humao.rest-client]]. I've checked in requests.http file in my repo. You can make network requests directly from that file.
