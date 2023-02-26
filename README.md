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

   ```javascript
      {
         factoryName: string,
         deviceType: string,
         deviceClass: string,
         status: string,
         ipAddress: string,
         name: string,
         deviceAttributes?:object
      }
   ```

2. GET https://ds1n99lv4a.execute-api.us-east-1.amazonaws.com/prod/device
   It will list all the devices except Devices which are deleted.

3. DELETE https://ds1n99lv4a.execute-api.us-east-1.amazonaws.com/prod/device/720bb7bf-33ef-4a3b-9fc3-7104de7c63c6
   It will delete the given device if it is not already deleted. If it is already deleted then it will return time it was deleted.

4. PUT https://ds1n99lv4a.execute-api.us-east-1.amazonaws.com/prod/device/433ec210-967e-4efa-96b4-e6d6eb3a1965

Payload example
{
"deviceAttributes":{
"maxTemp":"1000C"
}
}

Following properties can be updated using PUT request

```javascript
      {
         deviceType: string,
         deviceClass: string,
         status: string,
         name: string,
         deviceAttributes?:object
      }
```

Note:- Using PUT request updating IPAddress, Factory and DeviceId is disabled. This will be achieved by payload schema validation. I made that choice becasue I am using these properties for primary key (partion key and sort key combo) DB record. In DynamoDB, it primary key cannnot be updated once record is created.

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
2. To test APIs you can use your favorite REST client. Or if you'll be vieweing the code in VS Code then you can install [REST Client Plugin](https://marketplace.visualstudio.com/items?itemName=humao.rest-client). I've checked in requests.http file in my repo. You can make network requests directly from that file.

### Changes Implemented since last week's review call with Craig

1. Added comments to the most of the code which is hard to understand. Code comments exaplains DB operations in detail.
2. Cleaned up the API responses and made them uniform. All APIs will now always return the JSON obejct as response.
3. Delete response is converted to idempotent. Every time response will be same.
4. Connected the middy layer middleware with POST and PUT requests. [Middy layer](https://middy.js.org/) is middleware framework which provides functionality such as payload validation, response validation, etc.
5. Middy validator is used to validate payload for POST and PUT. In case if, POST if required properties are not passed in the body then request will fail with 400. In case of PUT, API allows sending empty request. If not property is passed only updatedAt time will be updated in DB.
6. PUT operation does not support updating IPAddress anymore.

### Drawbacks of current Design with DynamoDB based implementation

1. IP Address which is used cannot be recycled after it is used by one device even if that device is deleted. It is happening because IP Address is used as part of primary key of DB record.

### Code organizaton

1. cdk :- This directory contains code which related to cdk. It defines DynamoDB table, and other resources created by CDK.
2. services :- This directory contains CRUD lambdas.
