import { DynamoDB, CloudWatch } from 'aws-sdk'
import middy from '@middy/core'
import validator from '@middy/validator'
import jsonBodyParser from '@middy/http-json-body-parser'
import httpErrorHandler from '@middy/http-error-handler'

import { DBEntry, WSBody } from '../../types'

import { APIGatewayProxyResult, Context } from 'aws-lambda'
import { v4 } from 'uuid'

const TABLE_NAME = process.env.TABLE_NAME
const dbClient = new DynamoDB.DocumentClient()

const handler = async (
	event: any,
	context: Context
): Promise<APIGatewayProxyResult> => {
	const result: APIGatewayProxyResult = {
		statusCode: 200,
		body: 'Hello from DynamoDb',
	}
	//Prints logs to cloudWatch
	console.log('Event data is: ', event)

	const wsBody: WSBody = event.body
	console.log('Event body is: ', wsBody)
	const id = v4()

	const { ipAddress, factoryName } = wsBody

	//Following is the expression built for running scan on the dyanmoDB table.
	//Here we're first trying to find if any device already using the given
	//IP Address, if we found a device with given IP address then erorr will be returned

	const params = {
		TableName: TABLE_NAME!,
		FilterExpression:
			'contains(pk,:pkSearchString) and contains(sk, :searchString)',
		ExpressionAttributeValues: {
			':searchString': ipAddress,
			':pkSearchString': wsBody.factoryName,
		},
	}
	try {
		const scanResp = await dbClient.scan(params).promise()
		console.log('Scan response is: ', scanResp)
		if (scanResp.Count) {
			console.log('Found items with given IPAddress', scanResp)
			return {
				statusCode: 400,
				body: JSON.stringify({
					message: `Machine already exists with given IPAddress ${ipAddress} in ${factoryName} 
					Factory, cannot create new one.`,
				}),
			}
		}
	} catch (e) {
		console.error('Error in scanning', e)
	}
	try {
		//This is DB entry which will be added to DynamoDB table
		//Here pk means Partition Key :- Factory Name is used as partition key
		//sk means sort key : Combination of deviceId and ipAddress is used as
		//sort key.
		const item: DBEntry = {
			pk: wsBody.factoryName,
			sk: `${id}::${wsBody.ipAddress}`,
			deviceClass: wsBody.deviceClass ?? '',
			deviceType: wsBody.deviceType ?? '',
			name: wsBody.name ?? '',
			status: wsBody.status ?? '',
			deviceAttributes: wsBody.deviceAttributes ?? '',
			createdAt: Date.now(),
			factoryName: wsBody.factoryName ?? '',
		}
		await dbClient
			.put({
				TableName: TABLE_NAME!,
				Item: item,
				ConditionExpression: 'attribute_not_exists(#sortKey)',
				ExpressionAttributeNames: {
					'#sortKey': 'sk',
				},
			})
			.promise()
	} catch (error) {
		throw new Error('Failed to create DynamoDB record')
	}
	const body = {
		message: `Created new Device in ${wsBody.factoryName} factory`,
		deviceId: id,
	}
	result.body = JSON.stringify(body)
	return result
}

const schema = {
	type: 'object',
	properties: {
		body: {
			type: 'object',
			additionalProperties: false,
			properties: {
				deviceType: { type: 'string' },
				deviceClass: { type: 'string' },
				status: { type: 'string' },
				factoryName: { type: 'string' },
				ipAddress: {
					type: 'string',
					pattern:
						'^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$',
				},
				name: {
					type: 'string',
				},
				deviceAttributes: {
					type: 'object',
				},
			},
			required: [
				'deviceType',
				'deviceClass',
				'status',
				'ipAddress',
				'name',
				'factoryName',
			],
		},
	},
}

const handlerWithMiddleware = middy(handler)
	.use(jsonBodyParser())
	.use(
		validator({
			inputSchema: schema,
		})
	)
	.use({
		onError: (request) => {
			const response = request.response
			const error = <any>request.error
			if (response.statusCode != 400) return
			if (!error.expose || !error.cause) return
			response.headers['Content-Type'] = 'application/json'
			response.body = JSON.stringify({
				message: response.body,
				validationErrors: error.cause,
			})
		},
	})
	.use(httpErrorHandler())

export { handlerWithMiddleware as handler }
