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
	const { pathParameters } = event
	const result: APIGatewayProxyResult = {
		statusCode: 200,
		body: 'Hello from DynamoDb',
	}
	console.log('Event data is: ', event)

	if (!pathParameters?.id) {
		return {
			statusCode: 400,
			body: 'Device Id not passed!',
		}
	}
	const scanParams = {
		TableName: TABLE_NAME!,
		FilterExpression: 'contains(sk, :searchString)',
		ExpressionAttributeValues: {
			':searchString': pathParameters.id,
		},
	}
	let pk, sk
	try {
		const scanResp = await dbClient.scan(scanParams).promise()
		if (!scanResp.Count) {
			return {
				statusCode: 404,
				body: 'Device not found in any factory with given ID.',
			}
		}
		const items = scanResp.Items
		if (items && items.length > 0) {
			const selectedItem = items[0] as DBEntry
			pk = selectedItem.pk
			sk = selectedItem.sk
			const { deletedAt } = selectedItem
			if (deletedAt) {
				const date = new Date(deletedAt)
				return {
					statusCode: 200,
					body: `Device id ${
						pathParameters.id
					} from ${pk} Factory was deleted at ${date.toLocaleString('en-US', {
						timeZone: 'EST',
					})}. Deleted device cannnot be updated.`,
				}
			}
		}
	} catch (e) {
		return {
			statusCode: 404,
			body: 'Failed to find device with given Id',
		}
	}
	//once device is found scan if it is doing valid updates.
	const wsBody: WSBody =
		typeof event.body === 'object' ? event.body : JSON.parse(event.body)
	console.log('Event body is: ', wsBody)
	//If ipAddress is updating then first run scan make sure it will not conflict with other
	//existing machine.
	if (wsBody.ipAddress) {
		const ipAddress = wsBody.ipAddress

		console.log('IP Address from request', ipAddress)
		const params = {
			TableName: TABLE_NAME!,
			FilterExpression:
				'contains(pk,:pkSearchString) and contains(sk, :searchString)',
			ExpressionAttributeValues: {
				':searchString': ipAddress,
				':pkSearchString': pk,
			},
		}
		try {
			const scanResp = await dbClient.scan(params).promise()
			console.log('Scan response is: ', scanResp)
			if (scanResp.Count) {
				const scannedItem: DBEntry = scanResp?.Items?.[0] as DBEntry

				const scannedItemSK = scannedItem.sk
				if (scannedItemSK !== sk) {
					console.log('Found items with given IPAddress', scanResp)
					return {
						statusCode: 409,
						body: `Machine already exists with given IPAddress ${ipAddress}, you're trying to update device with already exisitng IP address.`,
					}
				}
			}
		} catch (e) {
			console.error('Error in scanning', e)
		}
	}
	const updateParams: any = {
		TableName: TABLE_NAME!,
		Key: { pk, sk },
		UpdateExpression: 'SET',
		ExpressionAttributeValues: {},
		ReturnValues: 'UPDATED_NEW',
	}
	const updateData = { ...wsBody, updatedAt: Date.now() }
	const entries = Object.entries(updateData)
	entries.forEach(([name, value], index) => {
		updateParams.ExpressionAttributeValues[`:${name}`] = value
		if (index < entries.length - 1)
			updateParams.UpdateExpression += ` ${name} = :${name},`
		else updateParams.UpdateExpression += ` ${name} = :${name}`
	})
	console.log('Update params', updateParams)
	const updateResp = await dbClient.update(updateParams).promise()
	console.log('Update response', updateResp)
	result.body = JSON.stringify(updateResp?.Attributes)
	return result
}

const handlerWithMiddleware = middy(handler)
	.use(httpHeaderNormalizer())
	.use(httpJsonBodyParser())
	.use(cloudWatchMetricsMiddleware())
	.use(inputOutputLoggerMiddleware())
	.use(errorLoggerMiddleware())

export { handlerWithMiddleware as handler }
