import { DynamoDB, CloudWatch } from 'aws-sdk'
import middy from '@middy/core'
import validator from '@middy/validator'
import httpJsonBodyParser from '@middy/http-json-body-parser'
import httpHeaderNormalizer from '@middy/http-header-normalizer'
import cloudWatchMetricsMiddleware from '@middy/cloudwatch-metrics'
import errorLoggerMiddleware from '@middy/error-logger'
import inputOutputLoggerMiddleware from '@middy/input-output-logger'

import { DBEntry, WSBody } from '../../types'

import {
	APIGatewayProxyEvent,
	APIGatewayProxyResult,
	Context,
} from 'aws-lambda'
import { v4 } from 'uuid'

const TABLE_NAME = process.env.TABLE_NAME
const dbClient = new DynamoDB.DocumentClient()

const handler = async (
	event: APIGatewayProxyEvent,
	contex: Context
): Promise<APIGatewayProxyResult> => {
	const result: APIGatewayProxyResult = {
		statusCode: 200,
		body: 'Hello from DynamoDb',
	}
	console.log('Event data is: ', event)
	const wsBody: WSBody =
		typeof event.body === 'object' ? event.body : JSON.parse(event.body)
	console.log('Event body is: ', wsBody)

	const item: DBEntry = {
		pk: wsBody.factoryName,
		sk: `${v4()}::${wsBody.ipAddress}`,
		deviceClass: wsBody.deviceClass,
		deviceType: wsBody.deviceType,
		name: wsBody.name,
		status: wsBody.status,
		deviceAttributes: wsBody.deviceAttributes,
		createdAt: Date.now(),
		factoryName: wsBody.factoryName,
	}
	const ipAddress = wsBody.ipAddress
	const params = {
		TableName: TABLE_NAME!,
		FilterExpression:
			'contains(pk,:pkSearchString) and contains(sk, :searchString) ',
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
				statusCode: 409,
				body: `Machine already exists with given IPAddress ${ipAddress}, cannot create new one.`,
			}
		}
	} catch (e) {
		console.error('Error in scanning', e)
	}
	try {
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
	result.body = JSON.stringify(`Created item with id: ${item.pk}:${item.sk}`)
	return result
}

const schema = {
	type: 'object',
	properties: {
		body: {
			type: 'object',
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
	required: ['body'],
}

const handlerWithMiddleware = middy(handler)
	.use(httpHeaderNormalizer())
	.use(httpJsonBodyParser())
	.use(cloudWatchMetricsMiddleware())
	.use(inputOutputLoggerMiddleware())
	.use(errorLoggerMiddleware())

export { handlerWithMiddleware as handler }
